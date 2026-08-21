import React, { useState, useEffect } from 'react';
import barberMascotImg from '../assets/images/barber_mascot_1786873404835.jpg';
import { ErrorBoundary } from './ErrorBoundary';
import {
  PieChart,
  Calendar,
  Users,
  Package,
  Landmark,
  Tag,
  LogOut,
  Crown,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import {
  BarberAppointment,
  BarberClient
} from '../types';
import {
  getAppointmentsFromFirestore,
  getClientsFromFirestore,
  subscribeToTenantAppointments
} from '../lib/firebaseServices';

interface BarberAdminDashboardProps {
  tenantName?: string;
  tenantSubdomain?: string;
  tempPasswordUsed?: string;
  onLogout?: () => void;
  onSwitchToSuperAdmin?: () => void;
  onSwitchToClientApp?: () => void;
}

type BarberTab = 'dashboard' | 'agendamentos' | 'clientes' | 'promocoes' | 'produtos' | 'caixa';

export const BarberAdminDashboard: React.FC<BarberAdminDashboardProps> = ({
  tenantName = 'Barbearia Navalha de Ouro',
  tenantSubdomain = 'navalha-ouro',
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<BarberTab>('dashboard');
  const [appointments, setAppointments] = useState<BarberAppointment[]>([]);
  const [clients, setClients] = useState<BarberClient[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const loadTenantData = async () => {
    setIsSyncing(true);
    try {
      const [cloudApts, cloudClients] = await Promise.all([
        getAppointmentsFromFirestore(tenantSubdomain),
        getClientsFromFirestore(tenantSubdomain)
      ]);

      if (cloudApts && cloudApts.length > 0) {
        const aptMap = new Map<string, BarberAppointment>();
        cloudApts.filter(Boolean).forEach((a: any, idx: number) => {
          const safeId = String(a?.id || `apt-${Date.now()}-${idx}`);
          aptMap.set(safeId, {
            id: safeId,
            clientName: String(a?.clientName || a?.name || 'Cliente Online'),
            clientPhone: String(a?.clientPhone || a?.phone || ''),
            serviceName: String(a?.serviceName || 'Serviço'),
            servicePrice: typeof a?.servicePrice === 'number' ? a.servicePrice : 50.0,
            barberName: String(a?.barberName || 'Barbeiro'),
            dateTime: String(a?.formattedDate || a?.dateTime || 'Hoje'),
            time: String(a?.time || '14:00'),
            origin: (a?.origin as any) || 'Painel Cliente',
            status: (a?.status as any) || 'Agendado'
          });
        });
        setAppointments(Array.from(aptMap.values()));
      } else {
        setAppointments([]);
      }

      if (cloudClients && cloudClients.length > 0) {
        const cliMap = new Map<string, BarberClient>();
        cloudClients.filter(Boolean).forEach((c: any, idx: number) => {
          const safeId = String(c?.id || c?.uid || `cli-${Date.now()}-${idx}`);
          cliMap.set(safeId, {
            id: safeId,
            name: String(c?.name || 'Cliente'),
            phone: String(c?.phone || ''),
            email: String(c?.email || ''),
            totalVisits: typeof c?.totalVisits === 'number' ? c.totalVisits : 1,
            fidelityPoints: typeof c?.fidelityPoints === 'number' ? c.fidelityPoints : 0,
            lastVisit: String(c?.lastVisit || 'Recente'),
            favoriteBarber: String(c?.favoriteBarber || 'Principal'),
            status: 'Ativo'
          });
        });
        setClients(Array.from(cliMap.values()));
      } else {
        setClients([]);
      }
    } catch (err) {
      console.warn('Erro ao carregar dados:', err);
    } finally {
      setIsSyncing(false);
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
            clientPhone: String(a?.clientPhone || ''),
            serviceName: String(a?.serviceName || 'Serviço'),
            servicePrice: typeof a?.servicePrice === 'number' ? a.servicePrice : 50.0,
            barberName: String(a?.barberName || 'Barbeiro'),
            dateTime: String(a?.formattedDate || a?.dateTime || 'Hoje'),
            time: String(a?.time || '12:00'),
            origin: (a?.origin as any) || 'Painel Cliente',
            status: (a?.status as any) || 'Agendado'
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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        {/* CABEÇALHO */}
        <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={barberMascotImg} alt="Logo" className="w-12 h-12 rounded-full border-2 border-amber-500" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                {tenantName} <Crown className="w-4 h-4 text-amber-400" />
              </h1>
              <p className="text-xs text-slate-400 font-mono">{tenantSubdomain}.barbersaas.com</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={loadTenantData} disabled={isSyncing} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition">
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
            {onLogout && (
              <button onClick={onLogout} className="flex items-center gap-2 bg-red-950/40 border border-red-900 hover:bg-red-900/60 text-red-300 px-4 py-2 rounded-lg text-sm font-medium transition">
                <LogOut className="w-4 h-4" /> Sair
              </button>
            )}
          </div>
        </header>

        {/* ESTRUTURA PRINCIPAL */}
        <div className="flex-1 flex flex-col md:flex-row">
          {/* MENU LATERAL */}
          <aside className="w-full md:w-64 bg-slate-900/40 border-r border-slate-800 p-4 space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">Módulos de Gestão</p>
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition ${activeTab === 'dashboard' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:bg-slate-800/60'}`}>
              <PieChart className="w-5 h-5" /> Dashboard Geral
            </button>
            <button onClick={() => setActiveTab('agendamentos')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition ${activeTab === 'agendamentos' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:bg-slate-800/60'}`}>
              <Calendar className="w-5 h-5" /> Agendamentos
            </button>
            <button onClick={() => setActiveTab('clientes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition ${activeTab === 'clientes' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:bg-slate-800/60'}`}>
              <Users className="w-5 h-5" /> Clientes & Fidelidade
            </button>
            <button onClick={() => setActiveTab('promocoes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition ${activeTab === 'promocoes' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:bg-slate-800/60'}`}>
              <Tag className="w-5 h-5" /> Banners & Campanhas
            </button>
            <button onClick={() => setActiveTab('produtos')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition ${activeTab === 'produtos' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:bg-slate-800/60'}`}>
              <Package className="w-5 h-5" /> Controle de Estoque
            </button>
            <button onClick={() => setActiveTab('caixa')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition ${activeTab === 'caixa' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:bg-slate-800/60'}`}>
              <Landmark className="w-5 h-5" /> Gestão Financeira
            </button>
          </aside>

          {/* CONTEÚDO DAS ABAS */}
          <main className="flex-1 p-6 md:p-8 overflow-y-auto">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                    <p className="text-xs text-slate-400 font-medium">Total de Horários Marcados</p>
                    <p className="text-3xl font-extrabold text-white mt-2 font-mono">{appointments.length}</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                    <p className="text-xs text-slate-400 font-medium">Clientes Cadastrados</p>
                    <p className="text-3xl font-extrabold text-white mt-2 font-mono">{clients.length}</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                    <p className="text-xs text-slate-400 font-medium">Status do Sistema</p>
                    <p className="text-sm font-semibold text-green-400 mt-3 flex items-center gap-2">
