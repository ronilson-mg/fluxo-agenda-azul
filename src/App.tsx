/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Auth from './pages/Auth';
import Sidebar, { PageView } from './components/Sidebar';
import Dashboard from './pages/Dashboard';
// ... (mantenha todos os seus outros imports de páginas aqui)
import LegalModal from './components/LegalModal';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(false);
  // ... (mantenha seus outros estados aqui)

  useEffect(() => {
    // Verifica se já aceitou
    if (localStorage.getItem('fa_legal_accepted')) {
      setHasAcceptedLegal(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // ... (mantenha sua lógica de listener aqui)
  }, []);

  if (loading) return null;

  if (!session) return <Auth onSuccess={() => {}} />;

  return (
    <div className="flex min-h-screen bg-brand-bg text-brand-text font-sans overflow-x-hidden">
      {/* O MODAL AGORA É RENDERIZADO COMO UMA CAMADA SOBRE TUDO */}
      {!hasAcceptedLegal && (
        <LegalModal onAccept={() => setHasAcceptedLegal(true)} />
      )}

      {/* SEU LAYOUT ORIGINAL MANTIDO AQUI */}
      <Sidebar 
        // ... (mantenha todas as suas props aqui)
      />
      
      <main className="flex-1 lg:ml-64 min-h-screen flex flex-col overflow-x-hidden">
        {/* ... (o restante do seu conteúdo original) ... */}
      </main>
    </div>
  );
}
