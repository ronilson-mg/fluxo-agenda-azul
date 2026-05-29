import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Copy, Check, Share2, X, Users, MessageSquare, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from '../lib/toast';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function ReferralModal({ isOpen, onClose, userId }: ReferralModalProps) {
  const [copied, setCopied] = useState(false);
  const [totalReferrals, setTotalReferrals] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      fetchReferralsCount();
    }
  }, [isOpen, userId]);

  const fetchReferralsCount = async () => {
    try {
      setLoading(true);
      const { count, error } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', userId);

      if (error) {
        console.error('Error fetching referrals count:', error);
        setTotalReferrals(0);
      } else {
        setTotalReferrals(count || 0);
      }
    } catch (err) {
      console.error('Failed to query referrals:', err);
      setTotalReferrals(0);
    } finally {
      setLoading(false);
    }
  };

  const referralLink = `${window.location.origin}/register?ref=${userId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      showToast('Link de indicação copiado! 🚀', 'success');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      showToast('Erro ao copiar link', 'error');
    }
  };

  const handleShareWhatsApp = () => {
    const textMsg = `Olá! 👋 Estou usando o Fluxo Azul & Agenda Azul para automatizar minhas cobranças e agendamentos e adorei! \n\nCadastre-se pelo meu link exclusivo e comece a profissionalizar seu negócio MEI agora mesmo: \n\n👉 {referralLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(textMsg)}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-brand-bg/90 backdrop-blur-sm z-[115] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-brand-card border border-brand-border rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl relative animate-in fade-in"
      >
        {/* Top Header Background with nice Gradient */}
        <div className="p-8 border-b border-brand-border flex items-center justify-between bg-gradient-to-r from-brand-primary/10 via-brand-primary/5 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-primary/20 rounded-2xl flex items-center justify-center border border-brand-primary/30 text-brand-primary shadow-lg shadow-brand-primary/10">
              <Gift className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h3 className="font-display font-black text-brand-text uppercase text-base sm:text-lg tracking-wider leading-none">Indique e Ganhe</h3>
              <p className="text-[10px] text-brand-muted uppercase font-black tracking-widest mt-1.5">Conecte amigos, multiplique seus dias!</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-brand-muted hover:text-brand-text transition-all bg-brand-bg/50 border border-brand-border w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-8 space-y-6">
          {/* Main program description text */}
          <div className="space-y-2 text-center sm:text-left bg-brand-primary/5 border border-brand-primary/15 rounded-2xl p-5">
            <h4 className="text-sm font-black text-brand-primary uppercase tracking-wider flex items-center gap-2 justify-center sm:justify-start">
              <span>🎁</span> ACESSO ELITE COMPARTILHADO
            </h4>
            <p className="text-xs text-brand-text leading-relaxed">
              Indique um amigo e ganhe <strong className="text-brand-primary font-bold">30 dias de acesso Elite</strong> adicionais em sua assinatura assim que ele se cadastrar!
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-4 bg-brand-bg/60 p-4 border border-brand-border rounded-2xl">
            <div className="text-center border-r border-brand-border/60">
              <span className="text-[10px] uppercase font-black tracking-widest text-brand-muted block">Minhas Indicações</span>
              <span className="text-2xl font-display font-black text-brand-text block mt-1">
                {loading ? (
                  <span className="text-xs text-brand-muted animate-pulse">Consultando...</span>
                ) : (
                  totalReferrals ?? 0
                )}
              </span>
            </div>
            <div className="text-center flex flex-col justify-center items-center">
              <span className="text-[10px] uppercase font-black tracking-widest text-brand-muted block">Bônus Acumulado</span>
              <span className="text-xs font-black text-brand-primary uppercase tracking-wide flex items-center gap-1.5 mt-1.5 bg-brand-primary/15 px-3 py-1 rounded-full border border-brand-primary/10">
                <Award className="w-3.5 h-3.5" />
                {loading ? '...' : `${(totalReferrals ?? 0) * 30} dias`}
              </span>
            </div>
          </div>

          {/* Referral Link Field */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted block">Seu Link Exclusivo de Indicação</span>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 bg-brand-bg border border-brand-border rounded-xl px-4 py-3 flex items-center justify-between text-xs font-mono text-brand-muted select-all overflow-x-auto min-h-[46px] scrollbar-none whitespace-nowrap">
                {referralLink}
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="bg-brand-bg hover:bg-brand-bg/80 border border-brand-border text-brand-text text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {copied ? <Check className="w-4 h-4 text-brand-primary" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar Link'}
              </button>
            </div>
          </div>

          {/* Sharing Actions */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="w-full bg-green-500 hover:bg-green-600 hover:brightness-105 active:scale-[0.99] hover:shadow-green-500/15 text-white py-3.5 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-green-500/10 cursor-pointer border border-green-400/20"
          >
            <MessageSquare className="w-4 h-4 fill-current" />
            Compartilhar no WhatsApp
          </button>
        </div>

        {/* Footer info lock */}
        <div className="p-6 border-t border-brand-border bg-brand-bg/30 flex items-center justify-center gap-2">
          <Users className="w-4 h-4 text-brand-muted opacity-60" />
          <span className="text-[9px] text-brand-muted uppercase font-black tracking-widest">Sem limites de indicações. Indique quantos quiser!</span>
        </div>
      </motion.div>
    </div>
  );
}
