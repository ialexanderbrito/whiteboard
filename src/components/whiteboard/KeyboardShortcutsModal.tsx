import React, { useState, useMemo } from 'react';
import {
  Keyboard,
  Search,
  X,
} from '@/components/ui/icons';
import {
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ResponsiveModalRoot,
  ResponsiveModalContent,
} from '@/components/ui/responsive-modal';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ShortcutCategory = 'tools' | 'edit' | 'widgets' | 'navigation' | 'history' | 'general';

interface ShortcutItem {
  keys: string[];
  description: string;
  category: ShortcutCategory;
}

const SHORTCUTS: ShortcutItem[] = [
  // Ferramentas de Criação
  { keys: ['V'], description: 'Mover e Selecionar', category: 'tools' },
  { keys: ['H'], description: 'Mão / Mover Tela (Pan)', category: 'tools' },
  { keys: ['N'], description: 'Novo Post-it (Sticky Note)', category: 'tools' },
  { keys: ['K'], description: 'Comentário Fixado em Thread', category: 'tools' },
  { keys: ['C'], description: 'Checklist Interativo (Micro-Widget)', category: 'tools' },
  { keys: ['R'], description: 'Criar Retângulo', category: 'tools' },
  { keys: ['O'], description: 'Criar Círculo', category: 'tools' },
  { keys: ['A'], description: 'Criar Seta Conectora', category: 'tools' },
  { keys: ['Shift', 'A'], description: 'Criar Linha Reta', category: 'tools' },
  { keys: ['P'], description: 'Caneta / Desenho Livre', category: 'tools' },
  { keys: ['Shift', 'P'], description: 'Alternar Desenho Inteligente (Formas Automáticas)', category: 'tools' },
  { keys: ['T'], description: 'Caixa de Texto', category: 'tools' },
  { keys: ['F'], description: 'Moldura / Raia de Sprint', category: 'tools' },
  { keys: ['S'], description: 'Templates de Sprint (Scrum, Retro, Kanban)', category: 'tools' },
  { keys: ['U'], description: 'Enviar Imagens do Computador, Stickers & GIFs', category: 'tools' },
  { keys: ['E'], description: 'Borracha (Eraser)', category: 'tools' },
  { keys: ['L'], description: 'Apontador Laser (toque alterna ou segure temporariamente)', category: 'tools' },
  { keys: ['/'], description: 'Chat do Cursor ao Vivo', category: 'tools' },

  // Edição, Agrupamento & Alinhamento
  { keys: ['Enter'], description: 'Editar texto do elemento selecionado', category: 'edit' },
  { keys: ['Ctrl', 'C'], description: 'Copiar elementos selecionados', category: 'edit' },
  { keys: ['Ctrl', 'X'], description: 'Recortar elementos selecionados', category: 'edit' },
  { keys: ['Ctrl', 'V'], description: 'Colar elementos, imagens, links ricos ou código', category: 'edit' },
  { keys: ['Ctrl', 'D'], description: 'Duplicar elementos selecionados', category: 'edit' },
  { keys: ['Del'], description: 'Excluir elementos selecionados (ou Backspace)', category: 'edit' },
  { keys: ['Ctrl', 'A'], description: 'Selecionar todos os elementos', category: 'edit' },
  { keys: ['Ctrl', 'G'], description: 'Agrupar elementos selecionados', category: 'edit' },
  { keys: ['Ctrl', 'Shift', 'G'], description: 'Desagrupar elementos selecionados', category: 'edit' },
  { keys: ['Ctrl', 'Alt', 'C'], description: 'Copiar estilo visual do elemento', category: 'edit' },
  { keys: ['Ctrl', 'Alt', 'V'], description: 'Colar estilo visual nos selecionados', category: 'edit' },
  { keys: ['Ctrl', 'Shift', 'L'], description: 'Bloquear / Desbloquear seleção', category: 'edit' },
  { keys: [']'], description: 'Trazer para o extremo da frente', category: 'edit' },
  { keys: ['['], description: 'Enviar para o fundo da pilha', category: 'edit' },
  { keys: ['Alt', 'A'], description: 'Alinhar seleção à esquerda', category: 'edit' },
  { keys: ['Alt', 'H'], description: 'Centralizar seleção horizontalmente', category: 'edit' },
  { keys: ['Alt', 'D'], description: 'Alinhar seleção à direita', category: 'edit' },
  { keys: ['Alt', 'W'], description: 'Alinhar seleção ao topo', category: 'edit' },
  { keys: ['Alt', 'V'], description: 'Centralizar seleção verticalmente', category: 'edit' },
  { keys: ['Alt', 'S'], description: 'Alinhar seleção à base', category: 'edit' },
  { keys: ['Ctrl', 'Alt', 'H'], description: 'Distribuir seleção horizontalmente', category: 'edit' },
  { keys: ['Esc'], description: 'Desmarcar seleção / Cancelar edição / Fechar modais', category: 'edit' },

  // Texto Rico, Mapa Mental & Código
  { keys: ['Tab'], description: 'Criar nó filho conectado (Mapa Mental) / Indentar código', category: 'widgets' },
  { keys: ['Enter'], description: 'Criar nó irmão (Mapa Mental) / Salvar card Kanban ou célula', category: 'widgets' },
  { keys: ['Ctrl', 'Enter'], description: 'Concluir edição no bloco de código', category: 'widgets' },
  { keys: ['Ctrl', 'B'], description: 'Negrito no texto selecionado', category: 'widgets' },
  { keys: ['Ctrl', 'I'], description: 'Itálico no texto selecionado', category: 'widgets' },
  { keys: ['Ctrl', 'U'], description: 'Sublinhado no texto selecionado', category: 'widgets' },
  { keys: ['Ctrl', 'L'], description: 'Inserir hiperlink no trecho de texto', category: 'widgets' },

  // Navegação, Minimapa & Visualização
  { keys: ['M'], description: 'Mostrar ou ocultar Minimapa interativo', category: 'navigation' },
  { keys: ['Ctrl', 'F'], description: 'Buscar textos, post-its e cards no quadro', category: 'navigation' },
  { keys: ['Espaço', 'Arrastar'], description: 'Arrastar e navegar pelo canvas', category: 'navigation' },
  { keys: ['Botão Meio', 'Arrastar'], description: 'Navegar livremente pelo canvas (Pan)', category: 'navigation' },
  { keys: ['Ctrl', 'Scroll'], description: 'Zoom suave ancorado no cursor', category: 'navigation' },
  { keys: ['Setas'], description: 'Mover itens selecionados em 1px', category: 'navigation' },
  { keys: ['Shift', 'Setas'], description: 'Mover itens selecionados em 10px', category: 'navigation' },
  { keys: ['+'], description: 'Aumentar Zoom do quadro', category: 'navigation' },
  { keys: ['-'], description: 'Diminuir Zoom do quadro', category: 'navigation' },
  { keys: ['Ctrl', '0'], description: 'Redefinir Zoom para 100%', category: 'navigation' },
  { keys: ['Ctrl', "'"], description: 'Mostrar ou ocultar grade do canvas', category: 'navigation' },
  { keys: ['Shift', 'G'], description: 'Alternar grade do canvas', category: 'navigation' },
  { keys: ['Shift', 'S'], description: 'Alternar guias inteligentes e encaixe magnético', category: 'navigation' },
  { keys: ['Ctrl', ';'], description: 'Alternar guias inteligentes (alternativo)', category: 'navigation' },
  { keys: ['Ctrl', '(segurar)'], description: 'Ignorar temporariamente o ímã ao arrastar', category: 'navigation' },
  { keys: ['←', '→'], description: 'Navegar entre molduras no Modo Apresentação', category: 'navigation' },

  // Histórico
  { keys: ['Ctrl', 'Z'], description: 'Desfazer última alteração', category: 'history' },
  { keys: ['Ctrl', 'Y'], description: 'Refazer alteração', category: 'history' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Refazer alteração (alternativo)', category: 'history' },

  // Geral
  { keys: ['Ctrl', 'K'], description: 'Abrir Paleta de Comandos (Spotlight)', category: 'general' },
  { keys: ['?'], description: 'Abrir este menu de atalhos', category: 'general' },
  { keys: ['Shift', '/'], description: 'Abrir atalhos de teclado', category: 'general' },
];

const CATEGORY_NAMES: Record<ShortcutCategory, string> = {
  tools: 'Ferramentas de Criação',
  edit: 'Edição, Grupos & Alinhamento',
  widgets: 'Texto, Kanban, Mapa Mental & Código',
  navigation: 'Navegação, Minimapa & Zoom',
  history: 'Histórico de Ações',
  general: 'Geral & Ajuda',
};

const CATEGORY_FILTER_PILLS: Array<{ id: 'all' | ShortcutCategory; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'tools', label: 'Ferramentas' },
  { id: 'edit', label: 'Edição' },
  { id: 'widgets', label: 'Widgets & Texto' },
  { id: 'navigation', label: 'Navegação' },
  { id: 'history', label: 'Histórico' },
  { id: 'general', label: 'Geral' },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | ShortcutCategory>('all');

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  const formatKey = (key: string) => {
    if (key === 'Ctrl') return isMac ? '⌘' : 'Ctrl';
    if (key === 'Shift') return isMac ? '⇧' : 'Shift';
    if (key === 'Alt') return isMac ? '⌥' : 'Alt';
    return key;
  };

  const filteredShortcuts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SHORTCUTS.filter((s) => {
      if (activeCategory !== 'all' && s.category !== activeCategory) {
        return false;
      }
      if (!q) return true;
      return (
        s.description.toLowerCase().includes(q) ||
        s.keys.some((k) => k.toLowerCase().includes(q)) ||
        CATEGORY_NAMES[s.category]?.toLowerCase().includes(q)
      );
    });
  }, [search, activeCategory]);

  // Agrupa atalhos por categoria
  const grouped = useMemo(() => {
    const map: Partial<Record<ShortcutCategory, ShortcutItem[]>> = {};
    for (const item of filteredShortcuts) {
      if (!map[item.category]) map[item.category] = [];
      map[item.category]!.push(item);
    }
    return map;
  }, [filteredShortcuts]);

  return (
    <ResponsiveModalRoot open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="sm:max-w-[660px] max-h-[85vh] overflow-hidden flex flex-col p-0 rounded-2xl shadow-2xl border-border bg-card">
        {/* Cabeçalho */}
        <div className="p-5 pb-3.5 border-b border-border flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 pr-8">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <Keyboard className="size-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base font-bold text-foreground">
                    Atalhos do Teclado
                  </DialogTitle>
                  <Badge variant="secondary" className="text-[10px] font-mono tabular-nums px-1.5 py-0">
                    {filteredShortcuts.length}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  Comandos rápidos para criação, agrupamento, navegação e colaboração.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Pesquisar atalho por ação, ferramenta ou tecla (ex: minimapa, agrupar, M)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 pr-8 text-xs bg-muted/40 rounded-lg border-border"
              autoFocus={false}
            />
            {search && (
              <button
                type="button"
                aria-label="Limpar busca de atalhos"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Filtros Rápidos por Categoria */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
            {CATEGORY_FILTER_PILLS.map((pill) => {
              const isSelected = activeCategory === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setActiveCategory(pill.id)}
                  className={cn(
                    'h-6 px-2.5 rounded-lg text-[11px] font-medium shrink-0 transition-[transform,background-color,color,border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer border',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-2xs'
                      : 'bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground'
                  )}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista Rolável de Atalhos Agrupados */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 custom-scrollbar">
          {Object.keys(grouped).length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Nenhum atalho encontrado para "{search}"
            </div>
          ) : (
            (Object.entries(grouped) as Array<[ShortcutCategory, ShortcutItem[]]>).map(
              ([category, items]) => (
                <div key={category} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {CATEGORY_NAMES[category] || category}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/70 tabular-nums">
                      {items.length} {items.length === 1 ? 'atalho' : 'atalhos'}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-background/50 divide-y divide-border/60 overflow-hidden">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 px-3.5 py-2 text-xs hover:bg-muted/30 transition-colors"
                      >
                        <span className="text-foreground font-medium">
                          {item.description}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          {item.keys.map((k, kIdx) => (
                            <React.Fragment key={kIdx}>
                              {kIdx > 0 && (
                                <span className="text-[10px] text-muted-foreground/60 select-none">
                                  +
                                </span>
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
              )
            )
          )}
        </div>

        {/* Rodapé Informativo */}
        <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            Pressione{' '}
            <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px] font-bold">
              ?
            </kbd>{' '}
            em qualquer lugar do quadro para abrir
          </span>
          <span className="font-mono text-[10px]">Mirio Whiteboard</span>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModalRoot>
  );
};
