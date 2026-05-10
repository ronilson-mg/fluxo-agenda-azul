import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Download,
  Calendar,
  Filter,
  FileText,
  PieChart as PieChartIcon,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { 
  BarChart as ReBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ReTooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { supabase } from '../lib/supabase';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { showToast } from '../lib/toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { Subscription } from '../types';

interface ReportStats {
  mes: string;
  fullDate: Date;
  recebido: number;
  previsto: number;
}

export default function Reports({ userId, subscription }: { userId: string, subscription: Subscription | null }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReportStats[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(6); // months
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [showGateModal, setShowGateModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [summary, setSummary] = useState({
    crescimento: 0,
    conversao: 0,
    ticketMedio: 0,
    status: 'Estável' as 'Ascendente' | 'Descendente' | 'Estável'
  });

  const isAdmin = subscription?.email === 'ronilsonaugustomg@gmail.com';
  const isPaid = isAdmin || subscription?.plano === 'business' || subscription?.plano === 'premium';

  useEffect(() => {
    fetchReportData();
  }, [userId, selectedPeriod]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowPeriodMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const { data: invoices } = await supabase
        .from('fa_invoices')
        .select('*')
        .eq('user_id', userId);

      if (invoices) {
        const now = new Date();
        const monthsData: ReportStats[] = [];
        
        for (let i = selectedPeriod - 1; i >= 0; i--) {
          const date = subMonths(now, i);
          const start = startOfMonth(date);
          const end = endOfMonth(date);
          
          const monthInvoices = invoices.filter(inv => {
            const dueDate = parseISO(inv.due_date);
            return isWithinInterval(dueDate, { start, end });
          });

          const recebido = monthInvoices
            .filter(inv => inv.status === 'paid')
            .reduce((acc, inv) => acc + inv.amount, 0);
          
          const previsto = monthInvoices
            .reduce((acc, inv) => acc + inv.amount, 0);

          monthsData.push({
            mes: format(date, 'MMM', { locale: ptBR }),
            fullDate: date,
            recebido,
            previsto
          });
        }

        setStats(monthsData);

        // Calculate Summary
        const totalPaid = invoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + i.amount, 0);
        const totalInvoiced = invoices.reduce((acc, i) => acc + i.amount, 0);
        const paidCount = invoices.filter(i => i.status === 'paid').length;
        
        const currentMonthStats = monthsData[monthsData.length - 1];
        const lastMonthStats = monthsData[monthsData.length - 2];
        
        let growth = 0;
        if (lastMonthStats && lastMonthStats.recebido > 0) {
          growth = ((currentMonthStats.recebido - lastMonthStats.recebido) / lastMonthStats.recebido) * 100;
        }

        setSummary({
          crescimento: growth,
          conversao: totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0,
          ticketMedio: paidCount > 0 ? totalPaid / paidCount : 0,
          status: growth > 5 ? 'Ascendente' : growth < -5 ? 'Descendente' : 'Estável'
        });
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      showToast('Erro ao carregar dados do relatório', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!isPaid) {
      setShowGateModal(true);
      return;
    }

    if (isExporting) return;
    
    setIsExporting(true);
    showToast('Iniciando exportação...', 'info');
    
    try {
      if (!reportRef.current) throw new Error('Ref não encontrada');
      
      setShowPeriodMenu(false);
      await new Promise(r => setTimeout(r, 400));

      const canvas = await html2canvas(reportRef.current, {
        scale: 1, // Escala conservadora para evitar crash
        useCORS: true,
        backgroundColor: '#0a0f16',
        logging: false,
        onclone: (doc) => {
          // Remove botões e elementos que não devem aparecer no PDF
          const elementsToHide = doc.querySelectorAll('button, .print\\:hidden, .hidden-in-pdf');
          elementsToHide.forEach(el => (el as HTMLElement).style.display = 'none');
          
          const container = doc.querySelector('.p-4');
          if (container) (container as HTMLElement).style.padding = '40px';
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
      pdf.save(`Relatorio_FluxoAzul_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
      
      showToast('Relatório exportado!', 'success');
    } catch (err: any) {
      console.error('PDF Error:', err);
      // Fallback: Abre a impressão do navegador (garantido funcionar)
      showToast('Usando modo de impressão alternativo...', 'info');
      setTimeout(() => window.print(), 500);
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-8 space-y-8"
      ref={reportRef}
    >
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 print:hidden">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-black text-brand-text uppercase tracking-tight">Centro de Inteligência</h2>
          <p className="text-brand-muted text-xs sm:text-sm font-bold uppercase tracking-widest mt-1 opacity-60">Análise de performance e crescimento do Fluxo Azul.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setShowPeriodMenu(!showPeriodMenu)}
              className="flex items-center gap-2 bg-brand-bg border border-brand-border px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-text hover:border-brand-primary transition-all active:scale-95"
            >
              <Calendar className="w-4 h-4" /> {selectedPeriod} Meses <ChevronDown className="w-3 h-3" />
            </button>
            
            <AnimatePresence>
              {showPeriodMenu && (
                <>
                  {/* Overlay invisível para fechar o menu ao clicar fora no mobile */}
                  <div 
                    className="fixed inset-0 z-40 lg:hidden" 
                    onClick={() => setShowPeriodMenu(false)} 
                  />
                  <motion.div 
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 bg-brand-card border border-brand-border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden backdrop-blur-xl"
                  >
                    <div className="p-2 border-b border-brand-border bg-brand-bg/50">
                      <p className="text-[9px] font-black uppercase tracking-widest text-brand-muted px-2 py-1">Selecionar Período</p>
                    </div>
                    {[3, 6, 12, 24].map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setSelectedPeriod(p);
                          setShowPeriodMenu(false);
                          showToast(`Período alterado: ${p} meses`, 'info');
                        }}
                        className={`w-full text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b border-brand-border/50 last:border-0 flex items-center justify-between group ${
                          selectedPeriod === p ? 'text-brand-primary bg-brand-primary/5' : 'text-brand-muted hover:bg-brand-primary/10 hover:text-brand-primary'
                        }`}
                      >
                        <span>Últimos {p} Meses</span>
                        {selectedPeriod === p && <div className="w-1.5 h-1.5 rounded-full bg-brand-primary shadow-[0_0_10px_#00a884]" />}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          
          <button 
            onClick={handleExportPDF}
            disabled={isExporting}
            className={`flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting ? 'Processando...' : 'Exportar PDF'}
          </button>
        </div>
      </header>

      {/* Business Gate Modal */}
      {showGateModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div 
             className="absolute inset-0 bg-brand-bg/95 backdrop-blur-xl"
             onClick={() => setShowGateModal(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-brand-card border border-blue-500/30 rounded-[2rem] p-8 shadow-2xl relative z-10 text-center"
          >
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
               <Download className="text-blue-500 w-8 h-8" />
            </div>
            <h3 className="text-xl font-display font-black text-brand-text uppercase tracking-tight mb-2 leading-tight">Exportação de Relatórios</h3>
            <p className="text-brand-muted text-xs leading-relaxed mb-8">
              A exportação profissional em PDF com análise de IA está disponível exclusivamente nos planos <strong>BUSINESS</strong> e <strong>PREMIUM</strong>.
            </p>
            <div className="space-y-3">
               <button 
                onClick={() => window.open(`https://wa.me/5531984132145?text=Oi%20Ronilson,%20quero%20o%20plano%20Business%20para%20exportar%20meus%20relatórios!%20Meu%20email:%20${subscription?.email}`, '_blank')}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-blue-500/20 uppercase text-[10px] tracking-widest"
              >
                Upgrade Business R$ 97,90
              </button>
              <button 
                onClick={() => setShowGateModal(false)}
                className="w-full py-4 rounded-xl font-bold text-brand-muted hover:bg-brand-bg transition-all uppercase text-[9px] tracking-widest"
              >
                Agora não
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Stats Table for Print */}
      <div className="hidden print:block mb-8">
        <h1 className="text-2xl font-bold mb-4">Relatório de Inteligência - Fluxo Azul</h1>
        <p className="text-sm text-gray-600 mb-8">Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      {/* Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-brand-card border border-brand-border rounded-[2rem] p-6 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${summary.status === 'Ascendente' ? 'bg-emerald-500/10 text-emerald-500' : summary.status === 'Descendente' ? 'bg-red-500/10 text-red-500' : 'bg-brand-primary/10 text-brand-primary'}`}>
               {summary.status === 'Ascendente' ? <TrendingUp className="w-5 h-5" /> : summary.status === 'Descendente' ? <TrendingDown className="w-5 h-5" /> : <BarChart3 className="w-5 h-5" />}
             </div>
             <span className={`text-[10px] font-black px-2 py-1 rounded-full ${summary.crescimento >= 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}>
               {summary.crescimento >= 0 ? '+' : ''}{summary.crescimento.toFixed(1)}%
             </span>
          </div>
          <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1">Crescimento Mensal</p>
          <h4 className="text-2xl font-display font-black text-brand-text">{summary.status}</h4>
          <p className="text-[10px] text-brand-muted mt-2">Comparado ao mês anterior</p>
        </div>

        <div className="bg-brand-card border border-brand-border rounded-[2rem] p-6 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
             <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
               <Target className="w-5 h-5" />
             </div>
             <span className="text-[10px] font-black text-brand-primary bg-brand-primary/10 px-2 py-1 rounded-full">Eficiência</span>
          </div>
          <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1">Taxa de Conversão</p>
          <h4 className="text-2xl font-display font-black text-brand-text">{summary.conversao.toFixed(1)}%</h4>
          <p className="text-[10px] text-brand-muted mt-2">Pagos vs Emitidos (Total)</p>
        </div>

        <div className="bg-brand-card border border-brand-border rounded-[2rem] p-6 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
             <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
               <PieChartIcon className="w-5 h-5" />
             </div>
             <span className="text-[10px] font-black text-purple-500 bg-purple-500/10 px-2 py-1 rounded-full">Média</span>
          </div>
          <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1">Ticket Médio</p>
          <h4 className="text-2xl font-display font-black text-brand-text">{formatCurrency(summary.ticketMedio)}</h4>
          <p className="text-[10px] text-brand-muted mt-2">Valor médio por pagamento</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Main Chart */}
        <div className="bg-brand-card border border-brand-border rounded-[2rem] p-8 shadow-xl relative min-h-[400px]">
           {loading && (
             <div className="absolute inset-0 bg-brand-card/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-[2rem]">
               <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
             </div>
           )}
           <div className="flex items-center justify-between mb-8">
              <h3 className="font-display font-bold text-brand-text uppercase tracking-wide flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-brand-primary" />
                Performance de Arrecadação
              </h3>
           </div>
           <div className="h-72">
             <ResponsiveContainer width="100%" height="100%">
               <ReBarChart data={stats}>
                 <XAxis dataKey="mes" stroke="#3D5A68" fontSize={10} axisLine={false} tickLine={false} />
                 <ReTooltip 
                   cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                   contentStyle={{ backgroundColor: '#111821', border: '1px solid #1e293b', borderRadius: '12px' }}
                   labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                 />
                 <Bar dataKey="recebido" name="Recebido" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                 <Bar dataKey="previsto" name="Previsto (Total)" fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 4" radius={[4, 4, 0, 0]} />
               </ReBarChart>
             </ResponsiveContainer>
           </div>
           <div className="flex items-center justify-center gap-6 mt-6">
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded bg-brand-primary" />
               <span className="text-[10px] font-black uppercase text-brand-muted">Realizado</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded border border-brand-primary border-dashed" />
               <span className="text-[10px] font-black uppercase text-brand-muted">Projetado</span>
             </div>
           </div>
        </div>

        {/* Detailed Insights */}
        <div className="bg-brand-card border border-brand-border rounded-[2rem] p-8 shadow-xl flex flex-col">
           <h3 className="font-display font-bold text-brand-text uppercase tracking-wide flex items-center gap-2 mb-6">
             <FileText className="w-5 h-5 text-brand-primary" />
             Insights de Crescimento
           </h3>
           <div className="space-y-4 flex-1">
             {[
               { 
                 icon: TrendingUp, 
                 color: summary.crescimento >= 0 ? 'text-emerald-500' : 'text-red-500', 
                 bg: summary.crescimento >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10', 
                 title: 'Tendência de Faturamento', 
                 desc: summary.crescimento >= 0 
                   ? `Seu faturamento cresceu ${summary.crescimento.toFixed(1)}% comparado ao mês anterior.` 
                   : `Houve uma redução de ${Math.abs(summary.crescimento).toFixed(1)}% no faturamento este mês.`,
                 priority: 'Faturamento' 
               },
               { 
                 icon: Target, 
                 color: 'text-brand-primary', 
                 bg: 'bg-brand-primary/10', 
                 title: 'Eficiência de Pagamento', 
                 desc: `Sua taxa de conversão atual é de ${summary.conversao.toFixed(1)}%. Cada pagamento concluído fortalece seu caixa.`, 
                 priority: 'Meta' 
               },
               { 
                 icon: PieChartIcon, 
                 color: 'text-purple-500', 
                 bg: 'bg-purple-500/10', 
                 title: 'Ticket Médio', 
                 desc: `O valor médio recebido por cobrança é de ${formatCurrency(summary.ticketMedio)}.`, 
                 priority: 'Financeiro' 
               },
               { 
                 icon: Calendar, 
                 color: 'text-orange-500', 
                 bg: 'bg-orange-500/10', 
                 title: 'Visão Temporal', 
                 desc: `Análise baseada nos últimos ${selectedPeriod} meses de atividade do Fluxo Azul.`, 
                 priority: 'Análise' 
               }
             ].map((insight, idx) => (
                <div key={idx} className="p-4 bg-brand-bg/50 border border-brand-border rounded-2xl hover:border-brand-primary/30 transition-all flex gap-4">
                  <div className={`w-12 h-12 rounded-xl ${insight.bg} ${insight.color} flex items-center justify-center shrink-0`}>
                    <insight.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-xs font-black text-brand-text uppercase">{insight.title}</h4>
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-brand-bg text-brand-muted border border-brand-border">{insight.priority}</span>
                    </div>
                    <p className="text-[10px] text-brand-muted font-bold leading-relaxed">{insight.desc}</p>
                  </div>
                </div>
             ))}
           </div>
        </div>
      </div>
    </motion.div>
  );
}

