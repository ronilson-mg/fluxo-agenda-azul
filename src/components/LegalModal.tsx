import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Scale, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface LegalModalProps {
  onAccept: () => void;
}

export default function LegalModal({ onAccept }: LegalModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [checkedTerms, setCheckedTerms] = useState({
    responsibility: false,
    lgpd: false,
    commercialHours: false
  });

  useEffect(() => {
    const hasAccepted = localStorage.getItem('fa_legal_accepted');
    if (!hasAccepted) {
      setIsOpen(true);
    }
  }, []);

  const handleAccept = () => {
    if (checkedTerms.responsibility && checkedTerms.lgpd && checkedTerms.commercialHours) {
      localStorage.setItem('fa_legal_accepted', 'true');
      localStorage.setItem('fa_legal_timestamp', new Date().toISOString());
      setIsOpen(false);
      onAccept();
    }
  };

  if (!isOpen) return null;

  const allChecked = checkedTerms.responsibility && checkedTerms.lgpd && checkedTerms.commercialHours;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-black/60">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-brand-card border border-brand-border w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-8 bg-gradient-to-br from-brand-primary/10 to-transparent border-b border-brand-border relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <ShieldCheck className="w-24 h-24 text-brand-primary" />
            </div>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30">
                <Scale className="text-brand-primary w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-brand-text tracking-tight uppercase italic">
                Termo de Conformidade Legal
              </h2>
            </div>
            <p className="text-brand-muted text-sm font-medium">
              Aviso obrigatório de segurança para Fluxo Azul e Agenda Azul.
            </p>
          </div>

          <div className="p-8 overflow-y-auto space-y-6">
            <div className="bg-brand-bg/50 border border-brand-border rounded-2xl p-6 space-y-4">
              <div className="flex gap-4">
                <AlertTriangle className="w-6 h-6 text-orange-500 shrink-0" />
                <div className="space-y-2">
                  <h3 className="font-bold text-brand-text uppercase text-xs tracking-widest">Responsabilidade do Usuário</h3>
                  <p className="text-sm text-brand-muted leading-relaxed">
                    O <strong>Fluxo Azul</strong> e a <strong>Agenda Azul</strong> são plataformas tecnológicas de suporte. O usuário é o único e integral responsável pelo conteúdo, veracidade e licitude das comunicações. As plataformas não possuem qualquer vínculo com as relações comerciais entre você e seus clientes.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <ShieldCheck className="w-6 h-6 text-brand-primary shrink-0" />
                <div className="space-y-2">
                  <h3 className="font-bold text-brand-text uppercase text-xs tracking-widest">Conformidade LGPD & CDC</h3>
                  <p className="text-sm text-brand-muted leading-relaxed">
                    O usuário compromete-se a cumprir a LGPD (Lei 13.709/2018) e o CDC, abstendo-se de práticas vexatórias. As plataformas não se responsabilizam por uso indevido, linguagem abusiva ou descumprimento de normas vigentes pelo usuário.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 py-4">
              <label className="flex items-start gap-4 p-4 rounded-xl hover:bg-brand-bg/50 transition-colors cursor-pointer group">
                <input type="checkbox" checked={checkedTerms.responsibility} onChange={(e) => setCheckedTerms(prev => ({ ...prev, responsibility: e.target.checked }))} className="mt-1 w-5 h-5 rounded border-brand-border text-brand-primary focus:ring-brand-primary bg-brand-bg" />
                <span className="text-sm text-brand-text font-medium leading-tight select-none">
                  Entendo que sou o único responsável legal e isento o Fluxo Azul e a Agenda Azul de qualquer responsabilidade civil ou criminal.
                </span>
              </label>

              <label className="flex items-start gap-4 p-4 rounded-xl hover:bg-brand-bg/50 transition-colors cursor-pointer group">
                <input type="checkbox" checked={checkedTerms.lgpd} onChange={(e) => setCheckedTerms(prev => ({ ...prev, lgpd: e.target.checked }))} className="mt-1 w-5 h-5 rounded border-brand-border text-brand-primary focus:ring-brand-primary bg-brand-bg" />
                <span className="text-sm text-brand-text font-medium leading-tight select-none">
                  Comprometo-me a respeitar a LGPD e a não praticar cobranças abusivas ou vexatórias.
                </span>
              </label>

              <label className="flex items-start gap-4 p-4 rounded-xl hover:bg-brand-bg/50 transition-colors cursor-pointer group">
                <input type="checkbox" checked={checkedTerms.commercialHours} onChange={(e) => setCheckedTerms(prev => ({ ...prev, commercialHours: e.target.checked }))} className="mt-1 w-5 h-5 rounded border-brand-border text-brand-primary focus:ring-brand-primary bg-brand-bg" />
                <span className="text-sm text-brand-text font-medium leading-tight select-none">
                  Estou ciente que o sistema limita disparos ao horário comercial para evitar importunação.
                </span>
              </label>
            </div>
          </div>

          <div className="p-8 border-t border-brand-border bg-brand-bg/20 flex flex-col items-center gap-4">
            <button
              onClick={handleAccept}
              disabled={!allChecked}
              className={cn(
                "w-full py-4 rounded-2xl font-black uppercase tracking-[3px] transition-all flex items-center justify-center gap-3 shadow-xl",
                allChecked 
                  ? "bg-brand-primary text-white hover:brightness-110 shadow-brand-primary/20" 
                  : "bg-brand-border text-brand-muted cursor-not-allowed"
              )}
            >
              <CheckCircle2 className="w-6 h-6" />
              Eu Aceito e Desejo Acessar
            </button>
            <p className="text-[10px] text-brand-muted uppercase font-black tracking-widest text-center opacity-50">
              IP: Registrado para fins de auditoria criminal
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
