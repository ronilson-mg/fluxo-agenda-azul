import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Subscription } from '../types';
import { 
  Clock, 
  Plus, 
  Trash2,
  Settings2,
  DollarSign,
  Briefcase,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { showToast } from '../lib/toast';

interface Service {
  id: string;
  name: string;
  duration: number; // in minutes
  price: number;
  prepayment_percentage: number;
  active: boolean;
}

export default function Services({ subscription, userId }: { subscription: Subscription | null, userId: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('30');
  const [price, setPrice] = useState('');
  const [prepayment, setPrepayment] = useState('50');

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fa_services')
        .select('*')
        .eq('user_id', userId)
        .order('name');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setServices(data);
        localStorage.setItem(`fa_services_${userId}`, JSON.stringify(data));
      } else {
        const localData = localStorage.getItem(`fa_services_${userId}`);
        if (localData) {
          setServices(JSON.parse(localData));
        } else {
          setServices([]);
        }
      }
    } catch (err) {
      console.error('Error fetching services:', err);
      const localData = localStorage.getItem(`fa_services_${userId}`);
      setServices(localData ? JSON.parse(localData) : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [userId]);

  const handleOpenAdd = () => {
    setEditingService(null);
    setName(''); setDuration('30'); setPrice(''); setPrepayment('50');
    setShowModal(true);
  };

  const handleOpenEdit = (service: Service) => {
    setEditingService(service);
    setName(service.name);
    setDuration(service.duration.toString());
    setPrice(service.price.toString());
    setPrepayment(service.prepayment_percentage.toString());
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este serviço permanentemente?')) return;
    
    // Atualização otimista/fallback local
    const updatedServices = services.filter(s => s.id !== id);
    setServices(updatedServices);
    localStorage.setItem(`fa_services_${userId}`, JSON.stringify(updatedServices));

    try {
      const { error } = await supabase.from('fa_services').delete().eq('id', id);
      if (error) {
        console.warn('Erro ao deletar do banco, mantendo local:', error);
      } else {
        showToast('Serviço removido com sucesso!');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const serviceData = {
      id: editingService?.id || Math.random().toString(36).substr(2, 9),
      name,
      duration: parseInt(duration),
      price: parseFloat(price),
      prepayment_percentage: parseInt(prepayment),
      user_id: userId,
      active: true
    };

    // Salvar localmente primeiro para garantir que o usuário veja a mudança
    const updatedServices = editingService 
      ? services.map(s => s.id === editingService.id ? serviceData : s)
      : [serviceData, ...services];
    
    setServices(updatedServices);
    localStorage.setItem(`fa_services_${userId}`, JSON.stringify(updatedServices));

    try {
      const { error } = editingService
        ? await supabase.from('fa_services').update(serviceData).eq('id', editingService.id)
        : await supabase.from('fa_services').insert(serviceData);
      
      if (error) throw error;
      showToast(editingService ? 'Serviço atualizado!' : 'Serviço criado!');
    } catch (err) {
      console.error('Error saving to DB:', err);
      showToast('Salvo localmente (Problema na conexão com o banco)', 'success');
    } finally {
      setShowModal(false);
      setSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-20"
    >
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-display font-black text-brand-text uppercase tracking-tight">Meus Serviços</h2>
          <p className="text-brand-muted text-sm italic">Defina o que você oferece e configure o valor do sinal.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-brand-primary hover:bg-brand-primary-hover text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-brand-primary/20 transition-all"
        >
          <Plus className="w-4 h-4" /> Novo Serviço
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-brand-card border border-brand-border h-40 rounded-2xl animate-pulse" />
          ))
        ) : services.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-brand-card border border-brand-border rounded-2xl">
             <Briefcase className="w-12 h-12 text-brand-muted mx-auto mb-4 opacity-20" />
             <p className="text-brand-muted font-bold uppercase tracking-widest text-xs">Nenhum serviço cadastrado ainda.</p>
          </div>
        ) : (
          services.map(service => (
            <div key={service.id} className="bg-brand-card border border-brand-border rounded-2xl p-6 hover:border-brand-primary/30 transition-all shadow-sm group">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-bg border border-brand-border rounded-xl flex items-center justify-center text-brand-primary group-hover:scale-110 transition-transform shadow-inner">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-brand-text uppercase tracking-tight">{service.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-brand-muted uppercase">
                        <Clock className="w-3 h-3" /> {service.duration} min
                      </span>
                      <span className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest",
                        service.active ? "bg-brand-primary/10 text-brand-primary border-brand-primary/10" : "bg-brand-muted/10 text-brand-muted border-brand-muted/10"
                      )}>
                        {service.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleOpenEdit(service)}
                    className="p-2 text-brand-muted hover:text-brand-text hover:bg-brand-bg rounded-lg transition-all"
                  >
                    <Settings2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(service.id)}
                    className="p-2 text-brand-muted hover:text-brand-danger hover:bg-brand-danger/5 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-end justify-between pt-6 border-t border-brand-border/50">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-brand-muted uppercase tracking-[2px]">Valor do Serviço</p>
                  <p className="text-2xl font-display font-black text-brand-text">R$ {service.price.toFixed(2)}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-bold text-brand-primary uppercase tracking-[2px]">Sinal Exigido (PIX)</p>
                  <div className="flex items-center gap-2 justify-end">
                    <p className="text-sm font-bold text-brand-text">{service.prepayment_percentage}%</p>
                    <div className="h-2 w-16 bg-brand-bg rounded-full overflow-hidden border border-brand-border">
                       <div 
                         className="h-full bg-brand-primary rounded-full"
                         style={{ width: `${service.prepayment_percentage}%` }}
                       />
                    </div>
                    <p className="text-sm font-black text-brand-primary">R$ {((service.price * service.prepayment_percentage) / 100).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Service Modal */}
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
                {editingService ? 'Editar Serviço' : 'Novo Serviço'}
              </h3>
            </header>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-brand-muted uppercase mb-1">Nome do Serviço</label>
                <input 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 text-sm"
                  placeholder="Ex: Corte de Cabelo"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-brand-muted uppercase mb-1">Duração (Minutos)</label>
                  <input 
                    type="number"
                    required
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-brand-muted uppercase mb-1">Preço (R$)</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-brand-muted uppercase mb-1">Sinal Exigido (%)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={prepayment}
                    onChange={(e) => setPrepayment(e.target.value)}
                    className="flex-1 accent-brand-primary"
                  />
                  <span className="font-bold text-brand-primary w-12">{prepayment}%</span>
                </div>
                <p className="text-[10px] text-brand-muted mt-1 italic">
                  O cliente pagará R$ {((parseFloat(price || '0') * parseInt(prepayment)) / 100).toFixed(2)} adiantado.
                </p>
              </div>
              <footer className="pt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold text-brand-muted uppercase">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-brand-primary text-white font-black px-8 py-3 rounded-xl text-xs uppercase tracking-widest disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Confirmar'}
                </button>
              </footer>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
