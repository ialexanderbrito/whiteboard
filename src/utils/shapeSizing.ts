/**
 * Utilitários para dimensionamento e posicionamento interativo de formas geométricas no canvas.
 * Suporta desenho por clique e arraste (Figma / Miro style), tecla Shift para proporção 1:1,
 * e tamanhos padrão centralizados em cliques simples.
 */

export interface ShapeBoundsResult {
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
}

/**
 * Calcula a posição e dimensões de uma forma durante o arraste do cursor.
 * Trata o centro de círculos e os cantos superiores esquerdos de retângulos, losangos, triângulos e estrelas.
 */
export function calculateShapeDragBounds(
  type: string,
  start: { x: number; y: number },
  current: { x: number; y: number },
  isShift: boolean = false
): ShapeBoundsResult {
  const dx = current.x - start.x;
  const dy = current.y - start.y;

  if (type === 'circle') {
    const side = Math.max(Math.abs(dx), Math.abs(dy));
    const r = Math.max(4, Math.round(side / 2));
    const signX = dx >= 0 ? 1 : -1;
    const signY = dy >= 0 ? 1 : -1;
    const minX = signX === 1 ? start.x : start.x - side;
    const minY = signY === 1 ? start.y : start.y - side;
    const cx = Math.round(minX + r);
    const cy = Math.round(minY + r);

    return {
      x: cx,
      y: cy,
      radius: r,
      width: r * 2,
      height: r * 2,
    };
  }

  let w = Math.abs(dx);
  let h = Math.abs(dy);
  let x = Math.min(start.x, current.x);
  let y = Math.min(start.y, current.y);

  if (isShift) {
    const side = Math.max(w, h);
    w = side;
    h = side;
    x = dx >= 0 ? start.x : start.x - side;
    y = dy >= 0 ? start.y : start.y - side;
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(4, Math.round(w)),
    height: Math.max(4, Math.round(h)),
  };
}

/**
 * Retorna as dimensões padrão centralizadas no ponto do clique caso o usuário não arraste.
 */
export function getDefaultShapeBounds(
  type: string,
  center: { x: number; y: number }
): ShapeBoundsResult {
  switch (type) {
    case 'rect':
      return {
        x: Math.round(center.x - 80),
        y: Math.round(center.y - 50),
        width: 160,
        height: 100,
      };
    case 'circle':
      return {
        x: Math.round(center.x),
        y: Math.round(center.y),
        radius: 60,
        width: 120,
        height: 120,
      };
    case 'diamond':
      return {
        x: Math.round(center.x - 70),
        y: Math.round(center.y - 70),
        width: 140,
        height: 140,
      };
    case 'triangle':
      return {
        x: Math.round(center.x - 70),
        y: Math.round(center.y - 65),
        width: 140,
        height: 130,
      };
    case 'star':
    default:
      return {
        x: Math.round(center.x - 65),
        y: Math.round(center.y - 65),
        width: 130,
        height: 130,
      };
  }
}
