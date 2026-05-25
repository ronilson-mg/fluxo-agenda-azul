import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Subscription, Client } from '../types';
import { 
  Users, 
  ShieldCheck, 
  Clock, 
  Search, 
  Plus, 
  ExternalLink,
  Mail,
  UserCheck,
  Rocket
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn, formatDate } from '../lib/utils';
import { showToast } from '../lib/toast';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'users' | 'clients'>('users');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isAdminVerified, setIsAdminVerified] = useState<boolean | null>(null);
  const [renewalMonths, setRenewalMonths] = useState<Record<string, number>>({});

  // Dynamic session email validation to prevent any state injection bypass
  useEffect(() => {
    const runVerification = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const activeEmail = session?.user?.email?.toLowerCase();
        if (activeEmail === 'ronilsonaugustomg@gmail.com') {
          setIsAdminVerified(true);
        } else {
          setIsAdminVerified(false);
        }
      } catch (err) {
        setIsAdminVerified(false);
      }
    };
    runVerification();
  }, []);

  const fetchData = async () => {
    if (isAdminVerified !== true) return;
    setLoading(true);
    if (activeTab === 'users') {
      // BUG 1 FIX: Duplicating users
      const { data, error } = await supabase
        .from('fa_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        // Remove duplicates by email (or user_id)
        const unique = [...new Map(data.map(item => [item.email, item])).values()];
        const normalized = unique.map((sub: any) => ({
          ...sub,
          data_expiracao_agenda: sub.data_expiracao_agenda || sub.data_expiracao
        }));
        setSubscriptions(normalized as Subscription[]);
      }
    } else {
      // BUG 2 FIX: "All Clients" tab with owner info
      const { data, error } = await supabase
        .from('fa_clients')
        .select('*, owner:fa_subscriptions!inner(email, nome)')
        .order('created_at', { ascending: false });
      
      if (!error && data) setAllClients(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdminVerified === true) {
      fetchData();
    }
  }, [activeTab, isAdminVerified]);

  const addMonths = async (subId: string, months: number) => {
    setActionLoading(subId);
    try {
      const { data: sub, error: fetchError } = await supabase.from('fa_subscriptions').select('*').eq('id', subId).single();
      if (fetchError || !sub) {
        showToast('Erro ao carregar dados do usuário', 'error');
        return;
      }

      const updateData: any = { 
        updated_at: new Date().toISOString(),
        ativo: true
      };

      const calcNewExp = (currentExpStr?: string | null) => {
        if (!currentExpStr || currentExpStr === 'Nunca Ativado') {
          const d = new Date();
          d.setMonth(d.getMonth() + months);
          return d.toISOString();
        }
        const currentExp = new Date(currentExpStr);
        if (isNaN(currentExp.getTime())) {
          const d = new Date();
          d.setMonth(d.getMonth() + months);
          return d.toISOString();
        }
        const baseDate = currentExp < new Date() ? new Date() : currentExp;
        const d = new Date(baseDate.getTime());
        d.setMonth(d.getMonth() + months);
        return d.toISOString();
      };

      updateData.data_expiracao = calcNewExp(sub.data_expiracao);
      
      // Security check: Ensure that non-existent column fields are deleted
      delete updateData.data_expiracao_agenda;
      delete updateData.plano;
      delete updateData.plan;

      const { error: updateError } = await supabase
        .from('fa_subscriptions')
        .update(updateData)
        .eq('id', subId);

      if (!updateError) {
        showToast(`Plano renovado por +${months} ${months === 1 ? 'mês' : 'meses'} com sucesso! 🎉`, 'success');
        await fetchData();
      } else {
        console.error('Supabase update error:', updateError);
        showToast(`Erro na renovação: ${updateError.message || JSON.stringify(updateError)}`, 'error');
      }
    } catch (err: any) {
      console.error('Error:', err);
      showToast(`Erro ao renovar plano: ${err?.message || err}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const changePlan = async (subId: string, newPlan: string) => {
    setActionLoading(`plan-${subId}`);
    try {
      const { error } = await supabase
        .from('fa_subscriptions')
        .update({ plano: newPlan, updated_at: new Date().toISOString() })
        .eq('id', subId);
      
      if (!error) {
        showToast(`Plano alterado para ${newPlan.toUpperCase()}`, 'success');
        await fetchData();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const filteredSubs = subscriptions.filter(sub => {
    const matchesSearch = sub.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (sub.nome || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const isExpired = new Date(sub.data_expiracao) < new Date();
    
    if (statusFilter === 'active') return matchesSearch && !isExpired;
    if (statusFilter === 'expired') return matchesSearch && isExpired;
    return matchesSearch;
  });

  if (isAdminVerified === null) {
    return (
      <div className="p-4 sm:p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-brand-primary animate-pulse text-xs font-black uppercase tracking-widest flex flex-col items-center gap-3">
          <span className="text-lg">⏳</span>
          <span>Verificando credenciais de Administrador...</span>
        </div>
      </div>
    );
  }

  if (isAdminVerified === false) {
    return (
      <div className="p-4 sm:p-8 flex items-center justify-center min-h-[400px]">
        <div className="max-w-md w-full bg-brand-card border border-brand-danger/30 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-brand-danger/10 text-brand-danger rounded-full flex items-center justify-center mx-auto border border-brand-danger/20">
            <span className="text-3xl">🔒</span>
          </div>
          <h3 className="text-xl font-display font-black text-brand-text uppercase italic tracking-tight">
            Acesso Negado
          </h3>
          <p className="text-brand-muted text-xs sm:text-xs leading-relaxed">
            Este painel é de acesso restrito ao Administrador Geral do Fluxo Azul. Seus dados de acesso foram catalogados por segurança.
          </p>
          <div className="text-[9px] font-black tracking-widest uppercase text-brand-danger/70 bg-brand-danger/5 py-2 px-3 rounded-lg border border-brand-danger/10 inline-block">
            Tentativa registrada no servidor
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 sm:p-8 space-y-8"
    >
      <header>
        <h2 className="text-xl sm:text-2xl font-display font-bold text-brand-text flex items-center gap-3">
          <ShieldCheck className="text-brand-primary shrink-0" />
          Painel Administrativo
        </h2>
        <p className="text-brand-muted text-xs sm:text-sm mt-1">Gerencie todos os usuários e dados globais do Fluxo Azul.</p>
      </header>

      {/* Admin Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="bg-brand-card border border-brand-border p-4 sm:p-6 rounded-2xl">
          <p className="text-[9px] sm:text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-2">Total Usuários</p>
          <p className="text-xl sm:text-3xl font-display font-bold text-brand-primary">{subscriptions.length}</p>
        </div>
        <div className="bg-brand-card border border-brand-border p-4 sm:p-6 rounded-2xl">
          <p className="text-[9px] sm:text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-2">Ativos</p>
          <p className="text-xl sm:text-3xl font-display font-bold text-green-500">
            {subscriptions.filter(s => new Date(s.data_expiracao) > new Date()).length}
          </p>
        </div>
        <div className="bg-brand-card border border-brand-border p-4 sm:p-6 rounded-2xl">
          <p className="text-[9px] sm:text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-2">Expirados</p>
          <p className="text-xl sm:text-3xl font-display font-bold text-brand-danger">
            {subscriptions.filter(s => new Date(s.data_expiracao) <= new Date()).length}
          </p>
        </div>
        <div className="bg-brand-card border border-brand-border p-4 sm:p-6 rounded-2xl">
          <p className="text-[9px] sm:text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-2">Planos Pagos</p>
          <p className="text-xl sm:text-3xl font-display font-bold text-orange-500">
            {subscriptions.filter(s => s.plano !== 'trial').length}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
          <input 
            type="text"
            placeholder="Buscar usuário por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-brand-card border border-brand-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-brand-text focus:outline-none focus:border-brand-primary"
          />
        </div>
        
        <div className="flex items-center gap-2 bg-brand-card border border-brand-border p-1 rounded-xl w-full md:w-auto">
          {(['all', 'active', 'expired'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={cn(
                "flex-1 md:flex-none px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                statusFilter === filter ? "bg-brand-primary text-white" : "text-brand-muted hover:text-brand-text"
              )}
            >
              {filter === 'all' ? 'Todos' : filter === 'active' ? 'Ativos' : 'Expirados'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden shadow-xl">
        <div className="flex border-b border-brand-border">
          <button 
            onClick={() => setActiveTab('users')}
            className={cn(
              "flex-1 py-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all",
              activeTab === 'users' ? "bg-brand-primary/10 text-brand-primary border-b-2 border-brand-primary" : "text-brand-muted hover:bg-brand-bg/50"
            )}
          >
            Usuários
          </button>
          <button 
            onClick={() => setActiveTab('clients')}
            className={cn(
              "flex-1 py-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all",
              activeTab === 'clients' ? "bg-brand-primary/10 text-brand-primary border-b-2 border-brand-primary" : "text-brand-muted hover:bg-brand-bg/50"
            )}
          >
            Todos os Clientes
          </button>
        </div>

        <div className="overflow-x-auto h-[600px] scrollbar-thin scrollbar-thumb-brand-border">
          {activeTab === 'users' ? (
            <table className="w-full text-left border-collapse">
              <thead className="bg-brand-bg/50 text-[9px] sm:text-[10px] font-bold text-brand-muted uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-4 bg-brand-bg/50 whitespace-nowrap">Nome / Email</th>
                  <th className="px-6 py-4 bg-brand-bg/50 whitespace-nowrap">Plano / Duração</th>
                  <th className="px-6 py-4 bg-brand-bg/50 whitespace-nowrap hidden sm:table-cell">Expiração (Fluxo / Agenda)</th>
                  <th className="px-6 py-4 bg-brand-bg/50 whitespace-nowrap hidden md:table-cell">Criado em</th>
                  <th className="px-6 py-4 bg-brand-bg/50 text-right">Ações de Renovação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {filteredSubs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-brand-bg/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col max-w-[150px] sm:max-w-none">
                        <span className="font-bold text-xs sm:text-sm text-brand-text uppercase truncate">{sub.nome || '-'}</span>
                        <span className="text-[10px] sm:text-xs text-brand-muted truncate">{sub.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <select 
                          value={sub.plano}
                          onChange={(e) => changePlan(sub.id, e.target.value)}
                          disabled={actionLoading === `plan-${sub.id}`}
                          className="bg-brand-bg border border-brand-border text-brand-text text-[10px] font-black rounded-lg px-2 py-1.5 outline-none focus:border-brand-primary transition-all uppercase"
                        >
                          <option value="trial">Trial</option>
                          <option value="pro">Pro</option>
                          <option value="business">Business</option>
                          <option value="premium">Premium</option>
                        </select>
                        <select 
                          value={renewalMonths[sub.id] || 1}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setRenewalMonths(prev => ({ ...prev, [sub.id]: val }));
                          }}
                          className="bg-brand-bg border border-brand-border text-brand-text text-[10px] font-black rounded-lg px-2 py-1.5 outline-none focus:border-brand-primary transition-all uppercase cursor-pointer"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m}>
                              {m} {m === 1 ? 'Mês' : 'Meses'}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[10px] sm:text-xs hidden sm:table-cell">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="opacity-40">💰</span>
                          <span className={new Date(sub.data_expiracao) < new Date() ? 'text-brand-danger font-bold' : 'text-brand-muted'}>
                            {formatDate(sub.data_expiracao)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="opacity-40">📅</span>
                          <span className={!sub.data_expiracao_agenda || new Date(sub.data_expiracao_agenda) < new Date() ? 'text-brand-danger font-bold' : 'text-brand-muted'}>
                            {sub.data_expiracao_agenda ? formatDate(sub.data_expiracao_agenda) : 'Nunca Ativado'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[10px] sm:text-xs text-brand-muted hidden md:table-cell whitespace-nowrap">
                      {formatDate(sub.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => addMonths(sub.id, renewalMonths[sub.id] || 1)}
                        disabled={!!actionLoading}
                        className={cn(
                          "transition-all text-[10px] font-black px-4 py-2 rounded-xl border whitespace-nowrap flex items-center justify-center gap-2 ml-auto cursor-pointer",
                          actionLoading === sub.id
                            ? "bg-brand-muted/10 text-brand-muted border-brand-border cursor-not-allowed"
                            : "bg-brand-primary text-white hover:bg-brand-primary-hover border-brand-primary shadow-lg shadow-brand-primary/20"
                        )}
                      >
                        {actionLoading === sub.id ? (
                          <span className="animate-spin text-xs">⏳</span>
                        ) : (
                          <Rocket className="w-3.5 h-3.5" />
                        )}
                        {actionLoading === sub.id 
                          ? 'PROCESSANDO...' 
                          : `RENOVAR +${renewalMonths[sub.id] || 1} MÊS${(renewalMonths[sub.id] || 1) > 1 ? 'ES' : ''}`}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSubs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-brand-muted text-xs italic">
                      Nenhum usuário encontrado com estes critérios.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-brand-bg/50 text-[9px] sm:text-[10px] font-bold text-brand-muted uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-4 bg-brand-bg/50 whitespace-nowrap">Cliente / Contato</th>
                  <th className="px-6 py-4 bg-brand-bg/50 whitespace-nowrap">Dono (SaaS)</th>
                  <th className="px-6 py-4 bg-brand-bg/50 whitespace-nowrap hidden sm:table-cell">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {allClients.map((client) => (
                  <tr key={client.id} className="hover:bg-brand-bg/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col max-w-[150px] sm:max-w-none">
                        <span className="font-bold text-xs sm:text-sm text-brand-text uppercase truncate">{client.name}</span>
                        <span className="text-[10px] sm:text-xs text-brand-muted truncate">{client.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col max-w-[120px] sm:max-w-none">
                        <span className="font-bold text-[11px] sm:text-xs text-brand-text uppercase truncate">{client.owner?.nome || 'Sem Nome'}</span>
                        <span className="text-[9px] sm:text-[10px] text-brand-muted italic truncate">{client.owner?.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[10px] sm:text-xs text-brand-muted hidden sm:table-cell whitespace-nowrap">
                      {formatDate(client.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </motion.div>
  );
}
