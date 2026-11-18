export type ElementType =
  | 'sticky'
  | 'checklist'
  | 'rect'
  | 'circle'
  | 'diamond'
  | 'triangle'
  | 'star'
  | 'hexagon'
  | 'cylinder'
  | 'text'
  | 'arrow'
  | 'line'
  | 'pen'
  | 'frame'
  | 'sticker'
  | 'gif'
  | 'comment'
  | 'table'
  | 'kanban'
  | 'code'
  | 'embed';

export type ToolType =
  | 'select'
  | 'sticky'
  | 'checklist'
  | 'rect'
  | 'circle'
  | 'diamond'
  | 'triangle'
  | 'star'
  | 'hexagon'
  | 'cylinder'
  | 'text'
  | 'arrow'
  | 'line'
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'laser'
  | 'pan'
  | 'frame'
  | 'comment'
  | 'table'
  | 'kanban'
  | 'mindmap'
  | 'code';

export const GEOMETRIC_SHAPE_TYPES: readonly ElementType[] = [
  'rect',
  'circle',
  'diamond',
  'triangle',
  'star',
  'hexagon',
  'cylinder',
] as const;

export const isGeometricShape = (type: string): boolean =>
  GEOMETRIC_SHAPE_TYPES.includes(type as ElementType);

/**
 * Item individual de um Micro-Widget de Checklist
 */
export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

/**
 * Resposta individual em uma Thread de Comentário Fixado no Canvas
 */
export interface CommentReply {
  id: string;
  authorId: string;
  authorName: string;
  authorColor?: string;
  text: string;
  createdAt: number;
}

/**
 * Cartão individual e Coluna de um Quadro Kanban Nativo
 */
export interface KanbanCardItem {
  id: string;
  title: string;
  tag?: string;
  color?: string;
  completed?: boolean;
}

export interface KanbanColumnItem {
  id: string;
  title: string;
  color?: string;
  cards: KanbanCardItem[];
}

/**
 * Recorte normalizado [0..1] não-destrutivo para imagens e prints colados no canvas
 */
export interface NormalizedImageCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type RichEmbedProvider =
  | 'github'
  | 'figma'
  | 'youtube'
  | 'jira'
  | 'linear'
  | 'notion'
  | 'docs'
  | 'web';

/**
 * Run de texto rico: permite formatar trechos independentes (letra, palavra ou frase)
 * sem depender da formatação global do elemento.
 */
export interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  color?: string;
  url?: string;
}

export type ConnectionSide = 'top' | 'right' | 'bottom' | 'left' | 'auto';

export interface ElementBinding {
  elementId: string;
  side?: ConnectionSide;
}

export type ConnectorStyle = 'straight' | 'curved' | 'orthogonal';

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;          // Para círculos
  fill?: string;            // Cor de preenchimento (post-it, formas, moldura)
  stroke?: string;          // Cor de borda ou traço
  strokeWidth?: number;     // Espessura da borda ou caneta
  dash?: number[];          // Padrão de tracejado [dash, gap] ou [] para contínuo
  opacity?: number;         // Opacidade (ex: marca-texto)
  text?: string;            // Texto de post-it, blocos de texto, código, comentário inicial ou título de moldura
  fontSize?: number;        // Tamanho da fonte
  points?: number[];        // Pontos [x1, y1, x2, y2, ...] para setas, linhas e desenho livre
  rotation?: number;
  zIndex: number;
  updatedBy: string;
  updatedByName?: string;
  updatedAt: number;

  // Reações no elemento (mapa de emoji -> lista de IDs dos usuários que reagiram)
  reactions?: Record<string, string[]>;

  // Atributos de Sticker / GIF / Imagem recortável
  src?: string;
  alt?: string;
  crop?: NormalizedImageCrop;

  // Bloqueio e agrupamento lógico do elemento
  locked?: boolean;
  groupId?: string;

  // Atributos de Checklist (Micro-Widget Vivo)
  checklistTitle?: string;
  checklistItems?: ChecklistItem[];

  // Atributos de Comentários Fixados em Thread (Pinned Comments)
  commentAuthorColor?: string;
  commentResolved?: boolean;
  commentReplies?: CommentReply[];
  attachedElementId?: string;

  // Atributos de Tabela Editável (Grid Nativo)
  tableData?: string[][];
  tableColWidths?: number[];
  tableHeaderRow?: boolean;

  // Atributos de Quadro Kanban Nativo
  kanbanTitle?: string;
  kanbanColumns?: KanbanColumnItem[];

  // Atributos de Mapa Mental (Mind Map)
  mindmapRootId?: string;
  mindmapParentId?: string;
  mindmapDirection?: 'right' | 'left';

  // Atributos de Bloco de Código / Markdown
  codeLanguage?: string;
  codeTheme?: 'dark' | 'light';

  // Atributos de Card de Link Rico (Unfurl)
  embedProvider?: RichEmbedProvider;
  embedTitle?: string;
  embedDescription?: string;
  embedDomain?: string;
  embedThumbUrl?: string;

  // Formatação tipográfica avançada e hiperlink
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through' | 'underline line-through';
  textAlign?: 'left' | 'center' | 'right';
  textColor?: string;
  linkUrl?: string;
  links?: Array<{ url: string; label?: string; id?: string }>;
  /** Formatação por trecho (texto livre). Quando presente, tem prioridade sobre os campos globais. */
  richText?: TextRun[];

  // Conexões magnéticas (diagramação inteligente estilo Miro/FigJam)
  startBinding?: ElementBinding;
  endBinding?: ElementBinding;
  connectorStyle?: ConnectorStyle;
  startArrowhead?: 'none' | 'arrow';
  endArrowhead?: 'none' | 'arrow';
}
