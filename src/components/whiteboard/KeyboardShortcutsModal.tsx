import React, { useState, useMemo } from 'react';
import {
  Keyboard,
  Search,
  X
} from '@/components/ui/icons';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'tools' | 'edit' | 'navigation' | 'history' | 'general';
}

const SHORTCUTS: ShortcutItem[] = [
  // Ferramentas
  { keys: ['V'], description: 'Mover e Selecionar', category: 'tools' },
  { keys: ['H'], description: 'Mão / Mover Tela (Pan)', category: 'tools' },
  { keys: ['N'], description: 'Novo Post-it (Sticky Note)', category: 'tools' },
  { keys: ['R'], description: 'Criar Retângulo', category: 'tools' },
  { keys: ['O'], description: 'Criar Círculo', category: 'tools' },
  { keys: ['A'], description: 'Criar Seta Conectora', category: 'tools' },
  { keys: ['P'], description: 'Caneta / Desenho Livre', category: 'tools' },
  { keys: ['T'], description: 'Caixa de Texto', category: 'tools' },
  { keys: ['F'], description: 'Moldura / Raia de Sprint', category: 'tools' },
  { keys: ['U'], description: 'Enviar Imagens do Computador, Stickers & GIFs', category: 'tools' },
  { keys: ['E'], description: 'Borracha (Eraser)', category: 'tools' },
  { keys: ['L'], description: 'Apontador Laser (Laser Pointer)', category: 'tools' },
  { keys: ['/'], description: 'Chat do Cursor ao Vivo', category: 'tools' },

  // Edição
  { keys: ['Ctrl', 'C'], description: 'Copiar elementos selecionados', category: 'edit' },
  { keys: ['Ctrl', 'X'], description: 'Recortar elementos selecionados', category: 'edit' },
  { keys: ['Ctrl', 'V'], description: 'Colar elementos ou imagens', category: 'edit' },
  { keys: ['Ctrl', 'D'], description: 'Duplicar elementos selecionados', category: 'edit' },
  { keys: ['Del'], description: 'Excluir elementos selecionados', category: 'edit' },
  { keys: ['Ctrl', 'A'], description: 'Selecionar todos os elementos', category: 'edit' },
  { keys: ['Ctrl', 'Shift', 'L'], description: 'Bloquear / Desbloquear seleção', category: 'edit' },
  { keys: ['Alt', 'A'], description: 'Alinhar seleção à esquerda', category: 'edit' },
  { keys: ['Alt', 'H'], description: 'Centralizar seleção horizontalmente', category: 'edit' },
  { keys: ['Alt', 'D'], description: 'Alinhar seleção à direita', category: 'edit' },
  { keys: ['Alt', 'W'], description: 'Alinhar seleção ao topo', category: 'edit' },
  { keys: ['Alt', 'V'], description: 'Centralizar seleção verticalmente', category: 'edit' },
  { keys: ['Alt', 'S'], description: 'Alinhar seleção à base', category: 'edit' },
  { keys: ['Ctrl', 'Alt', 'H'], description: 'Distribuir seleção horizontalmente', category: 'edit' },
  { keys: ['Ctrl', 'Alt', 'V'], description: 'Distribuir seleção verticalmente', category: 'edit' },
  { keys: ['Esc'], description: 'Desmarcar seleção / Fechar modais', category: 'edit' },

  // Navegação
  { keys: ['Espaço', 'Arrastar'], description: 'Arrastar e navegar pelo canvas', category: 'navigation' },
  { keys: ['Setas'], description: 'Mover itens selecionados em 1px', category: 'navigation' },
  { keys: ['Shift', 'Setas'], description: 'Mover itens selecionados em 10px', category: 'navigation' },
  { keys: ['+'], description: 'Aumentar Zoom do quadro', category: 'navigation' },
  { keys: ['-'], description: 'Diminuir Zoom do quadro', category: 'navigation' },
  { keys: ['Ctrl', '0'], description: 'Redefinir Zoom para 100%', category: 'navigation' },
  { keys: ['Ctrl', "'"], description: 'Mostrar ou ocultar grade do canvas', category: 'navigation' },
  { keys: ['Shift', 'G'], description: 'Alternar grade do canvas', category: 'navigation' },
  { keys: ['Shift', 'S'], description: 'Alternar guias inteligentes e encaixe magnético', category: 'navigation' },
  { keys: ['Ctrl', '(segurar)'], description: 'Ignorar temporariamente o ímã ao arrastar', category: 'navigation' },

  // Histórico
  { keys: ['Ctrl', 'Z'], description: 'Desfazer última alteração', category: 'history' },
  { keys: ['Ctrl', 'Y'], description: 'Refazer alteração', category: 'history' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Refazer alteração (alternativo)', category: 'history' },

  // Geral
  { keys: ['Ctrl', 'K'], description: 'Abrir Paleta de Comandos (Spotlight)', category: 'general' },
  { keys: ['?'], description: 'Abrir este menu de atalhos', category: 'general' },
  { keys: ['Shift', '/'], description: 'Abrir atalhos de teclado', category: 'general' },
];

const CATEGORY_NAMES: Record<string, string> = {
  tools: 'Ferramentas de Criação',
  edit: 'Edição & Seleção',
  navigation: 'Navegação & Zoom',
  history: 'Histórico de Ações',
  general: 'Geral & Ajuda',
};

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [search, setSearch] = useState('');

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  const formatKey = (key: string) => {
    if (key === 'Ctrl') return isMac ? '⌘' : 'Ctrl';
    if (key === 'Shift') return isMac ? '⇧' : 'Shift';
    if (key === 'Alt') return isMac ? '⌥' : 'Alt';
    return key;
  };

  const filteredShortcuts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SHORTCUTS;
    return SHORTCUTS.filter(
      (s) =>
        s.description.toLowerCase().includes(q) ||
        s.keys.some((k) => k.toLowerCase().includes(q)) ||
        CATEGORY_NAMES[s.category]?.toLowerCase().includes(q)
    );
  }, [search]);

  // Agrupa atalhos por categoria
  const grouped = useMemo(() => {
    const map: Record<string, ShortcutItem[]> = {};
    for (const item of filteredShortcuts) {
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    }
    return map;
  }, [filteredShortcuts]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-hidden flex flex-col p-0 rounded-2xl shadow-2xl border-border bg-card">
        {/* Cabeçalho */}
        <div className="p-5 pb-3 border-b border-border space-y-3">
          <div className="flex items-center gap-3 pr-8">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Keyboard className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Atalhos do Teclado
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Aumente sua produtividade usando comandos padrão da indústria.
              </DialogDescription>
            </div>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Pesquisar atalho por nome ou tecla..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-muted/40 rounded-lg border-border"
              autoFocus={false}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Lista Rolável de Atalhos Agrupados */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {Object.keys(grouped).length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Nenhum atalho encontrado para "{search}"
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  {CATEGORY_NAMES[category] || category}
                </span>

                <div className="rounded-xl border border-border/80 bg-background/50 divide-y divide-border/60 overflow-hidden">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3.5 py-2 text-xs hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-foreground font-medium">
                        {item.description}
                      </span>

                      <div className="flex items-center gap-1 shrink-0 ml-3">
                        {item.keys.map((k, kIdx) => (
                          <React.Fragment key={kIdx}>
                            {kIdx > 0 && (
                              <span className="text-[10px] text-muted-foreground/60 select-none">+</span>
                            )}
                            <kbd className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-md bg-muted border border-border font-mono text-[10px] font-bold text-foreground shadow-2xs select-none">
                              {formatKey(k)}
                            </kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rodapé Informativo */}
        <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Pressione <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px] font-bold">?</kbd> em qualquer lugar do quadro para abrir</span>
          <span className="font-mono text-[10px]">Mirio Whiteboard</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
