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
  const [isChecked, setIsChecked] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    const hasAccepted = localStorage.getItem('fa_legal_accepted');
    if (!hasAccepted) {
      setIsOpen(true);
    }
  }, []);

  // ==========================================
  // FUNÇÃO DE REGISTRO E AUDITORIA AUTOMÁTICA
  // ==========================================
  const handleAccept = async () => {
    if (!isChecked) {
      showToast('Você precisa aceitar os termos antes de prosseguir.', 'error');
      return;
    }

    setIsAccepting(true);
    let ip = '0.0.0.0';
    try {
      // Captura dinâmica do IP de forma assíncrona
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
      
      // Persistência juridicamente blindada no banco de dados
      const { error } = await supabase
        .from('audit_legal_consent')
        .insert({
          ip_address: ip,
          accepted_at: new Date().toISOString(),
          user_id: user?.id || null,
          user_email: user?.email || null,
          terms_version: '1.0' // Registro exato da versão dos textos
        });

      if (error) {
        console.warn('Could not log legal consent in Supabase. Proceeding to ensure client user flow.', error.message);
      }
    } catch (dbErr) {
      console.error('Database insertion error for consent audit:', dbErr);
    } finally {
      // Salvaguarda local
      localStorage.setItem('fa_legal_accepted', 'true');
      localStorage.setItem('fa_legal_timestamp', new Date().toISOString());
      setIsOpen(false);
      onAccept();
      setIsAccepting(false);
      showToast('Termos aceitos com sucesso! 🛡️', 'success');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="legal-modal-backdrop"
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md bg-brand-bg/90"
      >
        <motion.div
          id="legal-modal-container"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="max-w-2xl w-full bg-brand-card border border-brand-border p-6 sm:p-8 rounded-[2rem] shadow-2xl flex flex-col relative"
        >
          {/* Accent icon banner */}
          <div className="flex items-center gap-4 mb-6 pb-4 border-b border-brand-border">
            <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20 shrink-0">
              <Scale className="text-brand-primary w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-display font-black text-brand-text tracking-tight uppercase">
                Conformidade & Blindagem Jurídica
              </h2>
              <p className="text-[10px] text-brand-muted uppercase font-black tracking-wider mt-0.5">TERMOS DE USO & LGPD</p>
            </div>
          </div>

          <p className="text-brand-text text-xs leading-relaxed font-bold mb-4 bg-brand-primary/5 border border-brand-primary/15 rounded-xl p-4">
            Atenção: Para continuar navegando e usufruindo das soluções automatizadas, leia os termos atentamente e confirme seu consentimento expresso abaixo.
          </p>

          {/* Legal document container (scrollable max-h-300px) */}
          <div 
            id="legal-text-container"
            className="flex-1 bg-brand-bg/60 border border-brand-border/60 rounded-2xl p-4 sm:p-5 mb-6 overflow-y-auto max-h-[300px] text-[11px] text-brand-muted leading-relaxed font-medium space-y-4 scrollbar-thin scrollbar-thumb-brand-border scrollbar-track-transparent pr-2"
          >
            <div className="text-center font-display font-black text-brand-text text-xs uppercase tracking-wider mb-2 border-b border-brand-border/40 pb-2">
              TERMOS DE USO, POLÍTICA DE PRIVACIDADE E ISENÇÃO DE RESPONSABILIDADE
            </div>

            <p>
              <strong className="text-brand-text uppercase font-bold text-[10px] block mb-1">1. NATUREZA E LIMITAÇÃO DAS FERRAMENTAS:</strong>
              O Fluxo Azul e a Agenda Azul são softwares de gestão e suporte operacional disponibilizados na modalidade "como estão" (as-is). As ferramentas têm caráter puramente organizacional e informativo, não configurando assessoria jurídica, contábil, financeira ou profissional.
            </p>

            <div className="space-y-2">
              <strong className="text-brand-text uppercase font-bold text-[10px] block">2. ISENÇÃO DE RESPONSABILIDADE ESPECÍFICA:</strong>
              <p className="pl-3 border-l-2 border-brand-primary/40">
                <span className="text-brand-text font-bold">Fluxo Azul:</span> O usuário é o único responsável pela legalidade das cobranças realizadas. O software não garante o sucesso na recuperação de valores e o Fluxo Azul não se responsabiliza por conflitos, danos ou sanções decorrentes de cobranças indevidas, abusivas ou realizadas em desconformidade com a legislação pelo usuário.
              </p>
              <p className="pl-3 border-l-2 border-brand-primary/40">
                <span className="text-brand-text font-bold">Agenda Azul:</span> O Agenda Azul não responde por falhas de comunicação entre o usuário e seus clientes, nem por prejuízos financeiros oriundos de agendamentos não honrados, ausências ou erros operacionais na gestão da agenda.
              </p>
            </div>

            <p>
              <strong className="text-brand-text uppercase font-bold text-[10px] block mb-1">3. PROTEÇÃO DE DADOS (LGPD):</strong>
              Em estrita conformidade com a Lei nº 13.709/2018 (LGPD), o Fluxo Azul e a Agenda Azul atuam como operadores de dados, sendo o usuário o controlador responsável pela coleta, tratamento e legalidade dos dados inseridos. O usuário garante possuir base legal para o tratamento dos dados de seus próprios clientes e isenta o Fluxo Azul e a Agenda Azul de qualquer responsabilidade sobre o uso, armazenamento ou eventual vazamento de dados causado por gestão inadequada do próprio usuário.
            </p>

            <p>
              <strong className="text-brand-text uppercase font-bold text-[10px] block mb-1">4. LIMITAÇÃO DE RESPONSABILIDADE CIVIL:</strong>
              Fica excluída qualquer responsabilidade dos desenvolvedores por danos diretos, indiretos, incidentais ou lucros cessantes, sob qualquer hipótese, decorrentes do uso ou da impossibilidade de uso das ferramentas.
            </p>

            <p className="border-t border-brand-border/40 pt-2 font-semibold">
              <strong className="text-brand-text uppercase font-bold text-[10px] block mb-1">5. CONSENTIMENTO E ACEITE:</strong>
              Ao marcar a caixa de seleção e clicar em "EU ACEITO COM O CHECKBOX ATIVO", você declara ter lido, compreendido e aceitado todos os termos, eximindo o Fluxo Azul e a Agenda Azul de qualquer pretensão indenizatória presente ou futura.
            </p>
          </div>

          {/* Consent Checkbox */}
          <div className="flex items-start gap-3 mb-6 bg-brand-bg/40 p-3 sm:p-4 rounded-xl border border-brand-border/50">
            <input 
              type="checkbox" 
              id="checkbox-legal-consent"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="mt-0.5 w-4.5 h-4.5 rounded text-brand-primary focus:ring-brand-primary/30 border-brand-border bg-brand-bg shrink-0 cursor-pointer"
            />
            <label 
              htmlFor="checkbox-legal-consent" 
              className="text-[11px] text-brand-text/90 font-bold leading-normal cursor-pointer select-none"
            >
              Li, compreendi e concordo integralmente com os Termos de Uso, Política de Privacidade e Isenção de Responsabilidade do Fluxo Azul e Agenda Azul.
            </label>
          </div>

          {/* Action button */}
          <button
            id="btn-accept-legal"
            type="button"
            onClick={handleAccept}
            disabled={!isChecked || isAccepting}
            className={cn(
              "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2.5 shadow-xl select-none border border-transparent cursor-pointer",
              (!isChecked || isAccepting)
                ? "bg-brand-border text-brand-muted/70 cursor-not-allowed shadow-none"
                : "bg-brand-primary text-white hover:scale-[1.01] active:scale-[0.99] shadow-brand-primary/20 hover:brightness-105"
            )}
          >
            {isAccepting ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin text-brand-muted" />
                Registrando Consentimento...
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
