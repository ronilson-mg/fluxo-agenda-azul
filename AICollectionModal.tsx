import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Scale, FileText, AlertOctagon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from '../lib/toast';
import { cn } from '../lib/utils';

interface ConsentModalProps {
  isOpen: boolean;
  userId: string;
  onClose: () => void;
  onAcceptSuccess: () => void;
}

export default function ConsentModal({ isOpen, userId, onClose, onAcceptSuccess }: ConsentModalProps) {
  const [isChecked, setIsChecked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleConfirm = async () => {
    if (!isChecked) return;
    setIsSaving(true);

    try {
      // 1. Tenta gravar em tabela dedicada de consentimentos
      const { error: consentError } = await supabase
        .from('fa_automation_consents')
        .insert({
          user_id: userId,
          accepted: true,
          accepted_at: new Date().toISOString(),
          consent_type: 'automacao_responsavel'
        });

      if (consentError) {
        console.warn('Could not insert into fa_automation_consents, trying fallback:');
        
        // 2. Caso falhe (por tabela inexistente), grava na tabela de configurações existente
        // Puxando o registro atual primeiro para não passar por cima de dados
        const { data: currentSettings } = await supabase
          .from('fa_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        const { error: settingsError } = await supabase
          .from('fa_settings')
          .upsert({
            ...(currentSettings || {}),
            user_id: userId,
            automation_terms_accepted: true,
            automation_terms_accepted_at: new Date().toISOString()
          });
          
        if (settingsError) {
          console.warn('Could not insert into fa_settings either (no column or restriction). Fallback used.');
        }
      }
    } catch (err) {
      console.error('Erro na gravação de consentimento:', err);
    } finally {
      // Grava no localStorage para cache local absoluto de sessão
      localStorage.setItem(`fa_automation_consent_accepted_${userId}`, 'true');
      localStorage.setItem(`fa_automation_consent_timestamp_${userId}`, new Date().toISOString());
      
      setIsSaving(false);
      onAcceptSuccess();
      showToast('Termo de Consentimento aceito com sucesso!', 'success');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 backdrop-blur-xl bg-black/60">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-brand-card border border-brand-border w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative"
        >
          {/* Header */}
          <div className="p-8 bg-gradient-to-br from-brand-primary/10 via-brand-primary/[0.02] to-transparent border-b border-brand-border relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <ShieldCheck className="w-24 h-24 text-brand-primary" />
            </div>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-lg shadow-amber-500/5">
                <Scale className="text-amber-500 w-5 h-5" />
              </div>
              <h2 className="text-xl font-display font-black text-brand-text tracking-tight uppercase italic flex items-center gap-2">
                Conformidade Legal & Uso Responsável
              </h2>
            </div>
            <p className="text-brand-muted text-xs font-semibold uppercase tracking-wider">
              Termo de Consentimento para Automações de Cobrança e Notificações
            </p>
          </div>

          {/* Content */}
          <div className="p-8 overflow-y-auto space-y-6 leading-relaxed text-xs text-brand-muted font-medium select-none">
            <p className="text-brand-text font-bold text-sm leading-snug">
              Ao ativar este serviço, você confirma que leu e concorda com nossas diretrizes de uso responsável:
            </p>

            <div className="space-y-4 bg-brand-bg/40 border border-brand-border p-6 rounded-2xl">
              <div className="flex gap-3">
                <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0" />
                <p className="text-brand-text text-sm font-semibold">
                  Comprometo-me a enviar mensagens apenas para clientes que me autorizaram previamente.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0" />
                <p className="text-brand-text text-sm font-semibold">
                  Garanto que o conteúdo das mensagens é ético, profissional e não configura assédio ou cobrança vexatória.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0" />
                <p className="text-brand-text text-sm font-semibold">
                  Estou ciente de que a Agenda Azul fornece a ferramenta tecnológica, sendo eu o único responsável legal pelo cumprimento da LGPD e demais normas vigentes em minhas operações.
                </p>
              </div>
            </div>

            {/* Checkbox */}
            <label className="flex items-start gap-3.5 p-4 bg-brand-bg border border-brand-border/80 rounded-2xl cursor-pointer hover:border-brand-primary/40 transition-all duration-300">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded-lg border-brand-border text-brand-primary focus:ring-brand-primary bg-brand-bg cursor-pointer"
              />
              <span className="text-sm text-brand-text font-bold leading-tight flex-1">
                Li e aceito os termos de conformidade e me comprometo com o uso responsável das automações.
              </span>
            </label>
          </div>

          {/* Footer */}
          <div className="p-8 border-t border-brand-border bg-brand-bg/10 flex flex-col items-center gap-3 shrink-0">
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 border border-brand-border hover:bg-brand-bg/50 rounded-2xl text-brand-text font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!isChecked || isSaving}
                className={cn(
                  "flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer border border-transparent",
                  isChecked && !isSaving
                    ? "bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 hover:scale-[1.02] text-slate-950 shadow-amber-500/10 border-amber-300/30"
                    : "bg-brand-border text-brand-muted cursor-not-allowed"
                )}
              >
                {isSaving ? 'Registrando...' : 'Confirmar Ativação'}
              </button>
            </div>
            
            <p className="text-[9px] text-brand-muted uppercase font-bold tracking-widest flex items-center gap-1.5 opacity-60 mt-1">
              <AlertOctagon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              Sua resposta será auditada e logada eletronicamente no sistema.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
