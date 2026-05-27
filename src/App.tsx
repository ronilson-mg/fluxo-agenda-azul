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
import { motion } from 'motion/react';
import { cn } from './lib/utils';
import { useToasts } from './lib/toast';
import LegalModal from './components/LegalModal';
import { Menu } from 'lucide-react';

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
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(false);

  useEffect(() => {
    // Verifica se já aceitou os termos no localStorage
    setHasAcceptedLegal(!!localStorage.getItem('fa_legal_accepted'));

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
    // ... (mantenha toda a sua lógica atual de fetchSubscription aqui)
  };

  if (loading) return null; // Ou seu loading screen

  // Se não estiver logado, mostra Auth
  if (!session) {
    return <Auth onSuccess={() => {}} />;
  }

  // Lógica principal
  return (
    <div className="flex min-h-screen bg-brand-bg text-brand-text font-sans overflow-x-hidden">
      {/* O MODAL AGORA É RENDERIZADO CONDICIONALMENTE */}
      {!hasAcceptedLegal && (
        <LegalModal onAccept={() => setHasAcceptedLegal(true)} />
      )}

      {/* SIDEBAR E RESTO DO CONTEÚDO... */}
      <Sidebar 
        currentPage={currentPage}
        onPageChange={(page) => { setCurrentPage(page); setIsSidebarOpen(false); }}
        isAdmin={session.user.email === 'ronilsonaugustomg@gmail.com'}
        userName={session.user.user_metadata?.name || 'Usuário'}
        userPlan="PRO" 
        daysRemaining={0}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeModule={activeModule}
        setActiveModule={setActiveModule}
      />
      
      <main className="flex-1 lg:ml-64 min-h-screen flex flex-col overflow-x-hidden">
        {/* ... (o restante do seu conteúdo permanece igual) ... */}
        <ToastContainer />
        <PWAInstallPrompt />
      </main>
    </div>
  );
}
