import React, { useState } from 'react';
import { Sparkles, MessageSquare, X, Send, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateCollectionMessage } from '../services/aiService';
import ConsentModal from './ConsentModal';
import { Invoice } from '../types';
import { formatCurrency, formatDate, checkBusinessHours } from '../lib/utils';
import { showToast } from '../lib/toast';

interface AICollectionModalProps {
  invoice: Invoice | null;
  clientPhone?: string;
  onClose: () => void;
  isPremium?: boolean;
  pixKey?: string;
  companyName?: string;
}

type Tone = 'friendly' | 'firm' | 'urgent';

export function AICollectionModal({ invoice, clientPhone, onClose, isPremium = false, pixKey, companyName }: AICollectionModalProps) {
  const [tone, setTone] = useState<Tone>('friendly');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConsent, setShowConsent] = useState(false);

  if (!invoice) return null;

  const handleGenerate = async () => {
    const isConsentAccepted = localStorage.getItem(`fa_automation_consent_accepted_${invoice.user_id}`) === 'true';
    if (!isConsentAccepted) {
      setShowConsent(true);
      return;
    }

    const hours = checkBusinessHours();
    if (!hours.isAllowed) {
      showToast(hours.message || 'Fora do horário comercial', 'error');
      return;
    }

    setLoading(true);
    try {
      const msg = await generateCollectionMessage(
        invoice.client_name,
        invoice.amount,
        formatDate(invoice.due_date),
        tone,
        isPremium,
        pixKey,
        companyName
      );
      setGeneratedMessage(msg);
    } catch (err) {
      showToast('Erro ao gerar mensagem', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (!generatedMessage) return;

    const isConsentAccepted = localStorage.getItem(`fa_automation_consent_accepted_${invoice.user_id}`) === 'true';
    if (!isConsentAccepted) {
      setShowConsent(true);
      return;
    }

    const hours = checkBusinessHours();
    if (!hours.isAllowed) {
      showToast(hours.message || 'Fora do horário comercial', 'error');
      return;
    }

    // No more native confirm to avoid iframe blocks
    const cleanPhone = clientPhone?.replace(/\D/g, '') || '';
    const whatsappUrl = cleanPhone 
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(generatedMessage)}`
      : `https://wa.me/?text=${encodeURIComponent(generatedMessage)}`;
      
    window.open(whatsappUrl, '_blank');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-brand-bg/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-brand-card border border-brand-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
        >
          <div className="p-6 border-b border-brand-border flex items-center justify-between bg-brand-primary/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center border border-brand-primary/20">
                <Sparkles className="w-6 h-6 text-brand-primary" />
              </div>
              <div>
                <h3 className="font-display font-bold text-brand-text">Persuasão por IA</h3>
                <p className="text-[10px] text-brand-muted uppercase font-black tracking-widest mt-0.5">Potencialize sua Cobrança</p>
              </div>
            </div>
            <button onClick={onClose} className="text-brand-muted hover:text-brand-text transition-all">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-brand-bg/50 rounded-2xl p-4 border border-brand-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-brand-muted uppercase">Devedor</span>
                <span className="text-[10px] font-bold text-brand-primary uppercase">Elite Tech</span>
              </div>
              <p className="text-sm font-bold text-brand-text truncate">{invoice.client_name}</p>
              <p className="text-xl font-display font-black text-brand-text mt-1">{formatCurrency(invoice.amount)}</p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest flex items-center gap-2">
                <Wand2 className="w-3 h-3 text-brand-primary" /> Escolha o Tom da Cobrança
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['friendly', 'firm', 'urgent'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={cn(
                      "py-3 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all",
                      tone === t 
                        ? "bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20" 
                        : "bg-brand-card text-brand-muted border-brand-border hover:border-brand-primary/30"
                    )}
                  >
                    {t === 'friendly' ? '😃 Amigável' : t === 'firm' ? '🧐 Firme' : '🚨 Crítico'}
                  </button>
                ))}
              </div>
            </div>

            {generatedMessage ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4"
              >
                <div className="bg-white/5 border border-brand-primary/20 rounded-2xl p-4 relative">
                  <textarea
                    value={generatedMessage}
                    onChange={(e) => setGeneratedMessage(e.target.value)}
                    className="w-full bg-transparent text-sm text-brand-text font-sans leading-relaxed focus:outline-none min-h-[120px] resize-none"
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  </div>
                </div>
                <button
                  onClick={handleSend}
                  className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-black text-xs uppercase tracking-widest py-4 rounded-xl shadow-xl shadow-brand-primary/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <MessageSquare className="w-5 h-5" /> Abrir no WhatsApp Web
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full text-brand-muted hover:text-brand-primary text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? 'Reescrevendo...' : 'Gerar nova opção com IA'}
                </button>
              </motion.div>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary border-2 border-dashed border-brand-primary/30 font-black text-xs uppercase tracking-widest py-8 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all"
              >
                {loading ? (
                  <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Sparkles className="w-8 h-8" />
                    Criar Mensagem Persuasiva com IA
                  </>
                )}
              </button>
            )}
          </div>

          <div className="p-4 bg-brand-bg/30 text-center">
             <p className="text-[9px] text-brand-muted font-bold uppercase tracking-tighter">
               ⚡ Tecnologia Gemini AI integrada • 100% Gratuito para Business e Elite
             </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Helper local since we can't easily import from utils here if not exported
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
