import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Client, Subscription } from '../types';
import { 
  Users, 
  Search, 
  Plus, 
  Pencil, 
  Trash2,
  Mail,
  Phone,
  Rocket,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { showToast } from '../lib/toast';

interface ClientsProps {
  subscription: Subscription | null;
  userId: string;
}

export default function Clients({ subscription, userId }: ClientsProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const fetchClients = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fa_clients')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setClients(data);
    } catch (err: any) {
      console.error('Error fetching clients:', err);
      showToast('Erro ao carregar clientes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [userId]);

  const handleOpenAdd = () => {
    setEditingClient(null);
    setName(''); setEmail(''); setPhone(''); setNotes('');
    
    // PLAN GATE: Trial limit of 5 clients
    const isAdmin = subscription?.email?.toLowerCase() === 'ronilsonaugustomg@gmail.com' || subscription?.plano === 'premium';
    const isTrial = !isAdmin && (!subscription || subscription.plano === 'trial');
    if (isTrial && clients.length >= 5) {
      setShowLimitModal(true);
      return;
    }
    setShowAddModal(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setEmail(client.email || '');
    setPhone(client.phone);
    setNotes(client.notes || '');
    setShowAddModal(true);
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDeleteClient = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    
    // Save current state for rollback
    const previousClients = [...clients];
    
    // Optimistic delete
    const updated = clients.filter(c => c.id !== id);
    setClients(updated);
    localStorage.setItem(`fa_clients_${userId}`, JSON.stringify(updated));

    try {
      const { error } = await supabase
        .from('fa_clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      showToast('Cliente removido com sucesso!');
    } catch (err: any) {
      console.error('Error deleting client:', err);
      // Revert if DB delete failed (e.g. foreign key constraint)
      setClients(previousClients);
      localStorage.setItem(`fa_clients_${userId}`, JSON.stringify(previousClients));
      
      if (err.code === '23503') {
        showToast('Não é possível excluir: este cliente possui agendamentos vinculados.', 'error');
      } else {
        showToast('Erro ao excluir do banco de dados', 'error');
      }
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !phone) {
      showToast('Nome e WhatsApp são obrigatórios', 'error');
      return;
    }

    setSubmitting(true);
    const clientData: any = {
      id: editingClient?.id || Math.random().toString(36).substr(2, 9),
      user_id: userId,
      name,
      email: email || null,
      phone: phone.replace(/\D/g, ''),
      notes: notes || null,
      total_spent: editingClient?.total_spent || 0,
      appointments_count: editingClient?.appointments_count || 0,
      active: true,
      last_visit: editingClient?.last_visit || null
    };

    // Cache local imediato
    const updatedClients = editingClient 
      ? clients.map(c => c.id === editingClient.id ? clientData : c)
      : [clientData, ...clients];
    
    setClients(updatedClients);
    localStorage.setItem(`fa_clients_${userId}`, JSON.stringify(updatedClients));

    try {
      if (editingClient) {
        const { error } = await supabase.from('fa_clients').update({
          name, email: clientData.email, phone: clientData.phone, notes: clientData.notes
        }).eq('id', editingClient.id);
        if (error) throw error;
        showToast('Cliente atualizado!');
      } else {
        const { data, error } = await supabase.from('fa_clients').insert({
          user_id: userId, name, email: clientData.email, phone: clientData.phone, notes: clientData.notes
        }).select().single();
        
        if (error) throw error;
        
        // Atualiza o ID local com o ID real do banco
        if (data) {
          const finalClients = [data, ...clients.filter(c => c.id !== clientData.id)];
          setClients(finalClients);
          localStorage.setItem(`fa_clients_${userId}`, JSON.stringify(finalClients));
        }
        showToast('Cliente cadastrado!');
      }
    } catch (err) {
      console.error('Error saving to DB:', err);
      showToast('Salvo localmente (Problema conexão)', 'success');
    } finally {
      setShowAddModal(false);
      setSubmitting(false);
      setEditingClient(null);
      setName(''); setEmail(''); setPhone(''); setNotes('');
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-brand-text">Clientes</h2>
          <p className="text-brand-muted text-xs sm:text-sm font-sans mt-1">Gerencie sua carteira de clientes e contatos.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="w-full sm:w-auto justify-center bg-brand-primary hover:bg-brand-primary-hover text-white font-black text-xs uppercase tracking-widest py-3 px-6 rounded-xl transition-all shadow-lg shadow-brand-primary/20 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Novo Cliente
        </button>
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
        <input 
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente..."
          className="w-full bg-brand-card border border-brand-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-brand-text focus:outline-none focus:border-brand-primary transition-all shadow-inner placeholder:text-brand-muted/50"
        />
      </div>

      <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto h-[500px] scrollbar-thin scrollbar-thumb-brand-border">
          <table className="w-full text-left border-collapse">
            <thead className="bg-brand-bg/50 border-b border-brand-border sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-brand-muted uppercase tracking-wider bg-brand-bg/50">Nome</th>
                <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-brand-muted uppercase tracking-wider bg-brand-bg/50">Contato</th>
                <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-brand-muted uppercase tracking-wider bg-brand-bg/50 hidden sm:table-cell">Status</th>
                <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-brand-muted uppercase tracking-wider bg-brand-bg/50 hidden md:table-cell">Cobranças</th>
                <th className="px-6 py-4 text-[9px] sm:text-[10px] font-bold text-brand-muted uppercase tracking-wider text-right bg-brand-bg/50">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-brand-bg/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand-primary/10 text-brand-primary rounded-lg flex items-center justify-center font-black text-[10px] uppercase shadow-inner border border-brand-primary/20 shrink-0">
                        {client.name.charAt(0)}
                      </div>
                      <span className="font-bold text-xs sm:text-sm text-brand-text uppercase tracking-tight truncate max-w-[120px] sm:max-w-none">{client.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-brand-muted text-[10px] sm:text-[11px] font-medium truncate max-w-[150px]">
                        <Mail className="w-3 h-3 shrink-0" /> {client.email || '-'}
                      </div>
                      <div className="flex items-center gap-2 text-brand-muted text-[10px] sm:text-[11px] font-medium">
                        <Phone className="w-3 h-3 text-brand-primary shrink-0" /> {client.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <span className="bg-green-500/10 text-green-500 text-[8px] sm:text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full border border-green-500/20 uppercase whitespace-nowrap">
                      ✓ EM DIA
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[10px] sm:text-xs font-bold text-brand-muted uppercase tracking-tighter hidden md:table-cell whitespace-nowrap">
                    0 cobrança(s)
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => handleOpenEdit(client)}
                        className="p-2 text-brand-muted hover:text-brand-primary transition-all rounded-lg hover:bg-brand-primary/10 border border-transparent hover:border-brand-primary/20"
                        title="Editar Cliente"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDeleteId(client.id)}
                        className="w-9 h-9 flex items-center justify-center text-brand-muted hover:text-white transition-all rounded-xl hover:bg-brand-danger shadow-sm border border-transparent hover:border-brand-danger/20 group/trash"
                        title="Excluir Cliente"
                      >
                        <Trash2 className="w-4 h-4 group-hover/trash:scale-110 transition-transform" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-brand-muted font-sans italic text-sm">
                    Nenhum cliente cadastrado em sua carteira.
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
                {editingClient ? '✏️ Editar Cliente' : '👥 Novo Cliente'}
              </h3>
            </header>
            <form onSubmit={handleAddClient} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-brand-muted mb-2 ml-1 uppercase tracking-widest">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome do cliente"
                    className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text focus:outline-none focus:border-brand-primary shadow-inner"
                  />
                </div>
                <div>
                   <label className="block text-[10px] font-bold text-brand-muted mb-2 ml-1 uppercase tracking-widest">WhatsApp</label>
                   <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(31) 99999-9999"
                    className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text focus:outline-none focus:border-brand-primary shadow-inner font-mono"
                  />
                </div>
                <div>
                   <label className="block text-[10px] font-bold text-brand-muted mb-2 ml-1 uppercase tracking-widest">E-mail</label>
                   <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text focus:outline-none focus:border-brand-primary shadow-inner"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-brand-muted mb-2 ml-1 uppercase tracking-widest">Observações Internas</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Melhor dia para cobrar é dia 10..."
                  className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 px-4 text-sm text-brand-text focus:outline-none focus:border-brand-primary min-h-[100px] shadow-inner"
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
                  disabled={submitting}
                  className={cn(
                    "bg-brand-primary hover:bg-brand-primary-hover text-white font-black py-3 px-8 rounded-xl transition-all shadow-lg shadow-brand-primary/20 uppercase text-xs tracking-widest flex items-center gap-2",
                    submitting && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {editingClient ? 'Salvando...' : 'Cadastrando...'}
                    </>
                  ) : (
                    editingClient ? 'Salvar Alterações' : 'Confirmar Cadastro'
                  )}
                </button>
              </footer>
            </form>
          </motion.div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div 
             className="absolute inset-0 bg-brand-bg/95 backdrop-blur-md"
             onClick={() => setDeleteId(null)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-brand-card border border-brand-danger/30 rounded-3xl p-8 shadow-2xl relative z-10 text-center"
          >
            <div className="w-16 h-16 bg-brand-danger/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-brand-danger/20">
               <Trash2 className="text-brand-danger w-8 h-8" />
            </div>
            <h3 className="text-xl font-display font-black text-brand-text uppercase tracking-tight mb-2">Excluir Cliente?</h3>
            <p className="text-brand-muted text-xs leading-relaxed mb-8">
              Tem certeza que deseja remover este cliente? <br/>
              <span className="text-brand-danger font-bold uppercase tracking-tighter mt-2 inline-block">Essa ação não pode ser desfeita!</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
               <button 
                onClick={() => setDeleteId(null)}
                className="py-3.5 rounded-xl font-bold text-brand-muted hover:bg-brand-bg transition-all uppercase text-[10px] tracking-widest border border-brand-border"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDeleteClient}
                className="bg-brand-danger hover:bg-red-600 text-white font-black py-3.5 rounded-xl transition-all shadow-lg shadow-brand-danger/20 uppercase text-[10px] tracking-widest"
              >
                Sim, Excluir
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {showLimitModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div 
             className="absolute inset-0 bg-brand-bg/95 backdrop-blur-xl"
             onClick={() => setShowLimitModal(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-brand-card border border-brand-primary/30 rounded-[2rem] p-10 shadow-2xl relative z-10 text-center"
          >
            <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-brand-primary/20">
               <Rocket className="text-brand-primary w-10 h-10" />
            </div>
            <h3 className="text-2xl font-display font-black text-brand-text uppercase tracking-tight mb-4 leading-tight">Limite Atingido!</h3>
            <p className="text-brand-muted text-sm font-sans mb-8 leading-relaxed">
              Você atingiu o limite de 5 clientes no plano <strong>TRIAL</strong>. <br/>
              Assine o plano <strong>PRO</strong> para ter clientes ilimitados e continuar recuperando seus pagamentos!
            </p>
            <div className="space-y-3">
               <button 
                onClick={() => window.open(`https://wa.me/5531984132145?text=Oi%20Ronilson,%20bati%20o%20limite%20de%205%20clientes%20no%20Trial%20e%20quero%20o%20plano%20Pro!%20Meu%20email:%20${subscription?.email}`, '_blank')}
                className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-brand-primary/20 uppercase text-sm tracking-widest flex items-center justify-center gap-2 group"
              >
                Upgrade Pro R$ 69,90 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => setShowLimitModal(false)}
                className="w-full py-4 rounded-2xl font-bold text-brand-muted hover:bg-brand-bg transition-all uppercase text-xs tracking-widest"
              >
                Agora não
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
