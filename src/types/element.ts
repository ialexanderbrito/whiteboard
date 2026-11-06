export type ElementType = 'sticky' | 'rect' | 'circle' | 'text' | 'arrow' | 'line' | 'pen';

export type ToolType = 'select' | 'sticky' | 'rect' | 'circle' | 'text' | 'arrow' | 'line' | 'pen' | 'pan';

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;          // For circles
  fill?: string;            // Fill color (post-it background, shape fill, text color)
  stroke?: string;          // Stroke border or line color
  strokeWidth?: number;     // Border or pen line width
  text?: string;            // Text for sticky notes and text blocks
  fontSize?: number;        // Font size for text
  points?: number[];        // Points [x1, y1, x2, y2, ...] for lines, arrows, freehand
  rotation?: number;
  zIndex: number;
  updatedBy: string;
  updatedByName?: string;
  updatedAt: number;
}
