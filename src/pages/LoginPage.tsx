import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthCard } from '@/components/auth/AuthCard';
import { MirioLogo } from '@/components/layout/MirioLogo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { BuyMeACoffeeModal } from '@/components/layout/BuyMeACoffeeModal';
import { 
  MousePointer, 
  StickyNote, 
  Shapes, 
  PenTool, 
  Radio, 
  Layers, 
  ShieldCheck 
} from 'lucide-react';

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
    <div className="relative min-h-screen min-h-[100dvh] w-full flex flex-col bg-background text-foreground overflow-y-auto overflow-x-hidden selection:bg-foreground selection:text-background">
      {/* Padrão Arquitetural de Pontos do Canvas (Idêntico à página 404) */}
      <div 
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px] opacity-70" 
      />

      {/* Cabeçalho Minimalista com Logo Oficial e Ações */}
      <header className="relative z-10 flex h-14 w-full shrink-0 items-center justify-between px-4 sm:px-8 border-b border-border/60 backdrop-blur-md bg-background/80">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => navigate('/')} 
            className="flex items-center gap-3 transition-opacity duration-150 hover:opacity-80 cursor-pointer"
          >
            <MirioLogo variant="full" className="h-7 w-auto" />
          </button>
          <span className="hidden sm:inline-block rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            Workspace // Entrar
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Indicador de Status do Radar */}
          <div className="hidden sm:flex items-center gap-1.5 rounded border border-border px-2 py-1 text-[11px] font-mono text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>RTDB // ONLINE</span>
          </div>

          <BuyMeACoffeeModal />
          <ThemeToggle />
        </div>
      </header>

      {/* Conteúdo Principal: Grid Responsivo em 2 Colunas */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-6 sm:py-10 my-auto w-full">
        <div className="grid w-full max-w-6xl grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          
          {/* LADO ESQUERDO (Desktop Col 7): Vitrine Visual do Whiteboard */}
          <div className="hidden lg:flex lg:col-span-7 flex-col gap-6 order-2 lg:order-1">
            {/* Tipografia Editorial Minimalista */}
            <div className="flex flex-col gap-2.5 text-left">
              <div className="inline-flex items-center gap-2 self-start rounded border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>00 // CANVAS_COLLAB</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.12] text-foreground">
                Pense, desenhe e crie em tempo real.
              </h1>

              <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
                O whiteboard colaborativo fluido e sem fricção. Desenhe diagramas, adicione post-its, facilite dinâmicas de sprint e compartilhe com seu time em segundos.
              </p>
            </div>

            {/* Stage Visual Monocromático (Estilo Wireframe Arquitetural do 404) */}
            <div className="relative rounded-xl border border-border/80 bg-card/40 backdrop-blur-sm p-6 overflow-hidden min-h-[380px] flex items-center justify-center">
              
              {/* Barra de Ferramentas Minimalista Flutuante */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-lg border border-border bg-background/90 px-2 py-1 shadow-2xs backdrop-blur-md z-20">
                <div className="flex size-6 items-center justify-center rounded bg-foreground text-background">
                  <MousePointer className="size-3" />
                </div>
                <div className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted">
                  <StickyNote className="size-3" />
                </div>
                <div className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted">
                  <Shapes className="size-3" />
                </div>
                <div className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted">
                  <PenTool className="size-3" />
                </div>
                <div className="flex size-6 items-center justify-center rounded hover:bg-muted/80">
                  <MirioLogo variant="compact" className="h-3.5 w-auto" />
                </div>
              </div>

              {/* CARD 1: Nota de Sessão / Ideação */}
              <div className="absolute left-8 top-16 w-64 p-4 rounded-lg border border-border/80 bg-background/90 text-foreground shadow-xs select-none backdrop-blur-xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-[11px] font-mono font-semibold tracking-tight text-foreground flex items-center gap-1.5">
                    <Radio className="size-3 text-emerald-500 animate-pulse" />
                    <span>01 // BRAINSTORM_CANVAS</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground font-medium">
                    viva.sync
                  </span>
                </div>
                <div className="pt-2.5 flex flex-col gap-1.5 text-xs font-mono text-muted-foreground">
                  <div className="flex items-center gap-1.5 text-foreground">
                    <span className="text-emerald-500">[✓]</span>
                    <span>Canvas infinito Konva</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-foreground">
                    <span className="text-emerald-500">[✓]</span>
                    <span>Cursores ao vivo RTDB</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-foreground">
                    <span className="text-emerald-500">[✓]</span>
                    <span>Votação e facilitação</span>
                  </div>
                </div>
                <div className="pt-3 flex items-center justify-between text-[10px] font-mono text-muted-foreground border-t border-border/40 mt-2">
                  <span>STATUS: ATIVO</span>
                  <span className="text-foreground font-semibold">60 FPS</span>
                </div>
              </div>

              {/* Linha Conectora SVG Minimalista Tracejada */}
              <svg className="absolute inset-0 pointer-events-none w-full h-full stroke-muted-foreground/30 stroke-1" fill="none">
                <path d="M 290 150 C 350 150, 320 230, 380 230" strokeDasharray="3 3" />
              </svg>

              {/* CARD 2: Decisão de Acesso */}
              <div className="absolute right-8 bottom-12 w-60 p-3.5 rounded-lg border border-border bg-muted/40 text-foreground shadow-xs select-none backdrop-blur-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
                  <span className="text-[11px] font-mono font-semibold tracking-tight flex items-center gap-1.5">
                    <MirioLogo variant="compact" className="h-3.5 w-auto" />
                    <span>02 // QUICK_COLLAB</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border bg-background text-muted-foreground">
                    zero.fricção
                  </span>
                </div>
                <p className="pt-2 text-xs font-mono text-muted-foreground leading-relaxed">
                  Conecte sua conta Google ou entre em 1 clique como convidado para desenhar imediatamente.
                </p>
                <div className="pt-2 text-[9px] font-mono text-foreground flex items-center justify-between border-t border-border/40 mt-1">
                  <span>LATÊNCIA: &lt; 30MS</span>
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                </div>
              </div>

              {/* CURSORES MINIMALISTAS FLUTUANTES */}
              <div className="absolute left-64 top-10 z-20 pointer-events-none animate-float">
                <div className="flex items-center gap-1.5">
                  <svg className="size-3.5 text-foreground fill-current" viewBox="0 0 24 24">
                    <path d="M4.5 3l15 15h-6.5l-3.5 6-2-1 3.5-6H4.5L4.5 3z" />
                  </svg>
                  <span className="rounded border border-border bg-foreground px-1.5 py-0.5 text-[9px] font-mono font-medium text-background">
                    alexander: "vamos começar!"
                  </span>
                </div>
              </div>

              <div className="absolute right-36 top-36 z-20 pointer-events-none animate-float-delayed">
                <div className="flex items-center gap-1.5">
                  <svg className="size-3.5 text-muted-foreground fill-current" viewBox="0 0 24 24">
                    <path d="M4.5 3l15 15h-6.5l-3.5 6-2-1 3.5-6H4.5L4.5 3z" />
                  </svg>
                  <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[9px] font-mono font-medium text-foreground">
                    convidado: "já no canvas 👋"
                  </span>
                </div>
              </div>

            </div>

            {/* Métricas de Infraestrutura (Desktop) */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="flex items-center gap-2 rounded border border-border bg-card/60 p-2.5">
                <MirioLogo variant="compact" className="h-4 w-auto shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-mono font-semibold text-foreground">60 FPS</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Konva Engine</span>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded border border-border bg-card/60 p-2.5">
                <Layers className="size-3.5 text-foreground shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-mono font-semibold text-foreground">&lt; 30ms</span>
                  <span className="text-[10px] text-muted-foreground font-mono">RTDB Presença</span>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded border border-border bg-card/60 p-2.5">
                <ShieldCheck className="size-3.5 text-foreground shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-mono font-semibold text-foreground">1-Clique</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Sem Fricção</span>
                </div>
              </div>
            </div>
          </div>

          {/* LADO DIREITO (Mobile e Desktop): Card de Login com a Logo Oficial Mirio */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center order-1 lg:order-2 w-full gap-4">
            
            {/* Título de Apoio apenas em telas menores / mobile */}
            <div className="flex flex-col items-center text-center gap-1.5 lg:hidden max-w-xs mx-auto">
              <span className="rounded border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                Workspace // Acesso
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Bem-vindo ao Mirio
              </h1>
            </div>

            {/* AuthCard com a Logo Oficial Mirio */}
            <div className="w-full max-w-sm">
              <AuthCard
                onGoogleLogin={() => {
                  if (redirectUrl && redirectUrl !== '/') {
                    sessionStorage.setItem('mirio_auth_redirect', redirectUrl);
                  }
                  return signInWithGoogle().then(() => {
                    const saved = sessionStorage.getItem('mirio_auth_redirect');
                    sessionStorage.removeItem('mirio_auth_redirect');
                    const target = (redirectUrl && redirectUrl !== '/') ? redirectUrl : (saved || '/');
                    navigate(target, { replace: true });
                  });
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

            {/* Métricas Compactas em telas menores / mobile */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-sm lg:hidden pt-1">
              <div className="flex flex-col items-center justify-center text-center rounded border border-border bg-card/40 p-2">
                <MirioLogo variant="compact" className="h-3.5 w-auto mb-0.5" />
                <span className="text-[10px] font-mono font-semibold text-foreground">60 FPS</span>
                <span className="text-[8px] text-muted-foreground font-mono">GPU Canvas</span>
              </div>
              <div className="flex flex-col items-center justify-center text-center rounded border border-border bg-card/40 p-2">
                <Layers className="size-3 text-foreground mb-0.5" />
                <span className="text-[10px] font-mono font-semibold text-foreground">&lt; 30ms</span>
                <span className="text-[8px] text-muted-foreground font-mono">Presença</span>
              </div>
              <div className="flex flex-col items-center justify-center text-center rounded border border-border bg-card/40 p-2">
                <ShieldCheck className="size-3 text-foreground mb-0.5" />
                <span className="text-[10px] font-mono font-semibold text-foreground">1-Clique</span>
                <span className="text-[8px] text-muted-foreground font-mono">Acesso</span>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Rodapé Minimalista */}
      <footer className="relative z-10 flex h-12 w-full shrink-0 items-center justify-between px-4 sm:px-8 border-t border-border/40 text-xs text-muted-foreground font-mono">
        <span>MIRIO // REALTIME COLLABORATIVE WHITEBOARD</span>
        <span className="flex items-center gap-3">
          <a href="/privacy" className="hover:text-foreground transition-colors">PRIVACIDADE</a>
          <span className="hidden sm:inline">AUTENTICAÇÃO • WORKSPACE EM TEMPO REAL</span>
        </span>
      </footer>
    </div>
  );
};
