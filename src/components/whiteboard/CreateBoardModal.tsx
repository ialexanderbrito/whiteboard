import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Share2, 
  KeyRound, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BoardPermission, CurrentUser } from '../../types/board';
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
    desc: 'Restrito; compartilhe depois pelas configurações do quadro',
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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isCreating) return;

    const finalTitle = boardTitle.trim() || 'Novo Quadro de Ideias';
    await onCreateBoard({
      boardId: pregeneratedId,
      title: finalTitle,
      defaultPermission,
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

          {/* 4. Proteção por Senha (Opcional) */}
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
