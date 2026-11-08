import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthCard } from '@/components/auth/AuthCard';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { BuyMeACoffeeModal } from '@/components/layout/BuyMeACoffeeModal';
import { MirioLogo } from '@/components/layout/MirioLogo';

/**
 * LoginPage — Tela Global Única de Autenticação do Mirio.
 *
 * Minimalista, centrada e universal:
 * - Utilizada globalmente por todas as rotas (Dashboard, links diretos de boards convidados, etc.)
 * - Suporta parâmetro ?redirect= para retorno automático à URL solicitada após login
 * - Grid pontilhado suave do Canvas e paleta monocromática de alta precisão
 */
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  const { currentUser, isConfigured, signInWithGoogle, signInAsGuest } = useAuth();

  React.useEffect(() => {
    document.title = 'Entrar - Mirio';
    if (currentUser) {
      navigate(redirectUrl, { replace: true });
    }
  }, [currentUser, navigate, redirectUrl]);

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-background text-foreground overflow-y-auto overflow-x-hidden selection:bg-foreground selection:text-background">
      {/* Padrão Arquitetural de Pontos do Canvas */}
      <div 
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px] opacity-70" 
      />

      {/* Cabeçalho Minimalista com Logo Oficial e Ações */}
      <header className="relative z-10 flex h-14 w-full shrink-0 items-center justify-between px-4 sm:px-8 border-b border-border/60 backdrop-blur-md bg-background/80">
        <div className="flex items-center gap-3">
          <MirioLogo variant="full" className="h-7 w-auto" />
          <span className="hidden sm:inline-block rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            Canvas
          </span>
        </div>

        <div className="flex items-center gap-2">
          <BuyMeACoffeeModal />
          <ThemeToggle />
        </div>
      </header>

      {/* Conteúdo Principal: Centralizado, Limpo e Minimalista */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 my-auto w-full">
        <div className="w-full max-w-sm animate-mirio-entrance">
          <AuthCard
            onGoogleLogin={async () => {
              await signInWithGoogle();
              navigate(redirectUrl, { replace: true });
            }}
            onGuestLogin={async (name) => {
              await signInAsGuest(name);
              navigate(redirectUrl, { replace: true });
            }}
            isFirebaseConfigured={isConfigured}
          />
        </div>
      </main>
    </div>
  );
};
