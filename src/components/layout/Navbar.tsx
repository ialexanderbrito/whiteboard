import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Share2, 
  LogOut, 
  Eye,
  MessageSquare,
  Search,
  Edit2,
  UserPen,
  Layers
} from '@/components/ui/icons';
import type { Board, CurrentUser, UserPresence } from '../../types/board';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BuyMeACoffeeModal } from '@/components/layout/BuyMeACoffeeModal';
import { MirioLogo } from '@/components/layout/MirioLogo';
import { ShareModal } from '@/components/whiteboard/ShareModal';
import { FacilitationMenu } from '@/components/whiteboard/FacilitationMenu';
import { CanvasPreferencesMenu } from '@/components/whiteboard/CanvasPreferencesMenu';
import type { GridType, GridSize } from '@/components/whiteboard/CanvasGrid';
import { isBoardOwner } from '../../utils/permissions';

interface NavbarProps {
  title: string;
  board?: Board | null;
  onUpdateTitle: (newTitle: string) => void;
  onUpdateBoardSettings?: (updates: Partial<Pick<Board, 'defaultPermission' | 'collaborators' | 'collaboratorEmails' | 'members' | 'removedMemberIds' | 'waitingRoomEnabled' | 'joinRequests' | 'isPasswordProtected' | 'password'>>) => Promise<void>;
  onBackToDashboard: () => void;
  currentUser: CurrentUser;
  onOpenEditProfile?: () => void;
  remoteUsers: UserPresence[];
  followingUserId: string | null;
  onFollowUser: (userId: string, userName: string) => void;
  onLogout: () => void;
  isReadOnly?: boolean;
  isCommentOnly?: boolean;
  onEnterPresentation?: () => void;
  isTimerOpen?: boolean;
  onToggleTimer?: () => void;
  onOpenVoting?: () => void;
  hasActiveVote?: boolean;
  isVotingActive?: boolean;
  toolbarPosition?: 'left' | 'bottom';
  onChangeToolbarPosition?: (pos: 'left' | 'bottom') => void;
  onOpenCommandPalette?: () => void;
  gridType?: GridType;
  onChangeGridType?: (type: GridType) => void;
  gridSize?: GridSize;
  onChangeGridSize?: (size: GridSize) => void;
  gridOpacity?: number;
  onChangeGridOpacity?: (opacity: number) => void;
  showGrid?: boolean;
  onToggleGrid?: (show?: boolean) => void;
  showRemoteCursors?: boolean;
  onToggleRemoteCursors?: (show?: boolean) => void;
  smartGuides?: boolean;
  onToggleSmartGuides?: (enabled?: boolean) => void;
  mirioReactionUnlocked?: boolean;
  isShareModalOpen?: boolean;
  onShareModalOpenChange?: (open: boolean) => void;
  isCoffeeModalOpen?: boolean;
  onCoffeeModalOpenChange?: (open: boolean) => void;
  isLayersPanelOpen?: boolean;
  onToggleLayersPanel?: () => void;
}

export const Navbar: React.FC<NavbarProps> = React.memo(({
  title,
  board,
  onUpdateTitle,
  onUpdateBoardSettings,
  onBackToDashboard,
  currentUser,
  onOpenEditProfile,
  remoteUsers,
  followingUserId,
  onFollowUser,
  onLogout,
  isReadOnly = false,
  isCommentOnly = false,
  onEnterPresentation,
  isTimerOpen = false,
  onToggleTimer,
  onOpenVoting,
  hasActiveVote = false,
  isVotingActive = false,
  toolbarPosition = 'left',
  onChangeToolbarPosition,
  onOpenCommandPalette,
  gridType,
  onChangeGridType,
  gridSize,
  onChangeGridSize,
  gridOpacity,
  onChangeGridOpacity,
  showGrid,
  onToggleGrid,
  showRemoteCursors,
  onToggleRemoteCursors,
  smartGuides,
  onToggleSmartGuides,
  mirioReactionUnlocked = false,
  isShareModalOpen: controlledShareOpen,
  onShareModalOpenChange: setControlledShareOpen,
  isCoffeeModalOpen: controlledCoffeeOpen,
  onCoffeeModalOpenChange: setControlledCoffeeOpen,
  isLayersPanelOpen = false,
  onToggleLayersPanel,
}) => {
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const [internalShareOpen, setInternalShareOpen] = useState(false);
  const isShareModalOpen = controlledShareOpen !== undefined ? controlledShareOpen : internalShareOpen;
  const setIsShareModalOpen =
    controlledShareOpen !== undefined ? (setControlledShareOpen || (() => {})) : setInternalShareOpen;

  const pendingJoinRequestsCount = useMemo(() => {
    if (!board?.joinRequests) return 0;
    return Object.values(board.joinRequests).filter((r) => r && r.status === 'pending').length;
  }, [board?.joinRequests]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (tempTitle.trim() && tempTitle !== title) {
      onUpdateTitle(tempTitle.trim());
    } else {
      setTempTitle(title);
    }
  };

  return (
    <header className="absolute top-3 left-4 right-4 z-30 flex items-center justify-between pointer-events-none gap-2">
      {/* Lado Esquerdo: Voltar, Logo e Título Editável */}
      <div className="flex items-center gap-1.5 bg-background/80 dark:bg-card/80 backdrop-blur-md px-2 py-1 rounded-lg shadow-xs border border-border pointer-events-auto">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onBackToDashboard}
              aria-label="Voltar aos Quadros"
              className="size-7 text-muted-foreground hover:text-foreground rounded-md"
            >
              <ArrowLeft className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Voltar ao Workspace</TooltipContent>
        </Tooltip>

        {/* Marca Mirio Oficial (Compacta / Transparente) */}
        <div className="flex items-center gap-1.5 pr-2 border-r border-border">
          <MirioLogo variant="compact" className="h-5 w-auto" />
        </div>

        {/* Título Editável (ou estático em modo somente leitura ou comentário) */}
        {isReadOnly ? (
          <div className="flex items-center gap-2 px-2">
            <span className="text-xs font-semibold text-foreground truncate max-w-[160px] sm:max-w-[240px]">
              {title}
            </span>
            <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0 h-5 font-normal shrink-0">
              <Eye className="size-3" />
              <span>Leitura</span>
            </Badge>
          </div>
        ) : isCommentOnly ? (
          <div className="flex items-center gap-2 px-2">
            <span className="text-xs font-semibold text-foreground truncate max-w-[160px] sm:max-w-[240px]">
              {title}
            </span>
            <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-5 font-normal shrink-0 border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5">
              <MessageSquare className="size-3" />
              <span>Comentários</span>
            </Badge>
          </div>
        ) : isEditingTitle ? (
          <Input
            autoFocus
            type="text"
            value={tempTitle}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setTempTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSubmit();
              if (e.key === 'Escape') {
                setTempTitle(title);
                setIsEditingTitle(false);
              }
            }}
            className="h-7 text-xs font-medium px-2 max-w-[160px] sm:max-w-[240px]"
          />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTempTitle(title);
              setIsEditingTitle(true);
            }}
            title="Clique para renomear o quadro"
            className="group h-7 text-xs font-medium px-2 max-w-[160px] sm:max-w-[240px] truncate justify-start hover:bg-muted gap-1.5 cursor-pointer"
          >
            <span className="truncate">{title}</span>
            <Edit2 className="size-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </Button>
        )}

        {/* Trigger da Paleta de Comandos (Cmd+K) */}
        {onOpenCommandPalette && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="hidden lg:flex items-center gap-1.5 h-7 px-2 ml-1 text-xs text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/70 rounded-md border border-border/60 transition-colors active:scale-[0.97] cursor-pointer"
              >
                <Search className="size-3 text-muted-foreground/80" />
                <span className="text-[11px] font-medium">Buscar</span>
                <kbd className="inline-flex items-center justify-center h-4 px-1 rounded bg-background/80 border border-border font-mono text-[9px] font-bold text-muted-foreground shadow-2xs">
                  {isMac ? '⌘K' : 'Ctrl+K'}
                </kbd>
              </button>
            </TooltipTrigger>
            <TooltipContent>Paleta de Comandos ({isMac ? '⌘K' : 'Ctrl+K'})</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Lado Direito: Apoiar, Avatares, Ferramentas e Compartilhar */}
      <div className="flex items-center gap-1.5 pointer-events-auto">
        {/* Botão de Apoio PIX Buy Me A Coffee */}
        <BuyMeACoffeeModal
          open={controlledCoffeeOpen}
          onOpenChange={setControlledCoffeeOpen}
        />

        {/* Avatares dos Usuários Conectados com Modo Seguir Cursor */}
        <div className="flex items-center bg-background/80 dark:bg-card/80 backdrop-blur-md px-2 py-1 rounded-lg shadow-xs border border-border gap-1">
          {/* Avatar do próprio usuário (usuário Google exibe foto de perfil; convidados podem trocar nome) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onOpenEditProfile}
                className="relative group rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 active:scale-95 transition-transform cursor-pointer"
                aria-label={currentUser.isAnonymous ? "Trocar meu nome e cor" : "Personalizar cor do cursor"}
              >
                <Avatar className="size-6 text-[10px]">
                  {currentUser.photoURL ? (
                    <AvatarImage
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Você'}
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                  <AvatarFallback
                    className="text-white font-medium group-hover:brightness-90 transition-all"
                    style={{ backgroundColor: currentUser.color || '#3b82f6' }}
                  >
                    {(currentUser.displayName || 'Você').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {/* Indicador sutil de edição apenas para convidados que podem trocar nome */}
                {currentUser.isAnonymous && (
                  <span className="absolute -bottom-0.5 -right-0.5 size-2.5 bg-background text-primary border border-border rounded-full flex items-center justify-center opacity-85 group-hover:opacity-100 transition-opacity">
                    <Edit2 className="size-1.5" />
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold">{currentUser.displayName || 'Você'}</p>
              <p className="text-[10px] text-muted-foreground">
                {currentUser.isAnonymous
                  ? 'Convidado • Clique para trocar seu nome'
                  : 'Conta Google • Clique para alterar cor do cursor'}
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Rótulo de convidado clicável para acesso rápido e imediato */}
          {currentUser.isAnonymous && onOpenEditProfile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onOpenEditProfile}
                  className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted/70 transition cursor-pointer max-w-[110px]"
                >
                  <span className="truncate">{currentUser.displayName}</span>
                  <UserPen className="size-3 text-primary shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Clique para trocar seu nome de convidado</TooltipContent>
            </Tooltip>
          )}

          {/* Avatares dos colegas online clicáveis para seguir */}
          {remoteUsers.slice(0, 4).map((user, index) => {
            const isBeingFollowed = followingUserId === user.userId;
            const userName = user.name || 'Colega';
            const userKey = user.userId || `remote-user-${index}`;
            return (
              <Tooltip key={userKey}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onFollowUser(user.userId, userName)}
                    className={`relative rounded-full transition-transform hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
                      isBeingFollowed ? 'ring-2 ring-emerald-500' : ''
                    }`}
                  >
                    <Avatar className="size-6 text-[10px]">
                      {user.photoURL ? (
                        <AvatarImage
                          src={user.photoURL}
                          alt={userName}
                          referrerPolicy="no-referrer"
                        />
                      ) : null}
                      <AvatarFallback
                        className="text-white font-medium"
                        style={{ backgroundColor: user.color || '#3b82f6' }}
                      >
                        {userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isBeingFollowed && (
                      <span className="absolute -bottom-0.5 -right-0.5 size-3 bg-emerald-500 text-white flex items-center justify-center rounded-full shadow-xs">
                        <Eye className="size-2" />
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {isBeingFollowed ? 'Seguindo ' : 'Clique para seguir '}
                    <strong>{userName}</strong>
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {remoteUsers.length > 4 && (
            <div className="size-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-medium border border-border">
              +{remoteUsers.length - 4}
            </div>
          )}
        </div>

        {/* Painel de Camadas (toggle) */}
        {onToggleLayersPanel && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Painel de Camadas"
                onClick={onToggleLayersPanel}
                className={`size-8 rounded-lg border border-border bg-background/80 dark:bg-card/80 backdrop-blur-md shadow-xs transition-[transform,background-color,border-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer ${
                  isLayersPanelOpen ? 'bg-muted/90 border-foreground/30 text-foreground ring-1 ring-border' : ''
                }`}
              >
                <Layers className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Camadas</TooltipContent>
          </Tooltip>
        )}

        {/* Ferramentas de Colaboração & Facilitação (Timer, Votação, Apresentação, Reações) */}
        <FacilitationMenu
          boardId={board?.id || ''}
          userName={currentUser.displayName}
          isReadOnly={isReadOnly}
          isCommentOnly={isCommentOnly}
          onToggleTimer={onToggleTimer || (() => {})}
          isTimerOpen={isTimerOpen}
          onOpenLeaderboard={onOpenVoting || (() => {})}
          hasVotes={hasActiveVote}
          isVotingActive={isVotingActive}
          onEnterPresentation={onEnterPresentation || (() => {})}
          mirioReactionUnlocked={mirioReactionUnlocked}
        />

        {/* Preferências de Visualização e Grade do Canvas */}
        <CanvasPreferencesMenu
          toolbarPosition={toolbarPosition}
          onChangeToolbarPosition={onChangeToolbarPosition || (() => {})}
          gridType={gridType}
          onChangeGridType={onChangeGridType}
          gridSize={gridSize}
          onChangeGridSize={onChangeGridSize}
          gridOpacity={gridOpacity}
          onChangeGridOpacity={onChangeGridOpacity}
          showGrid={showGrid}
          onToggleGrid={onToggleGrid}
          showRemoteCursors={showRemoteCursors}
          onToggleRemoteCursors={onToggleRemoteCursors}
          smartGuides={smartGuides}
          onToggleSmartGuides={onToggleSmartGuides}
        />

        {/* Botão de Compartilhar (Proprietários podem compartilhar seu quadro) */}
        {isBoardOwner(board || null, currentUser) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Compartilhar Quadro"
                onClick={() => setIsShareModalOpen(true)}
                className={`relative size-8 rounded-lg border border-border bg-background/80 dark:bg-card/80 backdrop-blur-md shadow-xs transition-[transform,background-color,border-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer ${
                  isShareModalOpen ? 'bg-muted/90 border-foreground/30 text-foreground ring-1 ring-border' : ''
                }`}
              >
                <Share2 className="size-3.5" />
                {pendingJoinRequestsCount > 0 && (
                  <span className="absolute -top-1 -right-1 size-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center ring-2 ring-background animate-pulse">
                    {pendingJoinRequestsCount}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {pendingJoinRequestsCount > 0 
                ? `${pendingJoinRequestsCount} solicitação(ões) pendente(s)` 
                : 'Compartilhar Quadro'}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Modal de Compartilhamento com Permissões e Gmail */}
        <ShareModal
          open={isShareModalOpen}
          onOpenChange={setIsShareModalOpen}
          board={board || null}
          currentUser={currentUser}
          remoteUsers={remoteUsers}
          onUpdateBoardSettings={onUpdateBoardSettings}
        />

        {/* Botão Sair */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Sair da Conta"
              onClick={onLogout}
              className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 rounded-lg border border-border bg-background/80 dark:bg-card/80 backdrop-blur-md shadow-xs transition-[transform,background-color,border-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer"
            >
              <LogOut className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Sair da Conta</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
});

Navbar.displayName = 'Navbar';
