import React, { useState, useEffect } from 'react';
import { Rocket, Zap, Crown, Diamond, Check, Calendar, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

// Número para contato
const SUPPORT_WHATSAPP = '5531984132145';

interface PlansProps {
  onPageChange?: (page: 'dashboard' | 'clients' | 'invoices' | 'appointments' | 'services' | 'plans' | 'settings' | 'admin' | 'reports') => void;
  activeModule?: 'finance' | 'agenda';
}

export default function Plans({ onPageChange, activeModule = 'finance' }: PlansProps) {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('fa_subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
    
    if (data) {
      const normalizedData = {
        ...data,
        data_expiracao_agenda: data.data_expiracao_agenda || data.data_expiracao
      };
      setSubscription(normalizedData);
    } else {
      setSubscription(null);
    }
    setLoading(false);
  };

  const handleUpgrade = async (plano: string, valor: string, modulo?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email || 'não identificado';
    const moduloStr = modulo ? ` para o módulo ${modulo.toUpperCase()}` : '';
    let msg = `Olá! Quero assinar o Plano ${plano}${moduloStr} por R$ ${valor}/mês. Meu email: ${email}`;
    if (plano.toLowerCase() === 'premium') {
      msg = `Olá Ronilson! Quero assinar o Suporte VIP Premium por R$ ${valor}/mês e agendar minha Consultoria Estratégica de Implantação (Setup) e o Suporte VIP Prioritário (Fase de Onboarding). Meu email: ${email}`;
    }
    window.open(`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const isExpired = (date?: string) => {
    if (!date) return true;
    return new Date(date) < new Date();
  };

  const formatDate = (date?: string) => {
    if (!date) return 'Nunca Ativado';
    return format(new Date(date), 'dd/MM/yyyy');
  };

  const planOptions = [
    {
      id: 'trial',
      name: 'Trial',
      price: '0',
      period: '/14 dias — sem cartão',
      emoji: '⚡',
      color: 'white',
      features: [
        'Até 5 clientes',
        'Cobranças ilimitadas',
        'Mensagens WhatsApp + Pix',
        'Dashboard de Performance',
        'Health Score de Dívidas'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '69,90',
      period: '/mês — escolha um módulo',
      emoji: '👑',
      color: 'brand-primary',
      features: [
        'Clientes ILIMITADOS',
        'Módulo Único: Fluxo OU Agenda',
        'Centro de Inteligência (Básico)',
        'Painel de Vitórias (Contador)',
        'Suporte Geral 9h-18h'
      ]
    },
    {
      id: 'business',
      name: 'Business',
      price: '97,90',
      period: '/mês',
      emoji: '🚀',
      color: 'blue-500',
      features: [
        'COMBO MASTER: Fluxo + Agenda',
        'Exportação PDF Profissional',
        'Customização de Logo (Marca)',
        'IA Persuasiva (Autocobrança)',
        'Backup Semanal Automático',
        '✅ Agendamento Inteligente'
      ],
      popular: true
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '147,90',
      period: '/mês',
      emoji: '💎',
      color: 'brand-primary',
      features: [
        'COMBO ELITE: Tudo Liberado',
        'IA de Alta Performance (Pro)',
        'Consultoria Estratégica de Implantação (Setup)',
        'Acesso Antecipado a Novas IAs',
        'Suporte VIP Prioritário (Fase de Onboarding)',
        '✅ Agendamento Inteligente PREMIUM (IA Avançada)',
        '✅ Acesso Exclusivo ao Diretório Premium'
      ]
    }
  ];

  return (
    <div className="p-4 sm:p-8 space-y-8 pb-20">
      <header className="text-center max-w-2xl mx-auto space-y-4">
        <h2 className="text-2xl sm:text-4xl font-display font-black text-brand-text">Gestão Profissional para seu Negócio</h2>
        <p className="text-brand-muted font-sans text-sm sm:text-lg">Invista em organização e recupere muito mais do que paga.</p>
      </header>

      {subscription && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <div className={cn(
            "p-4 rounded-2xl border flex items-center justify-between",
            isExpired(subscription.data_expiracao) ? "border-brand-danger/20 bg-brand-danger/5" : "border-brand-primary/20 bg-brand-primary/5"
          )}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">💰</span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Fluxo Azul (Financeiro)</p>
                <p className={cn("text-xs font-bold", isExpired(subscription.data_expiracao) ? "text-brand-danger" : "text-brand-primary")}>
                  {isExpired(subscription.data_expiracao) ? 'Vencido em:' : 'Expira em:'} {formatDate(subscription.data_expiracao)}
                </p>
              </div>
            </div>
            {isExpired(subscription.data_expiracao) && <AlertCircle className="w-5 h-5 text-brand-danger animate-pulse" />}
          </div>

          <div className={cn(
            "p-4 rounded-2xl border flex items-center justify-between",
            isExpired(subscription.data_expiracao_agenda) ? "border-brand-danger/20 bg-brand-danger/5" : "border-brand-primary/20 bg-brand-primary/5"
          )}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">📅</span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Agenda Azul (Horários)</p>
                <p className={cn("text-xs font-bold", isExpired(subscription.data_expiracao_agenda) ? "text-brand-danger" : "text-brand-primary")}>
                  {isExpired(subscription.data_expiracao_agenda) ? 'Vencido em:' : 'Expira em:'} {formatDate(subscription.data_expiracao_agenda)}
                </p>
              </div>
            </div>
            {isExpired(subscription.data_expiracao_agenda) && <AlertCircle className="w-5 h-5 text-brand-danger animate-pulse" />}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {planOptions.map((plan) => (
          <motion.div
            key={plan.id}
            whileHover={{ y: -5 }}
            className={cn(
              "bg-brand-card border rounded-2xl p-8 relative flex flex-col group",
              plan.popular ? "border-brand-primary shadow-[0_0_40px_rgba(0,168,132,0.1)]" : "border-brand-border"
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-lg">
                ⭐ MAIS POPULAR
              </div>
            )}

            <div className="mb-6">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 bg-brand-bg border border-brand-border text-2xl shadow-sm"
              )}>
                {plan.emoji}
              </div>
              <h3 className="text-xl font-display font-bold text-brand-text uppercase">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-brand-text text-sm font-bold uppercase">R$</span>
                <span className={cn("text-4xl font-display font-black", plan.popular ? "text-brand-primary" : "text-brand-text")}>{plan.price}</span>
              </div>
              <p className="text-xs text-brand-muted mt-1 font-medium">{plan.period}</p>
            </div>

            <ul className="flex-1 space-y-4 mb-8">
              {plan.features.map((feat) => {
                const isNewHighlight = feat.startsWith('✅');
                const cleanFeat = isNewHighlight ? feat.replace(/^✅\s*/, '') : feat;
                return (
                  <li key={feat} className={cn(
                    "flex items-start gap-2.5 text-xs font-bold leading-tight",
                    isNewHighlight ? "text-amber-500" : "text-brand-muted"
                  )}>
                    <div className="w-4 h-4 flex items-center justify-center shrink-0 select-none mt-0.5">
                      {isNewHighlight ? (
                        <span className="text-xs">✅</span>
                      ) : (
                        <Check className="w-4 h-4 text-brand-primary" />
                      )}
                    </div>
                    <span className="flex-1">{cleanFeat}</span>
                  </li>
                );
              })}
            </ul>

            {plan.id === 'pro' ? (
              <div className="space-y-2">
                <button 
                  onClick={() => handleUpgrade(plan.name, plan.price, 'Fluxo')}
                  className="w-full py-4 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-brand-primary/20 active:scale-95"
                >
                  🚀 Ativar Fluxo Azul
                </button>
                <button 
                  onClick={() => handleUpgrade(plan.name, plan.price, 'Agenda')}
                  className="w-full py-4 bg-brand-bg hover:bg-brand-bg/50 text-brand-text border border-brand-border rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                >
                  📅 Ativar Agenda Azul
                </button>
              </div>
            ) : (
              <button 
                onClick={() => {
                  if (plan.id === 'trial') {
                    if (onPageChange) onPageChange('dashboard');
                  } else {
                    handleUpgrade(plan.name, plan.price);
                  }
                }}
                className={cn(
                  "w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all transition-transform active:scale-95 cursor-pointer",
                  plan.id === 'trial' 
                    ? "bg-brand-primary hover:bg-brand-primary-hover text-white shadow-lg shadow-brand-primary/20" 
                    : plan.id === 'premium' 
                      ? "bg-brand-primary hover:bg-brand-primary-hover text-white shadow-lg shadow-brand-primary/20"
                      : "bg-brand-bg hover:bg-brand-bg/50 text-brand-text border border-brand-border"
                )}
              >
                {plan.id === 'trial' 
                  ? (activeModule === 'finance' ? '📈 Começar a Operar (Trial)' : '📅 Começar a Operar (Trial)') 
                  : plan.id === 'premium' 
                    ? '🎯 SUPORTE VIP PREMIUM' 
                    : `🔥 Pagar e Validar`}
              </button>
            )}
          </motion.div>
        ))}
      </div>

      <div className="bg-brand-card/50 border border-brand-border rounded-2xl p-6 text-center max-w-2xl mx-auto">
        <p className="text-xs text-brand-muted">
          Precisa de uma solução personalizada para grandes volumes? 
          <button 
            onClick={() => window.open(`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Olá Ronilson! Tenho interesse em adquirir o Agenda Azul e o Fluxo Azul, e gostaria de saber mais informações sobre as soluções.')}`, '_blank')}
            className="text-brand-primary font-bold ml-1 hover:underline cursor-pointer"
          >
            Fale com um consultor especialista
          </button>
        </p>
      </div>
    </div>
  );
}
