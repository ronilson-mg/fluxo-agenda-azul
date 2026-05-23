import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  MessageSquare,
  CalendarDays
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useBusiness } from '@/providers/BusinessProvider';
import { 
  BarChart as ReBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion } from 'framer-motion';
import { AICollectionModal } from '@/components/modals/AICollectionModal';

interface DashboardStats {
  totalInvoiced: number;
  totalReceived: number;
  totalPending: number;
  totalOverdue: number;
  roi: number;
  activeClientsCount: number;
  totalAppointmentsCount: number;
  growthRate: number;
}

interface Invoice {
  id: string;
  client_id: string;
  client_name?: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  created_at: string;
  client?: {
    name: string;
    phone?: string;
    email?: string;
  };
}

interface Appointment {
  id: string;
  client_id: string;
  service_id: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  price: number;
  client?: {
    name: string;
  };
  service?: {
    name: string;
  };
  client_name?: string;
  service_name?: string;
}

export function Dashboard() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const [activeModule, setActiveModule] = useState<'finance' | 'agenda'>('finance');
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceForAI, setSelectedInvoiceForAI] = useState<Invoice | null>(null);
  
  const [statsData, setStatsData] = useState<DashboardStats>({
    totalInvoiced: 0,
    totalReceived: 0,
    totalPending: 0,
    totalOverdue: 0,
    roi: 0,
    activeClientsCount: 0,
    totalAppointmentsCount: 0,
    growthRate: 0
  });

  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [barData, setBarData] = useState<any[]>([]);
  const [donutData, setDonutData] = useState<any[]>([]);

  useEffect(() => {
    if (business?.id) {
      fetchDashboardData();
    }
  }, [business?.id, activeModule]);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      
      const { data: invoicesData, error: invError } = await supabase
        .from('invoices')
        .select(`
          id, client_id, amount, due_date, status, created_at,
          client:clients(name, phone, email)
        `)
        .eq('business_id', business.id);

      if (invError) throw invError;

      const { data: appData, error: appError } = await supabase
        .from('appointments')
        .select(`
          id, client_id, service_id, date, time, status, price,
          client:clients(name),
          service:services(name)
        `)
        .eq('business_id', business.id);

      if (appError) throw appError;

      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id);

      const invoices: Invoice[] = invoicesData || [];
      let received = 0;
      let pending = 0;
      let overdue = 0;
      let total = 0;

      const todayStr = new Date().toISOString().split('T')[0];

      invoices.forEach(inv => {
        const amt = Number(inv.amount || 0);
        total += amt;
        
        if (inv.status === 'paid') {
          received += amt;
        } else if (inv.status === 'pending') {
          if (inv.due_date < todayStr) {
            overdue += amt;
          } else {
            pending += amt;
          }
        } else if (inv.status === 'overdue') {
          overdue += amt;
        }
      });

      const calculatedRoi = received > 0 ? (received / 49.90) : 0;

      const appointments: Appointment[] = appData || [];
      const upcoming = appointments
        .filter(app => app.status !== 'cancelled')
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

      setUpcomingAppointments(upcoming);

      setStatsData({
        totalInvoiced: total,
        totalReceived: received,
        totalPending: pending,
        totalOverdue: overdue,
        roi: calculatedRoi,
        activeClientsCount: clientsCount || 0,
        totalAppointmentsCount: appointments.length,
        growthRate: 12.5
      });

      const sortedInvoices = [...invoices].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRecentInvoices(sortedInvoices.slice(0, 5));

      if (activeModule === 'finance') {
        setBarData([
          { name: 'Jan', recebido: received * 0.4, aberto: pending * 0.3, atrasado: overdue * 0.2 },
          { name: 'Fev', recebido: received * 0.6, aberto: pending * 0.5, atrasado: overdue * 0.4 },
          { name: 'Mar', recebido: received * 0.8, aberto: pending * 0.2, atrasado: overdue * 0.1 },
          { name: 'Abr', recebido: received, aberto: pending, atrasado: overdue },
        ]);
      } else {
        setBarData([
          { name: 'Seg', concluídos: 4, agendados: 2, cancelados: 0 },
          { name: 'Ter', concluídos: 6, agendados: 3, cancelados: 1 },
          { name: 'Qua', concluídos: 5, agendados: 5, cancelados: 0 },
          { name: 'Qui', concluídos: 7, agendados: 1, cancelados: 2 },
          { name: 'Sex', concluídos: 8, agendados: 4, cancelados: 0 },
        ]);
      }

      setDonutData([
        { name: 'Recebido', value: received, color: '#10b981' },
        { name: 'Em Aberto', value: pending, color: '#f59e0b' },
        { name: 'Atrasado', value: overdue, color: '#ef4444' },
      ]);

    } catch (error) {
      console.error('Erro ao processar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  const stats = activeModule === 'finance' ? [
    { id: 'received', label: 'Total Recebido', value: formatCurrency(statsData.totalReceived), icon: CheckCircle2, color: 'text-emerald-500', sub: 'Valores confirmados' },
    { id: 'pending', label: 'A Receber (Previsão)', value: formatCurrency(statsData.totalPending), icon: Clock, color: 'text-orange-500', sub: 'Dentro do prazo' },
    { id: 'overdue', label: 'Inadimplência Ativa', value: formatCurrency(statsData.totalOverdue), icon: AlertCircle, color: 'text-rose-500', sub: 'Contas atrasadas' },
    { id: 'roi', label: 'Retorno sobre Investimento', value: `${statsData.roi.toFixed(1)}x`, icon: TrendingUp, color: 'text-brand-primary', sub: 'Multiplicador do plano' }
  ] : [
    { id: 'appointments', label: 'Total de Agendamentos', value: statsData.totalAppointmentsCount.toString(), icon: Calendar, color: 'text-brand-primary', sub: 'Histórico completo' },
    { id: 'clients', label: 'Clientes Ativos', value: statsData.activeClientsCount.toString(), icon: Users, color: 'text-blue-500', sub: 'Cadastrados na base' },
    { id: 'growth', label: 'Taxa de Ocupação', value: `${statsData.growthRate}%`, icon: ArrowUpRight, color: 'text-emerald-500', sub: 'Média de slots cheios' },
    { id: 'faturamento_agenda', label: 'Previsão de Serviços', value: formatCurrency(statsData.totalInvoiced), icon: DollarSign, color: 'text-orange-500', sub: 'Total bruto calculado' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 sm:space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-brand-border pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-brand-text uppercase tracking-tight flex items-center gap-2">
            Dashboard Central
          </h1>
          <p className="text-xs sm:text-sm text-brand-muted font-medium uppercase tracking-wider mt-0.5">
            {business?.name || 'Sua Empresa'} • Gerenciamento Operacional
          </p>
        </div>

        <div className="flex bg-brand-card border border-brand-border p-1 rounded-xl self-start sm:self-auto shadow-inner">
          <button
            onClick={() => setActiveModule('finance')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
              activeModule === 'finance' ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/25" : "text-brand-muted hover:text-brand-text"
            )}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Financeiro / Cobranças
          </button>
          <button
            onClick={() => setActiveModule('agenda')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
              activeModule === 'agenda' ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/25" : "text-brand-muted hover:text-brand-text"
            )}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Agenda / Serviços
          </button>
        </div>
      </div>

      {activeModule === 'finance' && statsData.totalOverdue > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-brand-card to-brand-card border border-amber-500/20 rounded-2xl sm:rounded-[24px] p-4 sm:p-6 shadow-xl shadow-black/10 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 relative z-10">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl sm:rounded-2xl text-amber-500 shrink-0">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black bg-amber-500 text-black px-2 py-0.5 rounded uppercase tracking-widest">IA Ativa</span>
                  <h2 className="font-display font-black text-brand-text text-base sm:text-lg uppercase tracking-wide">Plano de Ação Inteligente</h2>
                </div>
                <p className="text-xs sm:text-sm text-brand-muted font-medium max-w-2xl leading-relaxed">
                  Identificamos <strong className="text-amber-500">{formatCurrency(statsData.totalOverdue)}</strong> em faturas atrasadas. Você pode acionar nosso assistente para gerar mensagens personalizadas de cobrança via WhatsApp.
                </p>
              </div>
            </div>
            <div className="w-full lg:flex-1 lg:max-w-sm">
              {statsData.roi >= 1 ? (
                <div className="bg-brand-primary text-white p-4 sm:p-5 rounded-2xl shadow-2xl shadow-brand-primary/20">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Status de Operação</p>
                  <p className="text-sm font-bold leading-tight">Sua plataforma já se pagou e está gerando lucro real!</p>
                </div>
              ) : (
                <div className="bg-brand-card border border-brand-border p-4 sm:p-5 rounded-2xl flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Aguardando primeiras baixas</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.id} className="bg-brand-card border border-brand-border rounded-2xl p-6 shadow-lg relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">{stat.label}</p>
              <stat.icon className={cn("w-5 h-5 opacity-70", stat.color)} />
            </div>
            <p className="text-2xl sm:text-3xl font-display font-black text-brand-text tracking-tight truncate">{stat.value}</p>
            <p className="text-[10px] text-brand-muted font-medium mt-1 uppercase tracking-tight">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {activeModule === 'agenda' && (
          <div className="bg-brand-card border border-brand-border rounded-2xl p-6 shadow-xl flex flex-col justify-between min-h-[380px]">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display font-bold text-brand-text mb-0 uppercase tracking-wide flex items-center gap-2 text-sm">
                  Seus Próximos Horários
                </h3>
                <span className="text-[10px] font-black bg-brand-primary/10 text-brand-primary px-2.5 py-1 rounded-full uppercase tracking-widest">
                  Hoje
                </span>
              </div>
              <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
                {upcomingAppointments && upcomingAppointments.length > 0 ? (
                  upcomingAppointments.slice(0, 3).map((apt) => (
                    <div key={apt.id} className="p-3 bg-brand-bg/40 border border-brand-border/60 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-brand-text truncate max-w-[140px]">{apt.client?.name || apt.client_name || 'Cliente'}</p>
                        <p className="text-[10px] text-brand-muted font-medium">{apt.service?.name || apt.service_name || 'Serviço'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-brand-primary">{apt.time}</p>
                        <p className="text-[10px] text-emerald-500 font-bold">{formatCurrency(apt.price || 0)}</p>
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
              <span className="inline-block text-[10px] font-black text-brand-primary uppercase tracking-wide bg-brand-primary/5 px-3 py-1.5 rounded-lg border border-brand-primary/20">
                Acesse "Meus Horários" no menu lateral
              </span>
            </div>
          </div>
        )}

        <div className={cn("bg-brand-card border border-brand-border rounded-2xl p-6 shadow-xl", activeModule === 'agenda' ? "lg:col-span-2" : "lg:col-span-2")}>
          <h3 className="font-display font-bold text-brand-text mb-6 uppercase tracking-wide flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-brand-primary" />
            {activeModule === 'finance' ? 'Histórico de Faturamento' : 'Volume de Atendimentos'}
          </h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                {activeModule === 'finance' ? (
                  <>
                    <Bar dataKey="recebido" name="Recebido" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="aberto" name="Em Aberto" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="atrasado" name="Em Atraso" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </>
                ) : (
                  <>
                    <Bar dataKey="concluídos" name="Concluídos" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="agendados" name="Agendados" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cancelados" name="Cancelados" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </>
                )}
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {activeModule === 'finance' && (
          <div className="bg-brand-card border border-brand-border rounded-2xl p-6 shadow-xl">
            <h3 className="font-display font-bold text-brand-text mb-6 uppercase tracking-wide text-sm">Distribuição Mensal</h3>
            <div className="h-[240px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value">
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mt-2">
              {donutData.map((item) => (
                <div key={item.name} className="space-y-0.5">
                  <p className="text-[9px] font-bold text-brand-muted uppercase tracking-tight">{item.name}</p>
                  <p className="text-xs font-black text-brand-text truncate">{formatCurrency(item.value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {activeModule === 'finance' && (
        <div className="bg-brand-card border border-brand-border rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-brand-border">
            <h3 className="font-display font-bold text-brand-text text-base uppercase tracking-wide">Fluxo de Cobranças Recentes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brand-border bg-brand-bg/50">
                  <th className="p-4 text-[10px] font-black text-brand-muted uppercase tracking-widest">Cliente</th>
                  <th className="p-4 text-[10px] font-black text-brand-muted uppercase tracking-widest">Vencimento</th>
                  <th className="p-4 text-[10px] font-black text-brand-muted uppercase tracking-widest">Valor Bruto</th>
                  <th className="p-4 text-[10px] font-black text-brand-muted uppercase tracking-widest">Status</th>
                  <th className="p-4 text-[10px] font-black text-brand-muted uppercase tracking-widest text-right">Régua de IA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {recentInvoices.length > 0 ? (
                  recentInvoices.map((invoice) => {
                    const isOverdue = invoice.status === 'overdue' || (invoice.status === 'pending' && invoice.due_date < new Date().toISOString().split('T')[0]);
                    return (
                      <tr key={invoice.id} className="hover:bg-brand-bg/30 transition-colors group">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="text-xs font-bold text-brand-text group-hover:text-brand-primary transition-colors">
                                {invoice.client?.name || 'Cliente Não Identificado'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-xs font-medium text-brand-text">
                          {new Date(invoice.due_date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-4 text-xs font-black text-brand-text">
                          {formatCurrency(invoice.amount)}
                        </td>
                        <td className="p-4">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            invoice.status === 'paid' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                            invoice.status === 'pending' && !isOverdue && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                            isOverdue && "bg-rose-500/10 text-rose-400 border-rose-500/20",
                            invoice.status === 'cancelled' && "bg-brand-bg text-brand-muted border-brand-border"
                          )}>
                            {isOverdue ? 'Atrasada' : invoice.status === 'paid' ? 'Paga' : invoice.status === 'cancelled' ? 'Cancelada' : 'Pendente'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {isOverdue ? (
                            <button
                              onClick={() => setSelectedInvoiceForAI(invoice)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-400"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              Cobrar com IA
                            </button>
                          ) : (
                            <span className="text-[10px] text-brand-muted font-medium uppercase tracking-wider italic">Régua Inativa</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-brand-muted text-xs font-medium uppercase tracking-wider">
                      Nenhuma movimentação encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedInvoiceForAI && (
        <AICollectionModal
          isOpen={!!selectedInvoiceForAI}
          onClose={() => setSelectedInvoiceForAI(null)}
          invoice={selectedInvoiceForAI}
        />
      )}
    </motion.div>
  );
}
