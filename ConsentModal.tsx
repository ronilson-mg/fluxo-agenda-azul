/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Auth from './pages/Auth';
import Sidebar, { PageView } from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Invoices from './pages/Invoices';
import Appointments from './pages/Appointments';
import Services from './pages/Services';
import Admin from './pages/Admin';
import Plans from './pages/Plans';
import Settings from './pages/Settings';
import Directory from './pages/Directory';
import { Subscription } from './types';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';

import Reports from './pages/Reports';

import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { useToasts } from './lib/toast';
import LegalModal from './components/LegalModal';
import { Menu, X } from 'lucide-react';
import ReferralModal from './components/ReferralModal';

const ToastContainer = () => {
  const toasts = useToasts();
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={cn(
            "px-6 py-3 rounded-2xl shadow-2xl text-white text-sm font-bold uppercase tracking-widest flex items-center gap-3",
            toast.type === 'success' ? 'bg-brand-primary' : toast.type === 'error' ? 'bg-brand-danger' : 'bg-brand-muted'
          )}
        >
          {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
          {toast.message}
        </motion.div>
      ))}
    </div>
  );
};

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<PageView>('dashboard');
  const [activeModule, setActiveModule] = useState<'finance' | 'agenda'>('finance');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'open' | 'overdue' | 'paid' | 'pending'>('all');
  const [showReferralModal, setShowReferralModal] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filterParam = params.get('filter');
    if (filterParam === 'pending') {
      setCurrentPage('invoices');
      setInvoiceFilter('pending');
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchSubscription(session.user.id);
      setLoading(false);
    });

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchSubscription(session.user.id);
      else setSubscription(null);
    });

    return () => authListener.unsubscribe();
  }, []);

  const fetchSubscription = async (userId: string) => {
    // Obter o email do usuário logado diretamente da sessão ativa do Supabase para garantir precisão absoluta
    const { data: { session: activeSession } } = await supabase.auth.getSession();
    const userEmail = activeSession?.user?.email || '';
    const isAdminEmail = (userEmail === 'ronilsonaugustomg@gmail.com');

    // Buscamos a assinatura mais recente (por ID decrescente ou data) para evitar erro de duplicidade
    const { data, error } = await supabase
      .from('fa_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (data) {
      const augmentedData = isAdminEmail ? { ...data, plano: 'premium' as const, email: userEmail } : data;
      if (!augmentedData.data_expiracao_agenda) {
        augmentedData.data_expiracao_agenda = augmentedData.data_expiracao;
      }
      setSubscription(augmentedData);
    } else if (!error) {
      // Se não houver registro no banco, criamos o registro de TRIAL ou PREMIUM persistente para garantir integridade
      const trialDuration = 14 * 24 * 60 * 60 * 1000;
      const userCreatedAt = activeSession?.user?.created_at ? new Date(activeSession.user.created_at) : new Date();
      const expirationDate = isAdminEmail
        ? new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(userCreatedAt.getTime() + trialDuration).toISOString();

      const newSub = {
        id: `sub_${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        email: userEmail,
        plano: isAdminEmail ? ('premium' as const) : ('trial' as const),
        data_expiracao: expirationDate,
        ativo: true,
        created_at: userCreatedAt.toISOString()
      };

      try {
        const { error: insertError } = await supabase
          .from('fa_subscriptions')
          .insert(newSub);
        
        if (!insertError) {
          setSubscription(newSub as Subscription);
        } else {
          // fallback temporal se houver restrição ou erro de banco
          setSubscription({ ...newSub, id: 'temp' } as Subscription);
        }
      } catch (err) {
        setSubscription({ ...newSub, id: 'temp' } as Subscription);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
        <div className="text-brand-primary animate-pulse flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 bg-brand-primary rounded-xl flex items-center justify-center">
            <span className="text-2xl font-bold text-white">⚡</span>
          </div>
          <p className="text-sm font-bold tracking-widest uppercase">Carregando Fluxo Azul...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth onSuccess={() => {}} />;
  }

  const user = session.user;
  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário';
  const isAdmin = user?.email?.toLowerCase() === 'ronilsonaugustomg@gmail.com';
  
  const currentPlan = isAdmin ? 'premium' : (subscription?.plano || 'trial');
  
  // Lógica de expiração separada por módulo, calculando o trial de 14 dias com base na data de criação da conta (evita trial infinito)
  const isTrial = currentPlan === 'trial';
  const getTrialExpiration = () => {
    const creationTime = session?.user?.created_at ? new Date(session.user.created_at).getTime() : Date.now();
    return new Date(creationTime + 14 * 24 * 60 * 60 * 1000);
  };

  const expiresAtFinance = isTrial 
    ? getTrialExpiration()
    : (subscription?.data_expiracao ? new Date(subscription.data_expiracao) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));

  const expiresAtAgenda = isTrial 
    ? getTrialExpiration()
    : (subscription?.data_expiracao_agenda ? new Date(subscription.data_expiracao_agenda) : (subscription?.data_expiracao ? new Date(subscription.data_expiracao) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)));
  
  const daysDiffFinance = isAdmin ? 3650 : Math.ceil((expiresAtFinance.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const daysDiffAgenda = isAdmin ? 3650 : Math.ceil((expiresAtAgenda.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  const daysRemainingFinance = Math.max(0, daysDiffFinance);
  const daysRemainingAgenda = Math.max(0, daysDiffAgenda);
  
  const daysRemaining = activeModule === 'finance' ? daysRemainingFinance : daysRemainingAgenda;

  const renderPage = () => {
    const userId = session?.user?.id;
    if (!userId) return null;

    // --- REGRAS DE ACESSO POR PLANO ---
    const isPro = currentPlan === 'pro';
    const isBusiness = currentPlan === 'business';
    const isPremium = currentPlan === 'premium';

    // Acesso à Agenda: Trial (dentro dos 14 dias), Pro (se ativado via data_expiracao_agenda), Business ou Premium
    const hasAgendaAccess = isAdmin || isBusiness || isPremium || (isPro && subscription?.data_expiracao_agenda && new Date(subscription.data_expiracao_agenda) > new Date()) || (isTrial && daysRemainingAgenda > 0);
    const isAgendaExpired = !isAdmin && daysRemainingAgenda <= 0;

    if (activeModule === 'agenda' && (!hasAgendaAccess || isAgendaExpired) && currentPage !== 'plans' && currentPage !== 'settings') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-6">
          <div className="w-24 h-24 bg-brand-primary/10 rounded-full flex items-center justify-center border border-brand-primary/20">
             <span className="text-4xl text-brand-primary">📅</span>
          </div>
          <h3 className="text-2xl font-display font-black text-brand-text uppercase italic">
            {isTrial ? 'Período Trial Expirado' : isAgendaExpired ? 'Agenda Azul — Plano Expirado' : 'Agenda Azul — Ative este Módulo'}
          </h3>
          <p className="text-brand-muted max-w-md text-sm leading-relaxed">
            {isTrial 
              ? 'Seu período de teste gratuito de 14 dias terminou. Faça o upgrade hoje mesmo para manter os dados salvos e continuar lucrando!'
              : isAgendaExpired 
                ? 'Sua assinatura da Agenda Azul expirou. Renove seu plano para continuar organizando seus horários.' 
                : 'Este módulo não faz parte do seu plano atual. Ative a Agenda Azul no Plano Pro ou faça upgrade para obter o combo completo.'}
          </p>
          <button 
           onClick={() => setCurrentPage('plans')}
           className="bg-brand-primary hover:bg-brand-primary-hover text-white font-black px-8 py-4 rounded-2xl shadow-xl transition-all uppercase tracking-wider text-xs"
          >
            {isTrial ? 'Fazer Upgrade Agora' : isAgendaExpired ? 'RENOVAR AGORA' : 'VER PLANOS'}
          </button>
        </div>
      );
    }
    
    // Bloqueio similar para o Financeiro (Fluxo Azul)
    const hasFinanceAccess = isAdmin || isBusiness || isPremium || (isPro && subscription?.data_expiracao && new Date(subscription.data_expiracao) > new Date()) || (isTrial && daysRemainingFinance > 0);
    const isFinanceExpired = !isAdmin && daysRemainingFinance <= 0;

    if (activeModule === 'finance' && (!hasFinanceAccess || isFinanceExpired) && currentPage !== 'plans' && currentPage !== 'settings') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-6">
          <div className="w-24 h-24 bg-brand-danger/10 rounded-full flex items-center justify-center border border-brand-danger/20">
             <span className="text-4xl">💰</span>
          </div>
          <h3 className="text-2xl font-display font-black text-brand-text uppercase italic">
            {isTrial ? 'Período Trial Expirado' : isFinanceExpired ? 'Fluxo Azul — Plano Expirado' : 'Fluxo Azul — Ative este Módulo'}
          </h3>
          <p className="text-brand-muted max-w-md text-sm leading-relaxed">
            {isTrial 
              ? 'Seu período de teste gratuito de 14 dias terminou. Faça o upgrade hoje mesmo para manter os dados salvos e continuar lucrando!'
              : isFinanceExpired 
                ? 'Sua assinatura do Fluxo Azul expirou. Seus dados continuam salvos com segurança, mas você precisa renovar para continuar gerando suas cobranças.'
                : 'Seu plano PRO está com o módulo financeiro inativo. Ative-o para gerenciar suas contas ou migre para um plano completo.'}
          </p>
          <button 
           onClick={() => setCurrentPage('plans')}
           className="bg-brand-primary hover:bg-brand-primary-hover text-white font-black px-8 py-4 rounded-2xl shadow-xl transition-all uppercase tracking-wider text-xs"
          >
            {isTrial ? 'Fazer Upgrade Agora' : isFinanceExpired ? 'RENOVAR FLUXO AZUL' : 'VER PLANOS E ATIVAR'}
          </button>
        </div>
      );
    }

    const handlePageChange = (page: PageView, extra?: { filter?: any }) => {
      if (page === 'invoices' && extra?.filter) {
        setInvoiceFilter(extra.filter);
        const url = new URL(window.location.href);
        url.searchParams.set('filter', extra.filter);
        window.history.pushState({}, '', url);
      } else {
        setInvoiceFilter('all');
        const url = new URL(window.location.href);
        url.searchParams.delete('filter');
        window.history.pushState({}, '', url);
      }
      setCurrentPage(page);
    };

    switch (currentPage) {
      case 'dashboard': return <Dashboard subscription={subscription} daysRemaining={daysRemaining} userId={userId} activeModule={activeModule} onPageChange={handlePageChange} onOpenReferrals={() => setShowReferralModal(true)} />;
      case 'clients': return <Clients subscription={subscription} userId={userId} />;
      case 'invoices': return <Invoices subscription={subscription} userId={userId} initialFilter={invoiceFilter} />;
      case 'appointments': return <Appointments subscription={subscription} userId={userId} />;
      case 'services': return <Services subscription={subscription} userId={userId} />;
      case 'reports': return <Reports userId={userId} subscription={subscription} />;
      case 'plans': return <Plans onPageChange={handlePageChange} activeModule={activeModule} />;
      case 'directory': return <Directory subscription={subscription} userId={userId} />;
      case 'settings': return <Settings userId={userId} subscription={subscription} />;
      case 'admin': return isAdmin ? <Admin /> : <Dashboard subscription={subscription} daysRemaining={daysRemaining} userId={userId} activeModule={activeModule} onPageChange={handlePageChange} onOpenReferrals={() => setShowReferralModal(true)} />;
      default: return <Dashboard subscription={subscription} daysRemaining={daysRemaining} userId={userId} activeModule={activeModule} onPageChange={handlePageChange} onOpenReferrals={() => setShowReferralModal(true)} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-brand-bg text-brand-text font-sans overflow-x-hidden">
      <Sidebar 
        currentPage={currentPage}
        onPageChange={(page) => {
          setInvoiceFilter('all');
          const url = new URL(window.location.href);
          url.searchParams.delete('filter');
          window.history.pushState({}, '', url);
          setCurrentPage(page);
          setIsSidebarOpen(false);
        }}
        isAdmin={isAdmin}
        userName={userName}
        userPlan={currentPlan.toUpperCase()}
        daysRemaining={daysRemaining}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeModule={activeModule}
        setActiveModule={(mod) => {
          setActiveModule(mod);
          // Ao trocar de módulo, vamos para o painel principal correspondente (Dashboard em ambos agora)
          setCurrentPage('dashboard');
        }}
        onOpenReferrals={() => setShowReferralModal(true)}
      />
      
      <main className="flex-1 lg:ml-64 min-h-screen flex flex-col overflow-x-hidden">
        <div className="sticky top-0 z-40 bg-brand-bg/80 backdrop-blur-md border-b border-brand-border px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-brand-muted hover:text-brand-text transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-sm sm:text-lg font-display font-black uppercase tracking-tight text-brand-text truncate">
              {currentPage === 'directory' ? 'Diretório Premium' : (
                activeModule === 'finance' ? (
                  currentPage === 'dashboard' ? 'Painel Financeiro' : 
                  currentPage === 'clients' ? 'Clientes' : 
                  currentPage === 'invoices' ? 'Cobranças' :
                  currentPage === 'reports' ? 'Relatórios' :
                  currentPage === 'plans' ? 'Planos' :
                  currentPage === 'settings' ? 'Configurações' : 'Admin'
                ) : (
                  currentPage === 'appointments' ? 'Agenda de Horários' :
                  currentPage === 'services' ? 'Serviços' :
                  currentPage === 'clients' ? 'Clientes (Agenda)' :
                  currentPage === 'plans' ? 'Planos' :
                  currentPage === 'settings' ? 'Configurações' : 'Agenda Azul'
                )
              )}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className={cn(
              "px-3 py-1.5 rounded-full border text-[9px] sm:text-[10px] font-black uppercase tracking-widest whitespace-nowrap",
              isAdmin ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20 ring-4 ring-brand-primary/5' : 
              daysRemaining <= 3 ? 'bg-brand-danger/10 text-brand-danger border-brand-danger/20' : 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'
            )}>
              <span className="hidden sm:inline">{currentPlan === 'premium' ? '💎' : currentPlan === 'business' ? '🚀' : currentPlan === 'pro' ? '👑' : '⚡'} </span>
              {isAdmin ? 'ACESSO ELITE' : `${currentPlan.toUpperCase()}: ${daysRemaining} DIAS`}
            </div>
            {!isAdmin && (currentPlan === 'trial' || currentPlan === 'pro' || currentPlan === 'business') && (
              <button 
                onClick={() => setCurrentPage('plans')}
                className="bg-brand-primary hover:bg-brand-primary-hover text-white text-[9px] sm:text-[11px] font-black uppercase tracking-widest px-3 sm:px-6 py-2 rounded-xl transition-all shadow-lg shadow-brand-primary/20 whitespace-nowrap"
              >
                ASSINAR
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 flex flex-col relative">
          <div className="flex-1">
            {renderPage()}
          </div>
          
          <footer className="mt-12 flex flex-col sm:flex-row justify-between items-center gap-4 opacity-30 pointer-events-none">
            <p className="text-[10px] font-black text-brand-muted uppercase tracking-[3px] text-center sm:text-left">
              FluxoAzul & AgendaAzul © 2026 - Soluções para MEI
            </p>
            <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em]">
              LGPD & CDC COMPLIANT
            </p>
          </footer>
        </div>

        <ToastContainer />
        <LegalModal onAccept={() => {}} />
        <PWAInstallPrompt />
        <ReferralModal isOpen={showReferralModal} onClose={() => setShowReferralModal(false)} userId={session?.user?.id || ''} />

        {currentPlan === 'premium' && (
          <button 
            onClick={() => window.open('https://wa.me/5531984132145?text=Oi%20Ronilson,%20sou%20Premium%20e%20gostaria%20de%20solicitar%20minha%20Consultoria%20Estrat%C3%A9gica%20de%20Implanta%C3%A7%C3%A3o%20(Setup)%20e%20o%20Suporte%20VIP%20Priorit%C3%A1rio%20(Fase%20de%20Onboarding)!', '_blank')}
            className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 bg-brand-primary text-white p-3 sm:p-4 rounded-2xl shadow-2xl z-50 flex items-center gap-2 font-black text-[10px] sm:text-sm uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-brand-primary/40 border border-white/10 group"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform">
              <span className="text-base sm:text-xl">🎯</span>
            </div>
            <span className="hidden sm:inline">Suporte VIP Premium</span>
            <span className="sm:hidden">Suporte VIP</span>
          </button>
        )}
      </main>
    </div>
  );
}
