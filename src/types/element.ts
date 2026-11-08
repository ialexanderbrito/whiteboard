export type ElementType = 
  | 'sticky' 
  | 'rect' 
  | 'circle' 
  | 'diamond'
  | 'triangle'
  | 'star'
  | 'text' 
  | 'arrow' 
  | 'line' 
  | 'pen' 
  | 'frame' 
  | 'sticker' 
  | 'gif';

export type ToolType = 
  | 'select' 
  | 'sticky' 
  | 'rect' 
  | 'circle' 
  | 'diamond'
  | 'triangle'
  | 'star'
  | 'text' 
  | 'arrow' 
  | 'line' 
  | 'pen' 
  | 'highlighter'
  | 'eraser'
  | 'laser'
  | 'pan' 
  | 'frame';

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
  opacity?: number;         // Opacidade (ex: marca-texto)
  text?: string;            // Texto de post-it, blocos de texto ou título de moldura
  fontSize?: number;        // Tamanho da fonte
  points?: number[];        // Pontos [x1, y1, x2, y2, ...] para setas, linhas e desenho livre
  rotation?: number;
  zIndex: number;
  updatedBy: string;
  updatedByName?: string;
  updatedAt: number;

  // Reações no post-it ou sticker (mapa de emoji -> lista de IDs dos usuários que reagiram)
  reactions?: Record<string, string[]>;

  // Atributos de Sticker / GIF
  src?: string;
  alt?: string;

  // Bloqueio do elemento
  locked?: boolean;

  // Formatação tipográfica avançada e hiperlink
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through' | 'underline line-through';
  textAlign?: 'left' | 'center' | 'right';
  textColor?: string;       // Cor personalizada do texto (cards/post-its, formas e texto)
  linkUrl?: string;
  links?: Array<{ url: string; label?: string; id?: string }>;
}
