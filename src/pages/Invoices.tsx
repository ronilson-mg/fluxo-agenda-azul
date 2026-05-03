import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Invoice, Client, Subscription } from '../types';
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  Pencil,
  MoreVertical, 
  CheckCircle2, 
  MessageSquare,
  FileText,
  Rocket,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'motion/react';
import { formatCurrency, formatDate, cn, checkBusinessHours } from '../lib/utils';
import { showToast } from '../lib/toast';
import { AICollectionModal } from '../components/AICollectionModal';

interface InvoicesProps {
  subscription: Subscription | null;
  userId: string;
}

export default function Invoices({ subscription, userId }: InvoicesProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'overdue' | 'paid'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGateModal, setShowGateModal] = useState(false);
  const [showAIGateModal, setShowAIGateModal] = useState(false);
  const [selectedInvoiceForAI, setSelectedInvoiceForAI] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Form state
  const [clientId, setClientId] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');

  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const now = new Date();
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
      
      const [invoicesResp, clientsResp] = await Promise.all([
        supabase.from('fa_invoices').select('*').eq('user_id', userId).order('due_date', { ascending: true }),
        supabase.from('fa_clients').select('*').eq('user_id', userId).order('name', { ascending: true })
      ]);

      if (!invoicesResp.error && invoicesResp.data) {
        const items = invoicesResp.data.map(inv => {
          if (inv.status === 'open' && inv.due_date < todayStr) {
            return { ...inv, status: 'overdue' as const };
          }
          return inv;
        });
        setInvoices(items);
      }
      if (!clientsResp.error && clientsResp.data) setClients(clientsResp.data);
    } catch (error) {
      console.error('Error fetching invoices data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const handleGeneratePDF = () => {
    // PLAN GATE: Business / Premium only
    const canAccess = subscription?.plano === 'business' || subscription?.plano === 'premium';
    if (!canAccess) {
      setShowGateModal(true);
      return;
    }
    
    showToast('Gerando Relatório PDF... (Função Business+ Ativa)', 'info');
    // In a real app, I'd use jsPDF here as requested.
  };

  const handleOpenAdd = () => {
    setEditingInvoice(null);
    setClientId('');
    setAmount('');
    setDueDate('');
    setDescription('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setClientId(invoice.client_id);
    setAmount(invoice.amount.toString());
    setDueDate(invoice.due_date);
    setDescription(invoice.description);
    setShowAddModal(true);
  };

  const handleAddInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !amount || !dueDate) {
      showToast('Preencha os campos obrigatórios', 'error');
      return;
    }

    const selectedClient = clients.find(c => c.id === clientId);
    const now = new Date();
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
    const initialStatus = dueDate < todayStr ? 'overdue' : 'open';

    try {
      if (editingInvoice) {
        const { error } = await supabase
          .from('fa_invoices')
          .update({
            client_id: clientId,
            client_name: selectedClient?.name || 'Cliente',
            amount: parseFloat(amount),
            due_date: dueDate,
            description,
            // If it was paid, keep it paid, otherwise update status based on date
            status: editingInvoice.status === 'paid' ? 'paid' : initialStatus
          })
          .eq('id', editingInvoice.id);

        if (error) throw error;
        showToast('Cobrança atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('fa_invoices')
          .insert({
            client_id: clientId,
            client_name: selectedClient?.name || 'Cliente',
            amount: parseFloat(amount),
            due_date: dueDate,
            description,
            status: initialStatus,
            user_id: userId
          });

        if (error) throw error;
        showToast('Cobrança criada com sucesso!');
      }

      setShowAddModal(false);
      setEditingInvoice(null);
      setClientId(''); setAmount(''); setDueDate(''); setDescription('');
      await fetchData(); // Await to ensure UI reflects database
    } catch (err: any) {
      console.error('Error saving invoice:', err);
      showToast('Erro ao salvar cobrança', 'error');
    }
  };

  const handleWhatsAppMessage = (invoice: Invoice) => {
    const hours = checkBusinessHours();
    if (!hours.isAllowed) {
      showToast(hours.message || '⚠️ LGPD: Envios proibidos aos domingos ou fora do horário comercial.', 'info');
      return;
    }

    const client = clients.find(c => c.id === invoice.client_id);
    if (!client || !client.phone) {
      showToast('Telefone do cliente não encontrado.', 'error');
      return;
    }

    const phone = client.phone.replace(/\D/g, '');
    const now = new Date();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
    const dueDate = invoice.due_date;
    
    let message = '';
    
    if (invoice.status === 'overdue') {
      message = `Olá, *${invoice.client_name}*! 😊\n\nIdentificamos uma pendência no valor de *${formatCurrency(invoice.amount)}* que venceu em ${formatDate(dueDate)}. 🧐\n\nSabemos que imprevistos acontecem! Poderia nos enviar o comprovante ou nos avisar se houve algum problema para que possamos te ajudar? 🙏\n\nFicamos no aguardo. Obrigado! 🚀`;
    } else if (dueDate === today) {
      message = `Oi, *${invoice.client_name}*! 👋\n\nPassando apenas para lembrar que sua cobrança de *${formatCurrency(invoice.amount)}* vence *hoje*! ⚡\n\nCaso já tenha pago, por favor desconsidere. Se precisar de algo, estou à disposição! Tenha um excelente dia! ✨`;
    } else {
      message = `Olá, *${invoice.client_name}*! 🌟\n\nTudo certinho? Gostaríamos de lembrar que sua fatura de *${formatCurrency(invoice.amount)}* tem vencimento para o dia ${formatDate(dueDate)}. 🗓️\n\nEste é apenas um lembrete amigável para sua organização. Conte conosco! 🎯`;
    }

    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleOpenAI = (invoice: Invoice) => {
    const canAccess = subscription?.plano === 'business' || subscription?.plano === 'premium';
    if (!canAccess) {
      setShowAIGateModal(true);
      return;
    }
    setSelectedInvoiceForAI(invoice);
  };

  const getDebtHealth = (invoice: Invoice) => {
    if (invoice.status === 'paid') return { label: 'Liquidada', color: 'text-brand-primary', bg: 'bg-brand-primary/10', icon: CheckCircle2 };
    
    const now = new Date();
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
    
    if (invoice.due_date >= todayStr) {
      return { label: 'No Prazo', color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle2 };
    }

    // Parse YYYY-MM-DD manually to local time midnight
    const [year, month, day] = invoice.due_date.split('-').map(Number);
    // Use local time for the date object to match todayObj
    const dueDateObj = new Date(year, month - 1, day);
    
    // Create todayObj based on Brazil time components
    const [tY, tM, tD] = todayStr.split('-').map(Number);
    const todayObj = new Date(tY, tM - 1, tD);
    
    const diffTime = todayObj.getTime() - dueDateObj.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) return { label: 'Atraso Leve', color: 'text-orange-500', bg: 'bg-orange-500/10', icon: AlertTriangle };
    if (diffDays <= 30) return { label: 'Atraso Crítico', color: 'text-brand-danger', bg: 'bg-brand-danger/10', icon: AlertTriangle };
    return { label: 'Inadimplente', color: 'text-purple-500', bg: 'bg-purple-500/10', icon: AlertTriangle };
  };

  const handleMarkAsPaid = async (invoice: Invoice) => {
    try {
      const { error } = await supabase
        .from('fa_invoices')
        .update({ status: 'paid' })
        .eq('id', invoice.id);
      
      if (error) throw error;
      
      showToast(`🎉 Recebimento de ${invoice.client_name} confirmado!`, 'success');
      fetchData();
    } catch (err: any) {
      console.error('Error marking as paid:', err);
      showToast('Erro ao confirmar recebimento.', 'error');
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    if (filter === 'all') return true;
    return inv.status === filter;
  });

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-brand-text">Cobranças</h2>
          <p className="text-brand-muted text-xs sm:text-sm font-sans mt-1">Monitore e acompanhe seus recebíveis.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button 
            onClick={handleGeneratePDF}
            className="w-full sm:w-auto justify-center bg-brand-card hover:bg-brand-bg text-brand-muted font-bold py-2.5 px-6 rounded-xl border border-brand-border transition-all flex items-center gap-2"
          >
            <FileText className="w-4 h-4" /> <span className="sm:hidden lg:inline text-xs">Relatório PDF</span>
          </button>
          <button 
            onClick={handleOpenAdd}
            className="w-full sm:w-auto justify-center bg-brand-primary hover:bg-brand-primary-hover text-white font-black text-xs uppercase tracking-widest py-3 px-6 rounded-xl transition-all shadow-lg shadow-brand-primary/20 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Nova Cobrança
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none sm:scrollbar-thin">
        {(['all', 'open', 'overdue', 'paid'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-lg text-[9px] sm:text-xs font-bold uppercase tracking-wider transition-all border shadow-sm shrink-0",
              filter === f 
                ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20" 
                : "bg-brand-card text-brand-muted border-brand-border hover:border-brand-primary/30"
            )}
          >
            {f === 'all' ? 'Todas' : f === 'open' ? 'Em aberto' : f === 'overdue' ? 'Vencidas' : 'Pagas'}
          </button>
        ))}
        <button 
          onClick={() => showToast('Para editar, clique no ícone do Lápis que aparece na linha da cobrança desejada.', 'info')}
          className="px-4 py-2 rounded-lg text-[9px] sm:text-xs font-bold uppercase tracking-wider transition-all border shadow-sm shrink-0 bg-brand-bg text-brand-muted border-brand-border hover:border-brand-primary/30 flex items-center gap-2"
        >
          <Pencil className="w-3 h-3" /> Editar
        </button>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto h-[500px] scrollbar-thin scrollbar-thumb-brand-border">
          <table className="w-full text-left border-collapse">
            <thead className="bg-brand-bg/50 border-b border-brand-border sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-brand-muted uppercase tracking-wider bg-brand-bg/50">Cliente / Descrição</th>
                <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-brand-muted uppercase tracking-wider bg-brand-bg/50">Valor</th>
                <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-brand-muted uppercase tracking-wider bg-brand-bg/50 hidden lg:table-cell">Health</th>
                <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-brand-muted uppercase tracking-wider bg-brand-bg/50 hidden sm:table-cell">Vencimento</th>
                <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-brand-muted uppercase tracking-wider bg-brand-bg/50">Status</th>
                <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-brand-muted uppercase tracking-wider text-right bg-brand-bg/50">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-brand-bg/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5 max-w-[150px] sm:max-w-none">
                      <span className="font-bold text-xs sm:text-sm text-brand-text uppercase tracking-tight truncate">{inv.client_name}</span>
                      <span className="text-[9px] sm:text-[10px] text-brand-muted truncate font-medium">{inv.description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "font-display font-black text-xs sm:text-sm",
                      inv.status === 'paid' ? 'text-brand-primary' : inv.status === 'overdue' ? 'text-brand-danger' : 'text-orange-500'
                    )}>
                      {formatCurrency(inv.amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    {(() => {
                      const health = getDebtHealth(inv);
                      const Icon = health.icon;
                      return (
                        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest", health.bg, health.color, "border-current/10")}>
                          <Icon className="w-3 h-3" />
                          {health.label}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 text-[10px] sm:text-xs font-bold text-brand-muted font-mono hidden sm:table-cell">
                    {formatDate(inv.due_date)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[8px] sm:text-[9px] font-black tracking-widest px-2 sm:px-2.5 py-1 rounded-full border uppercase shadow-sm whitespace-nowrap",
                      inv.status === 'paid' ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' :
                      inv.status === 'overdue' ? 'bg-brand-danger/10 text-brand-danger border-brand-danger/20' :
                      'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    )}>
                      {inv.status === 'paid' ? '✓ PAGO' : inv.status === 'overdue' ? '⚠ VENCIDO' : '⏳ ABERTO'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                       <button 
                         onClick={() => handleOpenEdit(inv)}
                         title="Editar Cobrança"
                         className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white transition-all flex items-center justify-center border border-brand-primary/20 shrink-0"
                       >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                       <button 
                         onClick={() => handleOpenAI(inv)}
                         title="IA Persuasiva"
                         className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-brand-primary text-white hover:bg-brand-primary-hover transition-all flex items-center justify-center shadow-lg shadow-brand-primary/20 shrink-0"
                       >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                       <button 
                         onClick={() => handleWhatsAppMessage(inv)}
                         title="Enviar WhatsApp"
                         className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all flex items-center justify-center border border-green-500/10 shrink-0"
                       >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button 
                         onClick={() => handleMarkAsPaid(inv)}
                         title="Dar Baixa (Confirmar Pagamento)"
                         className="h-7 sm:h-8 px-2 sm:px-3 rounded-lg bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white transition-all flex items-center gap-1.5 border border-brand-primary/10 shadow-sm shrink-0 group"
                       >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest hidden xl:inline">Dar Baixa</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-brand-muted font-sans italic text-sm">
                    Nenhuma cobrança encontrada em seu sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
             className="absolute inset-0 bg-brand-bg/90 backdrop-blur-md"
             onClick={() => setShowAddModal(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-brand-card border border-brand-border rounded-2xl shadow-2xl relative z-10 overflow-hidden"
          >
            <header className="p-6 border-b border-brand-border bg-brand-bg/50">
              <h3 className="text-lg font-display font-black text-brand-text uppercase tracking-tight">
                {editingInvoice ? '✏️ Editar Cobrança' : '💰 Nova Cobrança'}
              </h3>
            </header>
            <form onSubmit={handleAddInvoice} className="p-6 space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-brand-muted mb-2 ml-1 uppercase tracking-widest">Cliente</label>
                <select
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text focus:outline-none focus:border-brand-primary appearance-none shadow-inner"
                >
                  <option value="">Selecione o cliente</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-brand-muted mb-2 ml-1 uppercase tracking-widest">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text focus:outline-none focus:border-brand-primary shadow-inner font-mono"
                  />
                </div>
                <div>
                   <label className="block text-[10px] font-bold text-brand-muted mb-2 ml-1 uppercase tracking-widest">Vencimento</label>
                   <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text focus:outline-none focus:border-brand-primary shadow-inner"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-brand-muted mb-2 ml-1 uppercase tracking-widest">Descrição</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Consulta, Parcela 1/3, Serviço..."
                  className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text focus:outline-none focus:border-brand-primary shadow-inner"
                />
              </div>
              <footer className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2.5 rounded-xl font-bold text-brand-muted hover:bg-brand-bg transition-all uppercase text-[10px] tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-brand-primary hover:bg-brand-primary-hover text-white font-black py-3 px-8 rounded-xl transition-all shadow-lg shadow-brand-primary/20 uppercase text-xs tracking-widest"
                >
                  {editingInvoice ? 'Salvar Alterações' : 'Criar Cobrança'}
                </button>
              </footer>
            </form>
          </motion.div>
        </div>
      )}

       {/* Business Gate Modal */}
       {showGateModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div 
             className="absolute inset-0 bg-brand-bg/95 backdrop-blur-xl"
             onClick={() => setShowGateModal(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-brand-card border border-blue-500/30 rounded-[2rem] p-10 shadow-2xl relative z-10 text-center"
          >
            <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-blue-500/20">
               <Receipt className="text-blue-500 w-10 h-10" />
            </div>
            <h3 className="text-2xl font-display font-black text-brand-text uppercase tracking-tight mb-4 leading-tight">Relatórios PDF</h3>
            <p className="text-brand-muted text-sm font-sans mb-8 leading-relaxed">
              O relatório PDF mensal com todos os seus dados e resultados consolidados está disponível no plano <strong>BUSINESS</strong>.
            </p>
            <div className="space-y-3">
               <button 
                onClick={() => window.open(`https://wa.me/5531984132145?text=Oi%20Ronilson,%20quero%20o%20plano%20Business%20para%20gerar%20relatórios%20PDF!%20Meu%20email:%20${subscription?.email}`, '_blank')}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-500/20 uppercase text-sm tracking-widest"
              >
                Upgrade Business R$ 97,90
              </button>
              <button 
                onClick={() => setShowGateModal(false)}
                className="w-full py-4 rounded-2xl font-bold text-brand-muted hover:bg-brand-bg transition-all uppercase text-xs tracking-widest"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* AI Gate Modal */}
      {showAIGateModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div 
             className="absolute inset-0 bg-brand-bg/95 backdrop-blur-xl"
             onClick={() => setShowAIGateModal(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-brand-card border border-brand-primary/30 rounded-[2rem] p-10 shadow-2xl relative z-10 text-center"
          >
            <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-brand-primary/20">
               <Sparkles className="text-brand-primary w-10 h-10" />
            </div>
            <h3 className="text-2xl font-display font-black text-brand-text uppercase tracking-tight mb-4 leading-tight">IA Persuasiva</h3>
            <p className="text-brand-muted text-sm font-sans mb-8 leading-relaxed">
              Turbine suas cobranças com nossa Inteligência Artificial! Recurso exclusivo dos planos <strong>BUSINESS</strong> e <strong>PREMIUM</strong>.
            </p>
            <div className="space-y-3">
               <button 
                onClick={() => window.open(`https://wa.me/5531984132145?text=Oi%20Ronilson,%20quero%20o%20plano%20Business%20para%20usar%20a%20IA%20Persuasiva!%20Meu%20email:%20${subscription?.email}`, '_blank')}
                className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-brand-primary/20 uppercase text-sm tracking-widest"
              >
                Upgrade p/ Business R$ 97,90
              </button>
              <button 
                onClick={() => setShowAIGateModal(false)}
                className="w-full py-4 rounded-2xl font-bold text-brand-muted hover:bg-brand-bg transition-all uppercase text-xs tracking-widest"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}
      <AICollectionModal 
        invoice={selectedInvoiceForAI} 
        clientPhone={clients.find(c => c.id === selectedInvoiceForAI?.client_id)?.phone}
        isPremium={subscription?.plano === 'premium'}
        onClose={() => setSelectedInvoiceForAI(null)} 
      />
    </div>
  );
}
