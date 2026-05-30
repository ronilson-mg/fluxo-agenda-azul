import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Settings as SettingsType, Subscription } from '../types';
import { 
  Building, 
  Wallet, 
  Phone, 
  Save, 
  Upload, 
  Image as ImageIcon,
  ShieldCheck,
  Zap,
  MessageSquare,
  FileText,
  Download,
  Database
} from 'lucide-react';
import { motion } from 'motion/react';
import { showToast } from '../lib/toast';
import { cn } from '../lib/utils';

interface SettingsProps {
  userId: string;
  subscription?: Subscription | null;
}

export default function Settings({ userId, subscription: initialSubscription }: SettingsProps) {
  const [settings, setSettings] = useState<Partial<SettingsType>>({
    company_name: '',
    pix_key: '',
    support_phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    fetchSettings();
    if (initialSubscription) {
      const data = initialSubscription;
      const isAdmin = data.email?.toLowerCase() === 'ronilsonaugustomg@gmail.com';
      setSubscription(isAdmin ? { ...data, plano: 'premium' } : data);
    } else {
      fetchSubscription();
    }
  }, [userId, initialSubscription]);

  const fetchSubscription = async () => {
    const { data: { session: activeSession } } = await supabase.auth.getSession();
    const userEmail = (activeSession?.user?.email || '').toLowerCase();
    const isAdmin = userEmail === 'ronilsonaugustomg@gmail.com';

    const { data } = await supabase
      .from('fa_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (data) {
      setSubscription(isAdmin ? { ...data, plano: 'premium', email: userEmail } : data);
    } else {
      setSubscription({
        id: 'user-temp',
        user_id: userId,
        email: userEmail,
        plano: isAdmin ? 'premium' : 'trial',
        data_expiracao: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
        ativo: true,
        created_at: new Date().toISOString()
      } as Subscription);
    }
  };

  const handleExportCSV = async () => {
    const isAdmin = subscription?.email?.toLowerCase() === 'ronilsonaugustomg@gmail.com';
    const isPaid = isAdmin || subscription?.plano === 'business' || subscription?.plano === 'premium';
    
    if (!isPaid) {
      showToast('Recurso exclusivo do plano BUSINESS ou PREMIUM', 'error');
      return;
    }

    setExporting(true);
    try {
      const [{ data: invoices }, { data: clients }] = await Promise.all([
        supabase.from('fa_invoices').select('*').eq('user_id', userId),
        supabase.from('fa_clients').select('*').eq('user_id', userId)
      ]);

      if (!invoices || !clients) return;

      // Header
      let csv = 'ID;Cliente;Descrição;Valor;Vencimento;Status\n';
      
      // Rows
      invoices.forEach(inv => {
        const client = clients.find(c => c.id === inv.client_id);
        const clientName = client?.name || 'Desconhecido';
        csv += `${inv.id};${clientName};${inv.description};${inv.amount};${inv.due_date};${inv.status}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `backup_fluxo_azul_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast('Backup gerado com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao gerar backup', 'error');
    } finally {
      setExporting(false);
    }
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('fa_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) setSettings(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('fa_settings')
      .upsert({
        ...settings,
        user_id: userId
      });
    
    setLoading(false);
    if (!error) {
      showToast('Configurações salvas com sucesso!', 'success');
    } else {
      console.error('Error saving settings:', error);
      showToast('Erro ao salvar configurações', 'error');
    }
  };

  const handleLogoUpload = () => {
    const isAdmin = subscription?.email?.toLowerCase() === 'ronilsonaugustomg@gmail.com';
    const isPaid = isAdmin || subscription?.plano === 'business' || subscription?.plano === 'premium';
    
    if (!isPaid) {
      showToast('Customização de Logo disponível apenas nos planos BUSINESS e PREMIUM', 'error');
      return;
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        showToast('A imagem deve ter no máximo 2MB.', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        setSettings(prev => ({ ...prev, logo_url: base64 }));
        
        const { error } = await supabase
          .from('fa_settings')
          .upsert({
            ...settings,
            logo_url: base64,
            user_id: userId
          });

        if (!error) {
          showToast('Logo atualizada e salva com sucesso!', 'success');
        } else {
          console.error('Error saving logo:', error);
          showToast('Erro ao salvar logo no banco de dados', 'error');
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleRemoveLogo = async () => {
    setSettings(prev => ({ ...prev, logo_url: '' }));
    const { error } = await supabase
      .from('fa_settings')
      .upsert({
        ...settings,
        logo_url: '',
        user_id: userId
      });
    
    if (!error) {
      showToast('Logo removida com sucesso!', 'success');
    } else {
      showToast('Erro ao remover logo', 'error');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-8 space-y-8 max-w-4xl"
    >
      <header>
        <h2 className="text-xl sm:text-2xl font-display font-bold text-brand-text">Configurações</h2>
        <p className="text-brand-muted text-xs sm:text-sm font-sans mt-1">Gerencie as preferências e dados do seu negócio.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:gap-8">
        {/* Business Data */}
        <section className="bg-brand-card border border-brand-border rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Building className="w-5 h-5 text-brand-primary shrink-0" />
            <h3 className="font-display font-bold text-base sm:text-lg text-brand-text">Dados da Empresa</h3>
          </div>
          <p className="text-[10px] sm:text-xs text-brand-muted -mt-4 leading-relaxed">Estas informações serão exibidas nos links de cobrança e mensagens do WhatsApp.</p>
          
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-2 ml-1">Nome da Empresa</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted/50" />
                  <input
                    type="text"
                    value={settings.company_name}
                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                    placeholder="Nome do seu negócio"
                    className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 pl-10 pr-4 text-sm text-brand-text focus:outline-none focus:border-brand-primary placeholder:text-brand-muted/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-2 ml-1">Telefone de Suporte</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted/50" />
                  <input
                    type="text"
                    value={settings.support_phone}
                    onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                    placeholder="(31) 99999-9999"
                    className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 pl-10 pr-4 text-sm text-brand-text focus:outline-none focus:border-brand-primary placeholder:text-brand-muted/30"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-2 ml-1">Chave PIX Sugerida</label>
              <div className="relative">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted/50" />
                <input
                  type="text"
                  value={settings.pix_key}
                  onChange={(e) => setSettings({ ...settings, pix_key: e.target.value })}
                  placeholder="Seu CPF, CNPJ, E-mail ou Aleatória"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 pl-10 pr-4 text-sm text-brand-text focus:outline-none focus:border-brand-primary font-mono placeholder:text-brand-muted/30"
                />
              </div>
              <p className="text-[10px] text-brand-muted mt-2 ml-1">Essa chave será incluída automaticamente nos lembretes de pagamento.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto justify-center bg-brand-primary hover:bg-brand-primary-hover text-white font-black text-xs uppercase tracking-widest py-3 px-8 rounded-xl transition-all shadow-lg shadow-brand-primary/20 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>
        </section>

        {/* Identidade Visual */}
        <section className="bg-brand-card border border-brand-border rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ImageIcon className="w-5 h-5 text-brand-primary shrink-0" />
              <h3 className="font-display font-bold text-base sm:text-lg text-brand-text">Identidade Visual</h3>
            </div>
            <div className="w-fit bg-blue-500/10 text-blue-500 text-[10px] font-bold px-2.5 py-1 rounded-full border border-blue-500/20 whitespace-nowrap">
              💎 BUSINESS +
            </div>
          </div>
          
          <div 
            onClick={handleLogoUpload}
            className="border-2 border-dashed border-brand-border rounded-2xl p-6 sm:p-12 text-center space-y-4 hover:border-brand-primary/30 transition-all cursor-pointer group"
          >
             <div className="w-24 h-24 sm:w-32 sm:h-32 bg-brand-bg rounded-xl flex items-center justify-center mx-auto border border-brand-border overflow-hidden relative group-hover:border-brand-primary/40 transition-all">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-brand-muted group-hover:text-brand-primary" />
                )}
             </div>
             <div>
                {settings.logo_url ? (
                  <>
                    <p className="font-bold text-brand-text text-sm sm:text-base">Sua logo está ativa! 🎉</p>
                    <p className="text-[10px] sm:text-xs text-brand-muted mt-1 leading-relaxed">Clique em qualquer local desse card para substituir por outra imagem.</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveLogo();
                      }}
                      className="mt-3 text-[10px] text-red-500 hover:text-red-400 font-bold uppercase tracking-widest bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95"
                    >
                      Remover Logo
                    </button>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-brand-text text-sm sm:text-base">Fazer upload da sua logo</p>
                    <p className="text-[10px] sm:text-xs text-brand-muted mt-1 leading-relaxed">Sua logo aparecerá nos links de cobrança personalizados.</p>
                  </>
                )}
             </div>
          </div>
        </section>

        {/* Sugestões */}
        <section className="bg-brand-card border border-brand-border rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-brand-primary shrink-0" />
              <h3 className="font-display font-bold text-base sm:text-lg text-brand-text">Sugerir Função</h3>
            </div>
            <div className="w-fit bg-brand-primary/10 text-brand-primary text-[10px] font-bold px-2.5 py-1 rounded-full border border-brand-primary/20 whitespace-nowrap">
              👑 PREMIUM
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-brand-muted -mt-4 leading-relaxed">Sua voz importa! Como usuário Premium, suas sugestões vão direto para o time técnico.</p>
          
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="Ex: Integração com nota fiscal"
              className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text focus:outline-none focus:border-brand-primary"
            />
            <textarea 
              placeholder="Descreva a função..."
              className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text focus:outline-none focus:border-brand-primary min-h-[100px]"
            />
            <button className="w-full sm:w-auto bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white border border-brand-primary/20 font-bold text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all">
               Enviar Sugestão
            </button>
          </div>
        </section>

        {/* Backup & Dados */}
        <section className="bg-brand-card border border-brand-border rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-brand-primary shrink-0" />
              <h3 className="font-display font-bold text-base sm:text-lg text-brand-text">Backup de Dados</h3>
            </div>
            <div className="w-fit bg-blue-500/10 text-blue-500 text-[10px] font-bold px-2.5 py-1 rounded-full border border-blue-500/20 whitespace-nowrap">
              💎 BUSINESS +
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <p className="text-[10px] sm:text-xs text-brand-muted leading-relaxed">
                Mantenha seus dados seguros fora da plataforma. A exportação inclui todo o seu histórico de clientes e cobranças em formato CSV.
              </p>
              
              <div className="bg-brand-bg rounded-xl p-4 border border-brand-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-brand-muted uppercase tracking-tight">Backup Semanal por E-mail</span>
                  <span className={cn(
                    "text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest",
                    (subscription?.plano === 'business' || subscription?.plano === 'premium') 
                      ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20" 
                      : "bg-brand-muted/10 text-brand-muted border-brand-border"
                  )}>
                    {(subscription?.plano === 'business' || subscription?.plano === 'premium') ? '● ATIVO' : '○ INATIVO'}
                  </span>
                </div>
                <p className="text-[10px] text-brand-muted leading-relaxed">
                  {(subscription?.plano === 'business' || subscription?.plano === 'premium') 
                    ? `Enviamos automaticamente uma cópia dos seus dados toda segunda-feira para ${subscription.email}.`
                    : 'Faça upgrade para automatizar seus backups e recebê-los toda semana no seu e-mail.'}
                </p>
              </div>
            </div>

            <div className="md:w-64 flex flex-col gap-3">
              <button
                onClick={handleExportCSV}
                disabled={exporting}
                className="flex items-center justify-center gap-2 bg-brand-bg hover:bg-brand-border border border-brand-border text-brand-text font-bold text-xs uppercase tracking-widest py-4 px-6 rounded-xl transition-all"
              >
                <Download className="w-4 h-4" />
                {exporting ? 'Exportando...' : 'Exportar CSV'}
              </button>
              <p className="text-[9px] text-brand-muted text-center italic">Download imediato dos dados</p>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="bg-brand-bg/50 border border-brand-border rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6">
          <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center shrink-0 border border-brand-primary/20 shadow-inner">
            <ShieldCheck className="w-6 h-6 text-brand-primary" />
          </div>
          <div className="text-center md:text-left">
            <h4 className="font-bold text-brand-text text-sm sm:text-base">Segurança & LGPD</h4>
            <p className="text-[10px] sm:text-xs text-brand-muted mt-1 leading-relaxed">
              Criptografia de ponta a ponta. Seguimos rigorosamente a LGPD para garantir que seus recebíveis e dados de clientes estejam sempre protegidos.
            </p>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
