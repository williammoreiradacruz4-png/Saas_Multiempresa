import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import barberMascotImg from '../assets/images/barber_mascot_1786873404835.jpg';
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

  // Função para carregar agendamentos e clientes do Firestore/Cache
  const loadTenantData = async (showNotification = false) => {
    setIsSyncingAppointments(true);
    try {
      const [cloudApts, cloudClients] = await Promise.all([
        getAppointmentsFromFirestore(tenantSubdomain),
        getClientsFromFirestore(tenantSubdomain),
      ]);

      if (cloudApts && cloudApts.length > 0) {
        const mappedApts: BarberAppointment[] = cloudApts.map((a: any) => ({
          id: a.id || `apt-${Date.now()}`,
          clientName: a.clientName || 'Cliente Online',
          clientPhone: a.clientPhone || '(11) 98765-4321',
          serviceName: a.serviceName || 'Serviço',
          servicePrice: typeof a.servicePrice === 'number' ? a.servicePrice : 50.0,
          barberName: a.barberName || 'Barbeiro',
          dateTime: a.formattedDate || a.date || 'Hoje',
          time: a.time || '14:00',
          origin: (a.origin as any) || 'Painel Cliente',
          status: (a.status as any) || 'Agendado',
        }));
        setAppointments(mappedApts);
      } else {
        setAppointments([]);
      }

      if (cloudClients && cloudClients.length > 0) {
        const mappedClients: BarberClient[] = cloudClients.map((c: any) => ({
          id: c.id || c.uid || `cli-${Date.now()}`,
          name: c.name || 'Cliente',
          phone: c.phone || '',
          email: c.email || '',
          totalVisits: c.totalVisits || 1,
          fidelityPoints: c.fidelityPoints || 0,
          lastVisit: c.lastVisit || 'Recente',
          favoriteBarber: c.favoriteBarber || 'Barbeiro Principal',
          status: 'Ativo',
        }));
        setClients(mappedClients);
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

  // Sincronização em tempo real (Firestore onSnapshot + Custom Event + Storage Event)
  useEffect(() => {
    loadTenantData();

    // 1. Ouvinte em tempo real via Firestore onSnapshot para Agendamentos
    const unsubscribeSnapshot = subscribeToTenantAppointments(tenantSubdomain, (liveApts) => {
      if (liveApts && liveApts.length > 0) {
        const mapped: BarberAppointment[] = liveApts.map((a: any) => ({
          id: a.id || `apt-${Date.now()}`,
          clientName: a.clientName || 'Cliente Online',
          clientPhone: a.clientPhone || '(11) 98765-4321',
          serviceName: a.serviceName || 'Serviço',
          servicePrice: typeof a.servicePrice === 'number' ? a.servicePrice : 50.0,
          barberName: a.barberName || 'Barbeiro',
          dateTime: a.formattedDate || a.date || 'Hoje',
          time: a.time || '14:00',
          origin: (a.origin as any) || 'Painel Cliente',
          status: (a.status as any) || 'Agendado',
        }));
        setAppointments(mapped);
      }
    });

    // 2. Ouvinte em tempo real via Firestore onSnapshot para Clientes da Barbearia
    const unsubscribeClients = subscribeToTenantClients(tenantSubdomain, (liveClients) => {
      if (liveClients) {
        const mapped: BarberClient[] = liveClients.map((c: any) => ({
          id: c.id || c.uid || `cli-${Date.now()}`,
          name: c.name || 'Cliente',
          phone: c.phone || '',
          email: c.email || '',
          totalVisits: c.totalVisits || 1,
          fidelityPoints: typeof c.fidelityPoints === 'number' ? c.fidelityPoints : 0,
          lastVisit: c.lastVisit || 'Recente',
          favoriteBarber: c.favoriteBarber || 'Barbeiro Principal',
          status: 'Ativo',
        }));
        setClients(mapped);
      }
    });

    // 3. Ouvinte de evento imediato na janela para novos agendamentos
    const handleNewAppointmentEvent = (e: any) => {
      const detail = e.detail;
      if (detail) {
        const newApt: BarberAppointment = {
          id: detail.id || `apt-${Date.now()}`,
          clientName: detail.clientName || 'Cliente Online',
          clientPhone: detail.clientPhone || '(11) 98765-4321',
          serviceName: detail.serviceName || 'Serviço',
          servicePrice: typeof detail.servicePrice === 'number' ? detail.servicePrice : 50.0,
          barberName: detail.barberName || 'Barbeiro',
          dateTime: detail.formattedDate || detail.date || 'Hoje',
          time: detail.time || '14:00',
          origin: 'Painel Cliente',
          status: 'Agendado',
        };
        setAppointments((prev) => [newApt, ...prev.filter((item) => item.id !== newApt.id)]);
        showToast(`🔔 Novo agendamento de ${newApt.clientName} recebido!`);
      }
    };

    // 4. Ouvinte de evento imediato na janela para novos clientes cadastrados
    const handleNewClientEvent = (e: any) => {
      const detail = e.detail;
      if (detail && (!detail.tenantId || detail.tenantId === tenantSubdomain)) {
        const newCli: BarberClient = {
          id: detail.id || detail.uid || `cli-${Date.now()}`,
          name: detail.name || 'Novo Cliente',
          phone: detail.phone || '',
          email: detail.email || '',
          totalVisits: 1,
          fidelityPoints: typeof detail.fidelityPoints === 'number' ? detail.fidelityPoints : 0,
          lastVisit: 'Hoje (Recém cadastrado)',
          favoriteBarber: 'Barbeiro Principal',
          status: 'Ativo',
        };
        setClients((prev) => [newCli, ...prev.filter((item) => item.id !== newCli.id && (newCli.email ? item.email !== newCli.email : true))]);
        showToast(`🔔 Novo cliente cadastrado: ${newCli.name}! Já disponível para envio de pontos de fidelidade.`);
      }
    };

    const handleStorageChange = () => {
      loadTenantData();
    };

    window.addEventListener('barber_appointment_created', handleNewAppointmentEvent);
    window.addEventListener('barber_client_registered', handleNewClientEvent);
    window.addEventListener('storage', handleStorageChange);

    // 5. Carrega e ouve banners promocionais em tempo real
    const loadBanners = async () => {
      try {
        const list = await getBannersFromFirestore(tenantSubdomain);
        if (list && list.length > 0) {
          setBanners(list);
        }
      } catch (e) {
        console.warn('Erro ao carregar banners:', e);
      }
    };
    loadBanners();

    const unsubscribeBanners = subscribeToTenantBanners(tenantSubdomain, (liveBanners) => {
      if (liveBanners && liveBanners.length > 0) {
        setBanners(liveBanners);
      }
    });

    return () => {
      unsubscribeSnapshot();
      unsubscribeClients();
      unsubscribeBanners();
      window.removeEventListener('barber_appointment_created', handleNewAppointmentEvent);
      window.removeEventListener('barber_client_registered', handleNewClientEvent);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [tenantSubdomain]);

  // Handlers para Promoções & Banners
  const handleSaveBanner = async (banner: BarberPromotionBanner) => {
    setBanners((prev) => {
      const idx = prev.findIndex((b) => b.id === banner.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = banner;
        return next;
      }
      return [banner, ...prev];
    });
    showToast(`✨ Banner "${banner.title}" salvo e publicado com sucesso!`);
    await saveBannerToFirestore(tenantSubdomain, banner);
  };

  const handleDeleteBanner = async (bannerId: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== bannerId));
    showToast('🗑️ Banner promocional excluído com sucesso.');
    await deleteBannerFromFirestore(tenantSubdomain, bannerId);
  };

  const handleToggleBannerActive = async (banner: BarberPromotionBanner) => {
    const updated = { ...banner, active: !banner.active };
    setBanners((prev) => prev.map((b) => (b.id === banner.id ? updated : b)));
    showToast(`Banner ${updated.active ? 'ativado' : 'pausado'} com sucesso.`);
    await saveBannerToFirestore(tenantSubdomain, updated);
  };

  const handleResetToDefaultBanners = async () => {
    if (window.confirm('Deseja recarregar o pacote com os 15 banners promocionais originais com imagens em alta resolução e copies de IA?')) {
      setBanners(DEFAULT_PROMOTION_BANNERS);
      for (const b of DEFAULT_PROMOTION_BANNERS) {
        await saveBannerToFirestore(tenantSubdomain, b);
      }
      showToast('✨ 15 Banners promocionais recarregados com sucesso!');
    }
  };

  // Filter states
  const [appointmentSearch, setAppointmentSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedClientForFidelity, setSelectedClientForFidelity] = useState<BarberClient | null>(null);
  const [quickStampClientId, setQuickStampClientId] = useState<string>('');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAdminUpdateFidelity = async (clientId: string, newPoints: number) => {
    const clamped = Math.max(0, Math.min(10, newPoints));
    const previousPoints = selectedClientForFidelity?.fidelityPoints ?? 0;

    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, fidelityPoints: clamped } : c))
    );
    if (selectedClientForFidelity && selectedClientForFidelity.id === clientId) {
      setSelectedClientForFidelity((prev) => (prev ? { ...prev, fidelityPoints: clamped } : null));
    }

    // Persiste no banco de dados Firestore
    await updateClientFidelityInFirestore(clientId, clamped, tenantSubdomain);

    if (clamped === 10) {
      showToast(`🎉 Cartão de ${selectedClientForFidelity?.name || 'Cliente'} completou 10 selos! 1 CORTE GRÁTIS liberado.`);
    } else if (newPoints > previousPoints) {
      showToast(`✂️ +1 Selo carimbado pelo gerente com sucesso! (${clamped}/10)`);
    } else if (newPoints === 0) {
      showToast(`Cartão de fidelidade zerado após resgate do prêmio.`);
    } else {
      showToast(`Fidelidade atualizada: ${clamped}/10 selos.`);
    }
  };

  const handleQuickStampForClient = async (cli: BarberClient) => {
    const currentPoints = cli.fidelityPoints || 0;
    const nextPoints = currentPoints >= 10 ? 1 : currentPoints + 1;

    setClients((prev) =>
      prev.map((c) => (c.id === cli.id ? { ...c, fidelityPoints: nextPoints } : c))
    );

    await updateClientFidelityInFirestore(cli.id, nextPoints, tenantSubdomain);

    if (nextPoints === 10) {
      showToast(`🎉 ${cli.name} atingiu 10 selos! Corte Cortesia disponível no balcão.`);
    } else {
      showToast(`⭐ Selo #${nextPoints} carimbado com sucesso para ${cli.name}!`);
    }
  };

  // Quick Action Handlers
  const handleUpdateAppointmentStatus = (
    id: string,
    newStatus: 'Agendado' | 'Em Andamento' | 'Concluído' | 'Cancelado'
  ) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, status: newStatus } : apt))
    );
    showToast(`Status do agendamento atualizado para "${newStatus}"!`);
  };

  const handleAddAppointment = () => {
    const newApt: BarberAppointment = {
      id: `apt-${Date.now()}`,
      clientName: 'Cliente Balcão ' + Math.floor(Math.random() * 100),
      clientPhone: '(11) 98000-0000',
      serviceName: 'Corte Degradê / Fade',
      servicePrice: 55.0,
      barberName: 'Igor',
      dateTime: 'Hoje',
      time: '19:00',
      origin: 'Presencial',
      status: 'Agendado',
    };
    setAppointments((prev) => [newApt, ...prev]);
    showToast('Novo agendamento rápido criado com sucesso!');
  };

  const handleAddClient = () => {
    const newClient: BarberClient = {
      id: `cli-${Date.now()}`,
      name: 'Novo Cliente Cadastrado',
      phone: '(11) 9' + Math.floor(10000000 + Math.random() * 90000000),
      email: 'cliente@email.com',
      totalVisits: 1,
      fidelityPoints: 10,
      lastVisit: 'Hoje',
      favoriteBarber: 'Marcos',
      status: 'Ativo',
    };
    setClients((prev) => [newClient, ...prev]);
    showToast('Novo cliente cadastrado no programa de fidelidade!');
  };

  const handleAddTransaction = (type: 'entrada' | 'saida') => {
    const val = type === 'entrada' ? 55.0 : 30.0;
    const newTx: CashTransaction = {
      id: `tx-${Date.now()}`,
      description: type === 'entrada' ? 'Corte de Cabelo (Balcão)' : 'Compra Material Limpeza',
      category: type === 'entrada' ? 'Serviço' : 'Despesa Operacional',
      amount: val,
      type,
      paymentMethod: 'Pix',
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      operator: 'Larissa Lima',
    };
    setTransactions((prev) => [newTx, ...prev]);
    showToast(`Transação de R$ ${val.toFixed(2)} lançada no caixa!`);
  };

  // Calculations
  const totalRevenueToday = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'entrada')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions]);

  const totalExpenseToday = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'saida')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions]);

  const cashBalance = totalRevenueToday - totalExpenseToday;
  const lowStockCount = products.filter((p) => p.stockQty <= p.minStockQty).length;

  return (
    <div className="flex h-screen w-full bg-gray-950 text-gray-100 font-sans antialiased overflow-hidden selection:bg-amber-500 selection:text-gray-950">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium flex items-center gap-2.5 backdrop-blur-md bg-amber-950/90 text-amber-200 border-amber-500/50"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDEBAR (MENU LATERAL) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 border-r border-gray-800 flex flex-col justify-between transition-transform duration-300 md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Logo / Identidade */}
          <div className="p-5 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className="w-11 h-11 rounded-xl p-1 bg-gray-950 border-2 flex items-center justify-center shadow-inner shrink-0 overflow-hidden"
                style={{ borderColor: themeColorHex }}
              >
                <img
                  src={logoUrl}
                  alt="Logo Barbearia"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = barberMascotImg;
                  }}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span
                  className="font-bold text-sm sm:text-base tracking-wide block leading-tight truncate max-w-[150px]"
                  style={{ color: themeColorHex }}
                >
                  {tenantName || 'Barbearia'}
                </span>
                <span className="text-[10px] text-gray-400 font-medium block truncate max-w-[150px]">
                  Painel de Gestão
                </span>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-gray-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Links de Navegação */}
          <nav className="p-3 space-y-1">
            <button
              type="button"
              id="btn-dashboard"
              onClick={() => {
                setActiveTab('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-semibold transition cursor-pointer text-left ${
                activeTab === 'dashboard'
                  ? 'bg-amber-500 text-gray-950 shadow-md shadow-amber-500/20'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              style={activeTab === 'dashboard' ? { backgroundColor: themeColorHex, color: '#030712' } : {}}
            >
              <PieChart className="w-5 h-5 shrink-0" />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              id="btn-agendamentos"
              onClick={() => {
                setActiveTab('agendamentos');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-semibold transition cursor-pointer text-left ${
                activeTab === 'agendamentos'
                  ? 'bg-amber-500 text-gray-950 shadow-md shadow-amber-500/20'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              style={activeTab === 'agendamentos' ? { backgroundColor: themeColorHex, color: '#030712' } : {}}
            >
              <Calendar className="w-5 h-5 shrink-0" />
              <div className="flex-1 flex items-center justify-between">
                <span>Agendamentos</span>
                <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono">
                  {appointments.length}
                </span>
              </div>
            </button>

            <button
              type="button"
              id="btn-clientes"
              onClick={() => {
                setActiveTab('clientes');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-semibold transition cursor-pointer text-left ${
                activeTab === 'clientes'
                  ? 'bg-amber-500 text-gray-950 shadow-md shadow-amber-500/20'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              style={activeTab === 'clientes' ? { backgroundColor: themeColorHex, color: '#030712' } : {}}
            >
              <Users className="w-5 h-5 shrink-0" />
              <span>Clientes & Fidelidade</span>
            </button>

            <button
              type="button"
              id="btn-promocoes"
              onClick={() => {
                setActiveTab('promocoes');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-semibold transition cursor-pointer text-left ${
                activeTab === 'promocoes'
                  ? 'bg-amber-500 text-gray-950 shadow-md shadow-amber-500/20'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              style={activeTab === 'promocoes' ? { backgroundColor: themeColorHex, color: '#030712' } : {}}
            >
              <Flame className="w-5 h-5 shrink-0 text-amber-400" />
              <div className="flex-1 flex items-center justify-between">
                <span>Promoções & Banners</span>
                <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono">
                  {banners.length}
                </span>
              </div>
            </button>

            <button
              type="button"
              id="btn-servicos"
              onClick={() => {
                setActiveTab('servicos');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-semibold transition cursor-pointer text-left ${
                activeTab === 'servicos'
                  ? 'bg-amber-500 text-gray-950 shadow-md shadow-amber-500/20'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              style={activeTab === 'servicos' ? { backgroundColor: themeColorHex, color: '#030712' } : {}}
            >
              <Scissors className="w-5 h-5 shrink-0" />
              <span>Serviços & Valores</span>
            </button>

            <button
              type="button"
              id="btn-funcionarios"
              onClick={() => {
                setActiveTab('funcionarios');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-semibold transition cursor-pointer text-left ${
                activeTab === 'funcionarios'
                  ? 'bg-amber-500 text-gray-950 shadow-md shadow-amber-500/20'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              style={activeTab === 'funcionarios' ? { backgroundColor: themeColorHex, color: '#030712' } : {}}
            >
              <IdCard className="w-5 h-5 shrink-0" />
              <span>Funcionários</span>
            </button>

            <button
              type="button"
              id="btn-produtos"
              onClick={() => {
                setActiveTab('produtos');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-semibold transition cursor-pointer text-left ${
                activeTab === 'produtos'
                  ? 'bg-amber-500 text-gray-950 shadow-md shadow-amber-500/20'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              style={activeTab === 'produtos' ? { backgroundColor: themeColorHex, color: '#030712' } : {}}
            >
              <Package className="w-5 h-5 shrink-0" />
              <div className="flex-1 flex items-center justify-between">
                <span>Produtos & Estoque</span>
                {lowStockCount > 0 && (
                  <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">
                    {lowStockCount}
                  </span>
                )}
              </div>
            </button>

            <button
              type="button"
              id="btn-caixa"
              onClick={() => {
                setActiveTab('caixa');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-semibold transition cursor-pointer text-left ${
                activeTab === 'caixa'
                  ? 'bg-amber-500 text-gray-950 shadow-md shadow-amber-500/20'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              style={activeTab === 'caixa' ? { backgroundColor: themeColorHex, color: '#030712' } : {}}
            >
              <Landmark className="w-5 h-5 shrink-0" />
              <span>Fluxo de Caixa</span>
            </button>

            <button
              type="button"
              id="btn-configuracoes"
              onClick={() => {
                setActiveTab('configuracoes');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-semibold transition cursor-pointer text-left ${
                activeTab === 'configuracoes'
                  ? 'bg-amber-500 text-gray-950 shadow-md shadow-amber-500/20'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              style={activeTab === 'configuracoes' ? { backgroundColor: themeColorHex, color: '#030712' } : {}}
            >
              <Settings className="w-5 h-5 shrink-0" />
              <div className="flex-1 flex items-center justify-between">
                <span>Configurações</span>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: themeColorHex }}
                />
              </div>
            </button>
          </nav>
        </div>

        {/* Rodapé da Sidebar */}
        <div className="p-4 border-t border-gray-800 space-y-3 bg-gray-900/60">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Unidade Central
            </span>
            <span className="font-mono text-[11px] text-amber-400/80">://{tenantSubdomain}</span>
          </div>

          <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                ADM
              </div>
              <div className="text-left leading-tight">
                <p className="text-xs font-semibold text-white">Gerente da Loja</p>
                <p className="text-[10px] text-gray-400">Acesso via Senha Temp</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-gray-800 transition cursor-pointer"
              title="Sair do Painel da Barbearia"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-gray-950">
        
        {/* HEADER GLOBAL */}
        <header className="h-16 border-b border-gray-800 bg-gray-900 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-gray-400 hover:text-white p-1 rounded-lg focus:outline-none"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 id="page-title" className="text-lg sm:text-xl font-bold text-gray-100">
                {activeTab === 'dashboard' && 'Visão Geral'}
                {activeTab === 'agendamentos' && 'Agendamentos da Barbearia'}
                {activeTab === 'clientes' && 'Gestão de Clientes & Programa Fidelidade'}
                {activeTab === 'promocoes' && 'Promoções & Banners Promocionais'}
                {activeTab === 'servicos' && 'Tabela de Serviços e Preços'}
                {activeTab === 'funcionarios' && 'Equipe de Barbeiros & Comissões'}
                {activeTab === 'produtos' && 'Controle de Produtos & Estoque'}
                {activeTab === 'caixa' && 'Livro Caixa & Movimentação Financeira'}
                {activeTab === 'configuracoes' && 'Configurações da Barbearia'}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            {onSwitchToClientApp && (
              <button
                type="button"
                onClick={onSwitchToClientApp}
                className="hidden sm:flex items-center gap-1.5 text-xs bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer"
                title="Abrir a visão e experiência do cliente"
              >
                <User className="w-3.5 h-3.5" />
                <span>Ver App do Cliente</span>
              </button>
            )}

            {tempPasswordUsed && (
              <span className="hidden lg:flex items-center gap-1.5 text-xs bg-gray-800 border border-gray-700 text-gray-300 px-3 py-1 rounded-full font-mono">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Chave: {tempPasswordUsed}</span>
              </span>
            )}

            <span className="text-xs sm:text-sm bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Caixa Aberto
            </span>

            <div className="w-9 h-9 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-amber-500 text-xs">
              ADM
            </div>
          </div>
        </header>

        {/* ÁREA DOS PAINÉIS (CONTEÚDO DINÂMICO) */}
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* 1. TELA: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div id="tab-dashboard" className="space-y-6">
              
              {/* Métricas Rápidas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                
                {/* Metric 1 */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-900 p-5 rounded-xl border border-gray-800 flex justify-between items-center shadow-xs"
                >
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold">Agendamentos Hoje</p>
                    <h3 className="text-2xl font-bold mt-1 text-white">{appointments.length}</h3>
                    <span className="text-[11px] text-blue-400 mt-1 block">
                      {appointments.length === 0
                        ? 'Nenhum agendamento hoje'
                        : `${appointments.filter((a) => a.origin === 'Painel Cliente').length} agendados via App`}
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-lg border border-blue-500/20">
                    <Clock className="w-5 h-5" />
                  </div>
                </motion.div>

                {/* Metric 2 */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="bg-gray-900 p-5 rounded-xl border border-gray-800 flex justify-between items-center shadow-xs"
                >
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold">Faturamento Diário</p>
                    <h3 className="text-2xl font-bold mt-1 text-emerald-400">
                      {totalRevenueToday.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h3>
                    <span className="text-[11px] text-emerald-400/80 mt-1 block">Saldo Líquido: R$ {cashBalance.toFixed(2)}</span>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-lg border border-emerald-500/20">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </motion.div>

                {/* Metric 3 */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  onClick={() => setActiveTab('clientes')}
                  className="bg-gray-900 p-5 rounded-xl border border-gray-800 flex justify-between items-center shadow-xs cursor-pointer hover:border-purple-500/50 hover:bg-gray-850 transition group"
                  title="Clique para abrir lista de clientes e carimbar fidelidade"
                >
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold flex items-center gap-1.5">
                      <span>Clientes Cadastrados</span>
                      <span className="text-[10px] text-purple-400 opacity-0 group-hover:opacity-100 transition">↗</span>
                    </p>
                    <h3 className="text-2xl font-bold mt-1 text-white">{clients.length}</h3>
                    <span className="text-[11px] text-purple-400 mt-1 block">
                      {clients.length > 0
                        ? `${clients.filter((c) => (c.fidelityPoints || 0) > 0).length} com fidelidade ativa`
                        : '0 clientes cadastrados'}
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-lg border border-purple-500/20 group-hover:scale-110 group-hover:bg-purple-500/20 transition">
                    <UserPlus className="w-5 h-5" />
                  </div>
                </motion.div>

                {/* Metric 4 */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="bg-gray-900 p-5 rounded-xl border border-gray-800 flex justify-between items-center shadow-xs"
                >
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold">Alertas de Estoque</p>
                    <h3 className="text-2xl font-bold mt-1 text-red-400">{lowStockCount} Itens</h3>
                    <span className="text-[11px] text-red-400/80 mt-1 block">Necessitam reposição</span>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center text-lg border border-red-500/20">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </motion.div>
              </div>

              {/* Próximos Clientes / Atendimentos em Andamento */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base sm:text-lg font-bold text-amber-400 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                    <span>Atendimentos em Andamento / Próximos</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('agendamentos')}
                    className="text-xs text-gray-400 hover:text-amber-400 transition flex items-center gap-1"
                  >
                    Ver todos ({appointments.length}) <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-gray-800">
                  {appointments.slice(0, 4).map((apt) => (
                    <div
                      key={apt.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-gray-800/40 px-2 rounded-lg transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white">{apt.clientName}</p>
                          {apt.origin === 'Painel Cliente' && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-medium">
                              App Cliente
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {apt.serviceName} • <span className="text-gray-300">Barbeiro: {apt.barberName}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-emerald-400 font-semibold">
                          {apt.servicePrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <span className="text-sm font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg font-mono">
                          {apt.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card de Envio Rápido de Fidelidade para Clientes (Direto na Visão Geral) */}
              <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-amber-950/40 rounded-xl border border-amber-500/30 p-5 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-11 h-11 rounded-xl bg-amber-500 text-gray-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/25 shrink-0">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">Envio de Fidelidade & Carimbo de Selos</h3>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-semibold border border-amber-500/30">
                          {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'} na barbearia
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Novos clientes cadastrados aparecem aqui em tempo real para o gerente carimbar e enviar pontos.
                      </p>
                    </div>
                  </div>

                  {clients.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2.5">
                      <select
                        value={quickStampClientId}
                        onChange={(e) => setQuickStampClientId(e.target.value)}
                        className="bg-gray-950 border border-gray-700 text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 min-w-[220px]"
                      >
                        <option value="">-- Escolha o Cliente --</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} • {c.fidelityPoints}/10 selos
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        disabled={!quickStampClientId}
                        onClick={() => {
                          const cli = clients.find((c) => c.id === quickStampClientId);
                          if (cli) {
                            handleQuickStampForClient(cli);
                          }
                        }}
                        className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-gray-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md active:scale-95"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Carimbar +1 Selo</span>
                      </button>

                      <button
                        type="button"
                        disabled={!quickStampClientId}
                        onClick={() => {
                          const cli = clients.find((c) => c.id === quickStampClientId);
                          if (cli) {
                            setSelectedClientForFidelity(cli);
                          }
                        }}
                        className="bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-200 border border-gray-700 font-semibold px-3.5 py-2.5 rounded-xl text-xs transition cursor-pointer"
                      >
                        Ver Cartão
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-amber-400/90 bg-amber-500/10 px-3.5 py-2 rounded-xl border border-amber-500/20">
                      <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Aguardando cadastros no App ou clique em "Novo Cliente"</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Grid 2 colunas: Barbeiros em Atendimento + Ações Rápidas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Barbeiros da Escala */}
                <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 space-y-4">
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <IdCard className="w-5 h-5 text-amber-400" />
                    <span>Equipe na Escala de Hoje</span>
                  </h3>
                  <div className="space-y-3">
                    {employees.map((emp) => (
                      <div
                        key={emp.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-800/60 border border-gray-700/60"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
                            {emp.avatarInitials}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white">{emp.name}</p>
                            <p className="text-[11px] text-gray-400">{emp.role}</p>
                          </div>
                        </div>
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                            emp.status === 'Disponível'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {emp.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ações Rápidas de Balcão */}
                <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 space-y-4">
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span>Operações Rápidas de Balcão</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleAddAppointment}
                      className="p-4 rounded-xl bg-gray-800 hover:bg-gray-700/80 border border-gray-700 text-left transition cursor-pointer group"
                    >
                      <Plus className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition" />
                      <p className="text-xs font-semibold text-white">Novo Encaixe</p>
                      <p className="text-[10px] text-gray-400">Agendar cliente balcão</p>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddClient}
                      className="p-4 rounded-xl bg-gray-800 hover:bg-gray-700/80 border border-gray-700 text-left transition cursor-pointer group"
                    >
                      <UserPlus className="w-5 h-5 text-blue-400 mb-2 group-hover:scale-110 transition" />
                      <p className="text-xs font-semibold text-white">Novo Cliente</p>
                      <p className="text-[10px] text-gray-400">Cadastro + Fidelidade</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddTransaction('entrada')}
                      className="p-4 rounded-xl bg-gray-800 hover:bg-gray-700/80 border border-gray-700 text-left transition cursor-pointer group"
                    >
                      <ArrowUpRight className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition" />
                      <p className="text-xs font-semibold text-white">Lançar Receita</p>
                      <p className="text-[10px] text-gray-400">Entrada avulsa no caixa</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddTransaction('saida')}
                      className="p-4 rounded-xl bg-gray-800 hover:bg-gray-700/80 border border-gray-700 text-left transition cursor-pointer group"
                    >
                      <ArrowDownLeft className="w-5 h-5 text-rose-400 mb-2 group-hover:scale-110 transition" />
                      <p className="text-xs font-semibold text-white">Lançar Despesa</p>
                      <p className="text-[10px] text-gray-400">Sangria ou custo loja</p>
                    </button>
                  </div>

                  {/* Atalho para Promoções & Banners com IA */}
                  <div
                    onClick={() => setActiveTab('promocoes')}
                    className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/30 flex items-center justify-between cursor-pointer hover:border-amber-500 transition group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 text-gray-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/30 group-hover:scale-110 transition">
                        <Flame className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-amber-400 transition">
                          Promoções & Carrossel do App ({banners.filter((b) => b.active).length} Ativas)
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Gerar banners com IA, fotos HD e publicar no app do cliente
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition" />
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* 2. TELA: AGENDAMENTOS */}
          {activeTab === 'agendamentos' && (
            <div id="tab-agendamentos" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-amber-400">Pedidos de Agendamento Online & Balcão</h2>
                    <span className="text-xs bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-amber-500/30">
                      {appointments.length} Total
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Sincronização em tempo real com o Portal do Cliente e cadastros presenciais.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => loadTenantData(true)}
                    disabled={isSyncingAppointments}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-gray-700 transition cursor-pointer"
                    title="Sincronizar agendamentos do banco de dados agora"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAppointments ? 'animate-spin text-amber-400' : ''}`} />
                    <span>{isSyncingAppointments ? 'Sincronizando...' : 'Atualizar'}</span>
                  </button>

                  <input
                    type="text"
                    value={appointmentSearch}
                    onChange={(e) => setAppointmentSearch(e.target.value)}
                    placeholder="Buscar cliente ou barbeiro..."
                    className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddAppointment}
                    className="bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo Horário</span>
                  </button>
                </div>
              </div>

              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[700px]">
                    <thead className="bg-gray-800/80 text-gray-400 uppercase text-xs">
                      <tr>
                        <th className="p-4">Cliente</th>
                        <th className="p-4">Serviço</th>
                        <th className="p-4">Profissional</th>
                        <th className="p-4">Data/Hora</th>
                        <th className="p-4">Origem</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {appointments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-400 space-y-2">
                            <Calendar className="w-10 h-10 text-gray-600 mx-auto" />
                            <p className="text-sm font-semibold text-gray-300">Nenhum agendamento pendente no momento</p>
                            <p className="text-xs text-gray-500 max-w-md mx-auto">
                              Assim que um cliente agendar pelo aplicativo ou você registrar um novo horário, ele aparecerá aqui instantaneamente.
                            </p>
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={handleAddAppointment}
                                className="inline-flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold px-3 py-1.5 rounded-lg transition"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Criar Primeiro Agendamento</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        appointments
                          .filter(
                            (apt) =>
                              apt.clientName.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
                              apt.barberName.toLowerCase().includes(appointmentSearch.toLowerCase())
                          )
                          .map((apt) => (
                          <tr key={apt.id} className="hover:bg-gray-800/40 transition">
                            <td className="p-4">
                              <p className="font-semibold text-white">{apt.clientName}</p>
                              <p className="text-xs text-gray-400 font-mono">{apt.clientPhone}</p>
                            </td>
                            <td className="p-4">
                              <p className="text-gray-200">{apt.serviceName}</p>
                              <p className="text-xs font-mono text-emerald-400">
                                {apt.servicePrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </p>
                            </td>
                            <td className="p-4 text-gray-300 font-medium">{apt.barberName}</td>
                            <td className="p-4">
                              <span className="font-mono text-amber-400 text-xs font-semibold bg-amber-500/10 px-2.5 py-1 rounded">
                                {apt.dateTime} - {apt.time}
                              </span>
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  apt.origin === 'Painel Cliente'
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    : 'bg-gray-800 text-gray-300'
                                }`}
                              >
                                {apt.origin}
                              </span>
                            </td>
                            <td className="p-4">
                              <span
                                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                  apt.status === 'Agendado'
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    : apt.status === 'Em Andamento'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}
                              >
                                {apt.status}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => {
                                  // Localiza o cliente correspondente para carimbar
                                  const targetClient = clients.find(
                                    (c) => c.name.toLowerCase() === apt.clientName.toLowerCase() || c.phone === apt.clientPhone
                                  );
                                  if (targetClient) {
                                    handleQuickStampForClient(targetClient);
                                  } else {
                                    // Cria ou seleciona cliente
                                    const fallbackCli: BarberClient = {
                                      id: `cli-${Date.now()}`,
                                      name: apt.clientName,
                                      phone: apt.clientPhone,
                                      email: 'cliente@barbearia.com',
                                      totalVisits: 1,
                                      fidelityPoints: 1,
                                      lastVisit: 'Hoje',
                                      favoriteBarber: apt.barberName,
                                      status: 'Ativo',
                                    };
                                    setClients((prev) => [fallbackCli, ...prev]);
                                    updateClientFidelityInFirestore(fallbackCli.id, 1, tenantSubdomain);
                                    showToast(`⭐ Selo #1 carimbado para ${apt.clientName}!`);
                                  }
                                }}
                                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-xs font-bold transition cursor-pointer inline-flex items-center gap-1"
                                title="Carimbar Selo de Fidelidade para este atendimento"
                              >
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                <span>+1 Selo</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateAppointmentStatus(apt.id, 'Em Andamento')}
                                className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-xs font-semibold transition cursor-pointer"
                                title="Iniciar Atendimento"
                              >
                                Iniciar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateAppointmentStatus(apt.id, 'Concluído');
                                  // Prompt de carimbo automático ao concluir
                                  const targetClient = clients.find(
                                    (c) => c.name.toLowerCase() === apt.clientName.toLowerCase() || c.phone === apt.clientPhone
                                  );
                                  if (targetClient) {
                                    handleQuickStampForClient(targetClient);
                                  }
                                }}
                                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-xs font-semibold transition cursor-pointer"
                                title="Finalizar Atendimento e Carimbar Selo"
                              >
                                Concluir
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. TELA: CLIENTES & FIDELIDADE */}
          {activeTab === 'clientes' && (
            <div id="tab-clientes" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-amber-400">Base de Clientes & Programa Fidelidade</h2>
                  <p className="text-xs text-gray-400">Controle exclusivo do gerente para carimbar selos e acompanhar recompensas.</p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Buscar por nome ou celular..."
                    className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddClient}
                    className="bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Cadastrar Cliente</span>
                  </button>
                </div>
              </div>

              {/* BARRA DE CARIMBO RÁPIDO DO GERENTE */}
              <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-amber-950/40 p-4 rounded-xl border border-amber-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-gray-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20 shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Carimbador Rápido de Fidelidade</span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-semibold border border-amber-500/30">
                        Função do Gerente
                      </span>
                    </h3>
                    <p className="text-xs text-gray-400">
                      Selecione um cliente para carimbar +1 selo imediatamente no balcão.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={quickStampClientId}
                    onChange={(e) => setQuickStampClientId(e.target.value)}
                    className="bg-gray-950 border border-gray-800 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 min-w-[200px]"
                  >
                    <option value="">-- Selecionar Cliente --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.fidelityPoints}/10 selos)
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={!quickStampClientId}
                    onClick={() => {
                      const cli = clients.find((c) => c.id === quickStampClientId);
                      if (cli) {
                        handleQuickStampForClient(cli);
                      }
                    }}
                    className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md active:scale-95"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Carimbar +1 Selo</span>
                  </button>

                  <button
                    type="button"
                    disabled={!quickStampClientId}
                    onClick={() => {
                      const cli = clients.find((c) => c.id === quickStampClientId);
                      if (cli) {
                        setSelectedClientForFidelity(cli);
                      }
                    }}
                    className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-200 font-semibold px-3 py-2 rounded-lg text-xs transition cursor-pointer"
                  >
                    Abrir Cartão
                  </button>
                </div>
              </div>

              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[700px]">
                    <thead className="bg-gray-800/80 text-gray-400 uppercase text-xs">
                      <tr>
                        <th className="p-4">Cliente</th>
                        <th className="p-4">Contato</th>
                        <th className="p-4">Total Visitas</th>
                        <th className="p-4">Pontos Fidelidade</th>
                        <th className="p-4">Barbeiro Preferido</th>
                        <th className="p-4 text-right">Ação do Gerente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {clients.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-400">
                            <Users className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                            <p className="font-semibold text-sm text-gray-300">Nenhum cliente cadastrado nesta barbearia ainda.</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Novos clientes cadastrados no App ou agendados no balcão aparecerão aqui automaticamente.
                            </p>
                          </td>
                        </tr>
                      ) : clients.filter((c) => c.name.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-400">
                            <p className="font-semibold text-sm text-gray-300">Nenhum cliente encontrado para "{clientSearch}".</p>
                          </td>
                        </tr>
                      ) : (
                        clients
                          .filter((c) => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
                          .map((cli) => (
                            <tr key={cli.id} className="hover:bg-gray-800/40 transition">
                              <td className="p-4 font-semibold text-white">
                                <div>{cli.name}</div>
                                {cli.email && <div className="text-[11px] text-gray-500">{cli.email}</div>}
                              </td>
                              <td className="p-4 text-xs text-gray-300 font-mono">{cli.phone}</td>
                              <td className="p-4 font-bold text-white">{cli.totalVisits} cortes</td>
                              <td className="p-4">
                                <button
                                  type="button"
                                  onClick={() => setSelectedClientForFidelity(cli)}
                                  className="inline-flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs px-2.5 py-1 rounded-lg transition cursor-pointer group"
                                  title="Abrir Cartão Fidelidade Completo"
                                >
                                  <img
                                    src={barberMascotImg}
                                    alt="Mascote Fidelidade"
                                    referrerPolicy="no-referrer"
                                    className={`w-4 h-4 object-contain ${
                                      cli.fidelityPoints > 0 ? 'filter-none' : 'grayscale opacity-60'
                                    }`}
                                  />
                                  <span>{cli.fidelityPoints}/10 selos</span>
                                  <span className="text-[10px] text-amber-300 underline opacity-0 group-hover:opacity-100 transition">Ver</span>
                                </button>
                              </td>
                              <td className="p-4 text-gray-300">{cli.favoriteBarber}</td>
                              <td className="p-4 text-right space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleQuickStampForClient(cli)}
                                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded text-xs transition cursor-pointer inline-flex items-center gap-1 shadow-sm active:scale-95"
                                  title="Carimbar 1 selo para o cliente"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>+1 Selo</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedClientForFidelity(cli)}
                                  className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded text-xs font-semibold transition cursor-pointer"
                                >
                                  Cartão
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3.1 TELA: PROMOÇÕES & BANNERS (CARROSSEL COM IA E FOTOS) */}
          {activeTab === 'promocoes' && (
            <div id="tab-promocoes">
              <BarberPromotionsManager
                banners={banners}
                tenantSubdomain={tenantSubdomain}
                onSaveBanner={handleSaveBanner}
                onDeleteBanner={handleDeleteBanner}
                onToggleActive={handleToggleBannerActive}
                onResetDefaults={handleResetToDefaultBanners}
                themeColorHex={themeColorHex}
              />
            </div>
          )}

          {/* 4. TELA: SERVIÇOS & VALORES */}
          {activeTab === 'servicos' && (
            <div id="tab-servicos" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-amber-400">Cardápio de Serviços & Valores</h2>
                  <p className="text-xs text-gray-400">Configuração de tempo estimado e precificação.</p>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('Formulário de novo serviço!')}
                  className="bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Serviço</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((srv) => (
                  <div
                    key={srv.id}
                    className="bg-gray-900 p-5 rounded-xl border border-gray-800 space-y-3 relative hover:border-amber-500/40 transition"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded uppercase">
                        {srv.category}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {srv.durationMinutes} min
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-base leading-snug">{srv.name}</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">{srv.description}</p>

                    <div className="pt-3 border-t border-gray-800 flex items-center justify-between">
                      <span className="text-xl font-extrabold text-emerald-400 font-mono">
                        {srv.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded">
                        Ativo na Agenda
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. TELA: FUNCIONÁRIOS */}
          {activeTab === 'funcionarios' && (
            <div id="tab-funcionarios" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-amber-400">Equipe de Barbeiros & Comissionamento</h2>
                  <p className="text-xs text-gray-400">Controle de produtividade e porcentagens de repasse.</p>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('Adicionar novo barbeiro!')}
                  className="bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Barbeiro</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {employees.map((emp) => (
                  <div
                    key={emp.id}
                    className="bg-gray-900 p-5 rounded-xl border border-gray-800 flex items-center justify-between shadow-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 font-extrabold flex items-center justify-center text-sm border border-amber-500/30">
                        {emp.avatarInitials}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">{emp.name}</h3>
                        <p className="text-xs text-gray-400">{emp.role}</p>
                        <p className="text-xs text-amber-400 mt-1 font-semibold">
                          Comissão: {emp.commissionPercentage}% • {emp.totalCutsMonth} cortes no mês
                        </p>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">
                        {emp.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. TELA: PRODUTOS & ESTOQUE */}
          {activeTab === 'produtos' && (
            <div id="tab-produtos" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-amber-400">Controle de Produtos & Estoque</h2>
                  <p className="text-xs text-gray-400">Pomadas, óleos e cosméticos para revenda.</p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Buscar produto ou SKU..."
                    className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => showToast('Cadastrar produto!')}
                    className="bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo Produto</span>
                  </button>
                </div>
              </div>

              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[700px]">
                    <thead className="bg-gray-800/80 text-gray-400 uppercase text-xs">
                      <tr>
                        <th className="p-4">Produto</th>
                        <th className="p-4">SKU / Categoria</th>
                        <th className="p-4">Custo</th>
                        <th className="p-4">Venda</th>
                        <th className="p-4">Estoque Atual</th>
                        <th className="p-4">Situação</th>
                        <th className="p-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {products
                        .filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                        .map((prd) => (
                          <tr key={prd.id} className="hover:bg-gray-800/40 transition">
                            <td className="p-4 font-semibold text-white">{prd.name}</td>
                            <td className="p-4 text-xs text-gray-300">
                              <span className="font-mono text-amber-400">{prd.sku}</span> • {prd.category}
                            </td>
                            <td className="p-4 font-mono text-xs text-gray-400">
                              {prd.costPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="p-4 font-mono text-sm text-emerald-400 font-bold">
                              {prd.salePrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="p-4 font-bold text-white">
                              {prd.stockQty} un. <span className="text-xs text-gray-500">(Mín: {prd.minStockQty})</span>
                            </td>
                            <td className="p-4">
                              <span
                                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                  prd.stockQty <= prd.minStockQty
                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}
                              >
                                {prd.stockQty <= prd.minStockQty ? 'Estoque Baixo' : 'Normal'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setProducts((prev) =>
                                    prev.map((p) => (p.id === prd.id ? { ...p, stockQty: p.stockQty + 10 } : p))
                                  );
                                  showToast(`Estoque de "${prd.name}" reposto (+10 un)!`);
                                }}
                                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-amber-400 rounded text-xs font-semibold transition cursor-pointer"
                              >
                                +10 Repor
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 7. TELA: FLUXO DE CAIXA */}
          {activeTab === 'caixa' && (
            <div id="tab-caixa" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-amber-400">Fluxo de Caixa & Livro Diário</h2>
                  <p className="text-xs text-gray-400">Acompanhamento de entradas de serviços/produtos e saídas.</p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleAddTransaction('entrada')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>+ Nova Entrada</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddTransaction('saida')}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>- Nova Saída</span>
                  </button>
                </div>
              </div>

              {/* Cards de Resumo Financeiro */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-900 p-5 rounded-xl border border-gray-800">
                  <p className="text-xs text-gray-400 uppercase font-semibold">Total Entradas (Hoje)</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">
                    {totalRevenueToday.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="bg-gray-900 p-5 rounded-xl border border-gray-800">
                  <p className="text-xs text-gray-400 uppercase font-semibold">Total Saídas / Custos</p>
                  <p className="text-2xl font-bold text-rose-400 mt-1">
                    {totalExpenseToday.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="bg-gray-900 p-5 rounded-xl border border-gray-800">
                  <p className="text-xs text-gray-400 uppercase font-semibold">Saldo Atual em Caixa</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {cashBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              </div>

              {/* Lista de Transações */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-gray-800 font-semibold text-white text-sm">
                  Movimentações Recentes do Caixa
                </div>
                <div className="divide-y divide-gray-800 text-sm">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-800/40 transition">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm ${
                            tx.type === 'entrada'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {tx.type === 'entrada' ? (
                            <ArrowUpRight className="w-5 h-5" />
                          ) : (
                            <ArrowDownLeft className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{tx.description}</p>
                          <p className="text-xs text-gray-400">
                            {tx.category} • {tx.paymentMethod} • Operador: {tx.operator}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-mono font-bold ${
                            tx.type === 'entrada' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {tx.type === 'entrada' ? '+' : '-'}
                          {tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <p className="text-xs text-gray-500">{tx.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 8. TELA: CONFIGURAÇÕES DA BARBEARIA */}
          {activeTab === 'configuracoes' && (
            <BarberSettingsTab
              tenantName={tenantName}
              tenantSubdomain={tenantSubdomain}
              tempPasswordUsed={tempPasswordUsed}
              currentLogoUrl={logoUrl}
              currentColorHex={themeColorHex}
              onUpdateLogo={handleUpdateLogo}
              onUpdateColor={handleUpdateColor}
              onShowToast={showToast}
            />
          )}

        </div>
      </main>

      {/* Modal: Cartão Fidelidade do Cliente com Mascote */}
      <AnimatePresence>
        {selectedClientForFidelity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-gray-100"
            >
              <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                    {selectedClientForFidelity.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm leading-tight flex items-center gap-1.5">
                      <span>{selectedClientForFidelity.name}</span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-mono">
                        Gerente
                      </span>
                    </h3>
                    <p className="text-[11px] text-gray-400">Carimbador de Selos do Gerente da Barbearia</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedClientForFidelity(null)}
                  className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Cartão Visual Amarelo/Dourado */}
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-gray-950 shadow-lg relative overflow-hidden">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                        Programa de Fidelidade (Painel do Gerente)
                      </p>
                      <h4 className="text-base font-black">10 Cortes = 1 Grátis</h4>
                    </div>
                    <span className="text-xs font-bold bg-gray-950 text-amber-400 px-2 py-0.5 rounded-md">
                      {selectedClientForFidelity.fidelityPoints}/10
                    </span>
                  </div>

                  {/* Grade 10 Selos com Mascote */}
                  <div className="grid grid-cols-5 gap-2 my-2">
                    {Array.from({ length: 10 }).map((_, idx) => {
                      const stampNum = idx + 1;
                      const isStamped = stampNum <= selectedClientForFidelity.fidelityPoints;
                      const isPrize = stampNum === 10;

                      return (
                        <div
                          key={stampNum}
                          onClick={() => {
                            const newPts = isStamped && selectedClientForFidelity.fidelityPoints === stampNum
                              ? stampNum - 1
                              : stampNum;
                            handleAdminUpdateFidelity(selectedClientForFidelity.id, newPts);
                          }}
                          className={`relative aspect-square rounded-lg flex flex-col items-center justify-center p-1 overflow-hidden transition cursor-pointer select-none active:scale-95 ${
                            isStamped
                              ? 'bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-500 border-2 border-yellow-200 shadow-md'
                              : 'bg-gray-950/40 border-2 border-dashed border-gray-950/30 hover:border-gray-950/60'
                          }`}
                          title={`Gerente: Clique para alternar o selo #${stampNum}`}
                        >
                          <img
                            src={barberMascotImg}
                            alt="Mascote Fidelidade"
                            referrerPolicy="no-referrer"
                            className={`w-full h-full object-contain transition-all duration-200 ${
                              isStamped
                                ? 'filter-none opacity-100 scale-105 drop-shadow-sm'
                                : 'filter grayscale contrast-125 brightness-95 opacity-40'
                            }`}
                          />
                          <span className="absolute top-0.5 left-0.5 text-[7px] font-extrabold px-0.5 rounded-xs bg-gray-950/80 text-amber-300">
                            {isPrize ? '★10' : `#${stampNum}`}
                          </span>
                          {isStamped && (
                            <span className="absolute top-0.5 right-0.5 bg-emerald-600 text-white p-0.5 rounded-full shadow-xs">
                              {isPrize ? (
                                <Crown className="w-2 h-2 text-yellow-200 fill-yellow-200" />
                              ) : (
                                <Check className="w-2 h-2 stroke-[3]" />
                              )}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[11px] font-bold text-center mt-2 opacity-90">
                    {selectedClientForFidelity.fidelityPoints >= 10
                      ? '🎉 Este cliente tem direito a 1 corte grátis!'
                      : `Faltam ${10 - selectedClientForFidelity.fidelityPoints} corte(s) para o prêmio.`}
                  </p>
                </div>

                {/* Botões de Ação do Administrador */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      handleAdminUpdateFidelity(
                        selectedClientForFidelity.id,
                        selectedClientForFidelity.fidelityPoints + 1
                      )
                    }
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+1 Selo Carimbado</span>
                  </button>

                  <button
                    type="button"
                    disabled={selectedClientForFidelity.fidelityPoints <= 0}
                    onClick={() =>
                      handleAdminUpdateFidelity(
                        selectedClientForFidelity.id,
                        selectedClientForFidelity.fidelityPoints - 1
                      )
                    }
                    className="bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 font-semibold py-2.5 px-3 rounded-xl text-xs transition cursor-pointer"
                    title="Remover 1 selo"
                  >
                    -1 Selo
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAdminUpdateFidelity(selectedClientForFidelity.id, 0)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-medium py-2.5 px-3 rounded-xl text-xs transition cursor-pointer"
                    title="Zerar Cartão / Resgatar Prêmio de 10 Selos"
                  >
                    Zerar / Resgatar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
