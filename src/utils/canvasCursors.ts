import type { ToolType } from '../types/element';

/**
 * Utilitário para gerar cursores SVG personalizados com pontas e vértices
 * suavemente arredondados e alta legibilidade (Figma / Miro style) para o whiteboard.
 */

function encodeSvg(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export function getCustomCanvasCursor(
  tool: ToolType,
  color: string = '#0f172a',
  penMode: 'pen' | 'highlighter' | 'eraser' = 'pen'
): string {
  // 1. Apontador Laser: oculta o ponteiro do sistema para exibir exclusivamente o ponto neon e o rastro do canvas
  if (tool === 'laser') {
    return 'none';
  }

  // 2. Borracha (círculo pontilhado de precisão cirúrgica com centro vermelho e guias de alinhamento)
  if (tool === 'eraser' || (tool === 'pen' && penMode === 'eraser')) {
    const svg = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g filter="drop-shadow(0px 1px 2.5px rgba(0,0,0,0.35))">
          <circle cx="12" cy="12" r="9" stroke="#0f172a" stroke-width="1.6" stroke-dasharray="3 3" stroke-linecap="round" fill="#ffffff" fill-opacity="0.3"/>
          <circle cx="12" cy="12" r="8" stroke="#ffffff" stroke-width="0.9" stroke-dasharray="3 3" stroke-linecap="round" fill="none"/>
          <circle cx="12" cy="12" r="2.2" fill="#ef4444" stroke="#ffffff" stroke-width="0.9"/>
          <line x1="12" y1="2" x2="12" y2="4.5" stroke="#ef4444" stroke-width="1.4" stroke-linecap="round"/>
          <line x1="12" y1="19.5" x2="12" y2="22" stroke="#ef4444" stroke-width="1.4" stroke-linecap="round"/>
          <line x1="2" y1="12" x2="4.5" y2="12" stroke="#ef4444" stroke-width="1.4" stroke-linecap="round"/>
          <line x1="19.5" y1="12" x2="22" y2="12" stroke="#ef4444" stroke-width="1.4" stroke-linecap="round"/>
        </g>
      </svg>
    `;
    return `url("${encodeSvg(svg)}") 12 12, crosshair`;
  }

  // 3. Ferramenta de Texto: 'T' tipográfico em negrito (estilo FigJam / Figma) com alto contraste
  if (tool === 'text') {
    const svg = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g filter="drop-shadow(0px 1.5px 3px rgba(0,0,0,0.45))">
          <path
            d="M 4 3 H 18 C 18.6 3 19 3.4 19 4 V 6.5 C 19 7.1 18.6 7.5 18 7.5 H 13 V 19.5 C 13 20.1 12.6 20.5 12 20.5 H 10 C 9.4 20.5 9 20.1 9 19.5 V 7.5 H 4 C 3.4 7.5 3 7.1 3 6.5 V 4 C 3 3.4 3.4 3 4 3 Z"
            fill="#0f172a"
            stroke="#ffffff"
            stroke-width="1.4"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
        </g>
      </svg>
    `;
    return `url("${encodeSvg(svg)}") 3 3, text`;
  }

  // 4. Marca-texto (ponta chanfrada translúcida com a cor ativa selecionada)
  if (tool === 'highlighter' || (tool === 'pen' && penMode === 'highlighter')) {
    const highlightColor = color === '#ffffff' ? '#eab308' : (color || '#eab308');
    const svg = `
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g filter="drop-shadow(0px 1.5px 3px rgba(0,0,0,0.3))">
          <path d="M5 24L10 19L17 22L12 27L5 24Z" fill="${highlightColor}" fill-opacity="0.9" stroke="#1e293b" stroke-width="1.2" stroke-linejoin="round"/>
          <path d="M10 19L20 8L24 12L14 23L10 19Z" fill="#f8fafc" stroke="#1e293b" stroke-width="1.2" stroke-linejoin="round"/>
          <path d="M20 8L22 6C22.6 5.4 23.4 5.4 24 6L25 7C25.6 7.6 25.6 8.4 25 9L23 11L20 8Z" fill="${highlightColor}" stroke="#1e293b" stroke-width="1.2" stroke-linejoin="round"/>
          <circle cx="4" cy="25" r="2.8" fill="${highlightColor}" stroke="#ffffff" stroke-width="1.2"/>
        </g>
      </svg>
    `;
    return `url("${encodeSvg(svg)}") 4 25, crosshair`;
  }

  // 5. Caneta de Desenho Livre (estilete de alta precisão com cor ativa na ponta e gota de tinta)
  if (tool === 'pen') {
    const penColor = color || '#0f172a';
    const svg = `
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g filter="drop-shadow(0px 1.5px 3px rgba(0,0,0,0.32))">
          <path d="M 3.2 3.2 Q 2 2 4 6 L 8.5 10.5 L 11 8 L 6.5 3.5 Q 4.5 2 3.2 3.2 Z" fill="${penColor}" stroke="#ffffff" stroke-width="1" stroke-linejoin="round" stroke-linecap="round"/>
          <path d="M 8.5 10.5 L 18 20 C 18.6 20.6 19.6 20.6 20.2 20 L 21 19.2 C 21.6 18.6 21.6 17.6 21 17 L 11.5 7.5 L 8.5 10.5 Z" fill="#1e293b" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/>
          <circle cx="2.5" cy="2.5" r="2" fill="${penColor}" stroke="#ffffff" stroke-width="1"/>
        </g>
      </svg>
    `;
    return `url("${encodeSvg(svg)}") 2 2, crosshair`;
  }

  // 6. Post-it / Sticky Note (mini card com cantos suaves arredondados e cor ativa)
  if (tool === 'sticky') {
    const stickyFill = color || '#fef08a';
    const svg = `
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.25))">
          <path d="M 5 4 H 19 Q 21 4 21 6 V 16 L 16 21 H 7 Q 5 21 5 19 V 6 Q 5 4 7 4 Z" fill="${stickyFill}" stroke="#334155" stroke-width="1.2" stroke-linejoin="round"/>
          <path d="M 16 16 H 20 L 16 20 V 16 Z" fill="#000000" fill-opacity="0.18" stroke="#334155" stroke-width="1.2" stroke-linejoin="round"/>
          <line x1="8" y1="8" x2="16" y2="8" stroke="#475569" stroke-width="1.4" stroke-linecap="round"/>
          <line x1="8" y1="12" x2="14" y2="12" stroke="#475569" stroke-width="1.4" stroke-linecap="round"/>
        </g>
        <circle cx="3" cy="3" r="2.8" fill="#3b82f6" stroke="#ffffff" stroke-width="1.2"/>
      </svg>
    `;
    return `url("${encodeSvg(svg)}") 3 3, default`;
  }

  // 7. Formas Geométricas (mira central com terminações arredondadas e ícone geométrico suave)
  if (['rect', 'circle', 'diamond', 'triangle', 'star'].includes(tool)) {
    let shapePath = '';
    if (tool === 'rect') {
      shapePath = `<rect x="14" y="14" width="10" height="8" rx="2" fill="#3b82f6" fill-opacity="0.35" stroke="#3b82f6" stroke-width="1.5" stroke-linejoin="round"/>`;
    } else if (tool === 'circle') {
      shapePath = `<circle cx="19" cy="18" r="5" fill="#3b82f6" fill-opacity="0.35" stroke="#3b82f6" stroke-width="1.5"/>`;
    } else if (tool === 'diamond') {
      shapePath = `<path d="M19 13.5L23.5 18L19 22.5L14.5 18Z" fill="#3b82f6" fill-opacity="0.35" stroke="#3b82f6" stroke-width="1.5" stroke-linejoin="round"/>`;
    } else if (tool === 'triangle') {
      shapePath = `<path d="M19 13.5L23.5 21.5H14.5Z" fill="#3b82f6" fill-opacity="0.35" stroke="#3b82f6" stroke-width="1.5" stroke-linejoin="round"/>`;
    } else {
      shapePath = `<path d="M19 13L20.2 16.5H24L21 18.7L22.2 22.2L19 20L15.8 22.2L17 18.7L14 16.5H17.8Z" fill="#3b82f6" fill-opacity="0.35" stroke="#3b82f6" stroke-width="1.2" stroke-linejoin="round"/>`;
    }

    const svg = `
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="10" y1="2" x2="10" y2="18" stroke="#1e293b" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="2" y1="10" x2="18" y2="10" stroke="#1e293b" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="10" y1="3" x2="10" y2="17" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round"/>
        <line x1="3" y1="10" x2="17" y2="10" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round"/>
        ${shapePath}
      </svg>
    `;
    return `url("${encodeSvg(svg)}") 10 10, crosshair`;
  }

  // 8. Seta / Conector (terminações arredondadas e nó circular suave)
  if (tool === 'arrow' || tool === 'line') {
    const svg = `
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4L18 18M18 18H11M18 18V11" stroke="#0f172a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M4 4L18 18M18 18H11M18 18V11" stroke="#ffffff" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="4" cy="4" r="2.8" fill="#3b82f6" stroke="#ffffff" stroke-width="1.2"/>
      </svg>
    `;
    return `url("${encodeSvg(svg)}") 4 4, crosshair`;
  }

  // 9. Moldura / Frame (Mira de canto de prancheta com vértices suaves)
  if (tool === 'frame') {
    const svg = `
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 11V5C4 4.5 4.5 4 5 4H11M22 11V5C22 4.5 21.5 4 21 4H15M4 15V21C4 21.5 4.5 22 5 22H11M22 15V21C22 21.5 21.5 22 21 22H15" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="13" cy="13" r="1.8" fill="#3b82f6"/>
      </svg>
    `;
    return `url("${encodeSvg(svg)}") 13 13, crosshair`;
  }

  // 10. Pan / Navegação
  if (tool === 'pan') {
    return 'grab';
  }

  // 11. Seleção Padrão (Vetor de Precisão com Pontas e Vértices Suavemente Arredondados)
  const selectSvg = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g filter="drop-shadow(0px 1.5px 3px rgba(0,0,0,0.35))">
        <path
          d="M 1.50 5.00 Q 1.50 1.50 4.35 3.53 L 13.47 10.05 Q 15.50 11.50 13.00 11.50 L 11.00 11.50 Q 8.50 11.50 6.73 13.27 L 3.27 16.73 Q 1.50 18.50 1.50 16.00 Z"
          fill="#0f172a"
          stroke="#ffffff"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>
    </svg>
  `;
  return `url("${encodeSvg(selectSvg)}") 2 2, default`;
}
