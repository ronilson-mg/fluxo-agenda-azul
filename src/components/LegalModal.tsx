import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Scale, CheckCircle2, RotateCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { showToast } from '../lib/toast';

interface LegalModalProps {
  onAccept: () => void;
}

export default function LegalModal({ onAccept }: LegalModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    // Só renderize se o localStorage não contiver o aceite
    const hasAccepted = localStorage.getItem('fa_legal_accepted');
    if (!hasAccepted) {
      setIsOpen(true);
    }
  }, []);

  const handleAccept = async () => {
    setIsAccepting(true);
    let ip = '0.0.0.0';
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      if (res.ok) {
        const data = await res.json();
        ip = data.ip || '0.0.0.0';
      }
    } catch (e) {
      console.warn('Could not fetch user IP for audit logging:', e);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      
      const { error } = await supabase
        .from('audit_legal_consent')
        .insert({
          ip_address: ip,
          accepted_at: new Date().toISOString(),
          user_id: user?.id || null,
          user_email: user?.email || null,
          terms_version: '1.0'
        });

      if (error) {
        console.warn('Could not log legal consent in Supabase. Proceeding to ensure client user flow.', error.message);
      }
    } catch (dbErr) {
      console.error('Database insertion error for consent audit:', dbErr);
    } finally {
      // Salva o aceite no localStorage
      localStorage.setItem('fa_legal_accepted', 'true');
      localStorage.setItem('fa_legal_timestamp', new Date().toISOString());
      setIsOpen(false);
      // Dispara a função onAccept passada por props
      onAccept();
      setIsAccepting(false);
      showToast('Termos aceitos com sucesso!', 'success');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="legal-modal-backdrop"
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/60"
      >
        <motion.div
          id="legal-modal-container"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="max-w-md w-full bg-brand-bg border border-brand-border p-8 rounded-3xl shadow-2xl flex flex-col relative text-center"
        >
          {/* Accent icon banner */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20 mb-6 shadow-inner">
            <Scale className="text-brand-primary w-7 h-7" />
          </div>

          <h2 className="text-lg font-display font-black text-brand-text mb-4 tracking-tight uppercase italic">
            Termos & Conformidade Legal
          </h2>

          <div className="bg-brand-card/50 border border-brand-border/60 rounded-2xl p-5 mb-6 text-left">
            <p className="text-brand-text text-xs leading-relaxed font-bold">
              Para continuar utilizando o Fluxo Azul e a Agenda Azul, por favor, aceite nossos Termos de Uso e Política de Privacidade em conformidade com a LGPD.
            </p>
          </div>

          <div className="space-y-4 mb-8 text-left text-[11px] text-brand-muted leading-relaxed font-medium">
            <div className="flex gap-3">
              <ShieldCheck className="text-brand-primary w-4 h-4 shrink-0 mt-0.5" />
              <p>Seus dados e de seus clientes estão protegidos de acordo com padrões de criptografia e conformidade jurídica.</p>
            </div>
          </div>

          {/* Action button */}
          <button
            id="btn-accept-legal"
            type="button"
            onClick={handleAccept}
            disabled={isAccepting}
            className={cn(
              "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2.5 shadow-xl select-none cursor-pointer border border-transparent",
              isAccepting
                ? "bg-brand-border text-brand-muted cursor-not-allowed"
                : "bg-brand-primary text-white hover:scale-[1.02] active:scale-[0.98] shadow-brand-primary/25 hover:brightness-110"
            )}
          >
            {isAccepting ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin text-brand-muted" />
                Registrando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                EU ACEITO E COMPREENDO
              </>
            )}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
