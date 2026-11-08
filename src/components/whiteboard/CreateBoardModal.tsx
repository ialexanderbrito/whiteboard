import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Share2, 
  KeyRound, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Plus, 
  Trash2, 
  Globe, 
  MessageSquare,
  ShieldAlert,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BoardCollaborator, BoardPermission, CurrentUser } from '../../types/board';
import type { CreateBoardOptions } from '../../services/boardService';

interface CreateBoardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: CurrentUser;
  onCreateBoard: (options: CreateBoardOptions) => Promise<void>;
  isCreating?: boolean;
}

const TITLE_SUGGESTIONS = [
  'Sprint Planning',
  'Retrospectiva Ágil',
  'Brainstorming & Ideias',
  'Design System & Wireframes',
  'Roadmap de Produto',
  'Mapeamento de Fluxo',
];

const PERMISSION_OPTIONS: { id: BoardPermission; label: string; desc: string; icon: React.ElementType }[] = [
  {
    id: 'edit',
    label: 'Pode editar',
    desc: 'Participantes podem criar, desenhar e editar elementos',
    icon: Sparkles,
  },
  {
    id: 'comment',
    label: 'Pode comentar',
    desc: 'Participantes podem adicionar post-its e reagir com emojis',
    icon: MessageSquare,
  },
  {
    id: 'view',
    label: 'Apenas leitura',
    desc: 'Apenas visualização em tempo real sem alterar o quadro',
    icon: Globe,
  },
  {
    id: 'none',
    label: 'Sem acesso / Privado',
    desc: 'Restrito exclusivamente a convidados diretos por e-mail',
    icon: ShieldAlert,
  },
];

export const CreateBoardModal: React.FC<CreateBoardModalProps> = ({
  open,
  onOpenChange,
  currentUser: _currentUser,
  onCreateBoard,
  isCreating = false,
}) => {
  const [boardTitle, setBoardTitle] = useState('');
  const [defaultPermission, setDefaultPermission] = useState<BoardPermission>('edit');
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Colaboradores adicionados antes da criação
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [collaboratorRole, setCollaboratorRole] = useState<BoardPermission>('edit');
  const [collaborators, setCollaborators] = useState<Record<string, BoardCollaborator>>({});

  // ID pré-gerado para permitir copiar o link antecipadamente se desejar
  const [pregeneratedId, setPregeneratedId] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (open) {
      // Gera ID curto, limpo e direto sem prefixo board_
      const generated = Math.random().toString(36).substring(2, 10);
      setPregeneratedId(generated);
      setBoardTitle('');
      setDefaultPermission('edit');
      setIsPasswordProtected(false);
      setPassword('');
      setCollaborators({});
      setCollaboratorEmail('');
      setCollaboratorRole('edit');
      setCopiedLink(false);
    }
  }, [open]);

  // Link no padrão limpo e elegante /b/:id
  const cleanBoardUrl = `${window.location.origin}/b/${pregeneratedId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(cleanBoardUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignora
    }
  };

  const handleAddCollaborator = () => {
    const email = collaboratorEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) return;

    const emailKey = email.replace(/[.#$[\]]/g, '_');
    setCollaborators((prev) => ({
      ...prev,
      [emailKey]: {
        email,
        role: collaboratorRole,
        addedAt: Date.now(),
      },
    }));
    setCollaboratorEmail('');
  };

  const handleRemoveCollaborator = (emailKey: string) => {
    setCollaborators((prev) => {
      const next = { ...prev };
      delete next[emailKey];
      return next;
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isCreating) return;

    const finalTitle = boardTitle.trim() || 'Novo Quadro de Ideias';
    const collaboratorEmails = Object.values(collaborators).map((c) => c.email.toLowerCase());

    await onCreateBoard({
      boardId: pregeneratedId,
      title: finalTitle,
      defaultPermission,
      collaborators,
      collaboratorEmails,
      isPasswordProtected,
      password: isPasswordProtected ? password.trim() : '',
    });
  };

  const selectedPermOption = PERMISSION_OPTIONS.find((p) => p.id === defaultPermission) || PERMISSION_OPTIONS[0];
  const SelectedPermIcon = selectedPermOption.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden gap-0 border-border bg-card shadow-2xl">
        {/* Cabeçalho Visual de Alto Nível (Estilo Emil Kowalski / Linear) */}
        <div className="p-5 pb-4 border-b border-border bg-gradient-to-b from-muted/40 to-transparent">
          <DialogHeader className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                <Sparkles className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
                  Criar Novo Quadro
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Defina o nome, nível de acesso da equipe e senha antes de começar.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* 1. Nome do Quadro com Sugestões Rápidas */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Nome do Quadro</span>
              <span className="text-[11px] font-normal text-muted-foreground">Obrigatório</span>
            </label>

            <Input
              autoFocus
              type="text"
              placeholder="Ex: Planejamento da Sprint 12, Retrospectiva..."
              value={boardTitle}
              onChange={(e) => setBoardTitle(e.target.value)}
              className="h-9 text-xs transition-colors focus-visible:ring-1 focus-visible:ring-primary"
            />

            {/* Chips de Sugestão de Título (Fricção Zero) */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {TITLE_SUGGESTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setBoardTitle(tag)}
                  className={`text-[11px] px-2.5 py-1 rounded-md border transition-all active:scale-[0.97] cursor-pointer ${
                    boardTitle === tag
                      ? 'bg-primary text-primary-foreground border-primary font-medium shadow-xs'
                      : 'border-border/80 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Link do Quadro (Prévia com 1 clique de cópia) */}
          <div className="space-y-1.5 p-3 rounded-lg border border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Share2 className="size-3" />
                <span>Link do Quadro Gerado</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopyLink}
                className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground active:scale-[0.97]"
              >
                {copiedLink ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                <span>{copiedLink ? 'Copiado!' : 'Copiar link'}</span>
              </Button>
            </div>
            <p className="font-mono text-xs text-foreground/80 truncate select-all bg-background/80 px-2.5 py-1 rounded border border-border/60">
              {cleanBoardUrl}
            </p>
          </div>

          {/* 3. Permissão Geral do Link */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Quem pode acessar pelo link
            </label>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between h-auto py-2.5 px-3 text-left border-border hover:bg-muted/40 active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <SelectedPermIcon className="size-3.5" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-medium text-foreground">{selectedPermOption.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{selectedPermOption.desc}</p>
                    </div>
                  </div>
                  <ChevronDown className="size-3.5 opacity-60 shrink-0 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[480px] max-w-[calc(100vw-3rem)] p-1">
                {PERMISSION_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = defaultPermission === opt.id;
                  return (
                    <DropdownMenuItem
                      key={opt.id}
                      onClick={() => setDefaultPermission(opt.id)}
                      className={`flex items-start gap-2.5 py-2 px-2.5 cursor-pointer rounded-md ${
                        isSelected ? 'bg-primary/5 text-primary' : ''
                      }`}
                    >
                      <div className={`size-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon className="size-3.5" />
                      </div>
                      <div className="flex-1 truncate">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground">{opt.label}</span>
                          {isSelected && <Check className="size-3.5 text-primary" />}
                        </div>
                        <span className="text-[10px] text-muted-foreground block">{opt.desc}</span>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 4. Convidar Pessoas Específicas por E-mail */}
          <div className="space-y-2 pt-1 border-t border-border">
            <label className="text-xs font-semibold text-foreground block">
              Convidar Pessoas (Opcional)
            </label>

            <div className="flex items-center gap-1.5">
              <Input
                type="email"
                placeholder="email@empresa.com"
                value={collaboratorEmail}
                onChange={(e) => setCollaboratorEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCollaborator();
                  }
                }}
                className="h-8 text-xs flex-1"
              />

              {/* Seletor do Papel do Convidado */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs px-2 gap-1 shrink-0">
                    <span>
                      {collaboratorRole === 'edit'
                        ? 'Editar'
                        : collaboratorRole === 'comment'
                        ? 'Comentar'
                        : 'Leitura'}
                    </span>
                    <ChevronDown className="size-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-xs w-36">
                  <DropdownMenuItem onClick={() => setCollaboratorRole('edit')} className="cursor-pointer">
                    Pode editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCollaboratorRole('comment')} className="cursor-pointer">
                    Pode comentar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCollaboratorRole('view')} className="cursor-pointer">
                    Apenas leitura
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddCollaborator}
                disabled={!collaboratorEmail.trim() || !collaboratorEmail.includes('@')}
                className="h-8 px-2.5 text-xs gap-1 shrink-0 active:scale-[0.97]"
              >
                <Plus className="size-3.5" />
                <span>Adicionar</span>
              </Button>
            </div>

            {/* Lista de Colaboradores Adicionados */}
            {Object.keys(collaborators).length > 0 && (
              <div className="space-y-1 max-h-28 overflow-y-auto pt-1">
                {Object.entries(collaborators).map(([key, c]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-1 px-2.5 rounded-md bg-muted/30 border border-border/50 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <Avatar className="size-5 text-[9px]">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {c.email.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-foreground text-xs">{c.email}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                        {c.role === 'edit' ? 'Editor' : c.role === 'comment' ? 'Comentarista' : 'Leitor'}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleRemoveCollaborator(key)}
                        className="text-muted-foreground hover:text-destructive p-0.5 transition-colors"
                        title="Remover convite"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. Proteção por Senha (Opcional) */}
          <div className="p-3 rounded-lg border border-border bg-muted/15 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`size-6 rounded-md flex items-center justify-center transition-colors ${
                    isPasswordProtected
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <KeyRound className="size-3.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Proteger com Senha</p>
                  <p className="text-[10px] text-muted-foreground">
                    Exige senha para qualquer pessoa abrir o quadro
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant={isPasswordProtected ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsPasswordProtected(!isPasswordProtected)}
                className={`h-6 text-[11px] px-2.5 transition active:scale-[0.97] ${
                  isPasswordProtected ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''
                }`}
              >
                {isPasswordProtected ? 'Ativada' : 'Desativada'}
              </Button>
            </div>

            {/* Campo da Senha quando ativada */}
            {isPasswordProtected && (
              <div className="relative pt-1 animate-in fade-in-50 duration-150">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Defina uma senha de acesso..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-8 text-xs pr-8 border-amber-500/30 focus-visible:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-[13px] text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            )}
          </div>
        </form>

        {/* Rodapé com Ações Claras */}
        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex flex-row items-center justify-between sm:justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
            className="text-xs h-8 text-muted-foreground hover:text-foreground active:scale-[0.97]"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleSubmit()}
            disabled={isCreating || (isPasswordProtected && !password.trim())}
            className="text-xs font-semibold h-8 px-4 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm active:scale-[0.97] transition-all"
          >
            <span>{isCreating ? 'Criando Quadro...' : 'Criar e Abrir Quadro'}</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
