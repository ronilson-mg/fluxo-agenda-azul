import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { Zap, Mail, Lock, User, Building, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthProps {
  onSuccess: () => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, company },
          },
        });
        if (error) throw error;
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-brand-primary/5 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px] bg-brand-card border border-brand-border rounded-2xl p-8 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-brand-primary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,168,132,0.3)] mb-4">
            <Zap className="text-white w-8 h-8 fill-current" />
          </div>
          <h1 className="text-2xl font-display font-bold text-brand-text">Fluxo Azul</h1>
          <p className="text-brand-muted text-sm mt-1">Conta no Azul, Empresa no Topo</p>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-xl font-display font-bold text-brand-text">
            {isLogin ? 'Bem-vindo de volta' : 'Criar conta gratuita'}
          </h2>
          <p className="text-brand-muted text-sm mt-1">
            {isLogin ? 'Entre com sua conta para continuar' : '14 dias grátis — sem cartão'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-brand-danger/10 border border-brand-danger/20 rounded-lg text-brand-danger text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-semibold text-brand-muted mb-1.5 ml-1 uppercase tracking-wider">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full bg-brand-bg border border-brand-border rounded-lg py-2.5 pl-10 pr-4 text-sm text-brand-text focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-brand-muted mb-1.5 ml-1 uppercase tracking-wider">Empresa</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Nome do seu negócio"
                    className="w-full bg-brand-bg border border-brand-border rounded-lg py-2.5 pl-10 pr-4 text-sm text-brand-text focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-brand-muted mb-1.5 ml-1 uppercase tracking-wider">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-brand-bg border border-brand-border rounded-lg py-2.5 pl-10 pr-4 text-sm text-brand-text focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-muted mb-1.5 ml-1 uppercase tracking-wider">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-brand-bg border border-brand-border rounded-lg py-2.5 pl-10 pr-4 text-sm text-brand-text focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all"
              />
            </div>
          </div>

          {isLogin && (
            <div className="text-right">
              <button type="button" className="text-brand-primary text-xs hover:underline">Esqueci minha senha</button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-primary/20"
          >
            {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Começar 14 dias grátis')}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-brand-border text-center">
          <p className="text-brand-muted text-sm">
            {isLogin ? 'Não tem conta?' : 'Já tem uma conta?'}
            {' '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-brand-primary font-bold hover:underline"
            >
              {isLogin ? 'Criar conta gratuita' : 'Entrar na conta'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
