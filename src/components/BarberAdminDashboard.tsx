import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import barberMascotImg from '../assets/images/barber_mascot_1786873404835.jpg';
import { ErrorBoundary } from './ErrorBoundary';
import {
  Scissors,
  PieChart,
  Calendar,
  Users,
  IdCard,
  Package,
  Landmark,
  Clock,
  DollarSign,
  UserPlus,
  AlertTriangle,
  Zap,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  LogOut,
  Sparkles,
  Phone,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  ShoppingBag,
  Award,
  Key,
  ShieldCheck,
  Menu,
  X,
  CreditCard,
  ChevronRight,
  TrendingUp,
  Tag,
  User,
  Gift,
  Crown,
  Check,
  Settings,
  RefreshCw,
  UserCheck,
  Flame,
  Image as ImageIcon,
} from 'lucide-react';
import {
  BarberSettingsTab,
  THEME_20_COLORS,
  ThemeColorOption
} from './BarberSettingsTab';
import { BarberPromotionsManager } from './BarberPromotionsManager';
import { DEFAULT_PROMOTION_BANNERS } from '../lib/promoBannersData';
import {
  BarberAppointment,
  BarberClient,
  BarberService,
  BarberEmployee,
  BarberProduct,
  CashTransaction,
  BarberPromotionBanner,
} from '../types';
import {
  getAppointmentsFromFirestore,
  getClientsFromFirestore,
  updateClientFidelityInFirestore,
  subscribeToTenantAppointments,
  subscribeToTenantClients,
  getBannersFromFirestore,
  saveBannerToFirestore,
  deleteBannerFromFirestore,
  subscribeToTenantBanners,
} from '../lib/firebaseServices';

interface BarberAdminDashboardProps {
  tenantName?: string;
  tenantSubdomain?: string;
  tempPasswordUsed?: string;
  onLogout?: () => void;
  onSwitchToSuperAdmin?: () => void;
  onSwitchToClientApp?: () => void;
}

const INITIAL_APPOINTMENTS: BarberAppointment[] = [];
const INITIAL_CLIENTS: BarberClient[] = [];

const INITIAL_SERVICES: BarberService[] = [
  {
    id: 'srv-1',
    name: 'Corte Geral',
    category: 'Cabelo',
    durationMinutes: 40,
    price: 55.0,
    description: 'Corte tradicional ou degradê moderno com finalização profissional.',
    active: true,
  },
  {
    id: 'srv-2',
    name: 'Barboterapia & Toalha Quente',
    category: 'Barba',
    durationMinutes: 35,
    price: 45.0,
    description: 'Esfoliação facial, aplicação de óleos essenciais e toalha quente relaxante.',
    active: true,
  },
  {
    id: 'srv-3',
    name: 'Combo Completo (Cabelo + Barba)',
    category: 'Combos',
    durationMinutes: 65,
    price: 95.0,
    description: 'Experiência completa de corte e barba com bebidas cortesia.',
    active: true,
  },
];

const INITIAL_EMPLOYEES: BarberEmployee[] = [
  {
    id: 'emp-1',
    name: 'Barbeiro Principal',
    role: 'Master Barber / Proprietário',
    phone: '(11) 99999-9999',
    commissionPercentage: 50,
    totalCutsMonth: 0,
    status: 'Disponível',
    avatarInitials: 'BP',
  },
];

const INITIAL_PRODUCTS: BarberProduct[] = [];
const INITIAL_TRANSACTIONS: CashTransaction[] = [];

type BarberTab =
  | 'dashboard'
  | 'agendamentos'
  | 'clientes'
  | 'promocoes'
  | 'servicos'
  | 'funcionarios'
  | 'produtos'
  | 'caixa'
  | 'configuracoes';

// 🌟 AJUSTE CRÍTICO: Exportação nomeada para bater com as chaves {} do App.tsx
export const BarberAdminDashboard: React.FC<BarberAdminDashboardProps> = ({
  tenantName = 'Barbearia Navalha de Ouro',
  tenantSubdomain = 'navalha-ouro',
  tempPasswordUsed,
  onLogout,
  onSwitchToSuperAdmin,
  onSwitchToClientApp,
}) => {
  const [activeTab, setActiveTab] = useState<BarberTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Logo & Theme Color Customization State
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(`tenant_logo_${tenantSubdomain}`) || barberMascotImg;
    } catch {
      return barberMascotImg;
    }
  });

  const [themeColorHex, setThemeColorHex] = useState<string>(() => {
    try {
      return localStorage.getItem(`tenant_theme_color_${tenantSubdomain}`) || '#F59E0B';
    } catch {
      return '#F59E0B';
    }
  });

  const handleUpdateLogo = (newLogo: string) => {
    setLogoUrl(newLogo);
    try {
      localStorage.setItem(`tenant_logo_${tenantSubdomain}`, newLogo);
    } catch (e) {
      console.warn('Erro ao salvar logo:', e);
    }
  };

  const handleUpdateColor = (color: ThemeColorOption) => {
    setThemeColorHex(color.hex);
    try {
      localStorage.setItem(`tenant_theme_color_${tenantSubdomain}`, color.hex);
    } catch (e) {
      console.warn('Erro ao salvar cor do tema:', e);
    }
  };

  // States
  const [appointments, setAppointments] = useState<BarberAppointment[]>(INITIAL_APPOINTMENTS);
  const [clients, setClients] = useState<BarberClient[]>(INITIAL_CLIENTS);
  const [services, setServices] = useState<BarberService[]>(INITIAL_SERVICES);
  const [employees, setEmployees] = useState<BarberEmployee[]>(INITIAL_EMPLOYEES);
  const [products, setProducts] = useState<BarberProduct[]>(INITIAL_PRODUCTS);
  const [transactions, setTransactions] = useState<CashTransaction[]>(INITIAL_TRANSACTIONS);
  const [banners, setBanners] = useState<BarberPromotionBanner[]>(DEFAULT_PROMOTION_BANNERS);
  const [isSyncingAppointments, setIsSyncingAppointments] = useState<boolean>(false);

  // Carregar dados reais vindos do Firebase com remoção ativa de duplicados (Evita o erro RemoveChild)
  const loadTenantData = async (showNotification = false) => {
    setIsSyncingAppointments(true);
    try {
      const [cloudApts, cloudClients] = await Promise.all([
        getAppointmentsFromFirestore(tenantSubdomain),
        getClientsFromFirestore(tenantSubdomain),
      ]);

      if (cloudApts && cloudApts.length > 0) {
        const aptMap = new Map<string, BarberAppointment>();
        cloudApts
          .filter(Boolean)
          .forEach((a: any, idx: number) => {
            const safeId = String(a?.id || `apt-${Date.now()}-${idx}`);
            aptMap.set(safeId, {
              id: safeId,
              clientName: String(a?.clientName || a?.name || 'Cliente Online'),
              clientPhone: String(a?.clientPhone || a?.phone || '(11) 98765-4321'),
              serviceName: String(a?.serviceName || 'Serviço'),
              servicePrice: typeof a?.servicePrice === 'number' ? a.servicePrice : (parseFloat(a?.servicePrice) || 50.0),
              barberName: String(a?.barberName || 'Barbeiro'),
              dateTime: String(a?.formattedDate || a?.dateTime || a?.date || 'Hoje'),
              time: String(a?.time || '14:00'),
              origin: (a?.origin as any) || 'Painel Cliente',
              status: (a?.status as any) || 'Agendado',
            });
          });
        setAppointments(Array.from(aptMap.values()));
      } else {
        setAppointments([]);
      }

      if (cloudClients && cloudClients.length > 0) {
        const cliMap = new Map<string, BarberClient>();
        cloudClients
          .filter(Boolean)
          .forEach((c: any, idx: number) => {
            const safeId = String(c?.id || c?.uid || `cli-${Date.now()}-${idx}`);
            cliMap.set(safeId, {
              id: safeId,
              name: String(c?.name || 'Cliente'),
              phone: String(c?.phone || ''),
              email: String(c?.email || ''),
              totalVisits: typeof c?.totalVisits === 'number' ? c.totalVisits : 1,
              fidelityPoints: typeof c?.fidelityPoints === 'number' ? c.fidelityPoints : (parseInt(c?.fidelityPoints) || 0),
              lastVisit: String(c?.lastVisit || 'Recente'),
              favoriteBarber: String(c?.favoriteBarber || 'Barbeiro Principal'),
              status: 'Ativo',
            });
          });
        setClients(Array.from(cliMap.values()));
      } else {
        setClients([]);
      }

      if (showNotification) {
        showToast('Sincronização concluída com sucesso!');
      }
    } catch (err) {
      console.warn('Erro ao carregar dados do tenant do Firestore:', err);
    } finally {
      setIsSyncingAppointments(false);
    }
  };

  useEffect(() => {
    loadTenantData();

    const unsubscribeSnapshot = subscribeToTenantAppointments(tenantSubdomain, (liveApts) => {
      if (liveApts && liveApts.length > 0) {
        const aptMap = new Map<string, BarberAppointment>();
        liveApts.filter(Boolean).forEach((a: any, idx: number) => {
          const safeId = String(a?.id || `apt-live-${idx}`);
          aptMap.set(safeId, {
            id: safeId,
            clientName: String(a?.clientName || a?.name || 'Cliente Online'),
            clientPhone: String(a?.clientPhone || a?.phone || ''),
            serviceName: String(a?.serviceName || 'Serviço'),
            servicePrice: typeof a?.servicePrice === 'number' ? a.servicePrice : 50.0,
            barberName: String(a?.barberName || 'Barbeiro'),
            dateTime: String(a?.formattedDate || a?.dateTime || 'Hoje'),
            time: String(a?.time || '12:00'),
            origin: (a?.origin as any) || 'Painel Cliente',
            status: (a?.status as any) || 'Agendado',
          });
        });
        setAppointments(Array.from(aptMap.values()));
      }
    });

    return () => {
      if (typeof unsubscribeSnapshot === 'function') unsubscribeSnapshot();
    };
  }, [tenantSubdomain]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-900">
        {/* CABEÇALHO DA BARBEARIA */}
        <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logoUrl} alt="Logo" className="w-12 h-12 rounded-full border-2" style={{ borderColor: themeColorHex }} />
            <div>
