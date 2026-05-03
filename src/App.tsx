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
import { Subscription } from './types';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';

import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { useToasts } from './lib/toast';
import LegalModal from './components/LegalModal';
import { Menu, X } from 'lucide-react';

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
    // Buscamos a assinatura mais recente (por ID decrescente ou data) para evitar erro de duplicidade
    const { data, error } = await supabase
      .from('fa_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    const isAdminEmail = (session?.user?.email === 'ronilsonaugustomg@gmail.com');

    if (data) {
      const augmentedData = isAdminEmail ? { ...data, plano: 'premium' } : data;
      setSubscription(augmentedData);
    } else if (!error) {
      // Se for o administrador, forçamos o plano Premium
      setSubscription({
        id: 'temp',
        user_id: userId,
        email: session?.user?.email || '',
        plano: isAdminEmail ? 'premium' : 'trial',
        data_expiracao: isAdminEmail 
          ? new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString() // 10 anos
          : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        ativo: true,
        created_at: new Date().toISOString()
      } as Subscription);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-brand-primary animate-pulse flex flex-col items-center gap-4">
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
  const isAdmin = user?.email === 'ronilsonaugustomg@gmail.com';
  
  const currentPlan = subscription?.plano || 'trial';
  const expiresAt = subscription?.data_expiracao ? new Date(subscription.data_expiracao) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const daysDiff = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, daysDiff);

  const renderPage = () => {
    const userId = session?.user?.id;
    if (!userId) return null;

    // Se o usuário tentar acessar a agenda sem plano compatível, redirecionar para planos
    const canAccessAgenda = subscription?.plano === 'business' || subscription?.plano === 'premium';
    
    if (activeModule === 'agenda' && !canAccessAgenda && currentPage !== 'plans' && currentPage !== 'settings') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-6">
          <div className="w-24 h-24 bg-brand-primary/10 rounded-full flex items-center justify-center border border-brand-primary/20">
             <span className="text-4xl text-brand-primary">📅</span>
          </div>
          <h3 className="text-2xl font-display font-black text-brand-text uppercase">Agenda Azul — Recurso Business</h3>
          <p className="text-brand-muted max-w-md">Para organizar seus horários e receber adiantamentos via PIX, faça o upgrade para os planos <strong>BUSINESS</strong> ou <strong>PREMIUM</strong>.</p>
          <button 
           onClick={() => setCurrentPage('plans')}
           className="bg-brand-primary hover:bg-brand-primary-hover text-white font-black px-8 py-4 rounded-2xl shadow-xl transition-all"
          >
            VER PLANOS E FAZER UPGRADE
          </button>
        </div>
      );
    }

    switch (currentPage) {
      case 'dashboard': return <Dashboard subscription={subscription} daysRemaining={daysRemaining} userId={userId} />;
      case 'clients': return <Clients subscription={subscription} userId={userId} />;
      case 'invoices': return <Invoices subscription={subscription} userId={userId} />;
      case 'appointments': return <Appointments subscription={subscription} userId={userId} />;
      case 'services': return <Services subscription={subscription} userId={userId} />;
      case 'plans': return <Plans />;
      case 'settings': return <Settings userId={userId} />;
      case 'admin': return isAdmin ? <Admin /> : <Dashboard subscription={subscription} daysRemaining={daysRemaining} userId={userId} />;
      default: return <Dashboard subscription={subscription} daysRemaining={daysRemaining} userId={userId} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-brand-bg text-brand-text font-sans overflow-x-hidden">
      <Sidebar 
        currentPage={currentPage}
        onPageChange={(page) => {
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
          // Ao trocar de módulo, vamos para o painel principal correspondente
          if (mod === 'finance') setCurrentPage('dashboard');
          if (mod === 'agenda') setCurrentPage('appointments');
        }}
      />
      
      <main className="flex-1 lg:ml-64 min-h-screen flex flex-col">
        <div className="sticky top-0 z-40 bg-brand-bg/80 backdrop-blur-md border-b border-brand-border px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-brand-muted hover:text-brand-text transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-sm sm:text-lg font-display font-black uppercase tracking-tight text-brand-text truncate">
              {activeModule === 'finance' ? (
                currentPage === 'dashboard' ? 'Painel Financeiro' : 
                currentPage === 'clients' ? 'Clientes' : 
                currentPage === 'invoices' ? 'Cobranças' :
                currentPage === 'plans' ? 'Planos' :
                currentPage === 'settings' ? 'Configurações' : 'Admin'
              ) : (
                currentPage === 'appointments' ? 'Agenda de Horários' :
                currentPage === 'services' ? 'Serviços' :
                currentPage === 'clients' ? 'Clientes (Agenda)' :
                currentPage === 'plans' ? 'Planos' :
                currentPage === 'settings' ? 'Configurações' : 'Agenda Azul'
              )}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className={cn(
              "px-3 py-1.5 rounded-full border text-[9px] sm:text-[10px] font-black uppercase tracking-widest whitespace-nowrap",
              daysRemaining <= 3 ? 'bg-brand-danger/10 text-brand-danger border-brand-danger/20' : 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'
            )}>
              <span className="hidden sm:inline">{currentPlan === 'premium' ? '💎' : currentPlan === 'business' ? '🚀' : currentPlan === 'pro' ? '👑' : '⚡'} </span>
              {currentPlan.toUpperCase()}: {daysRemaining} DIAS
            </div>
            {(currentPlan === 'trial' || currentPlan === 'pro' || currentPlan === 'business') && (
              <button 
                onClick={() => setCurrentPage('plans')}
                className="bg-brand-primary hover:bg-brand-primary-hover text-white text-[9px] sm:text-[11px] font-black uppercase tracking-widest px-3 sm:px-6 py-2 rounded-xl transition-all shadow-lg shadow-brand-primary/20 whitespace-nowrap"
              >
                {currentPlan === 'premium' ? 'ELITE' : 'ASSINAR'}
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

        {currentPlan === 'premium' && (
          <button 
            onClick={() => window.open('https://wa.me/5531984132145?text=Oi%20Ronilson,%20sou%20Premium%20e%20quero%20agendar%20minha%20mentoria%20de%201h%20deste%20mês', '_blank')}
            className="fixed bottom-8 right-8 bg-brand-primary text-white p-4 rounded-2xl shadow-2xl z-50 flex items-center gap-2 font-bold text-sm uppercase tracking-widest hover:scale-105 transition-all"
          >
            🎯 Agendar Mentoria
          </button>
        )}
      </main>
    </div>
  );
}
