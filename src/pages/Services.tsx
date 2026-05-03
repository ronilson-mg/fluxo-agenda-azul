import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Subscription } from '../types';
import { 
  Scissors,
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setServices([
        { id: '1', name: 'Corte de Cabelo', duration: 40, price: 50, prepayment_percentage: 50, active: true },
        { id: '2', name: 'Barba Terapia', duration: 30, price: 35, prepayment_percentage: 0, active: true },
        { id: '3', name: 'Combo: Corte + Barba', duration: 60, price: 80, prepayment_percentage: 50, active: true },
        { id: '4', name: 'Consultoria Financeira', duration: 90, price: 200, prepayment_percentage: 100, active: true },
      ]);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

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
        <button className="bg-brand-primary hover:bg-brand-primary-hover text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-brand-primary/20 transition-all">
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
                    <Scissors className="w-6 h-6" />
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
                  <button className="p-2 text-brand-muted hover:text-brand-text hover:bg-brand-bg rounded-lg transition-all">
                    <Settings2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-brand-muted hover:text-brand-danger hover:bg-brand-danger/5 rounded-lg transition-all">
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

              <button className="w-full mt-6 py-3 bg-brand-bg hover:bg-brand-border border border-brand-border rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-muted hover:text-brand-text transition-all flex items-center justify-center gap-2">
                Ver Detalhes do Serviço <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
