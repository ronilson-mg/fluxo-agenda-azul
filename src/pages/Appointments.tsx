import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Subscription } from '../types';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  MessageSquare,
  Search,
  Filter,
  MoreVertical,
  QrCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { showToast } from '../lib/toast';

interface Appointment {
  id: string;
  client_name: string;
  service_name: string;
  date: string;
  time: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  price: number;
  prepayment_amount: number;
}

export default function Appointments({ subscription, userId }: { subscription: Subscription | null, userId: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for initial presentation
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppointments([
        { id: '1', client_name: 'Gabriel Silva', service_name: 'Corte de Cabelo + Barba', date: '2024-05-10', time: '14:30', status: 'confirmed', price: 80, prepayment_amount: 40 },
        { id: '2', client_name: 'Mariana Costa', service_name: 'Consultoria Estratégica', date: '2024-05-10', time: '16:00', status: 'scheduled', price: 250, prepayment_amount: 50 },
        { id: '3', client_name: 'Roberto Oliveira', service_name: 'Ajuste de Fluxo', date: '2024-05-11', time: '09:00', status: 'completed', price: 150, prepayment_amount: 0 },
      ]);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const getStatusInfo = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed': return { label: 'Confirmado', color: 'text-brand-primary', bg: 'bg-brand-primary/10', icon: CheckCircle2 };
      case 'completed': return { label: 'Concluído', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: CheckCircle2 };
      case 'cancelled': return { label: 'Cancelado', color: 'text-brand-danger', bg: 'bg-brand-danger/10', icon: XCircle };
      default: return { label: 'Pendente', color: 'text-orange-500', bg: 'bg-orange-500/10', icon: Clock };
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-20"
    >
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-display font-black text-brand-text uppercase tracking-tight">Meus Agendamentos</h2>
          <p className="text-brand-muted text-sm italic">Organize seus atendimentos e garanta seus recebimentos.</p>
        </div>
        <button className="bg-brand-primary hover:bg-brand-primary-hover text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-brand-primary/20 transition-all">
          <Plus className="w-4 h-4" /> Novo Horário
        </button>
      </header>

      {/* Stats Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-brand-card border border-brand-border p-6 rounded-2xl">
          <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-1">Hoje</p>
          <p className="text-2xl font-display font-black text-brand-text">4 Agendados</p>
        </div>
        <div className="bg-brand-card border border-brand-border p-6 rounded-2xl">
          <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-1">Adiantamentos</p>
          <p className="text-2xl font-display font-black text-green-500">R$ 380,00</p>
        </div>
        <div className="bg-brand-card border border-brand-border p-6 rounded-2xl">
          <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-1">A Confirmar</p>
          <p className="text-2xl font-display font-black text-orange-500">2 Pendentes</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-brand-card border border-brand-border p-4 rounded-2xl">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
          <input 
            type="text"
            placeholder="Buscar por cliente ou serviço..."
            className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 pl-10 pr-4 text-sm focus:border-brand-primary/50 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button className="flex-1 sm:flex-none px-4 py-3 bg-brand-bg border border-brand-border rounded-xl text-xs font-bold text-brand-text flex items-center justify-center gap-2">
            <Filter className="w-3.5 h-3.5" /> Filtros
          </button>
          <button className="flex-1 sm:flex-none px-4 py-3 bg-brand-bg border border-brand-border rounded-xl text-xs font-bold text-brand-text flex items-center justify-center gap-2">
            <CalendarIcon className="w-3.5 h-3.5" /> Esta Semana
          </button>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-brand-border bg-brand-bg/50">
                <th className="px-6 py-4 text-[10px] font-bold text-brand-muted uppercase tracking-widest">Horário</th>
                <th className="px-6 py-4 text-[10px] font-bold text-brand-muted uppercase tracking-widest">Cliente / Serviço</th>
                <th className="px-6 py-4 text-[10px] font-bold text-brand-muted uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-brand-muted uppercase tracking-widest text-right">Valor / Adiant.</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-brand-muted animate-pulse">Carregando seus horários...</td></tr>
              ) : appointments.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-brand-muted">Nenhum agendamento encontrado.</td></tr>
              ) : (
                appointments.map(apt => {
                  const status = getStatusInfo(apt.status);
                  const StatusIcon = status.icon;
                  return (
                    <tr key={apt.id} className="hover:bg-brand-bg/30 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="font-display font-black text-brand-text text-sm">{apt.time}</span>
                          <span className="text-[10px] text-brand-muted uppercase font-bold">{new Date(apt.date).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-brand-text text-sm uppercase tracking-tight">{apt.client_name}</span>
                          <span className="text-xs text-brand-primary font-medium">{apt.service_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          status.color, status.bg, "border-current/10"
                        )}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-display font-black text-brand-text text-sm">R$ {apt.price.toFixed(2)}</span>
                          {apt.prepayment_amount > 0 ? (
                            <span className="text-[9px] text-green-500 font-bold bg-green-500/10 px-1.5 rounded flex items-center gap-1">
                              SINAL R$ {apt.prepayment_amount.toFixed(2)} ✓
                            </span>
                          ) : (
                            <span className="text-[9px] text-brand-muted font-bold">SEM SINAL</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 text-brand-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all" title="WhatsApp">
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-brand-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all" title="Pagamento">
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-brand-muted hover:text-brand-text hover:bg-brand-bg rounded-lg transition-all">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
