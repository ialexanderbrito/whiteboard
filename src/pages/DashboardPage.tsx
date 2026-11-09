import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  Share2, 
  ExternalLink, 
  LogOut, 
  Clock, 
  Check, 
  Search,
  Layers,
  LayoutGrid,
  List,
  MoreHorizontal,
  UserPen,
  Palette,
  Pencil,
  Lock,
  KeyRound,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { boardService } from '../services/boardService';
import type { Board } from '../types/board';
import { Button } from '@/components/ui/button';
import { EditProfileModal } from '../components/whiteboard/EditProfileModal';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { BuyMeACoffeeModal } from '@/components/layout/BuyMeACoffeeModal';
import { MirioLogo } from '@/components/layout/MirioLogo';
import { CreateBoardModal } from '@/components/whiteboard/CreateBoardModal';
import { BoardPasswordSettingsModal } from '@/components/whiteboard/BoardPasswordSettingsModal';
import { BoardPermissionsModal } from '@/components/whiteboard/BoardPermissionsModal';
import { 
  AdaptiveBoardSkeleton, 
  getAdaptiveSnapshot, 
  saveAdaptiveSnapshot 
} from '@/components/whiteboard/AdaptiveBoardSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { cleanBoardId, type CreateBoardOptions } from '@/services/boardService';
import { isBoardOwner } from '@/utils/permissions';
import { CommandPalette } from '@/components/command/CommandPalette';
import { KeyboardShortcutsModal } from '@/components/whiteboard/KeyboardShortcutsModal';
import { useTheme } from '@/context/ThemeContext';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, updateGuestProfile, isConfigured, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [boards, setBoards] = useState<Board[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Carrega o estado adaptativo salvo da última interação (modo de visão e quantidade prévia de quadros)
  const initialAdaptive = getAdaptiveSnapshot(currentUser?.uid);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(initialAdaptive.viewMode);
  const [cachedBoardCount, setCachedBoardCount] = useState<number>(initialAdaptive.count);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreating, setIsCreating] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Define o título da aba do navegador para o Dashboard
  useEffect(() => {
    document.title = 'Quadros de Ideias - Mirio';
  }, []);

  // Estado para exclusão com confirmação elegante do AlertDialog
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados para modais de configurações dedicados
  const [passwordModalBoard, setPasswordModalBoard] = useState<Board | null>(null);
  const [permissionsModalBoard, setPermissionsModalBoard] = useState<Board | null>(null);

  // Estados para edição inline do título
  const [inlineEditingBoardId, setInlineEditingBoardId] = useState<string | null>(null);
  const [inlineTitleValue, setInlineTitleValue] = useState('');

  const handleToggleViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    saveAdaptiveSnapshot({ viewMode: mode }, currentUser?.uid);
  };

  useEffect(() => {
    if (!currentUser) return;
    const startTime = Date.now();
    const unsubscribe = boardService.subscribeBoards(currentUser, (list) => {
      // Suave tempo mínimo (250ms) para que o skeleton adaptativo transicione sem piscar
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 250 - elapsed);

      setTimeout(() => {
        setBoards(list);
        setIsLoading(false);
        if (list.length > 0) {
          setCachedBoardCount(list.length);
          saveAdaptiveSnapshot({ count: list.length, viewMode }, currentUser.uid);
        }
      }, remaining);
    });
    return () => unsubscribe();
  }, [currentUser, viewMode]);

  const handleConfirmCreateBoard = async (options: CreateBoardOptions) => {
    if (!currentUser || isCreating) return;
    setIsCreating(true);
    try {
      const boardId = await boardService.createBoard(options, currentUser);
      setIsCreateModalOpen(false);
      navigate(`/b/${boardId}`);
    } catch (e) {
      console.error('Erro ao criar quadro:', e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!boardToDelete || !currentUser) return;
    const isOwner = isBoardOwner(boardToDelete, currentUser);
    // Apenas o proprietário pode excluir o quadro
    if (!isOwner) {
      setBoardToDelete(null);
      return;
    }

    setIsDeleting(true);
    const targetId = boardToDelete.id;

    // Atualização otimista imediata na interface
    setBoards((prev) => {
      const next = prev.filter((b) => b.id !== targetId);
      setCachedBoardCount(next.length);
      saveAdaptiveSnapshot({ count: next.length, viewMode }, currentUser?.uid);
      return next;
    });

    try {
      await boardService.deleteBoard(targetId);
      setBoardToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir quadro:', err);
      // Se falhou, restaura
      const b = await boardService.getBoard(targetId);
      if (b) {
        setBoards((prev) => [b, ...prev]);
      }
      alert('Não foi possível excluir este quadro. Verifique suas permissões.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyLink = (e: React.MouseEvent, rawBoardId: string) => {
    e.stopPropagation();
    const cleanId = cleanBoardId(rawBoardId);
    const url = `${window.location.origin}/b/${cleanId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(rawBoardId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStartRename = (e: React.MouseEvent, board: Board) => {
    e.stopPropagation();
    setInlineEditingBoardId(board.id);
    setInlineTitleValue(board.title);
  };

  const handleSaveRename = async (boardId: string) => {
    const trimmed = inlineTitleValue.trim();
    if (!trimmed) {
      setInlineEditingBoardId(null);
      return;
    }

    // Atualização otimista imediata
    setBoards((prev) =>
      prev.map((b) => (b.id === boardId ? { ...b, title: trimmed, updatedAt: Date.now() } : b))
    );
    setInlineEditingBoardId(null);

    try {
      await boardService.updateBoardTitle(boardId, trimmed);
    } catch (err) {
      console.error('Erro ao renomear quadro:', err);
      const fresh = await boardService.getBoard(boardId);
      if (fresh) {
        setBoards((prev) => prev.map((b) => (b.id === boardId ? fresh : b)));
      }
    }
  };

  const handleCancelRename = () => {
    setInlineEditingBoardId(null);
  };

  const handleUpdateBoardSettings = async (
    boardId: string,
    updates: Partial<Pick<Board, 'title' | 'defaultPermission' | 'collaborators' | 'collaboratorEmails' | 'members' | 'removedMemberIds' | 'isPasswordProtected' | 'password'>>
  ) => {
    // Atualização otimista
    setBoards((prev) =>
      prev.map((b) => (b.id === boardId ? { ...b, ...updates, updatedAt: Date.now() } : b))
    );

    setPasswordModalBoard((prev) => (prev && prev.id === boardId ? { ...prev, ...updates } : prev));
    setPermissionsModalBoard((prev) => (prev && prev.id === boardId ? { ...prev, ...updates } : prev));

    try {
      await boardService.updateBoardSettings(boardId, updates);
    } catch (err) {
      console.error('Erro ao atualizar configurações do quadro:', err);
      const fresh = await boardService.getBoard(boardId);
      if (fresh) {
        setBoards((prev) => prev.map((b) => (b.id === boardId ? fresh : b)));
        setPasswordModalBoard((prev) => (prev && prev.id === boardId ? fresh : prev));
        setPermissionsModalBoard((prev) => (prev && prev.id === boardId ? fresh : prev));
      }
    }
  };

  const handleSavePasswordSettings = async (
    boardId: string,
    settings: { isPasswordProtected: boolean; password?: string }
  ) => {
    await handleUpdateBoardSettings(boardId, settings);
  };

  const filteredBoards = boards.filter((b) => {
    const title = (b?.title || '').toLowerCase();
    const query = (searchQuery || '').toLowerCase().trim();
    return title.includes(query);
  });

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Recente';
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(timestamp));
    } catch {
      return new Date(timestamp).toLocaleDateString('pt-BR');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col text-foreground selection:bg-foreground selection:text-background">
      {/* Barra de Navegação Superior do Dashboard (Estilo Linear / Vercel) */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
              <MirioLogo variant="full" className="h-6 w-auto" />
            </div>
            <span className="text-border">/</span>
            <span className="text-xs text-muted-foreground font-mono font-medium hidden sm:inline">Workspace</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão Buy me a coffee */}
            <BuyMeACoffeeModal />

            {/* Alternador de Tema Claro / Escuro */}
            <ThemeToggle />

            {/* Menu do Usuário */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 h-8 px-2 rounded-md hover:bg-muted"
                >
                  <Avatar className="size-6 text-[10px]">
                    {currentUser?.photoURL ? (
                      <AvatarImage
                        src={currentUser.photoURL}
                        alt={currentUser?.displayName || 'U'}
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                    <AvatarFallback
                      className="text-white font-medium"
                      style={{ backgroundColor: currentUser?.color || '#3b82f6' }}
                    >
                      {(currentUser?.displayName || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {currentUser ? (
                    <span className="text-xs font-medium text-foreground max-w-[100px] truncate hidden md:inline">
                      {currentUser.displayName}
                    </span>
                  ) : (
                    <Skeleton className="h-3 w-16 hidden md:inline-block rounded" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-0.5">
                    <span className="text-xs font-semibold">{currentUser?.displayName}</span>
                    <span className="text-[11px] text-muted-foreground font-normal truncate">
                      {currentUser?.email || 'Usuário Convidado'}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsEditProfileOpen(true)}
                  className="cursor-pointer gap-2 text-xs"
                >
                  {currentUser?.isAnonymous ? (
                    <>
                      <UserPen className="size-3.5 text-muted-foreground" />
                      <span>Trocar Nome de Convidado</span>
                    </>
                  ) : (
                    <>
                      <Palette className="size-3.5 text-muted-foreground" />
                      <span>Personalizar Cor do Cursor</span>
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer gap-2 text-xs"
                >
                  <LogOut className="size-3.5" />
                  <span>Sair da conta</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Banner Informativo Discreto de Demonstração se o Firebase não estiver configurado */}
      {!isConfigured && (
        <div className="border-b border-border bg-muted/40 py-2 px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Modo Local ativo: dados sincronizados nesta máquina. Para colaboração remota, configure o <code className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded">.env</code>.</span>
            </span>
          </div>
        </div>
      )}

      {/* Conteúdo Principal do Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full flex flex-col">
        {/* Cabeçalho da Seção */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                Quadros de Ideias
              </h1>
              <Badge variant="secondary" className="text-xs font-mono min-w-6 flex items-center justify-center">
                {isLoading ? (
                  <Skeleton className="h-3 w-3.5 rounded-xs" />
                ) : (
                  boards.length
                )}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Espaço compartilhado para planejamento, retrospectivas ágeis e fluxos de trabalho.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Busca */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar quadro..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-16 h-9 text-xs"
              />
              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(true)}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/80 hover:bg-muted border border-border/80 text-[10px] font-mono font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none active:scale-[0.97]"
                title={`Abrir Paleta de Comandos (${isMac ? '⌘K' : 'Ctrl+K'})`}
              >
                {isMac ? '⌘K' : 'Ctrl+K'}
              </button>
            </div>

            {/* Alternador de Visualização Grid / Tabela com Persistência Imediata */}
            <div className="flex items-center border border-border rounded-md p-0.5 bg-muted/30">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon-sm"
                onClick={() => handleToggleViewMode('grid')}
                className="size-7 rounded-sm active:scale-[0.97] transition-transform cursor-pointer"
                title="Visualização em Grade"
              >
                <LayoutGrid className="size-3.5" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="icon-sm"
                onClick={() => handleToggleViewMode('table')}
                className="size-7 rounded-sm active:scale-[0.97] transition-transform cursor-pointer"
                title="Visualização em Lista"
              >
                <List className="size-3.5" />
              </Button>
            </div>

            {/* Botão Novo Quadro */}
            <Button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-1.5 h-9 text-xs font-medium shrink-0 shadow-xs active:scale-[0.97]"
            >
              <Plus className="size-4" />
              <span>Novo Quadro</span>
            </Button>
          </div>
        </div>

        {/* Lista / Grade de Quadros com Skeleton Adaptativo ao Último Estado da Tela */}
        {isLoading ? (
          <AdaptiveBoardSkeleton viewMode={viewMode} count={cachedBoardCount} />
        ) : boards.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center max-w-md mx-auto my-auto bg-card/50">
            <div className="size-10 rounded-md border border-border bg-muted/60 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              <Layers className="size-5" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Nenhum quadro ainda</h3>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Crie seu primeiro quadro colaborativo para começar a organizar sprints, desenhar e brainstormar com a equipe.
            </p>
            <Button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-1.5 h-8 text-xs font-medium active:scale-[0.97]"
            >
              <Plus className="size-3.5" />
              <span>Criar Primeiro Quadro</span>
            </Button>
          </div>
        ) : filteredBoards.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="size-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">Nenhum quadro encontrado com o termo "{searchQuery}".</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="mt-1 text-xs"
            >
              Limpar busca
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Visualização em Grade Minimalista (Cards shadcn) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredBoards.map((b) => {
              const isOwner = isBoardOwner(b, currentUser);
              const canManage = isOwner;

              return (
                <Card
                  key={b.id}
                  onClick={() => navigate(`/b/${cleanBoardId(b.id)}`)}
                  className="group relative cursor-pointer border-border bg-card hover:border-foreground/20 hover:shadow-sm transition-all flex flex-col justify-between overflow-hidden"
                >
                  {/* Visual Header do Card (Canvas Miniature Wireframe sutil) */}
                  <div className="h-28 bg-muted/30 border-b border-border/60 flex items-center justify-center relative overflow-hidden group-hover:bg-muted/50 transition-colors">
                    {/* Subtle Canvas Dot Grid */}
                    <div
                      className="absolute inset-0 opacity-[0.15] dark:opacity-[0.25]"
                      style={{
                        backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
                        backgroundSize: '12px 12px',
                      }}
                    />

                    {/* Minimalist blueprint silhouette */}
                    <div className="relative z-1 flex items-center gap-2 opacity-40 group-hover:opacity-75 transition-opacity">
                      <div className="size-8 rounded border border-border bg-background shadow-xs flex items-center justify-center">
                        <span className="size-2 rounded-full bg-foreground/40" />
                      </div>
                      <div className="size-8 rounded border border-border bg-background shadow-xs flex items-center justify-center">
                        <div className="w-4 h-1 rounded bg-foreground/40" />
                      </div>
                    </div>

                    {/* Menu de Ações no Canto do Card (Apenas para o proprietário; convidados não podem apagar nem compartilhar) */}
                    {canManage && (
                      <div className="absolute top-2 right-2 z-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="size-7 rounded-md bg-background/80 backdrop-blur-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity border border-border/40 active:scale-[0.97] cursor-pointer"
                              title="Mais opções do quadro"
                            >
                              <MoreHorizontal className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 animate-in zoom-in-95 duration-150">
                            <DropdownMenuItem
                              onClick={(e) => handleStartRename(e, b)}
                              className="gap-2 text-xs cursor-pointer"
                            >
                              <Pencil className="size-3.5 text-muted-foreground" />
                              <span>Renomear</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setPermissionsModalBoard(b);
                              }}
                              className="gap-2 text-xs cursor-pointer"
                            >
                              <Users className="size-3.5 text-muted-foreground" />
                              <span>Permissões de Acesso</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setPasswordModalBoard(b);
                              }}
                              className="gap-2 text-xs cursor-pointer"
                            >
                              <KeyRound className="size-3.5 text-muted-foreground" />
                              <span>Proteção por Senha</span>
                              {b.isPasswordProtected && (
                                <span className="ml-auto flex items-center gap-1 text-[10px] text-amber-500 font-medium">
                                  <Lock className="size-2.5" />
                                  Ativa
                                </span>
                              )}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={(e) => handleCopyLink(e, b.id)}
                              className="gap-2 text-xs cursor-pointer"
                            >
                              {copiedId === b.id ? (
                                <>
                                  <Check className="size-3.5 text-emerald-500" />
                                  <span className="text-emerald-500 font-medium">Link copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Share2 className="size-3.5 text-muted-foreground" />
                                  <span>Copiar link</span>
                                </>
                              )}
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/b/${cleanBoardId(b.id)}`);
                              }}
                              className="gap-2 text-xs cursor-pointer"
                            >
                              <ExternalLink className="size-3.5 text-muted-foreground" />
                              <span>Abrir quadro</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setBoardToDelete(b);
                              }}
                              className="text-destructive focus:bg-destructive/10 focus:text-destructive gap-2 text-xs cursor-pointer"
                            >
                              <Trash2 className="size-3.5" />
                              <span>Excluir quadro</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>

                  {/* Conteúdo do Card */}
                  <CardContent className="p-3.5 flex flex-col justify-between gap-3">
                    <div>
                      {inlineEditingBoardId === b.id ? (
                        <div 
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Input
                            type="text"
                            value={inlineTitleValue}
                            onChange={(e) => setInlineTitleValue(e.target.value)}
                            autoFocus
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveRename(b.id);
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                handleCancelRename();
                              }
                            }}
                            onBlur={() => handleSaveRename(b.id)}
                            className="h-7 text-xs font-semibold px-2 py-0 border-primary focus-visible:ring-1"
                          />
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => handleSaveRename(b.id)}
                            className="size-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 shrink-0 active:scale-[0.97] transition-transform cursor-pointer"
                            title="Salvar nome"
                          >
                            <Check className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-1.5">
                          <h4 className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors flex-1">
                            {b.title}
                          </h4>
                          {b.isPasswordProtected && (
                            <span 
                              className="shrink-0 flex items-center text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded p-0.5" 
                              title="Protegido por senha"
                            >
                              <Lock className="size-2.5" />
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="size-3" />
                        <span>{formatDate(b.updatedAt)}</span>
                        {b.defaultPermission === 'none' && (
                          <>
                            <span>•</span>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Privado</span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                        <span className="truncate">{b.ownerName}</span>
                        {isOwner ? (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-normal">
                            Meu
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 font-normal">
                            Compartilhado
                          </Badge>
                        )}
                      </div>
                      {canManage ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => handleCopyLink(e, b.id)}
                          className="size-6 text-muted-foreground hover:text-foreground rounded cursor-pointer"
                          title="Copiar link"
                        >
                          {copiedId === b.id ? (
                            <Check className="size-3 text-emerald-500" />
                          ) : (
                            <Share2 className="size-3" />
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/b/${cleanBoardId(b.id)}`);
                          }}
                          className="h-6 px-2 text-[11px] gap-1 text-primary hover:text-primary hover:bg-primary/10 rounded font-medium cursor-pointer"
                          title="Entrar no quadro"
                        >
                          <span>Entrar</span>
                          <ExternalLink className="size-2.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Visualização em Tabela shadcn */
          <div className="rounded-md border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[45%] text-xs font-medium">Nome do Quadro</TableHead>
                  <TableHead className="text-xs font-medium">Criador</TableHead>
                  <TableHead className="text-xs font-medium">Última Modificação</TableHead>
                  <TableHead className="text-right text-xs font-medium">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBoards.map((b) => {
                  const isOwner = isBoardOwner(b, currentUser);
                  const canManage = isOwner;

                  return (
                    <TableRow
                      key={b.id}
                      onClick={() => navigate(`/b/${cleanBoardId(b.id)}`)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="font-medium text-xs">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded border border-border bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0">
                            <Layers className="size-3" />
                          </div>
                          {inlineEditingBoardId === b.id ? (
                            <div 
                              className="flex items-center gap-1.5 flex-1 max-w-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Input
                                type="text"
                                value={inlineTitleValue}
                                onChange={(e) => setInlineTitleValue(e.target.value)}
                                autoFocus
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveRename(b.id);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    handleCancelRename();
                                  }
                                }}
                                onBlur={() => handleSaveRename(b.id)}
                                className="h-7 text-xs font-semibold px-2 py-0 border-primary focus-visible:ring-1"
                              />
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => handleSaveRename(b.id)}
                                className="size-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 shrink-0 active:scale-[0.97] transition-transform cursor-pointer"
                                title="Salvar nome"
                              >
                                <Check className="size-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 truncate max-w-xs">
                              <span className="font-semibold text-foreground truncate">{b.title}</span>
                              {b.isPasswordProtected && (
                                <span 
                                  title="Protegido por senha" 
                                  className="text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded p-0.5 shrink-0"
                                >
                                  <Lock className="size-2.5" />
                                </span>
                              )}
                              {b.defaultPermission === 'none' && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-normal text-amber-600 dark:text-amber-400 border-amber-500/30">
                                  Privado
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <span>{b.ownerName}</span>
                          {isOwner ? (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-normal">
                              Meu
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 font-normal">
                              Compartilhado
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(b.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {canManage && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="size-7 rounded-md text-muted-foreground hover:text-foreground active:scale-[0.97] transition-transform cursor-pointer"
                                  title="Mais opções do quadro"
                                >
                                  <MoreHorizontal className="size-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 animate-in zoom-in-95 duration-150">
                                <DropdownMenuItem
                                  onClick={(e) => handleStartRename(e, b)}
                                  className="gap-2 text-xs cursor-pointer"
                                >
                                  <Pencil className="size-3.5 text-muted-foreground" />
                                  <span>Renomear</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPermissionsModalBoard(b);
                                  }}
                                  className="gap-2 text-xs cursor-pointer"
                                >
                                  <Users className="size-3.5 text-muted-foreground" />
                                  <span>Permissões de Acesso</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPasswordModalBoard(b);
                                  }}
                                  className="gap-2 text-xs cursor-pointer"
                                >
                                  <KeyRound className="size-3.5 text-muted-foreground" />
                                  <span>Proteção por Senha</span>
                                  {b.isPasswordProtected && (
                                    <span className="ml-auto flex items-center gap-1 text-[10px] text-amber-500 font-medium">
                                      <Lock className="size-2.5" />
                                      Ativa
                                    </span>
                                  )}
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={(e) => handleCopyLink(e, b.id)}
                                  className="gap-2 text-xs cursor-pointer"
                                >
                                  {copiedId === b.id ? (
                                    <>
                                      <Check className="size-3.5 text-emerald-500" />
                                      <span className="text-emerald-500 font-medium">Link copiado!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Share2 className="size-3.5 text-muted-foreground" />
                                      <span>Copiar link</span>
                                    </>
                                  )}
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBoardToDelete(b);
                                  }}
                                  className="text-destructive focus:bg-destructive/10 focus:text-destructive gap-2 text-xs cursor-pointer"
                                >
                                  <Trash2 className="size-3.5" />
                                  <span>Excluir quadro</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/b/${cleanBoardId(b.id)}`)}
                            className="h-7 px-2.5 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10 font-medium active:scale-[0.97] transition-transform cursor-pointer"
                            title="Entrar no quadro"
                          >
                            <span>Entrar</span>
                            <ExternalLink className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* Diálogo de Confirmação de Exclusão ou Remoção */}
      <AlertDialog open={Boolean(boardToDelete)} onOpenChange={(open) => !open && setBoardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isBoardOwner(boardToDelete, currentUser)
                ? 'Excluir quadro de ideias?'
                : 'Remover quadro da lista?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isBoardOwner(boardToDelete, currentUser) ? (
                <>
                  Esta ação removerá permanentemente o quadro <strong>"{boardToDelete?.title}"</strong> e todos os seus elementos. Esta ação não poderá ser desfeita.
                </>
              ) : (
                <>
                  Deseja remover o quadro <strong>"{boardToDelete?.title}"</strong> da sua lista de acesso? O quadro original continuará intacto com o proprietário.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className={
                isBoardOwner(boardToDelete, currentUser)
                  ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                  : ''
              }
            >
              {isDeleting
                ? 'Processando...'
                : boardToDelete?.ownerId === currentUser?.uid
                ? 'Sim, excluir quadro'
                : 'Sim, remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Modal de Criação e Configuração de Novo Quadro */}
      {currentUser && (
        <CreateBoardModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          currentUser={currentUser}
          onCreateBoard={handleConfirmCreateBoard}
          isCreating={isCreating}
        />
      )}

      {/* Paleta de Comandos Global (Cmd+K / Ctrl+K) */}
      <CommandPalette
        open={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
        dashboardContext={{
          boards,
          isAnonymous: currentUser?.isAnonymous,
          onCreateBoard: () => setIsCreateModalOpen(true),
          onOpenEditProfile: () => setIsEditProfileOpen(true),
          onToggleViewMode: () => {
            const next = viewMode === 'grid' ? 'table' : 'grid';
            handleToggleViewMode(next);
          },
          viewMode,
          onOpenShortcuts: () => setIsShortcutsModalOpen(true),
          onToggleTheme: toggleTheme,
          isDarkMode: isDark,
          onLogout: logout,
        }}
      />

      {/* Modal de Troca de Nome e Perfil (Convidado & Usuário) */}
      {currentUser && (
        <EditProfileModal
          open={isEditProfileOpen}
          onOpenChange={setIsEditProfileOpen}
          currentUser={currentUser}
          onSave={updateGuestProfile}
        />
      )}

      {/* Modal de Atalhos de Teclado */}
      <KeyboardShortcutsModal
        open={isShortcutsModalOpen}
        onOpenChange={setIsShortcutsModalOpen}
      />

      {/* Modal Focado de Proteção por Senha do Quadro */}
      <BoardPasswordSettingsModal
        open={Boolean(passwordModalBoard)}
        onOpenChange={(open) => !open && setPasswordModalBoard(null)}
        board={passwordModalBoard}
        onSavePasswordSettings={handleSavePasswordSettings}
      />

      {/* Modal Focado de Permissões de Acesso e Colaboradores */}
      {currentUser && (
        <BoardPermissionsModal
          open={Boolean(permissionsModalBoard)}
          onOpenChange={(open) => !open && setPermissionsModalBoard(null)}
          board={permissionsModalBoard}
          currentUser={currentUser}
          onUpdateBoardSettings={handleUpdateBoardSettings}
        />
      )}
    </div>
  );
};
