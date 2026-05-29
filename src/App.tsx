import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Invoices from './pages/Invoices';
import Appointments from './pages/Appointments';
import Directory from './pages/Directory';
import Settings from './pages/Settings';
import Plans from './pages/Plans';
import Admin from './pages/Admin';
import Auth from './pages/Auth';
import PWABadge from './components/PWABadge';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { cn } from './lib/utils';
import { useToasts } from './lib/toast';
import LegalModal from './components/LegalModal';
import { Menu, X } from 'lucide-react';
import ReferralModal from './components/ReferralModal';

const ToastContainer = () => {
  const toasts = useToasts();
  return (
    <div className="fixed bottom-4 right-4 z-[300] flex flex-col gap-2 max-w-sm w-full select-none pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto p-4 rounded-2xl border flex items-center gap-3 transition-all transform animate-in slide-in-from-bottom shadow-lg",
            toast.type === 'success' && "bg-emerald-950/90 border-emerald-500/30 text-emerald-200",
            toast.type === 'error' && "bg-rose-950/90 border-rose-500/30 text-rose-200",
            toast.type === 'info' && "bg-slate-900/90 border-slate-700/50 text-slate-100",
            toast.type === 'warning' && "bg-amber-950/90 border-amber-500/30 text-amber-200"
          )}
        >
          <div className="flex-1 font-bold text-xs uppercase tracking-wide">{toast.message}</div>
        </div>
      ))}
    </div>
  );
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [subscription, setSubscription] = useState<any | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'open' | 'overdue' | 'paid' | 'pending'>('all');
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [activeModule, setActiveModule] = useState<'finance' | 'agenda'>('finance');
  const [currentPage, setCurrentPage] = useState<any>('dashboard');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setUserId(session.user.id);
        fetchSubscription(session.user.id);
        checkAdminStatus(session.user.id);
      }
    });

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setUserId(session.user.id);
        fetchSubscription(session.user.id);
        checkAdminStatus(session.user.id);
      } else {
        setUserId('');
        setSubscription(null);
        setIsAdmin(false);
      }
    });

    return () => authSubscription.unsubscribe();
  }, []);

  const fetchSubscription = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();

      if (error) throw error;
      setSubscription(data);
    } catch (e) {
      console.warn('Error fetching subscription for client:', e);
    }
  };

  const checkAdminStatus = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();

      if (error) throw error;
      setIsAdmin(!!data);
    } catch (e) {
      console.warn('Admin status lookup:', e);
    }
  };

  const currentPlan = subscription?.status === 'active' ? subscription.plan_id : 'trial';

  const daysRemaining = (() => {
    if (!subscription) return null;
    const end = new Date(subscription.current_period_end);
    const diffTime = end.getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  })();

  const handlePageChange = (page: any, extra?: { filter?: any }) => {
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

  const renderPage = () => {
    if (!session) return <Auth />;

    switch (currentPage) {
      case 'dashboard': 
        return (
          <Dashboard 
            subscription={subscription} 
            daysRemaining={daysRemaining} 
            userId={userId} 
            activeModule={activeModule} 
            onPageChange={handlePageChange} 
            onOpenReferrals={() => setShowReferralModal(true)} 
          />
        );
      case 'clients': 
        return <Clients subscription={subscription} userId={userId} />;
      case 'invoices': 
        return <Invoices subscription={subscription} userId={userId} initialFilter={invoiceFilter} />;
      case 'appointments': 
        return <Appointments subscription={subscription} userId={userId} />;
      case 'plans': 
        return <Plans onPageChange={handlePageChange} activeModule={activeModule} />;
      case 'directory': 
        return <Directory subscription={subscription} userId={userId} />;
      case 'settings': 
        return <Settings userId={userId} subscription={subscription} />;
      case 'admin': 
        return isAdmin ? (
          <Admin />
        ) : (
          <Dashboard 
            subscription={subscription} 
            daysRemaining={daysRemaining} 
            userId={userId} 
            activeModule={activeModule} 
            onPageChange={handlePageChange} 
            onOpenReferrals={() => setShowReferralModal(true)} 
          />
        );
      default: 
        return (
          <Dashboard 
            subscription={subscription} 
            daysRemaining={daysRemaining} 
            userId={userId} 
            activeModule={activeModule} 
            onPageChange={handlePageChange} 
            onOpenReferrals={() => setShowReferralModal(true)} 
          />
        );
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
        <Auth />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex text-brand-text">
      {/* Sidebar Navigation */}
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
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeModule={activeModule}
        setActiveModule={(mod) => {
          setActiveModule(mod);
          setCurrentPage('dashboard');
        }}
        onOpenReferrals={() => setShowReferralModal(true)}
      />
      
      <main className="flex-1 lg:ml-64 min-h-screen flex flex-col overflow-x-hidden">
        {/* Mobile Header Top Navigation */}
        <header className="lg:hidden border-b border-brand-border bg-brand-card p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center font-display font-black text-white text-xs">
              FA
            </div>
            <span className="font-display font-black text-xs uppercase tracking-tight text-brand-text">Fluxo Azul</span>
          </div>
          <button 
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-brand-muted hover:text-brand-text p-2 cursor-pointer"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Dynamic Main App Page Render */}
        <div className="p-6 md:p-8 flex-1">
          {renderPage()}
        </div>

        {/* Main Footer branding */}
        <footer className="p-6 border-t border-brand-border text-center bg-brand-bg md:py-8">
          <p className="text-[10px] text-brand-muted uppercase font-black tracking-widest leading-relaxed">
            FluxoAzul & AgendaAzul © 2026 - Soluções para MEI
          </p>
        </footer>
      </main>

      {/* Auxiliary Global Widgets, Modals & Toast notifications */}
      <ToastContainer />
      <LegalModal onAccept={() => {}} />
      <PWAInstallPrompt />
      <PWABadge />
      <ReferralModal isOpen={showReferralModal} onClose={() => setShowReferralModal(false)} userId={userId} />
    </div>
  );
}
