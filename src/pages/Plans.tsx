import React from 'react';
import { Rocket, Zap, Crown, Diamond, Check, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

// Número para contato
const SUPPORT_WHATSAPP = '5531984132145';

export default function Plans() {
  
  const handleUpgrade = async (plano: string, valor: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email || 'não identificado';
    const msg = `Olá! Quero assinar o Plano ${plano} R$ ${valor}/mês do FluxoAzul. Meu email: ${email}`;
    window.open(`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const planOptions = [
    {
      id: 'trial',
      name: 'Trial',
      price: '0',
      period: '/14 dias — sem cartão',
      emoji: '⚡',
      color: 'brand-muted',
      features: [
        'Até 10 clientes',
        'Cobranças ilimitadas',
        'Mensagens WhatsApp + Pix',
        'Dashboard de Performance',
        'Health Score de Dívidas'
      ],
      current: true
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '69,90',
      period: '/mês — cancele quando quiser',
      emoji: '👑',
      color: 'brand-primary',
      features: [
        'Clientes ILIMITADOS',
        'Módulo Único (Fluxo OU Agenda)',
        'Painel de Vitórias (Contador)',
        'Análise de Fluxo de Caixa',
        'Suporte Geral 9h-18h'
      ],
      popular: true
    },
    {
      id: 'business',
      name: 'Business',
      price: '97,90',
      period: '/mês',
      emoji: '🚀',
      color: 'blue-500',
      features: [
        'COMBO MASTER (Fluxo + Agenda)',
        'IA Persuasiva (Mensagens IA)',
        'Relatórios PDF Estratégicos',
        'Backup CSV Semanal',
        'Sua Marca (Logo) nos links'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '147,90',
      period: '/mês',
      emoji: '💎',
      color: 'brand-primary',
      features: [
        'COMBO ELITE (Tudo Liberado)',
        'IA de Alta Performance (Pro)',
        'Mentoria Individual Mensal',
        'Canal de Feedback Direto',
        'Acesso VIP a Novas IAs'
      ]
    }
  ];

  return (
    <div className="p-4 sm:p-8 space-y-8 pb-20">
      <header className="text-center max-w-2xl mx-auto space-y-4">
        <h2 className="text-2xl sm:text-4xl font-display font-black text-brand-text">Escolha seu Plano</h2>
        <p className="text-brand-muted font-sans text-sm sm:text-lg">Invista em organização e recupere muito mais do que paga. Acompanhe seu fluxo com quem entende de cobrança.</p>
      </header>

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
              {plan.features.map((feat) => (
                <li key={feat} className="flex items-start gap-2 text-xs text-brand-muted leading-tight font-medium">
                  <Check className="w-4 h-4 text-brand-primary shrink-0" />
                  {feat}
                </li>
              ))}
            </ul>

            <button 
              onClick={() => plan.id !== 'trial' && handleUpgrade(plan.name, plan.price)}
              disabled={plan.id === 'trial'}
              className={cn(
                "w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all transition-transform active:scale-95",
                plan.popular 
                  ? "bg-brand-primary hover:bg-brand-primary-hover text-white shadow-lg shadow-brand-primary/20" 
                  : plan.id === 'trial' ? "bg-brand-bg text-brand-muted border border-brand-border cursor-default" : "bg-brand-bg hover:bg-brand-bg/50 text-brand-text border border-brand-border"
              )}
            >
              {plan.id === 'trial' ? '🛡️ Plano Atual' : plan.id === 'premium' ? '💎 Assinar Elite' : `🔥 Pagar e Validar`}
            </button>
          </motion.div>
        ))}
      </div>

      <div className="bg-brand-card/50 border border-brand-border rounded-2xl p-6 text-center max-w-2xl mx-auto">
        <p className="text-xs text-brand-muted">
          Precisa de uma solução personalizada para grandes volumes? 
          <button className="text-brand-primary font-bold ml-1 hover:underline">Fale com um consultor especialista</button>
        </p>
      </div>
    </div>
  );
}
