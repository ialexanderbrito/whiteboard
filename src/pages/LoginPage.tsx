import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthCard } from '@/components/auth/AuthCard';
import { LoginBoardShowcase } from '@/components/auth/LoginBoardShowcase';
import { MirioLogo } from '@/components/layout/MirioLogo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { BuyMeACoffeeModal } from '@/components/layout/BuyMeACoffeeModal';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryRedirect = searchParams.get('redirect');
  const redirectUrl = queryRedirect || (typeof window !== 'undefined' ? sessionStorage.getItem('mirio_auth_redirect') : null) || '/';
  const { currentUser, isConfigured, signInWithGoogle, signInAsGuest } = useAuth();

  // Se já estiver logado, redireciona para a rota solicitada ou para o workspace principal
  useEffect(() => {
    document.title = 'Entrar - Mirio';
    if (currentUser) {
      const savedRedirect = sessionStorage.getItem('mirio_auth_redirect');
      sessionStorage.removeItem('mirio_auth_redirect');
      const target = (redirectUrl && redirectUrl !== '/') ? redirectUrl : (savedRedirect || '/');
      navigate(target, { replace: true });
    }
  }, [currentUser, navigate, redirectUrl]);

  return (
    <div className="relative h-screen h-[100dvh] w-full flex flex-col justify-between bg-background text-foreground overflow-hidden selection:bg-foreground selection:text-background">
      {/* Padrão Arquitetural de Pontos do Canvas */}
      <div 
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px] opacity-70" 
      />

      {/* Cabeçalho Minimalista com Logo Oficial e Ações */}
      <header className="relative z-10 flex h-12 w-full shrink-0 items-center justify-between px-4 sm:px-8 border-b border-border/60 backdrop-blur-md bg-background/80">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => navigate('/')} 
            className="flex items-center gap-3 transition-opacity duration-150 hover:opacity-80 cursor-pointer"
          >
            <MirioLogo variant="full" className="h-6 sm:h-7 w-auto" />
          </button>
          <span className="hidden sm:inline-block rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            Workspace // Entrar
          </span>
        </div>

        <div className="flex items-center gap-2">
          <BuyMeACoffeeModal />
          <ThemeToggle />
        </div>
      </header>

      {/* Conteúdo Principal: Grid Responsivo em 2 Colunas (Sem Scroll) */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-8 py-2 w-full min-h-0 overflow-hidden">
        <div className="grid w-full max-w-6xl grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
          
          {/* LADO ESQUERDO (Desktop Col 7): Vitrine Visual do Whiteboard Real com Cursores Colaborativos */}
          <div className="hidden lg:flex lg:col-span-7 flex-col gap-3.5 order-2 lg:order-1">
            {/* Tipografia Editorial e Proposta de Valor */}
            <div className="flex flex-col gap-1 text-left">
              <h1 className="text-2xl sm:text-3xl lg:text-[2.2rem] font-bold tracking-tight leading-[1.15] text-foreground">
                Pense, desenhe e crie em tempo real com seu time.
              </h1>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-lg">
                O whiteboard colaborativo onde ideias ganham forma. Organize dinâmicas, crie post-its, estruture fluxos e colabore com cursores ao vivo.
              </p>
            </div>

            {/* Vitrine Interativa com Post-its, Barra de Ferramentas e Cursores em Movimento */}
            <LoginBoardShowcase />
          </div>

          {/* LADO DIREITO (Mobile e Desktop): Card de Login com a Logo Oficial Mirio */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center order-1 lg:order-2 w-full">
            
            {/* Título de Apoio apenas em telas menores / mobile */}
            <div className="flex flex-col items-center text-center gap-1 lg:hidden max-w-xs mx-auto mb-3">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Bem-vindo ao Mirio
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Desenhe diagramas, adicione post-its e colabore com seu time em tempo real.
              </p>
            </div>

            {/* AuthCard com a Logo Oficial Mirio */}
            <div className="w-full max-w-sm">
              <AuthCard
                onGoogleLogin={() => {
                  if (redirectUrl && redirectUrl !== '/') {
                    sessionStorage.setItem('mirio_auth_redirect', redirectUrl);
                  }
                  return signInWithGoogle();
                }}
                onGuestLogin={async (name: string) => {
                  await signInAsGuest(name);
                  const saved = sessionStorage.getItem('mirio_auth_redirect');
                  sessionStorage.removeItem('mirio_auth_redirect');
                  const target = (redirectUrl && redirectUrl !== '/') ? redirectUrl : (saved || '/');
                  navigate(target, { replace: true });
                }}
                isFirebaseConfigured={isConfigured}
                description="Whiteboard colaborativo em tempo real para seu time pensar, desenhar e criar junto."
              />
            </div>

          </div>

        </div>
      </main>

      {/* Rodapé Minimalista */}
      <footer className="relative z-10 flex h-9 w-full shrink-0 items-center justify-between px-4 sm:px-8 border-t border-border/40 text-[11px] text-muted-foreground font-mono">
        <span>MIRIO // REALTIME COLLABORATIVE WHITEBOARD</span>
        <span className="flex items-center gap-3">
          <a href="/privacy" className="hover:text-foreground transition-colors">PRIVACIDADE</a>
          <span className="hidden sm:inline">AUTENTICAÇÃO • WORKSPACE EM TEMPO REAL</span>
        </span>
      </footer>
    </div>
  );
};
