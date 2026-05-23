import React, { useEffect, useState } from 'react';
import { 
  ArrowUpRight, 
  Clock, 
  Users, 
  Wallet, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  MessageSquare,
  Trophy,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Target,
  Pencil
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart as ReBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';
import { formatCurrency, formatDate, cn, checkBusinessHours } from '../lib/utils';
import { Invoice, Client, Subscription } from '../types';
import { showToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { AICollectionModal } from '../components/AICollectionModal';

interface DashboardProps {
  subscription: Subscription | null;
  daysRemaining: number;
  userId: string;
  activeModule: 'finance' | 'agenda';
  onPageChange: (page: any) => void;
}

export default function Dashboard({ subscription, daysRemaining, userId, activeModule, onPageChange }: DashboardProps) {
  const [loading, setLoading] = useState(true);
  const [urgentInvoices, setUrgentInvoices] = useState<Invoice[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [selectedInvoiceForAI, setSelectedInvoiceForAI] = useState<Invoice | null>(null);
  const [showAIUpgradeModal, setShowAIUpgradeModal] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [allInvoicesState, setAllInvoicesState] = useState<Invoice[]>([]);
  const [statsData, setStatsData] = useState({
    aReceber: 0,
    recebidoMes: 0,
    emAtraso: 0,
    clientesAtivos: 0,
    countReceber: 0,
    countRecebido: 0,
    countAtraso: 0,
    roi: 0,
    healthScore: 100,
    totalAgendado: 0,
    valorAgendado: 0,
    taxaOcupacao: 0,
    novosClientes: 0
  });

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId]);

  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      console.log('Fetching dashboard data for user:', userId);
      
      const now = new Date();
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
      
      const [invResp, clientResp, allInvoicesResp, upcomingAppointmentsResp, allAppointmentsResp, servicesResp] = await Promise.all([
        supabase
          .from('fa_invoices')
          .select('*')
          .eq('user_id', userId)
          .neq('status', 'paid')
          .order('due_date', { ascending: true })
          .limit(5),
        supabase
          .from('fa_clients')
          .select('*')
          .eq('user_id', userId),
        supabase
          .from('fa_invoices')
          .select('*')
          .eq('user_id', userId),
        supabase
          .from('fa_appointments')
          .select('*, client:fa_clients(name, phone), service:fa_services(price, name, prepayment_percentage)')
          .eq('user_id', userId)
          .gte('date', todayStr)
          .order('date', { ascending: true })
          .order('time', { ascending: true })
          .limit(5),
        supabase
          .from('fa_appointments')
          .select('*, client:fa_clients(name, phone), service:fa_services(price, name, prepayment_percentage)')
          .eq('user_id', userId),
        supabase
          .from('fa_services')
          .select('*')
          .eq('user_id', userId)
      ]);

      // Cache and Fallback Logic (Same as Appointments.tsx)
      const finalServices = servicesResp.data && servicesResp.data.length > 0 
        ? servicesResp.data 
        : JSON.parse(localStorage.getItem(`fa_services_${userId}`) || '[]');
      
      const finalClients = clientResp.data && clientResp.data.length > 0 
        ? clientResp.data 
        : JSON.parse(localStorage.getItem(`fa_clients_${userId}`) || '[]');

      setClients(finalClients);

      // Process Appointments with Fallback
      let appointments: any[] = [];
      if (allAppointmentsResp.data && allAppointmentsResp.data.length > 0) {
        appointments = allAppointmentsResp.data.map((a: any) => ({
          ...a,
          price: a.service?.price || finalServices.find((s: any) => s.id === a.service_id)?.price || 0
        }));
      } else {
        const localApts = localStorage.getItem(`fa_appointments_${userId}`);
        appointments = localApts ? JSON.parse(localApts) : [];
      }
      setAllAppointments(appointments);

      // Process Upcoming
      let upcoming: any[] = [];
      if (upcomingAppointmentsResp.data && upcomingAppointmentsResp.data.length > 0) {
        upcoming = upcomingAppointmentsResp.data.map((a: any) => ({
          ...a,
          price: a.service?.price || finalServices.find((s: any) => s.id === a.service_id)?.price || 0
        }));
      } else {
        upcoming = appointments
          .filter(a => a.date >= todayStr)
          .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
          .slice(0, 5);
      }
      setUpcomingAppointments(upcoming);

      if (invResp.data) {
        const items = invResp.data.map(inv => {
          if (inv.status === 'open' && inv.due_date < todayStr) {
            return { ...inv, status: 'overdue' as const };
          }
          return inv;
        });
        setUrgentInvoices(items);
      }

      // Calculate Finance Stats
      let totalAVencer = 0, totalRecebido = 0, totalAtraso = 0, roi = 0, healthScore = 100;
      let countReceber = 0, countRecebido = 0, countAtraso = 0;
      let aReceber: Invoice[] = [], emAtraso: Invoice[] = [], recebido: Invoice[] = [];

      if (allInvoicesResp.data) {
        const allInvoices = allInvoicesResp.data;
        setAllInvoicesState(allInvoices);
        
        aReceber = allInvoices.filter(i => i.status === 'open' && i.due_date >= todayStr);
        emAtraso = allInvoices.filter(i => i.status === 'overdue' || (i.status === 'open' && i.due_date < todayStr));
        recebido = allInvoices.filter(i => i.status === 'paid');

        totalRecebido = recebido.reduce((acc, i) => acc + i.amount, 0);
        totalAtraso = emAtraso.reduce((acc, i) => acc + i.amount, 0);
        totalAVencer = aReceber.reduce((acc, i) => acc + i.amount, 0);
        
        countReceber = aReceber.length;
        countRecebido = recebido.length;
        countAtraso = emAtraso.length;

        // Health Score
        const totalGeral = totalRecebido + totalAtraso + totalAVencer;
        healthScore = totalGeral > 0 ? Math.max(0, 100 - (totalAtraso / totalGeral) * 100) : 100;

        const planPrices: Record<string, number> = {
          'trial': 0, 'pro': 69.90, 'business': 97.90, 'premium': 147.90
        };
        const currentPlanPrice = planPrices[subscription?.plano || 'trial'] || 69.90;
        roi = currentPlanPrice > 0 ? (totalRecebido / currentPlanPrice) : 0;
      }

      // Agenda Stats from ALL appointments
      const totalAgendado = appointments.filter(a => a.status !== 'cancelled').length;
      const valorAgendado = appointments
        .filter(a => a.status !== 'cancelled')
        .reduce((acc: number, a: any) => acc + (a.price || 0), 0);

      // Productivity Metrics for Agenda
      // Count appointments for today for occupancy
      const todayAppointments = appointments.filter(a => a.date === todayStr && a.status !== 'cancelled').length;
      const occupancyRate = Math.min(100, (todayAppointments / 10) * 100); // 10 is a daily capacity baseline
      const last7Days = new Date();
      last7Days.setDate(now.getDate() - 7);
      const last7DaysStr = last7Days.toISOString().split('T')[0];
      const newClients = finalClients.filter((c: any) => {
        if (!c.created_at) return false;
        return c.created_at.split('T')[0] >= last7DaysStr;
      }).length || 0;

      setStatsData({
        aReceber: totalAVencer,
        recebidoMes: totalRecebido,
        emAtraso: totalAtraso,
        clientesAtivos: finalClients.length,
        countReceber,
        countRecebido,
        countAtraso,
        roi,
        healthScore,
        totalAgendado,
        valorAgendado,
        taxaOcupacao: occupancyRate,
        novosClientes: newClients
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showToast('Erro ao carregar dados do painel', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppMessage = (invoice: Invoice) => {
    const hours = checkBusinessHours();
    if (!hours.isAllowed) {
      showToast(hours.message || '⚠️ LGPD: Cobranças suspensas fora do horário comercial.', 'info');
      return;
    }

    const client = clients.find(c => c.id === invoice.client_id);
    if (!client || !client.phone) {
      showToast('Telefone do cliente não encontrado.', 'error');
      return;
    }

    const phone = client.phone.replace(/\D/g, '');
    const now = new Date();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
    const dueDate = invoice.due_date;
    
    let message = '';
    
    if (invoice.status === 'overdue') {
      message = `Olá, *${invoice.client_name}*! 😊\n\nIdentificamos uma pendência no valor de *${formatCurrency(invoice.amount)}* (vencida em ${formatDate(dueDate)}). 🧐\n\nSabemos que imprevistos acontecem! Poderia nos enviar o comprovante ou nos avisar se houve algum problema? 🙏\n\nFicamos no aguardo para regularizar sua situação. Obrigado! 🚀`;
    } else if (dueDate === today) {
      message = `Oi, *${invoice.client_name}*! 👋\n\nPassando apenas para lembrar que sua cobrança de *${formatCurrency(invoice.amount)}* vence *hoje*! ⚡\n\nQualquer dúvida sobre o pagamento, estou à disposição. Tenha um excelente dia! ✨`;
    } else {
      message = `Olá, *${invoice.client_name}*! 🌟\n\nTudo certinho? Gostaríamos de lembrar que sua fatura de *${formatCurrency(invoice.amount)}* tem vencimento para o dia ${formatDate(dueDate)}. 🗓️\n\nEste é apenas um lembrete amigável para ajudar na sua organização. Boas vendas! 🎯`;
    }

    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleOpenAI = (invoice: Invoice) => {
    const isAdmin = subscription?.email === 'ronilsonaugustomg@gmail.com';
    const canAccess = isAdmin || subscription?.plano === 'business' || subscription?.plano === 'premium';
    if (!canAccess) {
      setShowAIUpgradeModal(true);
      return;
    }
    setSelectedInvoiceForAI(invoice);
  };

  const [isMarkingPaid, setIsMarkingPaid] = useState<string | null>(null);

  const handleMarkAsPaid = async (id: string) => {
    console.log('Marking as paid:', id);
    
    try {
      const { error } = await supabase
        .from('fa_invoices')
        .update({ status: 'paid' })
        .eq('id', id);
      
      if (error) throw error;
      
      showToast('🎉 Baixa realizada com sucesso!', 'success');
      fetchData();
    } catch (err: any) {
      console.error('Error marking as paid:', err);
      showToast('Erro ao dar baixa na cobrança.', 'error');
    } finally {
      setIsMarkingPaid(null);
    }
  };

  const stats = activeModule === 'agenda' ? [
    { id: 'agenda', label: 'Horários Marcados', value: `${statsData.totalAgendado}`, sub: 'Atendimentos confirmados', icon: Clock, color: 'text-brand-primary' },
    { id: 'ocupacao', label: 'Taxa de Ocupação', value: `${statsData.taxaOcupacao.toFixed(0)}%`, sub: 'Eficiência da sua agenda', icon: Target, color: 'text-brand-primary' },
    { id: 'previsto', label: 'Giro Previsto', value: formatCurrency(statsData.valorAgendado), sub: 'Receita potencial', icon: Wallet, color: 'text-emerald-500' },
    { id: 'novos', label: 'Novos Clientes', value: `${statsData.novosClientes}`, sub: 'Últimos 7 dias', icon: Users, color: 'text-brand-primary' },
  ] : [
    { id: 'health', label: 'Saúde da Carteira', value: `${(statsData.healthScore || 0).toFixed(0)}%`, sub: (statsData.healthScore || 0) > 90 ? 'Excelente' : (statsData.healthScore || 0) > 70 ? 'Boa' : 'Crítica', icon: Target, color: (statsData.healthScore || 0) > 70 ? 'text-brand-primary' : 'text-brand-danger' },
    { id: 'receber', label: 'Total a Receber', value: formatCurrency(statsData.aReceber), sub: `${statsData.countReceber} cobranças em aberto`, icon: Wallet, color: 'text-orange-500' },
    { id: 'recebido', label: 'Recebido no Mês', value: formatCurrency(statsData.recebidoMes), sub: `${statsData.countRecebido} cobranças pagas`, icon: CheckCircle2, color: 'text-brand-primary' },
    { id: 'atraso', label: 'Em Atraso', value: formatCurrency(statsData.emAtraso), sub: `${statsData.countAtraso} cobrança(s) vencida(s)`, icon: AlertCircle, color: 'text-brand-danger' },
  ];

  const donutData = [
    { name: 'Recebido', value: statsData.recebidoMes || 0, color: '#10b981' }, // Verde
    { name: 'Em Aberto', value: statsData.aReceber || 0, color: '#f59e0b' }, // Laranja
    { name: 'Em Atraso', value: statsData.emAtraso || 0, color: '#ef4444' }, // Vermelho
  ];

  const generateBarData = () => {
    const monthsNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);

    const last4Months = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last4Months.push({
        name: `${monthsNames[d.getMonth()]}/${d.getFullYear().toString().slice(-2)}`,
        month: d.getMonth(),
        year: d.getFullYear(),
        recebido: 0,
        aberto: 0,
        atrasado: 0
      });
    }

    last4Months.forEach(target => {
      if (activeModule === 'finance') {
        allInvoicesState.forEach(inv => {
          const [y, m] = inv.due_date.split('-').map(Number);
          if (target.month === m - 1 && target.year === y) {
            if (inv.status === 'paid') target.recebido += inv.amount;
            else if (inv.status === 'overdue' || (inv.status === 'open' && inv.due_date < todayStr)) target.atrasado += inv.amount;
            else target.aberto += inv.amount;
          }
        });
      } else {
        allAppointments.forEach(apt => {
          if (!apt.date) return;
          const [y, m] = apt.date.split('-').map(Number);
          if (target.month === m - 1 && target.year === y) {
            // In agenda module, "recebido" will represent count of completed/confirmed appointments
            // or just total appointments if we want a volume chart
            if (apt.status === 'completed' || apt.status === 'confirmed') {
              target.recebido += 1;
            } else if (apt.status === 'scheduled') {
              target.aberto += 1;
            } else if (apt.status === 'cancelled') {
              target.atrasado += 1;
            }
          }
        });
      }
    });

    return last4Months;
  };

  const barData = generateBarData();

  // Remove the redundant simulation useEffect
  // useEffect(() => {
  //   setTimeout(() => setLoading(false), 500);
  // }, []);

  const isAdmin = subscription?.email?.toLowerCase() === 'ronilsonaugustomg@gmail.com' || subscription?.plano === 'premium';
  const isTrial = !isAdmin && (!subscription || subscription.plano === 'trial');

  // Smart Success Center Logic
  const getSmartTip = () => {
    if (isTrial) {
      if (clients.length >= 5) {
        return {
          title: "Limite Atingido",
          message: "Você alcançou o limite de 5 clientes do Plano Trial! Assine o PRO para continuar crescendo sem limites.",
          action: "Fazer Upgrade",
          icon: Trophy,
          link: "plans"
        };
      }
      return {
        title: "Dica de Crescimento",
        message: daysRemaining > 10 
          ? "Comece cadastrando seus primeiros clientes para testar o poder das cobranças automáticas!"
          : "Seu trial está acabando! Garanta seu acesso ilimitado com o Plano Pro hoje mesmo.",
        action: "Ver Planos",
        icon: Zap,
        link: "plans"
      };
    }
    
    if (subscription?.plano === 'pro') {
      return {
        title: "Dica Mestre",
        message: activeModule === 'finance' 
          ? "Sabia que você pode ter a Agenda Azul integrada? No plano BUSINESS você libera o combo completo."
          : "Potencialize seus lucros! No plano BUSINESS você tem a Agenda + Fluxo de Caixa integrados.",
        action: "Ver Combo",
        icon: Sparkles,
        link: "plans"
      };
    }

    return {
      title: "Central de Sucesso",
      message: "Você está no controle total! Como está sendo sua experiência com o " + (activeModule === 'finance' ? "Fluxo Azul" : "Agenda Azul") + "?",
      action: "Dar Feedback",
      icon: MessageSquare,
      link: "whatsapp"
    };
  };

  const smartTip = getSmartTip();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Smart Hub / Engagement Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-brand-card border border-brand-primary/20 rounded-[2rem] p-6 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
             <smartTip.icon className="w-24 h-24 text-brand-primary" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                <span className="text-[10px] font-black text-brand-primary uppercase tracking-[2px]">{smartTip.title}</span>
              </div>
              <h3 className="text-lg sm:text-xl font-display font-black text-brand-text mb-2 leading-tight">
                {smartTip.message}
              </h3>
            </div>
            <button 
              onClick={() => {
                if (smartTip.link === 'plans') onPageChange('plans');
                else window.open(`https://wa.me/5531984132145?text=Olá%20Ronilson,%20estou%20gostando%20muito%20da%20plataforma%20e%20queria%20tirar%20uma%20dúvida!`, '_blank');
              }}
              className="mt-6 w-fit bg-brand-primary text-white text-[10px] font-black px-6 py-2.5 rounded-xl uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-brand-primary/20 flex items-center gap-2"
            >
              {smartTip.action} <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="bg-brand-primary/10 border border-brand-border rounded-[2rem] p-6 flex flex-col justify-center items-center text-center">
          <Trophy className="w-8 h-8 text-brand-primary mb-4" />
          <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1">Seu Progresso</p>
          <p className="text-2xl font-display font-black text-brand-text">{clients.length} / {isTrial ? '5' : '∞'}</p>
          <p className="text-[9px] font-bold text-brand-muted uppercase mt-1">
            {isTrial ? 'Clientes no Trial' : 'Clientes Ativos (Ilimitado)'}
          </p>
          <div className="w-full bg-brand-bg rounded-full h-1 mt-4">
            <div 
              className="bg-brand-primary h-full rounded-full transition-all duration-1000" 
              style={{ width: isTrial ? `${Math.min(100, (clients.length / 5) * 100)}%` : '100%' }}
            />
          </div>
        </div>
      </div>
      {/* Marriage Header: Agenda + Financeiro (Only for Agenda Module) */}
      {activeModule === 'agenda' && (
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1 bg-gradient-to-br from-brand-primary to-blue-600 rounded-[2rem] p-6 text-white shadow-xl shadow-brand-primary/20 relative overflow-hidden group">
            <Sparkles className="absolute right-[-20px] bottom-[-20px] w-40 h-40 opacity-10 group-hover:rotate-12 transition-transform duration-1000" />
            <div className="relative z-10">
              <h2 className="text-2xl font-display font-black uppercase tracking-tight mb-1">Visão Multimodal</h2>
              <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-6">Agenda Azul • Fluxo Azul</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Poder de Agenda</p>
                  <p className="text-xl font-display font-black">{statsData.totalAgendado}</p>
                  <p className="text-[9px] font-bold uppercase text-white/40">Horários Ativos</p>
                </div>
                <div className="bg-black/10 rounded-2xl p-4 backdrop-blur-md border border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Giro Previsto</p>
                  <p className="text-xl font-display font-black">{formatCurrency(statsData.valorAgendado)}</p>
                  <p className="text-[9px] font-bold uppercase text-white/40">Faturamento em Rota</p>
                </div>
              </div>
            </div>
          </div>

          <div className="md:w-1/3 bg-brand-card border border-brand-border rounded-[2rem] p-6 shadow-xl relative overflow-hidden flex flex-col justify-center">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Saúde Financeira</p>
                <h4 className="text-lg font-display font-black text-brand-text">Conversão Alta</h4>
              </div>
            </div>
            <div className="h-2 bg-brand-bg rounded-full overflow-hidden mb-2">
              <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${statsData.healthScore}%` }}
                 className="h-full bg-emerald-500"
              />
            </div>
            <p className="text-[10px] text-brand-muted font-bold uppercase tracking-widest flex justify-between">
              <span>Eficiência de Baixa</span>
              <span>{statsData.healthScore.toFixed(0)}%</span>
            </p>
          </div>
        </div>
      )}

      {activeModule === 'finance' && (
        <header className="mb-0 px-4 sm:px-0">
          <h2 className="text-xl sm:text-4xl font-display font-black text-brand-text uppercase tracking-tight break-words">
            Olá, <span className="text-brand-primary">Cliente</span>! 🚀
          </h2>
          <p className="text-brand-muted text-[10px] sm:text-sm font-bold uppercase tracking-[1px] sm:tracking-[4px] mt-2 italic opacity-60 leading-tight">Sua central estratégica de controle financeiro.</p>
        </header>
      )}

      {/* Trial Banner */}
      {isTrial && (
        <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 sm:gap-6 text-center sm:text-left flex-col sm:flex-row">
            <div className="text-3xl sm:text-4xl font-display font-black text-brand-primary shrink-0">{daysRemaining}</div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm sm:text-base text-brand-text uppercase tracking-widest sm:tracking-normal">Dias de trial restantes</h3>
              <p className="text-[10px] sm:text-sm text-brand-muted leading-tight">Assine o Pro para continuar usando sem limites.</p>
            </div>
          </div>
          <button 
            onClick={() => window.open(`https://wa.me/5531984132145?text=Oi%20Ronilson,%20estou%20no%20meu%20dia%20${14 - daysRemaining}%20do%20Trial%20e%20quero%20assinar%20o%20Pro!`, '_blank')}
            className="w-full md:w-auto bg-brand-primary hover:bg-brand-primary-hover text-white text-[10px] sm:text-sm font-bold px-6 py-3 sm:py-2.5 rounded-xl transition-all shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 uppercase tracking-widest sm:tracking-normal"
          >
            Ver Planos <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Victory Counter / ROI Focus (ONLY FOR FINANCE MODULE) */}
      {activeModule === 'finance' && (
        <div className="bg-brand-card border border-brand-border rounded-2xl sm:rounded-[32px] p-5 sm:p-8 relative overflow-hidden group shadow-2xl shadow-black/30 border-t-2 border-t-brand-primary/20">
          <Trophy className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-48 sm:w-64 h-48 sm:h-64 text-brand-primary opacity-[0.03] group-hover:scale-110 transition-transform duration-1000 group-hover:rotate-12" />
          
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-10 relative z-10 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30 shadow-lg shadow-brand-primary/10 shrink-0">
                <Trophy className="w-5 h-5 text-brand-primary animate-bounce" />
              </div>
              <div>
                <h3 className="text-[9px] sm:text-xs font-black text-brand-primary uppercase tracking-[1px] sm:tracking-[4px] leading-tight mb-1">Impacto Financeiro FluxoAzul</h3>
                <p className="text-[8px] sm:text-[10px] text-brand-muted font-bold uppercase tracking-wider">Provando o valor do seu investimento</p>
              </div>
            </div>

            <div className={cn(
              "px-3 py-1.5 rounded-lg border font-black text-[8px] sm:text-[10px] uppercase tracking-widest flex items-center gap-2 animate-pulse w-fit",
              statsData.roi >= 10 ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
              statsData.roi >= 5 ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
              "bg-brand-primary/10 text-brand-primary border-brand-primary/20"
            )}>
              <div className="w-1.5 h-1.5 rounded-full bg-current" />
              Nível: {statsData.roi >= 10 ? '💎 Diamante' : statsData.roi >= 5 ? '🚀 Elite' : statsData.roi >= 1 ? '🔥 Ouro' : '🌱 Iniciante'}
            </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-10 relative z-10">
            <div className="space-y-1 group/item">
              <p className="text-[10px] font-black text-brand-muted uppercase tracking-[2px] group-hover:text-brand-primary transition-colors">Recuperado este mês</p>
              <p className="text-xl sm:text-3xl font-display font-black text-brand-primary tracking-tight truncate">
                {formatCurrency(statsData.recebidoMes)}
              </p>
              <div className="w-12 h-1 bg-brand-primary/20 rounded-full overflow-hidden">
                <div className="h-full bg-brand-primary w-full animate-progress" />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-black text-brand-muted uppercase tracking-[2px]">Total recuperado geral</p>
              <p className="text-xl sm:text-3xl font-display font-black text-brand-text/90 tracking-tight truncate">
                {formatCurrency(statsData.recebidoMes)}
              </p>
              <p className="text-[8px] font-bold text-green-500 uppercase tracking-widest flex items-center gap-1">
                <ArrowUpRight className="w-2 h-2" /> Lucratividade Total
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-black text-brand-muted uppercase tracking-[2px]">Custo do plano hoje</p>
              <p className="text-xl sm:text-3xl font-display font-bold text-brand-muted/50 tracking-tight">
                {formatCurrency(subscription?.plano === 'pro' ? 69.90 : subscription?.plano === 'business' ? 97.90 : subscription?.plano === 'premium' ? 147.90 : 0)}
              </p>
              <p className="text-[8px] font-bold text-brand-muted uppercase tracking-widest">Investimento Mensal</p>
            </div>

            <div className="space-y-1 bg-white/5 p-4 sm:p-5 rounded-2xl border border-white/5 backdrop-blur-sm">
              <p className="text-[10px] font-black text-brand-primary uppercase tracking-[2px]">Lucro Líquido Real</p>
              <p className="text-xl sm:text-3xl font-display font-black text-brand-text tracking-tight truncate">
                {formatCurrency(Math.max(0, statsData.recebidoMes - (subscription?.plano === 'pro' ? 69.90 : subscription?.plano === 'business' ? 97.90 : subscription?.plano === 'premium' ? 147.90 : 0)))}
              </p>
              <div className="mt-2 text-[8px] font-black text-black bg-brand-primary px-2 py-0.5 rounded-full w-fit uppercase tracking-tighter">
                DINHEIRO NO SEU BOLSO
              </div>
            </div>
          </div>

          <div className="mt-8 sm:mt-10 flex flex-col lg:flex-row items-center justify-between gap-6 border-t border-brand-border pt-8 relative z-10">
            <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="w-full sm:w-auto flex items-center gap-4 bg-brand-primary/10 px-6 py-4 rounded-2xl border border-brand-primary/20 shadow-inner justify-center">
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl sm:text-3xl font-display font-black text-brand-primary">
                    {statsData.roi.toFixed(1)}
                  </p>
                  <span className="text-sm font-black text-brand-primary italic">X</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-brand-primary uppercase tracking-[2px]">Retorno (ROI)</p>
                  <p className="text-[9px] text-brand-muted font-bold uppercase tracking-tight">Software se paga sozinho</p>
                </div>
              </div>
              
              <div className="hidden sm:flex items-center gap-3 bg-brand-bg px-4 py-3 rounded-2xl border border-brand-border h-fit">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                   <ShieldCheck className="w-4 h-4 text-orange-500" />
                </div>
                <p className="text-[9px] font-black text-brand-text uppercase tracking-widest leading-tight">
                  Proteção Anti-Inadimplência<br/>
                  <span className="text-brand-muted">Garantindo Fluxo</span>
                </p>
              </div>
            </div>

            <div className="w-full lg:flex-1 lg:max-w-sm">
              {statsData.roi >= 1 ? (
                <div className="bg-brand-primary text-white p-4 sm:p-5 rounded-2xl sm:rounded-[24px] shadow-2xl shadow-brand-primary/20 relative overflow-hidden group/box">
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover/box:translate-x-[100%] transition-transform duration-1000" />
                  <p className="text-[10px] sm:text-xs font-black uppercase tracking-tight leading-tight mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 fill-current" />
                    SUCESSO CONSTATADO!
                  </p>
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest leading-relaxed opacity-90">
                    O FluxoAzul já recuperou <strong className="text-white underline">{statsData.roi.toFixed(1)}x</strong> o seu custo.
                  </p>
                </div>
              ) : (
                <div className="bg-brand-bg border border-brand-border p-4 sm:p-5 rounded-2xl sm:rounded-[24px] flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-brand-primary/30 border-t-brand-primary animate-spin" />
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-black text-brand-text uppercase tracking-widest">Calculando Ganhos</p>
                    <p className="text-[8px] sm:text-[9px] text-brand-muted uppercase font-bold tracking-tight">Ative o ROI agora</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.id} className="bg-brand-card border border-brand-border rounded-2xl p-6 relative group hover:border-brand-primary/30 transition-all overflow-hidden shadow-xl shadow-black/20">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <stat.icon className={cn("absolute right-4 top-4 w-6 h-6 opacity-10", stat.color)} />
            
            <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className={cn("w-1.5 h-1.5 rounded-full", stat.id === 'atraso' ? 'bg-brand-danger' : 'bg-brand-primary')} />
              {stat.label}
            </p>
            
            <p className={cn("text-3xl font-display font-black", stat.color)}>
              {stat.value}
            </p>
            <p className="text-xs text-brand-muted mt-2">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className={cn("grid grid-cols-1 gap-6", activeModule === 'agenda' ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
      {activeModule === 'agenda' && (
        <div className="bg-brand-card border border-brand-border rounded-2xl p-6 shadow-xl shadow-black/20 flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-bold text-brand-text mb-0 uppercase tracking-wide flex items-center gap-2 text-sm">
                Seus Próximos Horários
              </h3>
              <span className="text-[10px] font-black bg-brand-primary/10 text-brand-primary px-2.5 py-1 rounded-full uppercase tracking-widest">
                Hoje
              </span>
            </div>

            <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
              {upcomingAppointments && upcomingAppointments.length > 0 ? (
                upcomingAppointments.slice(0, 3).map((apt) => (
                  <div key={apt.id} className="p-3 bg-brand-bg/40 border border-brand-border/60 rounded-xl flex items-center justify-between transition-all hover:border-brand-primary/30">
                    <div>
                      <p className="text-xs font-bold text-brand-text truncate max-w-[140px]">{apt.client_name || 'Cliente'}</p>
                      <p className="text-[10px] text-brand-muted font-medium">{apt.service_name || 'Serviço'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-brand-primary">{apt.time}</p>
                      <p className="text-[10px] text-emerald-500 font-bold italic">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(apt.price || 0)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-brand-text/30 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest">Nenhum agendamento para hoje</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-brand-border/40 text-center">
            <p className="text-[10px] text-brand-muted font-medium mb-1">Para gerenciar e ver o calendário completo:</p>
            <span className="inline-block text-[10px] font-black text-brand-primary uppercase tracking-wide bg-brand-primary/5 px-3 py-1.5 rounded-lg border border-brand-primary/20">
              Acesse "Meus Horários" no menu lateral
            </span>
          </div>
        </div>
      )}
            </span>
          </div>
        </div>
      )}
          <div className="bg-brand-card border border-brand-border rounded-2xl p-6 shadow-xl shadow-black/20 flex flex-col">
            <h3 className="font-display font-bold text-brand-text mb-8 uppercase tracking-wide flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-primary" />
              Volume de Agendamentos
            </h3>
            <div className="h-48 sm:h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Confirmados', value: statsData.totalAgendado, color: '#3b82f6' },
                      { name: 'Disponível', value: Math.max(0, 10 - statsData.totalAgendado), color: '#1e293b' }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    dataKey="value"
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="#1e293b" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center mt-4">
              <p className="text-2xl font-display font-black text-brand-primary">{statsData.taxaOcupacao.toFixed(0)}%</p>
              <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Ocupação Diária</p>
            </div>
          </div>
        ) : (
          /* Fluxo de Caixa para Fluxo Azul */
          <div className="bg-brand-card border border-brand-border rounded-2xl p-6 shadow-xl shadow-black/20">
            <h3 className="font-display font-bold text-brand-text mb-8 uppercase tracking-wide">Fluxo de Caixa (Financeiro)</h3>
            <div className="h-[240px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111821', border: '1px solid #1e293b', borderRadius: '12px' }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-2">
                <span className="text-brand-primary text-2xl font-display font-black">{formatCurrency((statsData.recebidoMes || 0) + (statsData.aReceber || 0) + (statsData.emAtraso || 0))}</span>
                <span className="text-brand-muted text-[10px] font-bold uppercase tracking-widest">Giro Total</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2">
               {donutData.map((item) => (
                 <div key={item.name} className="flex items-center justify-between text-xs text-brand-muted">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                   </div>
                   <span className="font-bold text-brand-text">{formatCurrency(item.value)}</span>
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* Cobranças por Mês (Fluxo) ou Produtividade Mensal (Agenda) */}
        <div className="bg-brand-card border border-brand-border rounded-2xl p-6 shadow-xl shadow-black/20">
          <h3 className="font-display font-bold text-brand-text mb-8 uppercase tracking-wide">
            {activeModule === 'agenda' ? 'Produtividade de Atendimentos' : 'Cobranças por Mês'}
          </h3>
          <div className="h-48 sm:h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={barData}>
                <XAxis dataKey="name" stroke="#3D5A68" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                   cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                   contentStyle={{ backgroundColor: '#111821', border: '1px solid #1e293b', borderRadius: '12px' }}
                />
                {activeModule === 'agenda' ? (
                  <Bar dataKey="recebido" name="Finalizados" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                ) : (
                  <>
                    <Bar dataKey="recebido" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="aberto" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="atrasado" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </>
                )}
              </ReBarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center justify-center gap-6">
            {activeModule === 'agenda' ? (
              <div className="flex items-center gap-2 text-xs text-brand-muted font-bold uppercase tracking-widest">
                <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                <span>Volume de Atendimentos</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-xs text-brand-muted font-bold uppercase tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                  <span>Recebido</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-brand-muted font-bold uppercase tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                  <span>Em Aberto</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-brand-muted font-bold uppercase tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
                  <span>Atrasado</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Urgent Invoices Table (ONLY FOR FINANCE MODULE) */}
      {activeModule === 'finance' && (
        <div className="bg-brand-card border border-brand-border rounded-xl sm:rounded-[32px] overflow-hidden shadow-2xl shadow-black/30 border-t-2 border-t-brand-danger/20">
          <header className="p-4 sm:p-8 border-b border-brand-border flex flex-col sm:flex-row items-center justify-between gap-6 bg-gradient-to-r from-brand-danger/5 to-transparent">
            <div className="w-full sm:w-auto flex flex-col gap-1">
              <button 
                onClick={() => {
                  if (urgentInvoices.length > 0) {
                    handleWhatsAppMessage(urgentInvoices[0]);
                  }
                }}
                className="group flex items-center justify-center sm:justify-start gap-3 bg-brand-danger text-white px-6 py-3 rounded-2xl font-black uppercase tracking-[2px] text-xs hover:brightness-110 hover:scale-[1.02] transition-all shadow-xl shadow-brand-danger/20"
              >
                <Zap className="w-4 h-4 fill-current animate-pulse" />
                Cobranças Urgentes
              </button>
              <p className="text-[9px] sm:text-[10px] font-bold text-brand-muted uppercase tracking-widest ml-1 text-center sm:text-left">Foco imediato: {statsData.countAtraso} pendências</p>
            </div>
            
            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-4">
              <span className="w-full sm:w-auto text-center text-[9px] sm:text-[10px] font-black text-brand-muted uppercase tracking-widest bg-brand-bg px-4 py-2 rounded-xl border border-brand-border">
                LGPD: Horário Comercial Ativo
              </span>
              <button 
                onClick={() => onPageChange('reports')}
                className="text-[9px] sm:text-[10px] font-black text-brand-primary hover:text-white uppercase tracking-[2px] transition-colors"
              >
                Ver Relatório Estratégico
              </button>
            </div>
          </header>

          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-brand-border h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-brand-bg/50 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-6 sm:px-8 py-5 text-[9px] sm:text-[10px] font-black text-brand-muted uppercase tracking-[2px] sm:tracking-[3px] bg-brand-bg/50">Devedor</th>
                  <th className="px-6 sm:px-8 py-5 text-[9px] sm:text-[10px] font-black text-brand-muted uppercase tracking-[2px] sm:tracking-[3px] bg-brand-bg/50">Montante</th>
                  <th className="px-4 sm:px-8 py-5 text-[9px] sm:text-[10px] font-black text-brand-muted uppercase tracking-[2px] sm:tracking-[3px] bg-brand-bg/50 hidden sm:table-cell">Limite</th>
                  <th className="px-6 sm:px-8 py-5 text-[9px] sm:text-[10px] font-black text-brand-muted uppercase tracking-[2px] sm:tracking-[3px] bg-brand-bg/50">Status</th>
                  <th className="px-6 sm:px-8 py-5 text-[9px] sm:text-[10px] font-black text-brand-muted uppercase tracking-[2px] sm:tracking-[3px] text-right bg-brand-bg/50">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {urgentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-brand-bg/50 transition-all group">
                    <td className="px-6 sm:px-8 py-6 font-black text-xs sm:text-sm text-brand-text uppercase tracking-tight truncate max-w-[120px] sm:max-w-none">{inv.client_name}</td>
                    <td className="px-6 sm:px-8 py-6 font-display font-black text-brand-danger text-base sm:text-lg">{formatCurrency(inv.amount)}</td>
                    <td className="px-4 sm:px-8 py-6 font-mono text-[10px] sm:text-xs font-bold text-brand-muted hidden sm:table-cell">{formatDate(inv.due_date)}</td>
                    <td className="px-6 sm:px-8 py-6">
                      <span className={cn(
                        "text-[8px] sm:text-[9px] font-black px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border uppercase tracking-widest sm:tracking-[2px] flex items-center gap-1 sm:gap-2 w-fit",
                        inv.status === 'overdue' ? "bg-brand-danger/10 text-brand-danger border-brand-danger/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                      )}>
                        <div className={cn("w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full animate-ping", inv.status === 'overdue' ? 'bg-brand-danger' : 'bg-blue-500')} />
                        {inv.status === 'overdue' ? 'VENCIDO' : 'EM ABERTO'}
                      </span>
                    </td>
                    <td className="px-6 sm:px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 sm:gap-3">
                         <button 
                           onClick={() => handleOpenAI(inv)}
                           className="bg-brand-primary text-white p-2 sm:p-2.5 rounded-lg sm:rounded-xl shadow-lg shadow-brand-primary/20 hover:bg-brand-primary-hover transition-all"
                           title="IA Persuasiva"
                         >
                           <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                         </button>
                         <button 
                          onClick={() => showToast('Para editar, vá até a aba Cobranças.', 'info')}
                          className="bg-brand-bg text-brand-muted p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-brand-border hover:text-brand-primary transition-all"
                          title="Editar Cobrança"
                        >
                          <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                         <button 
                          onClick={() => handleWhatsAppMessage(inv)}
                          className="bg-green-500 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-1 sm:gap-2 shadow-lg shadow-green-500/20 border border-green-400/20"
                        >
                          <MessageSquare className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                          <span className="hidden sm:inline">Cobrar</span>
                        </button>
                        <button 
                          onClick={() => handleMarkAsPaid(inv.id)}
                          className="h-8 sm:h-10 px-3 sm:px-4 rounded-lg sm:rounded-xl bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white transition-all flex items-center gap-2 border border-brand-primary/10 shadow-lg shadow-brand-primary/5 group/btn"
                          title="Marcar como Pago/Dar Baixa"
                        >
                          <CheckCircle2 className="w-4 h-4 sm:w-5 h-5" />
                          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest hidden lg:inline">Dar Baixa</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {urgentInvoices.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-8 py-16 text-center text-brand-muted font-bold uppercase tracking-widest opacity-40">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      Fluxo de recebíveis 100% em dia! 🏆
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Serviços Populares (ONLY FOR AGENDA MODULE) */}
      {activeModule === 'agenda' && (
        <div className="bg-brand-card border border-brand-border rounded-[2rem] p-5 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div>
              <h3 className="text-lg sm:text-xl font-display font-black text-brand-text uppercase tracking-tight">Serviços Campeões</h3>
              <p className="text-[10px] text-brand-muted font-bold uppercase tracking-widest mt-1">Sua base de maior retorno</p>
            </div>
            <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-brand-primary opacity-20" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
             {allAppointments.length > 0 ? (
               Array.from(new Set(allAppointments.map(a => a.service?.name).filter(Boolean)))
                 .map(name => ({
                   name,
                   count: allAppointments.filter(a => a.service?.name === name).length
                 }))
                 .sort((a, b) => b.count - a.count)
                 .slice(0, 4)
                 .map((service, idx) => {
                  return (
                    <div key={idx} className="p-4 sm:p-6 bg-brand-bg/50 border border-brand-border rounded-2xl hover:border-brand-primary/30 transition-all border-l-4 border-l-brand-primary">
                       <p className="text-[9px] font-black text-brand-primary uppercase tracking-widest mb-1">Top {idx + 1}</p>
                       <h4 className="text-xs sm:text-sm font-display font-bold text-brand-text truncate">{service.name}</h4>
                       <p className="text-[9px] text-brand-muted font-bold uppercase mt-2">{service.count} atendimentos</p>
                    </div>
                  );
                })
             ) : (
               <div className="col-span-full py-10 text-center opacity-30">
                  <p className="text-[10px] font-bold uppercase tracking-widest">Sem dados de serviços suficientes ainda</p>
               </div>
             )}
          </div>
        </div>
      )}

      {/* AI Collection Modal */}
      <AICollectionModal 
        invoice={selectedInvoiceForAI} 
        clientPhone={clients.find(c => c.id === selectedInvoiceForAI?.client_id)?.phone}
        isPremium={subscription?.email === 'ronilsonaugustomg@gmail.com' || subscription?.plano === 'premium'}
        onClose={() => setSelectedInvoiceForAI(null)} 
      />

      {/* AI Upgrade Modal */}
      {showAIUpgradeModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div 
             className="absolute inset-0 bg-brand-bg/95 backdrop-blur-xl"
             onClick={() => setShowAIUpgradeModal(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-brand-card border border-brand-primary/30 rounded-[2rem] p-10 shadow-2xl relative z-10 text-center"
          >
            <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-brand-primary/20">
               <Sparkles className="text-brand-primary w-10 h-10" />
            </div>
            <h3 className="text-2xl font-display font-black text-brand-text uppercase tracking-tight mb-4 leading-tight">IA Persuasiva</h3>
            <p className="text-brand-muted text-sm font-sans mb-8 leading-relaxed">
              O recurso de cobrança inteligente com Inteligência Artificial persuasiva está disponível nos planos <strong>BUSINESS</strong> e <strong>PREMIUM</strong>.
            </p>
            <div className="space-y-3">
               <button 
                onClick={() => window.open(`https://wa.me/5531984132145?text=Oi%20Ronilson,%20quero%20o%20plano%20Business%20para%20usar%20a%20IA%20Persuasiva!%20Meu%20email:%20${subscription?.email}`, '_blank')}
                className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-brand-primary/20 uppercase text-sm tracking-widest"
              >
                Upgrade p/ Business R$ 97,90
              </button>
              <button 
                onClick={() => setShowAIUpgradeModal(false)}
                className="w-full py-4 rounded-2xl font-bold text-brand-muted hover:bg-brand-bg transition-all uppercase text-xs tracking-widest"
              >
                Talvez mais tarde
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
