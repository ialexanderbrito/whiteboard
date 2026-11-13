import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { InviteCard } from '@/components/auth/InviteCard';
import { InviteBoardShowcase } from '@/components/auth/InviteBoardShowcase';
import { MirioLogo } from '@/components/layout/MirioLogo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { BuyMeACoffeeModal } from '@/components/layout/BuyMeACoffeeModal';
import { boardService, cleanBoardId, type BoardInviteSnapshot } from '../services/boardService';

/**
 * Tela de convite (rota /invite/:boardId): mesmo padrão de layout da tela de
 * login (grid 12 colunas, vitrine à esquerda, card à direita), mas com
 * narrativa de CHAMADO PESSOAL — o dono REAL do quadro (quando o snapshot
 * público do convite está disponível) chama o convidado pelo nome para entrar
 * na sala, e o card confirma o chamado ("Fulano te chamou", #b/id, "na sala agora").
 */
export const InvitePage: React.FC = () => {
  const { boardId: rawBoardId } = useParams<{ boardId: string }>();
  const boardId = cleanBoardId(rawBoardId || '');
  const navigate = useNavigate();
  const { currentUser, isConfigured, signInWithGoogle, signInAsGuest } = useAuth();

  // Snapshot público do convite: nome REAL do anfitrião e título REAL do quadro
  // (coleção /invites/{boardId} — dados não sensíveis, leitura aberta por regra)
  const [invite, setInvite] = useState<BoardInviteSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (boardId) {
      boardService
        .getInviteSnapshot(boardId)
        .then((snap) => {
          if (!cancelled) setInvite(snap);
        })
        .catch(() => {
          // Snapshot indisponível: a tela cai para o chamado genérico do time
        });
    }
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  // Já autenticado: vai direto para o quadro do convite (sem pedágio)
  useEffect(() => {
    document.title = 'Convite para o quadro - Mirio';
    if (currentUser && boardId) {
      navigate(`/b/${boardId}`, { replace: true });
    }
  }, [currentUser, boardId, navigate]);

  const handleGoogleLogin = () => {
    // Registra o destino ANTES do popup: o fluxo do Google retorna à raiz e o
    // redirect em sessionStorage leva o usuário direto para o quadro convidado
    if (boardId) {
      sessionStorage.setItem('mirio_auth_redirect', `/b/${boardId}`);
    }
    return signInWithGoogle();
  };

  const handleGuestLogin = async (name: string) => {
    await signInAsGuest(name);
    navigate(`/b/${boardId}`, { replace: true });
  };

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
          <span className="hidden sm:inline-block rounded border border-indigo-400/40 bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            Convite // Sala Aberta
          </span>
        </div>

        <div className="flex items-center gap-2">
          <BuyMeACoffeeModal />
          <ThemeToggle />
        </div>
      </header>

      {/* Conteúdo Principal: Grid Responsivo em 2 Colunas (padrão do login, Sem Scroll) */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-8 py-2 w-full min-h-0 overflow-hidden">
        <div className="grid w-full max-w-6xl grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">

          {/* LADO ESQUERDO (Desktop Col 7): Vitrine do Convite — o time na sala, te esperando */}
          <div className="hidden lg:flex lg:col-span-7 flex-col gap-3.5 order-2 lg:order-1">
            {/* Tipografia Editorial: o chamado para a sala (nome real do anfitrião quando disponível) */}
            <div className="flex flex-col gap-1 text-left">
              <h1 className="animate-invite-reveal text-2xl sm:text-3xl lg:text-[2.2rem] font-bold tracking-tight leading-[1.15] text-foreground">
                {invite?.ownerName
                  ? `${invite.ownerName} te chamou para entrar na sala.`
                  : 'Você foi chamado para entrar na sala.'}
              </h1>

              <p className="animate-invite-reveal text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-lg" style={{ animationDelay: '80ms' }}>
                {invite
                  ? `O quadro “${invite.title}” está com o time reunido agora mesmo — post-its, desenhos e cursores ao vivo. Um clique e você aparece no canvas.`
                  : 'O time está reunido no quadro #b/' + boardId + ' agora mesmo — post-its, desenhos e cursores ao vivo. Um clique e você aparece no canvas.'}
              </p>
            </div>

            {/* Vitrine Interativa: a sala real do convite, com o anfitrião REAL esperando */}
            <div className="animate-invite-reveal" style={{ animationDelay: '150ms' }}>
              <InviteBoardShowcase
                boardId={boardId}
                hostName={invite?.ownerName}
                boardTitle={invite?.title}
              />
            </div>
          </div>

          {/* LADO DIREITO (Mobile e Desktop): Card do Chamado */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center order-1 lg:order-2 w-full">

            {/* Título de Apoio apenas em telas menores / mobile */}
            <div className="flex flex-col items-center text-center gap-1 lg:hidden max-w-xs mx-auto mb-3">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {invite?.ownerName
                  ? `${invite.ownerName} te chamou para uma sala`
                  : 'Você foi chamado para uma sala'}
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {invite?.title
                  ? `O quadro “${invite.title}” está com o time agora. Entre para colaborar em tempo real.`
                  : 'O time está no quadro #b/' + boardId + ' agora. Entre para colaborar em tempo real.'}
              </p>
            </div>

            {/* Card do Convite: quem te chamou (nome real), o quadro e como entrar */}
            <div className="animate-invite-reveal w-full max-w-sm" style={{ animationDelay: '100ms' }}>
              <InviteCard
                boardId={boardId}
                hostName={invite?.ownerName}
                boardTitle={invite?.title}
                onGoogleLogin={handleGoogleLogin}
                onGuestLogin={handleGuestLogin}
                isFirebaseConfigured={isConfigured}
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
          <span className="hidden sm:inline">CONVITE • SALA EM TEMPO REAL</span>
        </span>
      </footer>
    </div>
  );
};
