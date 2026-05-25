import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Subscription } from '../types';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Trash2,
  MessageSquare,
  Search,
  Filter,
  MoreVertical,
  QrCode,
  Pencil,
  Sparkles,
  Check,
  X,
  Zap,
  Smartphone,
  Code,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { showToast } from '../lib/toast';
import ConsentModal from '../components/ConsentModal';

interface Appointment {
  id: string;
  client_id: string;
  service_id: string;
  client_name: string;
  client_phone?: string;
  service_name: string;
  date: string;
  time: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  price: number;
  prepayment_amount: number;
  prepayment_paid?: boolean;
}

interface Service {
  id: string;
  name: string;
  price: number;
  prepayment_percentage: number;
}

interface Client {
  id: string;
  name: string;
  phone?: string;
}

interface UserSettings {
  company_name: string;
  pix_key: string;
}

export default function Appointments({ subscription, userId }: { subscription: Subscription | null, userId: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Form State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [status, setStatus] = useState<Appointment['status']>('scheduled');

  // Estados para o Agendamento Inteligente (WhatsApp Lembretes)
  const [showReminderSettings, setShowReminderSettings] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const currentPlan = subscription?.plano || 'trial';
  const isAdminCheck = subscription?.email?.toLowerCase() === 'ronilsonaugustomg@gmail.com';
  const hasAccessToReminders = currentPlan === 'business' || currentPlan === 'premium' || isAdminCheck;

  const [isReminderActive, setIsReminderActive] = useState<boolean>(() => {
    if (subscription && !(subscription.plano === 'business' || subscription.plano === 'premium' || subscription.email?.toLowerCase() === 'ronilsonaugustomg@gmail.com')) {
      return false;
    }
    return localStorage.getItem(`fa_reminder_active_${userId}`) === 'true';
  });
  const [reminderHours, setReminderHours] = useState<number>(() => {
    return parseInt(localStorage.getItem(`fa_reminder_hours_${userId}`) || '2', 10);
  });
  const [reminderTemplate, setReminderTemplate] = useState<string>(() => {
    return localStorage.getItem(`fa_reminder_template_${userId}`) || 
      'Olá {nome_cliente}! ⏰ Passando para lembrar do seu atendimento de *{nome_servico}* amanhã às *{horario}*.\n\nContamos com a sua presença! Caso precise remarcar, nos avise por favor.';
  });
  const [apiSkeletonVisible, setApiSkeletonVisible] = useState(false);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Primariamente, carregar Dropdowns (Serviços e Clientes) e Configurações
      const [svcsRes, cltsRes, settingsRes] = await Promise.all([
        supabase.from('fa_services').select('*').eq('user_id', userId),
        supabase.from('fa_clients').select('*').eq('user_id', userId),
        supabase.from('fa_settings').select('company_name, pix_key').eq('user_id', userId).maybeSingle()
      ]);

      const svcs = svcsRes.data;
      const clts = cltsRes.data;

      if (settingsRes.data) setSettings(settingsRes.data);

      // Cache e Fallback para Serviços/Clientes (Garante que apareçam na Agenda se criados em outras abas)
      const finalServices = svcs && svcs.length > 0 ? svcs : JSON.parse(localStorage.getItem(`fa_services_${userId}`) || '[]');
      const finalClients = clts && clts.length > 0 ? clts : JSON.parse(localStorage.getItem(`fa_clients_${userId}`) || '[]');
      
      setServices(finalServices);
      setClients(finalClients);

      // 2. Buscar Agendamentos
      const { data: apts, error: aptsErr } = await supabase
        .from('fa_appointments')
        .select('*, client:fa_clients(name, phone), service:fa_services(name, price, prepayment_percentage)')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (aptsErr) console.warn('Pode haver erro de relação no DB, processando fallback manual...');

      let processedApts: Appointment[] = [];
      if (apts && apts.length > 0) {
        processedApts = apts.map((a: any) => ({
          ...a,
          client_name: a.client?.name || finalClients.find((c: any) => c.id === a.client_id)?.name || 'Cliente',
          client_phone: a.client?.phone || finalClients.find((c: any) => c.id === a.client_id)?.phone,
          service_name: a.service?.name || finalServices.find((s: any) => s.id === a.service_id)?.name || 'Serviço',
          price: a.service?.price || finalServices.find((s: any) => s.id === a.service_id)?.price || 0,
          prepayment_amount: (a.service?.price || finalServices.find((s: any) => s.id === a.service_id)?.price || 0) * (a.service?.prepayment_percentage || 0) / 100
        }));
      } else {
        const localApts = localStorage.getItem(`fa_appointments_${userId}`);
        processedApts = localApts ? JSON.parse(localApts) : [];
      }
      
      setAppointments(processedApts);
      localStorage.setItem(`fa_appointments_${userId}`, JSON.stringify(processedApts));

    } catch (err) {
      console.error('Error fetching data:', err);
      setAppointments(JSON.parse(localStorage.getItem(`fa_appointments_${userId}`) || '[]'));
      setServices(JSON.parse(localStorage.getItem(`fa_services_${userId}`) || '[]'));
      setClients(JSON.parse(localStorage.getItem(`fa_clients_${userId}`) || '[]'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendPixWhatsApp = (apt: Appointment) => {
    const phone = apt.client_phone || clients.find(c => c.id === apt.client_id)?.phone;

    if (!phone) {
      showToast('Este cliente não possui telefone cadastrado.', 'error');
      return;
    }

    const pixKey = settings?.pix_key || 'NÃO CONFIGURADA';
    const company = settings?.company_name || 'Agendamento Profissional';
    const dateFormatted = apt.date.split('-').reverse().join('/');
    
    // 3 Variações de Mensagens Persuasivas (Lógica Agenda Azul)
    const messages = [
      // VARIAÇÃO 1: PROFISSIONAL E DIRETA
      `Olá *${apt.client_name}*! 👋\n\nConfirmamos seu agendamento para *${apt.service_name}*.\n\n📅 Data: *${dateFormatted}*\n⏰ Horário: *${apt.time}*\n\nPara validar sua reserva em nosso sistema, solicitamos o pagamento antecipado do sinal:\n\n💰 Valor: *R$ ${apt.prepayment_amount.toFixed(2)}*\n🔑 Chave PIX: *${pixKey}*\n🏦 Favorecido: *${company}*\n\nPor favor, envie o comprovante para finalizarmos sua reserva. Obrigado!`,
      
      // VARIAÇÃO 2: AMIGÁVEL E ACOLHEDORA
      `Tudo bem, *${apt.client_name}*? 😊\n\nEstamos muito felizes em atender você! Já separamos o horário das *${apt.time}* no dia *${dateFormatted}* para seu serviço de *${apt.service_name}*.\n\nComo nossa agenda é bastante concorrida, pedimos apenas um sinal de *R$ ${apt.prepayment_amount.toFixed(2)}* para garantir sua vaga com exclusividade.\n\n🔑 PIX: *${pixKey}*\n✨ Empresa: *${company}*\n\nQualquer dúvida, estou à disposição!`,
      
      // VARIAÇÃO 3: PERSUASIVA (FOCO EM GARANTIA DE VAGA)
      `Olá *${apt.client_name}*! 🚀\n\nSeu horário para *${apt.service_name}* está pré-agendado com sucesso para o dia *${dateFormatted}* às *${apt.time}*.\n\n⚠️ *Aviso Importante:* Devido à alta demanda, mantemos os horários reservados por curto período. Para garantir 100% sua vaga, realize o pagamento do sinal agora:\n\n💳 Valor do Sinal: *R$ ${apt.prepayment_amount.toFixed(2)}*\n🔑 Chave PIX: *${pixKey}*\n\nAssim que o PIX for realizado, sua vaga estará confirmada e bloqueada para você! 📅`
    ];

    // Sorteia uma das 3 variações para não ser repetitivo (IA Persuasiva)
    const finalMessage = messages[Math.floor(Math.random() * messages.length)];
    
    const url = `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(finalMessage)}`;
    window.open(url, '_blank');
    showToast('Mensagem persuasiva gerada!', 'success');
  };

  const [showAIModal, setShowAIModal] = useState(false);
  const [selectedAIAppointment, setSelectedAIAppointment] = useState<Appointment | null>(null);
  const [aiTone, setAiTone] = useState<'sinal' | 'confirmacao' | 'lembrete'>('sinal');
  const [generatedMessage, setGeneratedMessage] = useState('');

  const handleOpenAI = (apt: Appointment) => {
    setSelectedAIAppointment(apt);
    setGeneratedMessage('');
    setShowAIModal(true);
  };

  const generateAIMessage = () => {
    if (!selectedAIAppointment) return;
    
    const apt = selectedAIAppointment;
    const pixKey = settings?.pix_key || 'NÃO CONFIGURADA';
    const company = settings?.company_name || 'Agendamento Profissional';
    const dateFormatted = apt.date.split('-').reverse().join('/');

    let msg = '';
    if (aiTone === 'sinal') {
      msg = `Olá *${apt.client_name}*! 👋 Separamos o horário das *${apt.time}* no dia *${dateFormatted}* com muito carinho para você.\n\nPara garantir sua exclusividade na agenda, solicitamos um sinal de reserva:\n\n💰 Valor: *R$ ${apt.prepayment_amount.toFixed(2)}*\n🔑 PIX: *${pixKey}*\n✨ Empresa: *${company}*\n\nAssim que realizar o pagamento, me envie o comprovante por aqui! 📅`;
    } else if (aiTone === 'confirmacao') {
      msg = `Prezado(a) *${apt.client_name}*, confirmamos seu agendamento para o serviço de *${apt.service_name}*.\n\n📍 *Detalhes do Horário:*\n📅 Data: *${dateFormatted}*\n⏰ Hora: *${apt.time}*\n\nSeu horário já está devidamente registrado em nosso sistema. Pedimos a gentileza de chegar com 5 minutos de antecedência. Até lá! 🏢`;
    } else {
      msg = `Oi *${apt.client_name}*! 👋 Tudo pronto para seu atendimento de *${apt.service_name}* amanhã às *${apt.time}*?\n\n💡 *Dica do Especialista:* Para um melhor resultado, recomendamos vir com roupas confortáveis e evitar atrasos para aproveitarmos ao máximo seu tempo.\n\nEstamos ansiosos para te receber! Caso precise remarcar, nos avise com antecedência. 🚀`;
    }

    setGeneratedMessage(msg);
  };

  const sendToWhatsApp = () => {
    if (!selectedAIAppointment || !generatedMessage) return;
    const phone = selectedAIAppointment.client_phone || clients.find(c => c.id === selectedAIAppointment.client_id)?.phone;
    
    if (!phone) {
      showToast('Cliente sem telefone cadastrado', 'error');
      return;
    }

    const url = `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(generatedMessage)}`;
    window.open(url, '_blank');
    setShowAIModal(false);
    showToast('Mensagem enviada com sucesso!');
  };

  const handleToggleReminder = (active: boolean) => {
    if (!hasAccessToReminders) {
      showToast('O Agendamento Inteligente requer o plano Business ou Premium!', 'error');
      return;
    }
    
    const isConsentAccepted = localStorage.getItem(`fa_automation_consent_accepted_${userId}`) === 'true';
    if (active && !isConsentAccepted) {
      setShowConsentModal(true);
      return;
    }
    
    setIsReminderActive(active);
  };

  const handleSaveReminderSettings = () => {
    if (!hasAccessToReminders) {
      showToast('O Agendamento Inteligente requer o plano Business ou Premium!', 'error');
      return;
    }
    const isConsentAccepted = localStorage.getItem(`fa_automation_consent_accepted_${userId}`) === 'true';
    if (isReminderActive && !isConsentAccepted) {
      setShowConsentModal(true);
      return;
    }
    localStorage.setItem(`fa_reminder_active_${userId}`, String(isReminderActive));
    localStorage.setItem(`fa_reminder_hours_${userId}`, String(reminderHours));
    localStorage.setItem(`fa_reminder_template_${userId}`, reminderTemplate);
    showToast('Configurações salvas e fila redefinida! ⏰', 'success');
  };

  const handleConsentAcceptSuccess = () => {
    setIsReminderActive(true);
    localStorage.setItem(`fa_reminder_active_${userId}`, 'true');
    localStorage.setItem(`fa_reminder_hours_${userId}`, String(reminderHours));
    localStorage.setItem(`fa_reminder_template_${userId}`, reminderTemplate);
    showToast('Configurações salvas e fila redefinida! ⏰', 'success');
  };

  const getCompiledPreview = () => {
    return reminderTemplate
      .replace(/{nome_cliente}/g, 'Arthur Dent')
      .replace(/{nome_servico}/g, 'Corte de Cabelo Premium')
      .replace(/{data}/g, '26/05/2026')
      .replace(/{horario}/g, '14:30')
      .replace(/{valor_sinal}/g, 'R$ 25,00')
      .replace(/{chave_pix}/g, settings?.pix_key || 'suachave@pix.com');
  };

  const runReminderSimulation = () => {
    if (!hasAccessToReminders) {
      showToast('O Agendamento Inteligente requer o plano Business ou Premium!', 'error');
      return;
    }
    if (isSimulating) return;
    setIsSimulating(true);
    setSimulationLogs([]);
    
    const logs = [
      `[SISTEMA] Iniciando varredura na tabela 'fa_appointments' para o usuário ${userId}...`,
      `[SISTEMA] Buscando agendamentos ativos com status 'scheduled' ou 'confirmed'...`,
      `[CONFIG] Regra Ativa: Enviar mensagem ${reminderHours} horas antes de cada agendamento.`,
    ];

    let delay = 0;
    logs.forEach((logLine, index) => {
      setTimeout(() => {
        setSimulationLogs(prev => [...prev, logLine]);
      }, delay);
      delay += 400;
    });

    setTimeout(() => {
      const activePending = appointments.filter(a => a.status === 'scheduled');
      if (activePending.length === 0) {
        setSimulationLogs(prev => [
          ...prev, 
          `[RESULT] Nenhum agendamento pendente encontrado para disparos imediatos hoje.`,
          `[LOG] Fila ociosa. Aguardando novos clientes.`
        ]);
        setIsSimulating(false);
      } else {
        const first = activePending[0];
        setSimulationLogs(prev => [
          ...prev,
          `[FILTRO] Encontrados ${activePending.length} agendamentos elegíveis para lembretes.`,
          `[CROM] Avaliando agendamento ID: ${first.id} (${first.client_name} - ${first.time})`,
          `[COMPILE] Mensagem compilada com sucesso para ${first.client_name}:`,
          `--------------------------------------------------`,
          `"${reminderTemplate
              .replace(/{nome_cliente}/g, first.client_name)
              .replace(/{nome_servico}/g, first.service_name)
              .replace(/{data}/g, first.date.split('-').reverse().join('/'))
              .replace(/{horario}/g, first.time)
              .replace(/{valor_sinal}/g, `R$ ${first.prepayment_amount.toFixed(2)}`)
              .replace(/{chave_pix}/g, settings?.pix_key || 'SUA_CHAVE_PIX')}"`,
          `--------------------------------------------------`,
          `[SKELETON API] POST em https://api.whats-gateway.com/v1/send-message (API Key: INJECT_SENSITIVE_KEY_HERE)`,
          `[SUCCESS] Mensagem adicionada à fila local do WhatsApp de maneira lógica. Pronto para webhook do desenvolvedor! 🎉`
        ]);
        setIsSimulating(false);
      }
    }, delay + 400);
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const handleOpenAdd = () => {
    setEditingAppointment(null);
    setSelectedClientId('');
    setSelectedServiceId('');
    setDate('');
    setTime('');
    setStatus('scheduled');
    setShowModal(true);
  };

  const handleOpenEdit = (apt: Appointment) => {
    setEditingAppointment(apt);
    setSelectedClientId(apt.client_id);
    setSelectedServiceId(apt.service_id);
    setDate(apt.date);
    setTime(apt.time);
    setStatus(apt.status);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este agendamento permanentemente?')) return;
    
    // Optimistic delete
    const updated = appointments.filter(a => a.id !== id);
    setAppointments(updated);
    localStorage.setItem(`fa_appointments_${userId}`, JSON.stringify(updated));
    
    try {
      const { error } = await supabase.from('fa_appointments').delete().eq('id', id);
      if (error) throw error;
      showToast('Agendamento removido!');
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleCompleteAppointment = async (id: string) => {
    // Optimistic update
    const updated = appointments.map(a => a.id === id ? { ...a, status: 'completed' as const } : a);
    setAppointments(updated);
    localStorage.setItem(`fa_appointments_${userId}`, JSON.stringify(updated));

    try {
      const { error } = await supabase
        .from('fa_appointments')
        .update({ status: 'completed' })
        .eq('id', id);

      if (error) throw error;
      showToast('Horário concluído!');
    } catch (err) {
      console.error('Complete error:', err);
      showToast('Erro ao sincronizar conclusão', 'error');
    }
  };

  const handleTogglePrepayment = async (apt: Appointment) => {
    const isPaid = !apt.prepayment_paid;
    
    // Optimistic update
    const updated = appointments.map(a => a.id === apt.id ? { ...a, prepayment_paid: isPaid } : a);
    setAppointments(updated);
    localStorage.setItem(`fa_appointments_${userId}`, JSON.stringify(updated));

    try {
      const { error } = await supabase
        .from('fa_appointments')
        .update({ prepayment_paid: isPaid })
        .eq('id', apt.id);

      if (error) throw error;
      showToast(isPaid ? 'Sinal recebido!' : 'Sinal removido');
    } catch (err) {
      console.error('Toggle prepayment error:', err);
      showToast('Erro ao atualizar sinal', 'error');
    }
  };

  const handleWhatsAppReminder = (apt: Appointment) => {
    const phone = apt.client_phone || clients.find(c => c.id === apt.client_id)?.phone;
    if (!phone) return showToast('Cliente sem telefone', 'error');

    const message = `Olá *${apt.client_name}*! 👋\n\nPassando para lembrar do seu horário de *${apt.service_name}* no dia *${apt.date.split('-').reverse().join('/')}* às *${apt.time}*.\n\nAté logo!`;
    const url = `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClientId) return showToast('Selecione um cliente', 'error');
    if (!selectedServiceId) return showToast('Selecione um serviço', 'error');
    if (!date) return showToast('Selecione a data', 'error');
    if (!time) return showToast('Selecione o horário', 'error');

    setSubmitting(true);
    
    const selectedClient = clients.find(c => c.id === selectedClientId);
    const selectedService = services.find(s => s.id === selectedServiceId);
    
    const appointmentData: any = {
      id: editingAppointment?.id || Math.random().toString(36).substr(2, 9),
      client_id: selectedClientId,
      service_id: selectedServiceId,
      date,
      time,
      status,
      user_id: userId,
      client_name: selectedClient?.name || 'Cliente',
      service_name: selectedService?.name || 'Serviço',
      price: selectedService?.price || 0,
      prepayment_amount: (selectedService?.price || 0) * (selectedService?.prepayment_percentage || 0) / 100,
      prepayment_paid: editingAppointment?.prepayment_paid ?? false
    };

    try {
      if (editingAppointment) {
        const { error } = await supabase.from('fa_appointments').update({
          client_id: selectedClientId,
          service_id: selectedServiceId,
          date,
          time,
          status,
          user_id: userId,
          prepayment_paid: editingAppointment.prepayment_paid
        }).eq('id', editingAppointment.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('fa_appointments').insert({
          client_id: selectedClientId,
          service_id: selectedServiceId,
          date,
          time,
          status,
          user_id: userId,
          prepayment_paid: false
        }).select().single();
        
        if (error) throw error;

        // Update with real ID from Supabase
        if (data) appointmentData.id = data.id;
      }

      const finalUpdated = editingAppointment 
        ? appointments.map(a => a.id === editingAppointment.id ? appointmentData : a)
        : [appointmentData, ...appointments];
      
      setAppointments(finalUpdated);
      localStorage.setItem(`fa_appointments_${userId}`, JSON.stringify(finalUpdated));
      
      showToast(editingAppointment ? 'Agendamento atualizado!' : 'Agendamento realizado!');
    } catch (err) {
      console.error('Submit error:', err);
      // Ensure it's at least in state/local even if DB fails
      const finalUpdated = editingAppointment 
        ? appointments.map(a => a.id === editingAppointment.id ? appointmentData : a)
        : [appointmentData, ...appointments];
      setAppointments(finalUpdated);
      localStorage.setItem(`fa_appointments_${userId}`, JSON.stringify(finalUpdated));
      showToast('Salvo localmente (Problema conexão banco)', 'success');
    } finally {
      setShowModal(false);
      setSubmitting(false);
    }
  };

  const getStatusInfo = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed': return { label: 'Confirmado', color: 'text-brand-primary', bg: 'bg-brand-primary/10', icon: CheckCircle2 };
      case 'completed': return { label: 'Concluído', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: CheckCircle2 };
      case 'cancelled': return { label: 'Cancelado', color: 'text-brand-danger', bg: 'bg-brand-danger/10', icon: XCircle };
      default: return { label: 'Pendente', color: 'text-orange-500', bg: 'bg-orange-500/10', icon: Clock };
    }
  };

  const filteredAppointments = appointments.filter(a => 
    a.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.service_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-20"
    >
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-display font-black text-brand-text uppercase tracking-tight">Meus Agendamentos</h2>
          <p className="text-brand-muted text-[10px] sm:text-sm italic leading-tight max-w-[280px] sm:max-w-none">Organize seus atendimentos e garanta seus recebimentos.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="w-full sm:w-auto bg-brand-primary hover:bg-brand-primary-hover text-white px-6 py-3 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20 transition-all"
        >
          <Plus className="w-4 h-4" /> Novo Horário
        </button>
      </header>

      {/* Stats Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-brand-card border border-brand-border p-5 sm:p-6 rounded-2xl">
          <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-1">Total</p>
          <p className="text-xl sm:text-2xl font-display font-black text-brand-text truncate">{appointments.length} Agendados</p>
        </div>
        <div className="bg-brand-card border border-brand-border p-5 sm:p-6 rounded-2xl">
          <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-1">Adiantamentos (Sinal)</p>
          <p className="text-xl sm:text-2xl font-display font-black text-green-500 truncate">R$ {appointments.reduce((acc, curr) => acc + (curr.prepayment_paid ? curr.prepayment_amount : 0), 0).toFixed(2)}</p>
        </div>
        <div className="bg-brand-card border border-brand-border p-5 sm:p-6 rounded-2xl">
          <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-1">A Confirmar</p>
          <p className="text-xl sm:text-2xl font-display font-black text-orange-500 truncate">{appointments.filter(a => a.status === 'scheduled').length} Pendentes</p>
        </div>
      </div>

      {/* ⚡ AGENDAMENTO INTELIGENTE (WHATSAPP AUTOMÁTICO) */}
      <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden shadow-xl border-t-2 border-t-brand-primary/20">
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20 shrink-0">
              <Zap className="w-5 h-5 text-brand-primary animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-black text-brand-text uppercase italic tracking-tight text-sm sm:text-base flex items-center gap-2">
                Agendamento Inteligente Premium 💎
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                  isReminderActive 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                    : "bg-brand-muted/10 text-brand-muted border-brand-border"
                )}>
                  {isReminderActive ? 'Ativo' : 'Inativo'}
                </span>
              </h3>
              <p className="text-brand-muted text-[10px] sm:text-xs">Configure lembretes automáticos e mensagens persuasivas disparados antes do horário.</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowReminderSettings(!showReminderSettings)}
            className="w-full sm:w-auto bg-brand-bg hover:bg-brand-bg/85 border border-brand-border text-brand-text text-[10px] font-black rounded-xl px-4 py-3 outline-none transition-all uppercase tracking-widest cursor-pointer text-center select-none"
          >
            {showReminderSettings ? 'Ocultar Painel' : 'Abrir Painel Setup'}
          </button>
        </div>

        <AnimatePresence>
          {showReminderSettings && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-brand-border bg-brand-bg/20 overflow-hidden"
            >
              {!hasAccessToReminders ? (
                <div className="p-8 text-center max-w-xl mx-auto space-y-4">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20 mx-auto text-lg">
                    💎
                  </div>
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-[3px]">recurso exclusivo</p>
                  <h4 className="font-display font-black text-brand-text text-base uppercase italic tracking-tight">Agendamento Inteligente Premium</h4>
                  <p className="text-brand-muted text-xs leading-relaxed">
                    A automação por WhatsApp de lembretes e envios inteligentes está disponível exclusivamente para usuários dos planos <strong>Business</strong> e <strong>Premium</strong>. Eleve a retenção e diminua o absenteísmo dos seus clientes hoje mesmo!
                  </p>
                  <button
                    onClick={() => {
                      showToast('Direcionando para upgrade... Redirecione para a aba de Planos no menu!');
                    }}
                    className="bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 hover:scale-[1.02] active:scale-[0.98] text-slate-950 font-black px-6 py-2.5 rounded-xl shadow-lg transition-all text-[10px] uppercase tracking-widest border border-amber-300/30 cursor-pointer"
                  >
                    Fazer Premium Upgrade
                  </button>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Lado Esquerdo: Controles */}
                    <div className="space-y-6">
                      <div className="bg-brand-card/50 border border-brand-border/60 rounded-xl p-5 space-y-4">
                        <p className="text-[10px] font-black text-brand-primary uppercase tracking-[2px]">Regras de Disparo</p>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-brand-text">Status dos Lembretes</p>
                            <p className="text-[9px] text-brand-muted">Habilitar envio inteligente automático</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={isReminderActive} 
                              onChange={(e) => handleToggleReminder(e.target.checked)} 
                            />
                            <div className="w-11 h-6 bg-brand-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-brand-muted peer-checked:after:bg-white after:border-brand-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                          </label>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-brand-muted uppercase tracking-[1px]">Antecedência de Disparo</label>
                          <select 
                            value={reminderHours}
                            onChange={(e) => setReminderHours(parseInt(e.target.value, 10))}
                            className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-xs outline-none focus:border-brand-primary transition-all text-brand-text font-bold cursor-pointer"
                          >
                            <option value={1}>1 Hora Antes</option>
                            <option value={2}>2 Horas Antes</option>
                            <option value={4}>4 Horas Antes</option>
                            <option value={12}>12 Horas Antes</option>
                            <option value={24}>24 Horas Antes (1 dia)</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-brand-muted uppercase tracking-[1px]">Modelo de Mensagem (Template)</label>
                          <p className="text-[9px] text-brand-muted italic uppercase font-bold">Clique nas tags para inserir</p>
                        </div>

                        {/* Botões de Variáveis */}
                        <div className="flex flex-wrap gap-1.5 pb-1">
                          {[
                            { id: '{nome_cliente}', label: 'Cliente' },
                            { id: '{nome_servico}', label: 'Serviço' },
                            { id: '{data}', label: 'Data' },
                            { id: '{horario}', label: 'Horário' },
                            { id: '{valor_sinal}', label: 'Sinal' },
                            { id: '{chave_pix}', label: 'Chave PIX' }
                          ].map(tag => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => setReminderTemplate(prev => prev + ' ' + tag.id)}
                              className="bg-brand-primary/10 hover:bg-brand-primary/25 border border-brand-primary/15 text-brand-primary text-[9px] font-black rounded-lg px-2 py-1 uppercase tracking-tight transition-all cursor-pointer"
                            >
                              +{tag.label}
                            </button>
                          ))}
                        </div>

                        <textarea 
                          rows={4}
                          placeholder="Edite o modelo de conversa..."
                          className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 text-xs outline-none focus:border-brand-primary transition-all text-brand-text leading-relaxed font-bold font-mono"
                          value={reminderTemplate}
                          onChange={(e) => setReminderTemplate(e.target.value)}
                        />

                        <div className="flex gap-3 justify-end pt-2">
                          <button 
                            onClick={handleSaveReminderSettings}
                            className="bg-brand-primary hover:bg-brand-primary-hover text-white text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-all cursor-pointer shadow-md shadow-brand-primary/10"
                          >
                            Salvar Configuração
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Lado Direito: Preview e Logs */}
                    <div className="space-y-4">
                      {/* Visualização de Chat Realista */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-brand-muted uppercase tracking-[1px] flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-brand-primary" /> Visualização em Tempo Real (Cliente)
                        </p>
                        <div className="p-4 bg-brand-bg border border-brand-border rounded-xl relative overflow-hidden backdrop-blur-sm min-h-[160px] flex flex-col justify-end">
                          {/* Papel de parede de chat com tons do whatsapp e da marca */}
                          <div className="absolute inset-0 bg-brand-primary/[0.02] pointer-events-none" />
                          
                          <div className="bg-brand-primary text-white p-3.5 rounded-2xl rounded-br-none shadow-md max-w-[85%] ml-auto text-xs relative leading-relaxed font-medium">
                            <p className="whitespace-pre-line font-medium text-brand-bg text-[11px] font-sans">
                              {getCompiledPreview()}
                            </p>
                            <div className="text-[9px] text-right mt-1 opacity-70 font-mono">14:30 ✓✓</div>
                          </div>
                        </div>
                      </div>

                      {/* Developer skeleton / Simulação Logs */}
                      <div className="border border-brand-border rounded-xl bg-slate-950 p-4 font-mono select-none">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-muted uppercase tracking-wider">
                            <Code className="w-3.5 h-3.5 text-brand-muted" /> Integradora de Envio (API Sandbox)
                          </div>
                          <button 
                            onClick={() => setApiSkeletonVisible(!apiSkeletonVisible)}
                            className="text-[8px] font-black text-brand-primary hover:underline uppercase"
                          >
                            {apiSkeletonVisible ? 'Ocultar Código' : 'Ver Código API'}
                          </button>
                        </div>

                        {apiSkeletonVisible ? (
                          <div className="space-y-2">
                            <p className="text-[9px] text-brand-muted">// Cole no seu servidor Node/Express para disparar via WhatsApp real:</p>
                            <pre className="text-[8px] text-brand-primary overflow-x-auto bg-slate-900/60 p-2.5 rounded-lg border border-white/5 leading-relaxed">
  {`async function sendAutomatedReminder(clientPhone, clientName, appointment) {
    const cleanMessage = template
      .replace('{nome_cliente}', clientName)
      .replace('{nome_servico}', appointment.service_name);
    
    // Exemplo de integração com gateway:
    return await fetch('https://api.whats-gateway.com/v1/send', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer WHATS_API_KEY' },
      body: JSON.stringify({ to: clientPhone, message: cleanMessage })
    });
  }`}
                            </pre>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-4">
                              <p className="text-[9px] text-slate-400">Excelente para testar a ordem e envio lógico dos dados temporais.</p>
                              <button
                                onClick={runReminderSimulation}
                                disabled={isSimulating}
                                className="bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-[9px] font-bold px-3 py-1.5 rounded-lg border border-brand-primary/20 flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                              >
                                <Play className="w-2.5 h-2.5" /> {isSimulating ? 'SIMULANDO...' : 'Simular Disparos'}
                              </button>
                            </div>
                            
                            {simulationLogs.length > 0 && (
                              <div className="max-h-40 overflow-y-auto text-[8px] leading-relaxed text-emerald-400 space-y-1 bg-slate-900/40 p-3 rounded-lg border border-brand-primary/15 transition-all">
                                {simulationLogs.map((log, i) => (
                                  <p key={i} className="font-mono">{log}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-brand-card border border-brand-border p-4 rounded-2xl">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
          <input 
            type="text"
            placeholder="Buscar por cliente ou serviço..."
            className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 pl-10 pr-4 text-[10px] sm:text-sm focus:border-brand-primary/50 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-brand-border bg-brand-bg/50">
                <th className="px-6 py-4 text-[10px] font-bold text-brand-muted uppercase tracking-widest">Horário</th>
                <th className="px-6 py-4 text-[10px] font-bold text-brand-muted uppercase tracking-widest">Cliente / Serviço</th>
                <th className="px-6 py-4 text-[10px] font-bold text-brand-muted uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-brand-muted uppercase tracking-widest text-right">Valor / Adiant.</th>
                <th className="px-6 py-4 text-[10px] font-bold text-brand-muted uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-brand-muted animate-pulse">Carregando seus horários...</td></tr>
              ) : filteredAppointments.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-brand-muted">Nenhum agendamento encontrado.</td></tr>
              ) : (
                filteredAppointments.map(apt => {
                  const status = getStatusInfo(apt.status);
                  const StatusIcon = status.icon;
                  return (
                    <tr key={apt.id} className="hover:bg-brand-bg/30 transition-colors group">
                      <td className="px-4 sm:px-6 py-5">
                        <div className="flex flex-col">
                          <span className="font-display font-black text-brand-text text-sm">{apt.time}</span>
                          <span className="text-[10px] text-brand-muted uppercase font-bold">
                            {apt.date.split('-').reverse().join('/')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-5">
                        <div className="flex flex-col min-w-[120px]">
                          <span className="font-bold text-brand-text text-sm uppercase tracking-tight truncate">{apt.client_name}</span>
                          <span className="text-xs text-brand-primary font-medium truncate">{apt.service_name}</span>
                          {isReminderActive && apt.status === 'scheduled' && (
                            <span className="text-[8px] text-emerald-400 font-extrabold uppercase mt-1 flex items-center gap-1" title="Lembrete automático ativo para este horário">
                              <Sparkles className="w-2.5 h-2.5 animate-pulse shrink-0" /> Lembrete Ativo ({reminderHours}h antes)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-5">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          status.color, status.bg, "border-current/10"
                        )}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-5 text-right font-mono">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-display font-black text-brand-text text-sm">R$ {apt.price.toFixed(2)}</span>
                          {apt.prepayment_amount > 0 && (
                            <button 
                              onClick={() => handleTogglePrepayment(apt)}
                              className={cn(
                                "text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 whitespace-nowrap transition-all",
                                apt.prepayment_paid 
                                  ? "text-green-500 bg-green-500/10 border border-green-500/20" 
                                  : "text-orange-500 bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20"
                              )}
                              title={apt.prepayment_paid ? "Sinal Recebido" : "Confirmar Recebimento"}
                            >
                              SINAL R$ {apt.prepayment_amount.toFixed(2)} {apt.prepayment_paid ? '✓' : '?'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-5">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <button 
                            onClick={() => handleOpenEdit(apt)}
                            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg border border-brand-border bg-brand-bg hover:bg-brand-primary/10 text-brand-primary transition-all"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          
                          <button 
                            onClick={() => handleOpenAI(apt)}
                            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-brand-primary text-white shadow-lg shadow-brand-primary/40 hover:scale-110 active:scale-95 transition-all"
                            title="Persuasão por IA"
                          >
                            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>

                          <button 
                            onClick={() => handleSendPixWhatsApp(apt)}
                            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg border border-brand-primary/30 bg-brand-bg hover:bg-brand-primary/10 text-brand-primary transition-all"
                            title="Solicitar Sinal (PIX)"
                          >
                            <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>

                          <button 
                            onClick={() => handleWhatsAppReminder(apt)}
                            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg border border-emerald-500/30 bg-brand-bg hover:bg-emerald-500/10 text-emerald-500 transition-all"
                            title="Enviar Lembrete"
                          >
                            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>

                          <button 
                            onClick={() => handleCompleteAppointment(apt.id)}
                            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg border border-blue-500/30 bg-brand-bg hover:bg-blue-500/10 text-blue-500 transition-all"
                            title="Concluir Horário"
                          >
                            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>

                          <button 
                            onClick={() => handleDelete(apt.id)}
                            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg border border-brand-danger/30 bg-brand-bg hover:bg-brand-danger/10 text-brand-danger transition-all"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Appointment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-bg/90 backdrop-blur-md" onClick={() => setShowModal(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-brand-card border border-brand-border rounded-2xl shadow-2xl relative z-10"
          >
            <header className="p-6 border-b border-brand-border">
              <h3 className="text-lg font-display font-black text-brand-text uppercase">
                {editingAppointment ? 'Editar Horário' : 'Novo Agendamento'}
              </h3>
            </header>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-brand-muted uppercase mb-1">Cliente</label>
                <select 
                  required
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 text-sm text-brand-text outline-none"
                >
                  <option value="">Selecione o cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-brand-muted uppercase mb-1">Serviço</label>
                <select 
                  required
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 text-sm text-brand-text outline-none"
                >
                  <option value="">Selecione o serviço</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-brand-muted uppercase mb-1">Data</label>
                  <input 
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 text-sm text-brand-text"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-brand-muted uppercase mb-1">Horário</label>
                  <input 
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 text-sm text-brand-text"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-brand-muted uppercase mb-1">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {['scheduled', 'confirmed'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s as any)}
                      className={cn(
                        "py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
                        status === s ? "bg-brand-primary/10 border-brand-primary text-brand-primary" : "border-brand-border text-brand-muted"
                      )}
                    >
                      {s === 'scheduled' ? 'Agendado' : 'Confirmado'}
                    </button>
                  ))}
                </div>
              </div>
              
              <footer className="pt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold text-brand-muted uppercase tracking-widest">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-brand-primary text-white font-black px-8 py-3 rounded-xl text-xs uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-brand-primary/20"
                >
                  {submitting ? 'Salvando...' : 'Confirmar'}
                </button>
              </footer>
            </form>
          </motion.div>
        </div>
      )}

      {/* IA PERSUASIVA MODAL */}
      <AnimatePresence>
        {showAIModal && selectedAIAppointment && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-brand-bg/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-brand-card border border-brand-border rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-brand-border flex justify-between items-center bg-brand-primary/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary shadow-inner">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-black text-brand-text uppercase tracking-tight">Persuasão por IA</h2>
                    <p className="text-[10px] text-brand-muted font-bold uppercase tracking-widest">Potencialize seu Agendamento</p>
                  </div>
                </div>
                <button onClick={() => setShowAIModal(false)} className="p-2 hover:bg-brand-border rounded-xl transition-colors text-brand-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {/* INFO CARD */}
                <div className="p-5 bg-brand-bg border border-brand-border rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-4 right-4 px-2 py-0.5 bg-brand-primary/10 border border-brand-primary/20 rounded text-[8px] font-black text-brand-primary uppercase tracking-widest">Elite Tech</div>
                  <div className="space-y-1">
                    <p className="text-xs text-brand-muted font-bold uppercase tracking-widest">Cliente</p>
                    <p className="text-xl font-display font-black text-brand-text uppercase">{selectedAIAppointment.client_name}</p>
                    <p className="text-2xl font-display font-black text-brand-primary mt-2">R$ {selectedAIAppointment.price.toFixed(2)}</p>
                  </div>
                </div>

                {/* TONE OPTIONS */}
                <div className="space-y-3">
                  <p className="text-[10px] text-brand-muted font-black uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-ping" />
                    Escolha o objetivo da mensagem
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <button 
                      onClick={() => { setAiTone('sinal'); setGeneratedMessage(''); }}
                      className={cn(
                        "py-3 px-2 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all flex flex-col items-center gap-2",
                        aiTone === 'sinal' ? "bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/30 scale-105" : "bg-brand-bg border-brand-border text-brand-muted hover:border-brand-primary/50"
                      )}
                    >
                      <span className="text-base">🤑</span>
                      Pedir Sinal
                    </button>
                    <button 
                      onClick={() => { setAiTone('confirmacao'); setGeneratedMessage(''); }}
                      className={cn(
                        "py-3 px-2 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all flex flex-col items-center gap-2",
                        aiTone === 'confirmacao' ? "bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/30 scale-105" : "bg-brand-bg border-brand-border text-brand-muted hover:border-brand-primary/50"
                      )}
                    >
                      <span className="text-base">🧐</span>
                      Confirmar
                    </button>
                    <button 
                      onClick={() => { setAiTone('lembrete'); setGeneratedMessage(''); }}
                      className={cn(
                        "py-3 px-2 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all flex flex-col items-center gap-2",
                        aiTone === 'lembrete' ? "bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/30 scale-105" : "bg-brand-bg border-brand-border text-brand-muted hover:border-brand-primary/50"
                      )}
                    >
                      <span className="text-base">🧙‍♂️</span>
                      Lembrete
                    </button>
                  </div>
                </div>

                {/* GENERATED TEXT AREA */}
                <div className="relative group">
                  {!generatedMessage ? (
                    <button 
                      onClick={generateAIMessage}
                      className="w-full h-32 border-2 border-dashed border-brand-border rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-brand-primary/50 hover:bg-brand-primary/5 transition-all group/gen"
                    >
                      <Sparkles className="w-6 h-6 text-brand-primary transition-transform group-hover/gen:rotate-12" />
                      <span className="text-xs font-black text-brand-primary uppercase tracking-widest">Criar Mensagem Persuasiva com IA</span>
                    </button>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="w-full bg-brand-bg border border-brand-border rounded-2xl p-4 min-h-[128px]"
                    >
                      <textarea 
                        value={generatedMessage}
                        onChange={(e) => setGeneratedMessage(e.target.value)}
                        className="w-full h-32 bg-transparent border-none focus:ring-0 text-xs text-brand-text font-medium leading-relaxed resize-none"
                      />
                      <div className="mt-2 flex justify-end">
                        <button 
                          onClick={sendToWhatsApp}
                          className="px-6 py-2.5 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-primary/20 flex items-center gap-2"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Enviar via WhatsApp
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-brand-border/10 border-t border-brand-border flex items-center justify-center gap-3">
                <span className="text-[8px] font-black text-brand-muted uppercase tracking-widest flex items-center gap-1.5 font-mono">
                  ⚡ Tecnologia Gemini AI Integrada • 100% Gratuito para Business e Elite
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConsentModal
        isOpen={showConsentModal}
        userId={userId}
        onClose={() => setShowConsentModal(false)}
        onAcceptSuccess={handleConsentAcceptSuccess}
      />
    </motion.div>
  );
}
