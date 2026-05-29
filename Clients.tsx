import { cn } from '../lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  Rocket, 
  Settings, 
  LogOut, 
  ShieldCheck,
  Zap,
  Gift
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export type PageView = 'dashboard' | 'clients' | 'invoices' | 'appointments' | 'services' | 'plans' | 'settings' | 'admin' | 'reports' | 'directory';

interface SidebarProps {
  currentPage: PageView;
  onPageChange: (page: PageView) => void;
  isAdmin: boolean;
  userName: string;
  userPlan: string;
  daysRemaining: number;
  isOpen?: boolean;
  onClose?: () => void;
  activeModule: 'finance' | 'agenda';
  setActiveModule: (mod: 'finance' | 'agenda') => void;
  onOpenReferrals?: () => void;
}

export default function Sidebar({ 
  currentPage, 
  onPageChange, 
  isAdmin, 
  userName, 
  userPlan,
  daysRemaining,
  isOpen = true,
  onClose,
  activeModule,
  setActiveModule,
  onOpenReferrals
}: SidebarProps) {
  
  const financeItems = [
    { id: 'dashboard', label: 'Painel Financeiro', emoji: '📊' },
    { id: 'invoices', label: 'Todas Cobranças', emoji: '💰' },
    { id: 'clients', label: 'Meus Clientes', emoji: '👥' },
    { id: 'reports', label: 'Centro de Inteligência', emoji: '📈' },
  ] as const;

  const agendaItems = [
    { id: 'dashboard', label: 'Painel Geral', emoji: '📊' },
    { id: 'appointments', label: 'Meus Horários', emoji: '📅' },
    { id: 'services', label: 'Meus Serviços', emoji: '💼' },
    { id: 'clients', label: 'Meus Clientes', emoji: '👥' },
  ] as const;

  const configItems = [
    { id: 'plans', label: 'Plano de Assinatura', emoji: '🚀' },
    { id: 'directory', label: 'Diretório Premium', emoji: '💎' },
    { id: 'settings', label: 'Configurações', emoji: '⚙️' },
  ] as const;

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden" 
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "fixed left-0 top-0 bottom-0 w-72 bg-brand-card border-r border-brand-border flex flex-col z-[60] transition-transform duration-300 lg:translate-x-0 lg:w-64",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-brand-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-brand-primary rounded-lg flex items-center justify-center shadow-lg shadow-brand-primary/20">
                <Zap className="text-white w-5 h-5 fill-current" />
              </div>
              <span className="font-display font-bold text-lg text-brand-text">
                {activeModule === 'finance' ? 'Fluxo Azul' : 'Agenda Azul'}
              </span>
            </div>
            <button className="lg:hidden text-brand-muted hover:text-brand-text" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="flex p-1 bg-brand-bg rounded-xl border border-brand-border">
            <button 
              onClick={() => setActiveModule('finance')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                activeModule === 'finance' ? "bg-brand-card text-brand-primary border border-brand-primary/20 ring-1 ring-brand-primary/10 shadow-sm" : "text-brand-muted hover:text-brand-text"
              )}
            >
              📊 <span className="hidden sm:inline">Fluxo</span>
            </button>
            <button 
              onClick={() => setActiveModule('agenda')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                activeModule === 'agenda' ? "bg-brand-card text-brand-primary border border-brand-primary/20 ring-1 ring-brand-primary/10 shadow-sm" : "text-brand-muted hover:text-brand-text"
              )}
            >
              📅 <span className="hidden sm:inline">Agenda</span>
            </button>
          </div>
        </div>

      <nav className="flex-1 p-4 space-y-8 overflow-y-auto">
        <div>
          <p className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.12em] px-4 mb-4">
            {activeModule === 'finance' ? 'Operação Financeira' : 'Gestão de Agenda'}
          </p>
          <div className="space-y-1">
            {(activeModule === 'finance' ? financeItems : agendaItems).map((item) => (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id as PageView)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all group",
                  currentPage === item.id 
                    ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20" 
                    : "text-brand-muted hover:bg-brand-bg hover:text-brand-text border border-transparent"
                )}
              >
                <span className="text-base grayscale-[0.2] group-hover:grayscale-0 transition-all">{item.emoji}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.12em] px-4 mb-4">Plataforma</p>
          <div className="space-y-1">
            {configItems.map((item) => {
              const isPlans = item.id === 'plans';
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    onClick={() => onPageChange(item.id as PageView)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all group cursor-pointer",
                      currentPage === item.id 
                        ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20" 
                        : "text-brand-muted hover:bg-brand-bg hover:text-brand-text border border-transparent"
                    )}
                  >
                    <span className="text-base grayscale-[0.2] group-hover:grayscale-0 transition-all">{item.emoji}</span>
                    {item.label}
                  </button>

                  {isPlans && (
                    <button
                      type="button"
                      onClick={onOpenReferrals}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-brand-muted hover:bg-brand-bg hover:text-brand-text border border-transparent transition-all group cursor-pointer"
                    >
                      <span className="text-base grayscale-[0.2] group-hover:grayscale-0 transition-all">🎁</span>
                      Indique e Ganhe
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-brand-border space-y-4">
        <div className="bg-brand-bg/50 rounded-xl p-3 flex items-center gap-3 hover:bg-brand-bg transition-colors cursor-pointer group">
          <div className="w-9 h-9 bg-brand-primary rounded-full flex items-center justify-center font-bold text-white text-sm shadow-inner uppercase">
            {userName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-brand-text truncate uppercase">{userName}</p>
            <p className="text-[10px] text-brand-primary font-semibold flex items-center gap-1">
              <span>{userPlan.toLowerCase() === 'premium' ? '💎' : userPlan.toLowerCase() === 'business' ? '🚀' : userPlan.toLowerCase() === 'pro' ? '👑' : '⚡'}</span>
              {isAdmin ? 'ACESSO ELITE' : `${userPlan} — ${daysRemaining} dias`}
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => onPageChange('admin')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold transition-all border",
              currentPage === 'admin'
                ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20"
                : "bg-brand-primary/5 text-brand-primary/80 border-brand-primary/10 hover:bg-brand-primary/10"
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            Painel Admin
          </button>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-brand-danger/80 hover:text-brand-danger hover:bg-brand-danger/5 transition-all group cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
    </>
  );
}
