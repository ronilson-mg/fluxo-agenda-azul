import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  History, 
  HelpCircle, 
  MessageSquare, 
  Send, 
  Copy, 
  Check, 
  Users,
  Search,
  Filter,
  Eye,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  X,
  Brain,
  Lightbulb,
  CalendarCheck,
  Gift
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line
} from 'recharts';
import { supabase } from '../lib/supabase';
import { Invoice } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { showToast } from '../lib/toast';
import AICollectionModal from '../components/AICollectionModal';
import QuickReceiptGenerator from '../components/QuickReceiptGenerator';

interface DashboardProps {
  subscription: any;
  daysRemaining: number | null;
  userId: string;
  activeModule: 'finance' | 'agenda';
  onPageChange: (page: any, extra?: any) => void;
  onOpenReferrals?: () => void;
}

export default function Dashboard({ subscription, daysRemaining, userId, activeModule, onPageChange, onOpenReferrals }: DashboardProps) {
  const [loading, setLoading] = useState(true);
  const [urgentInvoices, setUrgentInvoices] = useState<Invoice[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    collected: 0,
    pending: 0,
    overdue: 0,
    totalCount: 0,
    monthlyComparison: [] as any[],
    statusDistribution: [] as any[]
  });
  const [selectedInvoiceForAI, setSelectedInvoiceForAI] = useState<Invoice | null>(null);

  useEffect(() => {
    if (userId) {
      if (activeModule === 'finance') {
        fetchFinanceData();
      } else {
        fetchAgendaData();
      }
    }
  }, [userId, activeModule]);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      if (data) {
        const invoices = data as Invoice[];
        
        const now = new Date();
        const urgent = invoices
          .filter(inv => inv.status === 'pending' && new Date(inv.due_date) < now)
          .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
          .slice(0, 3);
          
        setUrgentInvoices(urgent);

        const collected = invoices
          .filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + inv.amount, 0);

        const pending = invoices
          .filter(inv => inv.status === 'pending')
          .reduce((sum, inv) => sum + inv.amount, 0);

        const overdue = invoices
          .filter(inv => inv.status === 'overdue')
          .reduce((sum, inv) => sum + inv.amount, 0);

        const paidCount = invoices.filter(i => i.status === 'paid').length;
        const pendingCount = invoices.filter(i => i.status === 'pending').length;
        const overdueCount = invoices.filter(i => i.status === 'overdue').length;

        const monthlyComparison = [
          { name: 'Jan', Cobrado: collected * 0.7, Pendente: pending * 0.8 },
          { name: 'Fev', Cobrado: collected * 0.8, Pendente: pending * 0.9 },
          { name: 'Mar', Cobrado: collected * 0.9, Pendente: pending * 0.55 },
          { name: 'Abr', Cobrado: collected * 0.95, Pendente: pending * 0.4 },
          { name: 'Mai', Cobrado: collected, Pendente: pending },
        ];

        const statusDistribution = [
          { name: 'Pago', value: paidCount || 1, color: '#10B981' },
          { name: 'Pendente', value: pendingCount || 1, color: '#F59E0B' },
          { name: 'Atrasado', value: overdueCount || 1, color: '#EF4444' }
        ];

        setStats({
          collected,
          pending,
          overdue,
          totalCount: invoices.length,
          monthlyComparison,
          statusDistribution
        });
      }
    } catch (err) {
      console.error('Error fetching dashboard finance indicators:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgendaData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          client:client_id (
            name,
            phone
          )
        `)
        .eq('user_id', userId)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;

      if (data) {
        setUpcomingAppointments(data.slice(0, 4));
        const totalCount = data.length;
        const pendingCount = data.filter((a: any) => a.status === 'pending').length;
        const confirmedCount = data.filter((a: any) => a.status === 'confirmed').length;
        const cancelledCount = data.filter((a: any) => a.status === 'cancelled').length;

        const collected = data
          .filter((a: any) => a.payment_status === 'paid')
          .reduce((sum: number, a: any) => sum + (a.price || 0), 0);

        const pending = data
          .filter((a: any) => a.payment_status === 'pending')
          .reduce((sum: number, a: any) => sum + (a.price || 0), 0);

        const statusDistribution = [
          { name: 'Confirmado', value: confirmedCount || 1, color: '#10B981' },
          { name: 'Pendente', value: pendingCount || 1, color: '#F59E0B' },
          { name: 'Cancelado', value: cancelledCount || 1, color: '#EF4444' }
        ];

        const monthlyComparison = [
          { name: 'Jan', Cobrado: collected * 0.6, Pendente: pending * 0.4 },
          { name: 'Fev', Cobrado: collected * 0.8, Pendente: pending * 0.5 },
          { name: 'Mar', Cobrado: collected * 0.7, Pendente: pending * 0.8 },
          { name: 'Abr', Cobrado: collected * 0.9, Pendente: pending * 0.3 },
          { name: 'Mai', Cobrado: collected, Pendente: pending },
        ];

        setStats({
          collected,
          pending,
          overdue: 0,
          totalCount,
          monthlyComparison,
          statusDistribution
        });
      }
    } catch (err) {
      console.error('Error fetching dashboard agenda indicators:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      {/* Top Welcome header banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-black tracking-widest text-brand-primary">MEI Performance</span>
          <h2 className="text-2xl sm:text-3xl font-display font-black text-brand-text uppercase tracking-tight mt-1.5 leading-none">
            {activeModule === 'finance' ? 'Indicadores Financeiros' : 'Gestão de Atendimentos'}
          </h2>
          <p className="text-xs text-brand-muted mt-2">Visão consolidada para gerenciar recebíveis e organizar sua rotina de negócios.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onPageChange(activeModule === 'finance' ? 'invoices' : 'appointments')}
            className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-hover hover:scale-[1.01] active:scale-[0.99] text-white text-[10px] font-black uppercase tracking-wider px-5 py-3.5 rounded-2xl shadow-lg shadow-brand-primary/20 transition-all cursor-pointer border border-transparent"
          >
            <Plus className="w-4 h-4" />
            {activeModule === 'finance' ? 'Nova Cobrança' : 'Novo Agendamento'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[10px] uppercase font-black tracking-widest text-brand-muted">Processando Indicadores...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-brand-card border border-brand-border p-6 rounded-[2rem] flex items-center gap-5 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-brand-muted block">Valores Recebidos</span>
              <span className="text-xl sm:text-2xl font-display font-black text-emerald-500 block mt-1 leading-none">
                {formatCurrency(stats.collected)}
              </span>
            </div>
          </div>
          
          <div className="bg-brand-card border border-brand-border p-6 rounded-[2rem] flex items-center gap-5 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-brand-muted block">Valores Pendentes</span>
              <span className="text-xl sm:text-2xl font-display font-black text-amber-500 block mt-1 leading-none">
                {formatCurrency(stats.pending)}
              </span>
            </div>
          </div>

          <div className="bg-brand-card border border-brand-border p-6 rounded-[2rem] flex items-center gap-5 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-brand-muted block">
                {activeModule === 'finance' ? 'Valores Vencidos' : 'Total de Cadastros'}
              </span>
              <span className="text-xl sm:text-2xl font-display font-black text-rose-500 block mt-1 leading-none">
                {activeModule === 'finance' ? formatCurrency(stats.overdue) : stats.totalCount}
              </span>
            </div>
          </div>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Charts container */}
          <div className="lg:col-span-2 bg-brand-card border border-brand-border p-6 sm:p-8 rounded-[2rem] shadow-sm flex flex-col min-h-[354px]">
            <h3 className="text-sm font-black text-brand-text uppercase tracking-wider mb-4">Progresso Mensal Estimado</h3>
            <div className="flex-1 min-h-[250px] w-full">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.monthlyComparison}>
                  <XAxis dataKey="name" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1E293B', 
                      borderColor: '#334155', 
                      borderRadius: '12px',
                      color: '#F8FAFC' 
                    }} 
                  />
                  <Bar dataKey="Cobrado" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Pendente" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Stats Distribution chart */}
          <div className="bg-brand-card border border-brand-border p-6 sm:p-8 rounded-[2rem] shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-black text-brand-text uppercase tracking-wider mb-4">Fatias de Status</h3>
              <div className="h-44 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              {stats.statusDistribution.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-2 text-brand-muted uppercase text-[10px] tracking-wider">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <span className="text-brand-text">{item.value} registros</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Highlight Card: Indique e Ganhe */}
      <div className="mb-12 bg-gradient-to-r from-brand-primary/15 via-brand-primary/5 to-transparent border border-brand-primary/20 rounded-[2rem] p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
          <Gift className="w-40 h-40 text-brand-primary" />
        </div>
        <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
          <div className="w-14 h-14 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl flex items-center justify-center text-2xl shrink-0 group-hover:rotate-12 transition-transform">
            🎁
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-display font-black text-brand-text uppercase tracking-wider mb-1 flex items-center gap-2 justify-center md:justify-start">
              Impulsione o Fluxo Azul
            </h3>
            <p className="text-xs text-brand-muted font-medium max-w-xl leading-relaxed">
              Indique o Fluxo Azul ou Agenda Azul para outros MEIs e ganhe <strong className="text-brand-primary font-bold">30 dias de acesso Elite</strong> adicionais por indicação cadastrada.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenReferrals}
          className="w-full md:w-auto bg-brand-primary hover:bg-brand-primary-hover hover:scale-[1.02] active:scale-[0.99] hover:shadow-brand-primary/30 text-white text-[11px] font-black px-8 py-4 rounded-2xl uppercase tracking-widest transition-all shadow-lg shadow-brand-primary/25 shrink-0 cursor-pointer border border-transparent"
        >
          🎁 Indicar Amigos
        </button>
      </div>

      {/* AI Collection Modal */}
      <AICollectionModal 
        invoice={selectedInvoiceForAI} 
        isOpen={!!selectedInvoiceForAI} 
        onClose={() => setSelectedInvoiceForAI(null)} 
      />
    </div>
  );
}
