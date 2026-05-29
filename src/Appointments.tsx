import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Subscription } from '../types';
import { 
  Search, 
  Plus, 
  MapPin, 
  MessageSquare, 
  Sparkles, 
  CheckCircle, 
  User, 
  TrendingUp, 
  ShieldAlert, 
  ArrowRight,
  Filter,
  Check,
  Building2,
  Trash2,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { showToast } from '../lib/toast';
import { cn } from '../lib/utils';

interface DirectoryListing {
  id: string;
  user_id: string;
  email: string;
  business_name: string;
  service_description: string;
  category: string;
  whatsapp: string;
  special_discount: string;
  location: string;
  created_at: string;
}

const CATEGORIES = [
  'Tecnologia & Desenvolvimento',
  'Design & Branding',
  'Marketing & Tráfego Pago',
  'Consultoria & Mentoria',
  'Suporte Administrativo',
  'Contabilidade & Finanças',
  'Estética & Bem Estar',
  'Fotografia & Audiovisual',
  'Outros Serviços'
];

const DEFAULT_MEMBER_MOCKS: DirectoryListing[] = [
  {
    id: 'mock_1',
    user_id: 'user_mock_1',
    email: 'julianafiscal@gmail.com',
    business_name: 'Juliana Santos Contabilidade',
    service_description: 'Especialista em planejamento tributário e redução fiscal inteligente para MEI e Pequenas Empresas. Conectamos seu painel financeiro a relatórios contábeis automatizados sem dor de cabeça.',
    category: 'Contabilidade & Finanças',
    whatsapp: '11999998888',
    special_discount: 'Auditoria tributária gratuita de boas-vindas para membros do ecossistema.',
    location: 'Salo Paulo - SP',
    created_at: new Date().toISOString()
  },
  {
    id: 'mock_2',
    user_id: 'user_mock_2',
    email: 'rodrigo.branding@gmail.com',
    business_name: 'Alves Branding & UX',
    service_description: 'Criação de páginas e interfaces de alta performance focadas em conversão de vendas. Criamos seu design de landing page no Figma pensando exclusivamente na experiência do usuário.',
    category: 'Design & Branding',
    whatsapp: '21988887777',
    special_discount: '15% de desconto no desenvolvimento de sua identidade de marca.',
    location: 'Rio de Janeiro - RJ',
    created_at: new Date().toISOString()
  },
  {
    id: 'mock_3',
    user_id: 'user_mock_3',
    email: 'carlostrafego@gmail.com',
    business_name: 'Carlos Peixoto Ads',
    service_description: 'Estrategista em anúncios online no Facebook, Instagram e Google Ads. Estruturação de funis de vendas direcionados que convertem contatos frios em clientes ativos recorrentes.',
    category: 'Marketing & Tráfego Pago',
    whatsapp: '31977776666',
    special_discount: 'Setup inicial de pixel de rastreamento e tags de conversão gratuito.',
    location: 'Belo Horizonte - MG',
    created_at: new Date().toISOString()
  }
];

export default function Directory({ subscription, userId }: { subscription: Subscription | null, userId: string }) {
  const currentPlan = subscription?.plano || 'trial';
  const isAdmin = subscription?.email?.toLowerCase() === 'ronilsonaugustomg@gmail.com';
  const isPremium = currentPlan === 'premium' || isAdmin;

  const [activeTab, setActiveTab] = useState<'explore' | 'my-post'>('explore');
  const [listings, setListings] = useState<DirectoryListing[]>([]);
  const [myListing, setMyListing] = useState<DirectoryListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Form Field State
  const [businessName, setBusinessName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [whatsapp, setWhatsapp] = useState('');
  const [specialDiscount, setSpecialDiscount] = useState('');
  const [location, setLocation] = useState('');

  const fetchListings = async () => {
    setLoading(true);
    try {
      // Tenta buscar no banco de dados
      const { data, error } = await supabase
        .from('fa_premium_directory')
        .select('*')
        .order('created_at', { ascending: false });

      let parsedListings: DirectoryListing[] = [];
      if (!error && data) {
        parsedListings = data as DirectoryListing[];
      } else {
        // Fallback local se a tabela não tiver sido provisionada
        const localData = localStorage.getItem('fa_premium_listings');
        parsedListings = localData ? JSON.parse(localData) : [];
      }

      // Adicionar mocks fixos se vazios, mantendo listings
      const allListings = [...parsedListings];
      // Impedir duplicados de mocks
      DEFAULT_MEMBER_MOCKS.forEach(mock => {
        if (!allListings.some(item => item.id === mock.id)) {
          allListings.push(mock);
        }
      });
      
      setListings(allListings);

      // Descobrir se eu possuo um cadastro registrado
      const myItem = parsedListings.find(item => item.user_id === userId);
      if (myItem) {
        setMyListing(myItem);
        // Preencher form state
        setBusinessName(myItem.business_name);
        setServiceDescription(myItem.service_description);
        setCategory(myItem.category);
        setWhatsapp(myItem.whatsapp);
        setSpecialDiscount(myItem.special_discount);
        setLocation(myItem.location);
      }
    } catch (err) {
      console.error(err);
      // Fallback
      const localData = localStorage.getItem('fa_premium_listings');
      const parsedLocal = localData ? JSON.parse(localData) : [];
      const allLocal = [...parsedLocal, ...DEFAULT_MEMBER_MOCKS];
      setListings(allLocal);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPremium) {
      fetchListings();
    }
  }, [userId, isPremium]);

  const handleSaveListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !serviceDescription || !whatsapp) {
      showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
      return;
    }

    setSaving(true);
    const timeNow = new Date().toISOString();
    const cleanWhatsapp = whatsapp.replace(/\D/g, '');

    const payload: DirectoryListing = {
      id: myListing?.id || `pub_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      email: subscription?.email || '',
      business_name: businessName,
      service_description: serviceDescription,
      category,
      whatsapp: cleanWhatsapp,
      special_discount: specialDiscount,
      location: location || 'Brasil',
      created_at: myListing?.created_at || timeNow
    };

    try {
      // 1. Tentar salvar no Banco de dados Supabase
      const { error } = await supabase
        .from('fa_premium_directory')
        .upsert(payload);

      // 2. Salvar no LocalStorage para garantir persistência robusta em qualquer cenário
      const localData = localStorage.getItem('fa_premium_listings');
      let currentLocal: DirectoryListing[] = localData ? JSON.parse(localData) : [];
      
      // Remover se já existia
      currentLocal = currentLocal.filter(item => item.user_id !== userId);
      currentLocal.push(payload);
      localStorage.setItem('fa_premium_listings', JSON.stringify(currentLocal));

      if (error) {
        console.warn('DB error occurred, saved metadata locally:', error);
      }

      showToast('Anúncio registrado com sucesso! Seu negócio agora é visível no ecossistema.', 'success');
      setMyListing(payload);
      await fetchListings();
      setActiveTab('explore');
    } catch (err) {
      console.error(err);
      showToast('Houve um problema de rede, mas seu cadastro foi salvo localmente!', 'success');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!confirm('Tem certeza de que deseja remover seu anúncio do Diretório Premium?')) return;
    
    setSaving(true);
    try {
      if (myListing) {
        // Remover do Supabase
        await supabase.from('fa_premium_directory').delete().eq('id', myListing.id);
      }
      
      // Remover local
      const localData = localStorage.getItem('fa_premium_listings');
      if (localData) {
        let currentLocal: DirectoryListing[] = JSON.parse(localData);
        currentLocal = currentLocal.filter(item => item.user_id !== userId);
        localStorage.setItem('fa_premium_listings', JSON.stringify(currentLocal));
      }

      showToast('Seu anúncio foi removido do Diretório Premium.');
      setMyListing(null);
      setBusinessName('');
      setServiceDescription('');
      setWhatsapp('');
      setSpecialDiscount('');
      setLocation('');
      await fetchListings();
      setActiveTab('explore');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Se não possuir plano Premium (Acesso bloqueado), exibir upgrade wall premium dourada
  if (!isPremium) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full bg-slate-950 border border-amber-500/20 rounded-[32px] p-8 sm:p-12 relative overflow-hidden shadow-2xl text-center shadow-amber-500/5 text-slate-100"
        >
          {/* Luz dourada de fundo */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-gradient-to-b from-amber-500/20 to-transparent blur-[80px] rounded-full pointer-events-none" />
          
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center border border-amber-300/30 shadow-2xl shadow-amber-500/20 mx-auto mb-8 relative">
            <span className="text-4xl">💎</span>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-ping opacity-60" />
          </div>

          <p className="text-[10px] sm:text-xs font-black text-amber-400 uppercase tracking-[4px] leading-tight mb-2">
            RECURSO EXCLUSIVO • PLANO PREMIUM
          </p>
          <h2 className="text-2xl sm:text-4xl font-display font-black text-white uppercase italic tracking-tight mb-6">
            Diretório Premium
          </h2>
          
          <p className="text-slate-400 max-w-lg mx-auto text-xs sm:text-sm leading-relaxed mb-8">
            Conecte-se com outros profissionais de alto nível da nossa base! O <strong>Diretório Premium</strong> permite divulgar seus serviços, firmar parcerias estratégicas e fazer negócios diretamente dentro do nosso ecossistema privado com ofertas especiais exclusivas.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto mb-10 text-left">
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase mb-1">
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                Venda Interna
              </div>
              <p className="text-[11px] text-slate-400 leading-normal font-medium">Anuncie seus produtos e receba contatos diretos no WhatsApp.</p>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase mb-1">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                Descontos
              </div>
              <p className="text-[11px] text-slate-400 leading-normal font-medium">Economize comprando serviços qualificados com incentivos exclusivos.</p>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase mb-1">
                <User className="w-3.5 h-3.5 shrink-0" />
                Posicionamento
              </div>
              <p className="text-[11px] text-slate-400 leading-normal font-medium">Apareça para centenas de MEIs consolidados de vários setores no país.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => showToast('Direcionando para upgrade... Redirecione para a aba de Planos no menu!')}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 hover:scale-[1.02] active:scale-[0.98] text-slate-950 font-black px-8 py-4 rounded-xl shadow-2xl transition-all uppercase tracking-widest text-xs border border-yellow-300/30 font-sans"
            >
              Liberar Ecossistema Premium
            </button>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
              Ou faça upgrade no menu "Plano de Assinatura"
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Filtragem dos anúncios
  const filteredListings = listings.filter(item => {
    const matchesSearch = item.business_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.service_description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-20"
    >
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-lg">💎</span>
            <span className="text-[9px] font-black uppercase tracking-[3px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">Espaço de Networking</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-black text-brand-text uppercase tracking-tight">ecossistema premium</h2>
          <p className="text-brand-muted text-[10px] sm:text-xs font-bold uppercase tracking-wider leading-tight">Gere parcerias, ofereça seus serviços e compre de quem está no mesmo nível que você.</p>
        </div>

        <div className="flex p-1 bg-brand-card rounded-xl border border-brand-border select-none">
          <button 
            onClick={() => setActiveTab('explore')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all border border-transparent",
              activeTab === 'explore' 
                ? "bg-brand-primary text-white" 
                : "text-brand-muted hover:text-brand-text"
            )}
          >
            Explorar Membros
          </button>
          <button 
            onClick={() => setActiveTab('my-post')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all border border-transparent",
              activeTab === 'my-post' 
                ? "bg-brand-primary text-white" 
                : "text-brand-muted hover:text-brand-text"
            )}
          >
            {myListing ? <Edit3 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {myListing ? 'Editar Meu Anúncio' : 'Publicar Meu Negócio'}
          </button>
        </div>
      </header>

      {activeTab === 'explore' ? (
        <div className="space-y-6">
          {/* Barra de Filtros */}
          <div className="bg-brand-card border border-brand-border p-4 rounded-2xl flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
              <input 
                type="text"
                placeholder="Buscar serviços, empresas ou palavras-chave..."
                className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 pl-10 pr-4 text-[10px] sm:text-sm focus:border-brand-primary/50 transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-brand-muted hidden sm:inline" />
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-brand-bg border border-brand-border text-brand-text text-[10px] sm:text-xs font-black rounded-xl px-4 py-3 outline-none focus:border-brand-primary transition-all cursor-pointer w-full md:w-auto"
              >
                <option value="all">Todas Categorias</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid de Membros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.length === 0 ? (
              <div className="col-span-full bg-brand-card border border-brand-border rounded-2xl p-12 text-center text-brand-muted font-bold text-xs uppercase tracking-widest">
                Nenhum membro encontrado com os termos pesquisados.
              </div>
            ) : (
              filteredListings.map(item => {
                const isItemMyListing = item.user_id === userId;
                return (
                  <motion.div 
                    layout
                    key={item.id}
                    className={cn(
                      "bg-brand-card border rounded-2xl p-6 transition-all ring-hover relative flex flex-col justify-between group",
                      isItemMyListing 
                        ? 'border-brand-primary/40 bg-brand-primary/[0.01]' 
                        : 'border-brand-border hover:border-brand-primary/20'
                    )}
                  >
                    {isItemMyListing && (
                      <span className="absolute top-4 right-4 text-[8px] font-black uppercase tracking-widest bg-brand-primary text-slate-900 border border-brand-primary/20 px-2 py-0.5 rounded-full">
                        Sua Publicação
                      </span>
                    )}
                    
                    <div className="space-y-4">
                      {/* Categoria do Serviço */}
                      <span className="text-[8px] font-black uppercase tracking-[2px] text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-2.5 py-1 rounded-full w-fit">
                        {item.category}
                      </span>

                      <div className="space-y-1">
                        <h4 className="font-display font-black text-brand-text uppercase italic tracking-tight text-base sm:text-lg">
                          {item.business_name}
                        </h4>
                        <p className="text-[10px] text-brand-muted font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-brand-primary" />
                          {item.location}
                        </p>
                      </div>

                      <p className="text-brand-muted/90 text-[11px] leading-relaxed line-clamp-4 group-hover:text-brand-text transition-colors">
                        {item.service_description}
                      </p>
                    </div>

                    <div className="mt-6 border-t border-brand-border pt-4 space-y-4">
                      {item.special_discount && (
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
                          <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-400" /> benefício para membros
                          </p>
                          <p className="text-[10px] text-slate-400 leading-normal font-bold">
                            {item.special_discount}
                          </p>
                        </div>
                      )}

                      <button 
                        onClick={() => {
                          const msg = `Olá! Vi seu perfil no Diretório Premium do FluxoAzul/AgendaAzul e gostaria de conversar sobre seus serviços jurídicos/comerciais (${item.business_name}).`;
                          window.open(`https://wa.me/55${item.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                        className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/10"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Chamar no WhatsApp
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Aba formulário publicar meu negócio */
        <div className="max-w-2xl bg-brand-card border border-brand-border rounded-2xl p-6 sm:p-8">
          <h3 className="font-display font-black text-brand-text text-base sm:text-lg uppercase italic tracking-tight mb-2">
            {myListing ? 'Gerenciar minha publicação' : 'Entrar para o ecossistema'}
          </h3>
          <p className="text-brand-muted text-[10px] sm:text-xs leading-normal uppercase tracking-wider mb-8">
            Divulgue seu trabalho e amplie seu faturamento oferecendo bônus ou descontos em nossa rede de MEI Premium!
          </p>

          <form onSubmit={handleSaveListing} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-brand-muted uppercase tracking-[1px]">Nome do Negócio / Fantasia *</label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: Consultoria Jurídica Silva"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-xs outline-none focus:border-brand-primary transition-all text-brand-text font-bold"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-brand-muted uppercase tracking-[1px]">Localização / Estado *</label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: Belo Horizonte - MG"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-xs outline-none focus:border-brand-primary transition-all text-brand-text font-bold"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-brand-muted uppercase tracking-[1px]">Segmento de Atividade</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-xs outline-none focus:border-brand-primary transition-all text-brand-text font-bold cursor-pointer"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-brand-muted uppercase tracking-[1px]">WhatsApp para Contatos *</label>
                <input 
                  type="tel"
                  required
                  placeholder="Ex: 31988887777 (apenas números)"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-xs outline-none focus:border-brand-primary transition-all text-brand-text font-bold"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-[1px]">O que você faz? Descreva seus serviços *</label>
              <textarea 
                required
                rows={4}
                maxLength={400}
                placeholder="Descreva claramente como você pode ajudar outros membros da plataforma. Seja persuasivo e profissional! Máximo 400 caracteres."
                className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 text-xs outline-none focus:border-brand-primary transition-all text-brand-text leading-relaxed font-bold"
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1 bg-brand-primary/5 border border-brand-primary/10 rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-2 text-brand-primary">
                <Sparkles className="w-4 h-4 fill-current shrink-0 animate-pulse" />
                <label className="text-[10px] font-black uppercase tracking-widest leading-0">Cupom ou Benefício de Rede (Opcional)</label>
              </div>
              <input 
                type="text"
                placeholder="Ex: 20% off no primeiro mês ou Setup Gratuito de Infraestrutura"
                className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-xs outline-none focus:border-brand-primary/50 transition-all text-brand-text font-bold"
                value={specialDiscount}
                onChange={(e) => setSpecialDiscount(e.target.value)}
              />
              <p className="text-[9px] text-brand-muted uppercase font-bold tracking-tight mt-1 ml-0.5">Membros da rede tendem a fechar negócio muito mais rápido quando há descontos mútuos.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-between">
              {myListing && (
                <button 
                  type="button"
                  onClick={handleDeleteListing}
                  disabled={saving}
                  className="bg-brand-danger/10 hover:bg-brand-danger/20 text-brand-danger border border-brand-danger/20 font-black text-[10px] uppercase tracking-widest px-6 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4" /> Excluir Anúncio
                </button>
              )}
              
              <button 
                type="submit"
                disabled={saving}
                className="bg-brand-primary hover:bg-brand-primary-hover border border-brand-primary text-white font-black text-[10px] uppercase tracking-widest px-8 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 ml-auto w-full sm:w-auto shadow-lg shadow-brand-primary/20"
              >
                {saving ? 'REGISTRANDO...' : myListing ? 'ATUALIZAR MEU ANÚNCIO' : 'PUBLICAR ANÚNCIO'}
              </button>
            </div>
          </form>
        </div>
      )}
    </motion.div>
  );
}
