import React from 'react';
import { cn } from '../lib/utils';
import { 
  LineChart, 
  Users, 
  Receipt, 
  Settings, 
  LogOut, 
  ShieldCheck,
  Zap,
  Gift
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type PageView = 'dashboard' | 'clients' | 'invoices' | 'appointments' | 'plans' | 'directory' | 'settings' | 'admin';

interface SidebarProps {
  currentPage: PageView;
  onPageChange: (page: PageView) => void;
  isAdmin: boolean;
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
  isOpen = true,
  onClose,
  activeModule,
  setActiveModule,
  onOpenReferrals
}: SidebarProps) {
  
  const financeItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: LineChart },
    { id: 'clients', label: 'Clientes MEI', icon: Users },
    { id: 'invoices', label: 'Faturas & Link', icon: Receipt },
  ];

  const agendaItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: LineChart },
    { id: 'clients', label: 'Clientes MEI', icon: Users },
    { id: 'appointments', label: 'Agenda & Horários', icon: Receipt },
  ];

  const configItems = [
    { id: 'plans', label: 'Plano de Assinatura', emoji: '💳' },
    { id: 'directory', label: 'Diretório Premium', emoji: '🌟' },
    { id: 'settings', label: 'Configurações', emoji: '⚙️' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navItems = activeModule === 'finance' ? financeItems : agendaItems;

  return (
    <aside className={cn(
      "fixed top-0 left-0 z-40 w-64 h-screen transition-transform lg:translate-x-0 border-r border-brand-border flex flex-col bg-brand-card",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Top Brand Logo */}
      <div className="p-6 border-b border-brand-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center font-display font-black text-lg text-white shadow-lg shadow-brand-primary/25">
            FA
          </div>
          <div>
            <h1 className="font-display font-black text-sm tracking-tight text-brand-text uppercase leading-none">Fluxo Azul</h1>
            <p className="text-[9px] font-black text-brand-primary uppercase tracking-widest mt-1">Gestão & Agenda</p>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="lg:hidden text-brand-muted hover:text-brand-text cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Module Selector */}
      <div className="px-4 py-4 border-b border-brand-border">
        <div className="flex gap-1 bg-brand-bg p-1.5 rounded-2xl border border-brand-border/60">
          <button
            onClick={() => setActiveModule('finance')}
            className={cn(
              "flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer",
              activeModule === 'finance'
                ? "bg-brand-primary text-white shadow-md shadow-brand-primary/15"
                : "text-brand-muted hover:text-brand-text"
            )}
          >
            Cobranças
          </button>
          <button
            onClick={() => setActiveModule('agenda')}
            className={cn(
              "flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer",
              activeModule === 'agenda'
                ? "bg-brand-primary text-white shadow-md shadow-brand-primary/15"
                : "text-brand-muted hover:text-brand-text"
            )}
          >
            Agenda
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-none">
        <div>
          <p className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.12em] px-4 mb-4">Módulos</p>
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id as PageView)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all group cursor-pointer",
                    currentPage === item.id 
                      ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20" 
                      : "text-brand-muted hover:bg-brand-bg hover:text-brand-text border border-transparent"
                  )}
                >
                  <Icon className={cn(
                    "w-4 h-4 transition-transform group-hover:scale-110",
                    currentPage === item.id ? "text-brand-primary" : "text-brand-muted group-hover:text-brand-text"
                  )} />
                  {item.label}
                </button>
              );
            })}
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

      <div className="p-4 border-t border-brand-border space-y-2">
        {isAdmin && (
          <button
            type="button"
            onClick={() => onPageChange('admin')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold transition-all border",
              currentPage === 'admin'
                ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20"
                : "bg-brand-bg/50 text-brand-muted border-brand-border hover:text-brand-text"
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
  );
}
