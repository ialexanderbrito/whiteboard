import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { boardService } from '../services/boardService';
import { MirioLogo } from '@/components/layout/MirioLogo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { BuyMeACoffeeModal } from '@/components/layout/BuyMeACoffeeModal';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Plus, 
  Copy, 
  Check, 
  Compass, 
  MousePointer, 
  StickyNote, 
  Shapes, 
  PenTool, 
  Search, 
  Radio, 
  Layers, 
  ShieldCheck, 
  Sparkles,
  Loader2,
  ArrowRight
} from 'lucide-react';

export interface NotFoundPageProps {
  requestedBoardId?: string;
  title?: string;
  description?: string;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  requestedBoardId,
  title = 'Essa página não existe.',
  description = 'O que você está procurando não está aqui. O link do quadro pode conter um erro de digitação, ter sido excluído pelo proprietário ou nunca ter existido.',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [recentBoardIds, setRecentBoardIds] = useState<string[]>([]);

  // Atualiza título da aba no navegador com elegância
  useEffect(() => {
    if (requestedBoardId) {
      document.title = `Quadro ${requestedBoardId} não encontrado - Mirio`;
    } else {
      document.title = '404 - Página Não Encontrada - Mirio';
    }
  }, [requestedBoardId]);

  // Carrega histórico recente para oferecer rota de saída imediata (Revenue-Centric Retention)
  useEffect(() => {
    if (currentUser?.uid) {
      try {
        const ids = boardService.getVisitedBoardIds(currentUser.uid);
        const validIds = ids.filter((id) => id !== requestedBoardId).slice(0, 3);
        setRecentBoardIds(validIds);
      } catch {
        setRecentBoardIds([]);
      }
    }
  }, [currentUser, requestedBoardId]);

  const displayPath = requestedBoardId 
    ? `/b/${requestedBoardId}`
    : location.pathname;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleCreateNewBoard = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      if (currentUser) {
        const newBoardId = await boardService.createBoard(
          { title: 'Novo Quadro de Ideias' }, 
          currentUser
        );
        navigate(`/b/${newBoardId}`);
      } else {
        navigate('/login');
      }
    } catch (err) {
      console.error('Erro ao criar quadro novo:', err);
      navigate('/');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative min-h-screen min-h-[100dvh] w-full flex flex-col bg-background text-foreground overflow-y-auto overflow-x-hidden selection:bg-foreground selection:text-background">
      {/* Padrão Arquitetural de Pontos do Canvas (Preto & Branco / Escala de Cinza) */}
      <div 
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
            404 // Off-Grid
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Indicador de Status do Radar */}
          <div className="hidden sm:flex items-center gap-1.5 rounded border border-border px-2 py-1 text-[11px] font-mono text-muted-foreground">
            <span className="size-1.5 rounded-full bg-destructive animate-pulse" />
            <span>COORD // NÃO ENCONTRADA</span>
          </div>

          <BuyMeACoffeeModal />
          <ThemeToggle />
        </div>
      </header>

      {/* Conteúdo Principal: Responsivo com suporte total a scroll em telas menores */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-6 sm:py-10 my-auto w-full">
        <div className="grid w-full max-w-6xl grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          
          {/* LADO ESQUERDO (Apenas telas grandes / Desktop Col 7): Vitrine Arquitetural da Coordenada Perdida */}
          <div className="hidden lg:flex lg:col-span-7 flex-col gap-6 order-2 lg:order-1">
            {/* Tipografia Editorial Minimalista */}
            <div className="flex flex-col gap-2.5 text-left">
              <div className="inline-flex items-center gap-2 self-start rounded border border-destructive/30 bg-destructive/5 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-destructive">
                <span className="size-1.5 rounded-full bg-destructive animate-pulse" />
                <span>404 // Coordenada Inexistente</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.12] text-foreground">
                O que você procura não está aqui.
              </h1>

              <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
                Varremos o canvas infinito e o banco de dados em tempo real, mas nenhuma camada ou quadro foi registrado com essa chave de acesso.
              </p>
            </div>

            {/* Stage Visual Monocromático (Estilo Linear / Wireframe Arquitetural) */}
            <div className="relative rounded-xl border border-border/80 bg-card/40 backdrop-blur-sm p-6 overflow-hidden min-h-[380px] flex items-center justify-center">
              
              {/* Barra de Ferramentas Minimalista no Topo */}
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
                <div className="flex size-6 items-center justify-center rounded text-destructive hover:bg-destructive/10">
                  <Search className="size-3" />
                </div>
              </div>

              {/* CARD 1: Nota Adesiva Fantasma com Borda Tracejada (Wireframe Arquitetural) */}
              <div 
                className="absolute left-8 top-16 w-64 p-4 rounded-lg border-2 border-dashed border-border/80 bg-background/90 text-foreground shadow-xs select-none backdrop-blur-xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-[11px] font-mono font-semibold tracking-tight text-foreground flex items-center gap-1.5">
                    <Radio className="size-3 text-destructive animate-pulse" />
                    <span>00 // GHOST_CANVAS</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-destructive/30 bg-destructive/10 text-destructive font-medium">
                    ERR_404
                  </span>
                </div>
                <div className="pt-2.5 flex flex-col gap-1.5 text-xs font-mono text-muted-foreground">
                  <div className="flex items-center gap-1.5 text-foreground">
                    <span className="text-destructive">[✕]</span>
                    <span className="truncate max-w-[170px]">{requestedBoardId || 'rota_desconhecida'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span>[!]</span>
                    <span>0 elementos Konva</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-foreground">
                    <span className="text-emerald-500">[✓]</span>
                    <span>Workspace seguro</span>
                  </div>
                </div>
                <div className="pt-3 flex items-center justify-between text-[10px] font-mono text-muted-foreground border-t border-border/40 mt-2">
                  <span>STATUS: OFF-GRID</span>
                  <span className="text-foreground font-semibold">0 FPS</span>
                </div>
              </div>

              {/* Conector Linha SVG Minimalista Tracejada */}
              <svg className="absolute inset-0 pointer-events-none w-full h-full stroke-muted-foreground/30 stroke-1" fill="none">
                <path d="M 290 150 C 350 150, 320 230, 380 230" strokeDasharray="3 3" />
              </svg>

              {/* CARD 2: Retículo do Radar de Diagnóstico */}
              <div 
                className="absolute right-8 bottom-12 w-60 p-3.5 rounded-lg border border-border bg-muted/40 text-foreground shadow-xs select-none backdrop-blur-xs"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
                  <span className="text-[11px] font-mono font-semibold tracking-tight flex items-center gap-1.5">
                    <Compass className="size-3 text-foreground" />
                    <span>01 // DIAGNOSTIC_SYS</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border bg-background text-muted-foreground">
                    radar.core
                  </span>
                </div>
                <p className="pt-2 text-xs font-mono text-muted-foreground leading-relaxed">
                  Varredura completa em 360°. Nenhum documento ou membro associado a este ID.
                </p>
                <div className="pt-2 text-[9px] font-mono text-foreground flex items-center justify-between border-t border-border/40 mt-1">
                  <span>COORDENADA: (Ø, Ø)</span>
                  <span className="size-1.5 rounded-full bg-destructive" />
                </div>
              </div>

              {/* CURSORES MINIMALISTAS PRETO E BRANCO PROCURANDO NO CANVAS */}
              {/* Cursor 1: Alexander procurando */}
              <div className="absolute left-64 top-10 z-20 pointer-events-none animate-float">
                <div className="flex items-center gap-1.5">
                  <svg className="size-3.5 text-foreground fill-current" viewBox="0 0 24 24">
                    <path d="M4.5 3l15 15h-6.5l-3.5 6-2-1 3.5-6H4.5L4.5 3z" />
                  </svg>
                  <span className="rounded border border-border bg-foreground px-1.5 py-0.5 text-[9px] font-mono font-medium text-background">
                    alexander: "onde foi parar?"
                  </span>
                </div>
              </div>

              {/* Cursor 2: Radar Bot */}
              <div className="absolute right-36 top-36 z-20 pointer-events-none animate-float-delayed">
                <div className="flex items-center gap-1.5">
                  <svg className="size-3.5 text-muted-foreground fill-current" viewBox="0 0 24 24">
                    <path d="M4.5 3l15 15h-6.5l-3.5 6-2-1 3.5-6H4.5L4.5 3z" />
                  </svg>
                  <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[9px] font-mono font-medium text-foreground">
                    radar_bot: "canvas vazio"
                  </span>
                </div>
              </div>

            </div>

            {/* Métricas Minimalistas de Infraestrutura (Desktop) */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="flex items-center gap-2 rounded border border-border bg-card/60 p-2.5">
                <Compass className="size-3.5 text-foreground shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-mono font-semibold text-foreground">Status 404</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Página Inexistente</span>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded border border-border bg-card/60 p-2.5">
                <Layers className="size-3.5 text-foreground shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-mono font-semibold text-foreground">0 Objetos</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Nenhum Dado Perdido</span>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded border border-border bg-card/60 p-2.5">
                <ShieldCheck className="size-3.5 text-foreground shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-mono font-semibold text-foreground">1-Clique</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Retorno Seguro</span>
                </div>
              </div>
            </div>
          </div>

          {/* LADO DIREITO (Mobile e Desktop): O Card de Erro Centralizado */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center order-1 lg:order-2 w-full gap-4">
            
            {/* Título de Apoio apenas em telas menores / mobile */}
            <div className="flex flex-col items-center text-center gap-1.5 lg:hidden max-w-xs mx-auto">
              <span className="rounded border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-destructive">
                404 // Erro de Navegação
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Essa página não existe.
              </h1>
            </div>

            <div className="w-full max-w-sm">
              <Card className="w-full max-w-sm border-border/80 bg-card/90 backdrop-blur-md shadow-xs transition-all">
                <CardHeader className="flex flex-col items-center gap-3 pb-3 text-center pt-6">
                  {/* Ícone de Bússola Minimalista Monocromático */}
                  <div className="size-12 rounded-2xl border border-border bg-muted/40 flex items-center justify-center text-foreground shadow-2xs">
                    <Compass className="size-6 text-foreground" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-bold tracking-tight text-foreground">
                      {title}
                    </h2>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-[280px]">
                      {description}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-4 pt-1">
                  {/* Pílula de Código com o Link Solicitado e Botão de Cópia */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      <span>Endereço solicitado:</span>
                      <span className="text-destructive font-semibold">404</span>
                    </div>
                    
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-mono text-muted-foreground">
                      <span className="truncate select-all text-foreground font-medium">
                        {displayPath}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="ml-2 shrink-0 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono hover:bg-background hover:text-foreground border border-transparent hover:border-border transition-[background-color,border-color,color] duration-150 active:scale-[0.96] cursor-pointer"
                        title="Copiar link"
                      >
                        {copied ? (
                          <>
                            <Check className="size-3 text-emerald-500" />
                            <span className="text-emerald-500">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Ações Primárias (Revenue-Centric Design + Emil Kowalski Polish) */}
                  <div className="flex flex-col gap-2.5 pt-1">
                    {/* Botão Primário: Voltar ao Workspace */}
                    <Button
                      type="button"
                      onClick={() => navigate('/')}
                      className="relative w-full h-10 sm:h-11 justify-center gap-2 text-xs font-medium bg-foreground text-background hover:bg-foreground/90 transition-[transform,background-color] duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer shadow-none"
                    >
                      <ArrowLeft className="size-4 shrink-0" />
                      <span>Voltar ao Workspace</span>
                    </Button>

                    {/* Botão Secundário: Criar Novo Quadro Instantâneo */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCreateNewBoard}
                      disabled={isCreating}
                      className="relative w-full h-10 sm:h-11 justify-center gap-2 text-xs font-medium border-border hover:bg-muted/80 transition-[transform,background-color] duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer shadow-none"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          <span>Criando quadro...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="size-4 shrink-0" />
                          <span>Criar um Novo Quadro</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Lista de Quadros Recentes (Revenue-Centric Retention) */}
                  {recentBoardIds.length > 0 && (
                    <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
                      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                        <span>Quadros Recentes:</span>
                        <Sparkles className="size-2.5" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {recentBoardIds.map((id) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => navigate(`/b/${id}`)}
                            className="flex items-center justify-between px-3 py-2 rounded-lg border border-border/70 bg-background hover:bg-muted/60 text-xs font-mono text-foreground transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] group cursor-pointer text-left"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="size-1.5 rounded-full bg-foreground/50 group-hover:bg-foreground transition-colors" />
                              <span className="truncate">/b/{id}</span>
                            </div>
                            <ArrowRight className="size-3 text-muted-foreground group-hover:text-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dica de Produtividade */}
                  <div className="text-[10px] font-mono text-center text-muted-foreground/80 pt-1">
                    Dica: Pressione <kbd className="px-1 py-0.5 rounded border border-border bg-muted/60 text-[9px]">Cmd+K</kbd> ou <kbd className="px-1 py-0.5 rounded border border-border bg-muted/60 text-[9px]">Ctrl+K</kbd> no workspace para buscar em tempo real.
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Métricas Compactas em telas menores / mobile */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-sm lg:hidden pt-1">
              <div className="flex flex-col items-center justify-center text-center rounded border border-border bg-card/40 p-2">
                <Compass className="size-3 text-foreground mb-0.5" />
                <span className="text-[10px] font-mono font-semibold text-foreground">404</span>
                <span className="text-[8px] text-muted-foreground font-mono">Off-Grid</span>
              </div>
              <div className="flex flex-col items-center justify-center text-center rounded border border-border bg-card/40 p-2">
                <Layers className="size-3 text-foreground mb-0.5" />
                <span className="text-[10px] font-mono font-semibold text-foreground">0 Itens</span>
                <span className="text-[8px] text-muted-foreground font-mono">Vazio</span>
              </div>
              <div className="flex flex-col items-center justify-center text-center rounded border border-border bg-card/40 p-2">
                <ShieldCheck className="size-3 text-foreground mb-0.5" />
                <span className="text-[10px] font-mono font-semibold text-foreground">Seguro</span>
                <span className="text-[8px] text-muted-foreground font-mono">Workspace</span>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Rodapé Minimalista */}
      <footer className="relative z-10 flex h-12 w-full shrink-0 items-center justify-between px-4 sm:px-8 border-t border-border/40 text-xs text-muted-foreground font-mono">
        <span>MIRIO // REALTIME COLLABORATIVE WHITEBOARD</span>
        <span className="hidden sm:inline">ERRO 404 • COORDENADA INEXISTENTE</span>
      </footer>
    </div>
  );
};

export default NotFoundPage;
