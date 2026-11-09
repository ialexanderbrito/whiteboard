import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Globe, ExternalLink, Copy, Check, Trash2, Edit3 } from 'lucide-react';
import type { CanvasElement } from '../../types/element';
import { extractAllLinks, getDomainFromUrl } from '../../utils/textLinks';
import { Button } from '@/components/ui/button';
import {
  getViewport,
  subscribeViewport,
  type ViewportState,
} from '../../utils/viewport';

interface ElementLinkBalloonProps {
  element: CanvasElement;
  scale: number;
  stagePos: { x: number; y: number };
  canEdit?: boolean;
  onEditLink?: (url: string) => void;
  onRemoveLink?: (url: string) => void;
}

/**
 * Balão de Hiperlink Flutuante Estilo Miro
 * Aparece associado ao elemento selecionado sem poluir o texto com sintaxe Markdown.
 */
export const ElementLinkBalloon: React.FC<ElementLinkBalloonProps> = ({
  element,
  scale,
  stagePos,
  canEdit = true,
  onEditLink,
  onRemoveLink,
}) => {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const balloonRef = useRef<HTMLDivElement>(null);

  // Posiciona direto no DOM: pan/zoom não deve re-renderizar o balão nem seus botões.
  const placeBalloon = useCallback((viewport: ViewportState) => {
    const node = balloonRef.current;
    if (!node) return;

    const elemWidth = (element.width || (element.radius ? element.radius * 2 : 180)) * viewport.scale;
    const textHeight = (element.fontSize || 20) * 1.2;
    const elemHeight = (
      element.height ||
      (element.type === 'text' ? textHeight : element.radius ? element.radius * 2 : 180)
    ) * viewport.scale;

    const rawX = element.type === 'circle' && element.radius ? element.x - element.radius : element.x;
    const rawY = element.type === 'circle' && element.radius ? element.y - element.radius : element.y;

    const screenX = rawX * viewport.scale + viewport.x;
    const screenY = rawY * viewport.scale + viewport.y;

    const isSticky = element.type === 'sticky';
    const isNearBottom =
      screenY + elemHeight + (isSticky ? 90 : 60) >
      (typeof window !== 'undefined' ? window.innerHeight : 800);
    const balloonTop = isNearBottom
      ? Math.max(60, screenY - 48)
      : isSticky
      ? screenY + elemHeight + 46
      : screenY + elemHeight + 10;

    node.style.left = `${screenX + elemWidth / 2}px`;
    node.style.top = `${balloonTop}px`;
  }, [element]);

  useEffect(() => {
    placeBalloon(getViewport());
    return subscribeViewport(placeBalloon);
  }, [placeBalloon]);

  const links = extractAllLinks(element.text, element.linkUrl, element.links);
  if (links.length === 0) return null;

  // Posição inicial a partir do viewport já comprometido (evita salto no primeiro paint).
  const elemWidth = (element.width || (element.radius ? element.radius * 2 : 180)) * scale;
  const textHeight = (element.fontSize || 20) * 1.2;
  const elemHeight = (
    element.height ||
    (element.type === 'text' ? textHeight : element.radius ? element.radius * 2 : 180)
  ) * scale;

  const rawX = element.type === 'circle' && element.radius ? element.x - element.radius : element.x;
  const rawY = element.type === 'circle' && element.radius ? element.y - element.radius : element.y;

  const screenX = rawX * scale + stagePos.x;
  const screenY = rawY * scale + stagePos.y;

  const isSticky = element.type === 'sticky';
  const isNearBottom = screenY + elemHeight + (isSticky ? 90 : 60) > (typeof window !== 'undefined' ? window.innerHeight : 800);
  const balloonTop = isNearBottom
    ? Math.max(60, screenY - 48)
    : isSticky
    ? screenY + elemHeight + 46
    : screenY + elemHeight + 10;
  const balloonCenterX = screenX + elemWidth / 2;

  const handleCopy = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleOpen = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    links.forEach((l) => window.open(l.url, '_blank', 'noopener,noreferrer'));
  };

  return (
    <div
      ref={balloonRef}
      className="absolute z-40 transform -translate-x-1/2 pointer-events-auto select-none animate-in fade-in-0 zoom-in-95 duration-150"
      style={{
        left: `${balloonCenterX}px`,
        top: `${balloonTop}px`,
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {links.length === 1 ? (
        /* Balão Pílula Simples para 1 Link (Miro Standard) */
        <div className="flex items-center gap-2 px-3 py-1.5 bg-popover/95 text-popover-foreground backdrop-blur-md rounded-full shadow-lg border border-border/80 text-xs">
          <Globe className="size-3.5 text-blue-500 shrink-0" />
          
          <button
            type="button"
            onClick={(e) => handleOpen(links[0].url, e)}
            className="flex items-center gap-1.5 min-w-0 max-w-[200px] text-left hover:underline group"
            title={`Abrir ${links[0].url}`}
          >
            <span className="font-semibold text-foreground truncate text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400">
              {links[0].label || getDomainFromUrl(links[0].url)}
            </span>
            {links[0].label && (
              <span className="text-[10px] text-muted-foreground font-mono truncate">
                ({getDomainFromUrl(links[0].url)})
              </span>
            )}
          </button>

          <div className="flex items-center gap-1 shrink-0 ml-1">
            <Button
              size="sm"
              variant="default"
              onClick={(e) => handleOpen(links[0].url, e)}
              className="h-6 px-2.5 text-[11px] font-semibold gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xs"
              title="Abrir página em nova aba"
            >
              <span>Abrir</span>
              <ExternalLink className="size-3" />
            </Button>

            <Button
              size="icon-sm"
              variant="ghost"
              onClick={(e) => handleCopy(links[0].url, e)}
              className="size-6 rounded-full text-muted-foreground hover:text-foreground"
              title="Copiar URL"
            >
              {copiedUrl === links[0].url ? (
                <Check className="size-3 text-emerald-500" />
              ) : (
                <Copy className="size-3" />
              )}
            </Button>

            {canEdit && onEditLink && (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditLink(links[0].url);
                }}
                className="size-6 rounded-full text-muted-foreground hover:text-foreground"
                title="Editar link"
              >
                <Edit3 className="size-3" />
              </Button>
            )}

            {canEdit && onRemoveLink && (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveLink(links[0].url);
                }}
                className="size-6 rounded-full text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                title="Remover link"
              >
                <Trash2 className="size-3" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Balão Card para Múltiplos Links */
        <div className="flex flex-col gap-1.5 p-2 bg-popover/95 text-popover-foreground backdrop-blur-md rounded-xl shadow-xl border border-border/80 text-xs min-w-[280px] max-w-[380px]">
          <div className="flex items-center justify-between px-1.5 pb-1 border-b border-border/60">
            <div className="flex items-center gap-1.5 font-semibold text-[11px] text-foreground">
              <Globe className="size-3.5 text-blue-500" />
              <span>Links no elemento ({links.length})</span>
            </div>
            <button
              type="button"
              onClick={handleOpenAll}
              className="text-[10px] text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-0.5"
            >
              <span>Abrir todos</span>
              <ExternalLink className="size-2.5" />
            </button>
          </div>

          <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
            {links.map((linkItem, idx) => (
              <div
                key={`${linkItem.url}-${idx}`}
                className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Globe className="size-3 text-muted-foreground group-hover:text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-foreground truncate leading-tight">
                      {linkItem.label || getDomainFromUrl(linkItem.url)}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate leading-tight">
                      {getDomainFromUrl(linkItem.url)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={(e) => handleOpen(linkItem.url, e)}
                    className="h-6 px-2 text-[10px] font-semibold gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                  >
                    <span>Abrir</span>
                    <ExternalLink className="size-2.5" />
                  </Button>

                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={(e) => handleCopy(linkItem.url, e)}
                    className="size-6 rounded-md text-muted-foreground hover:text-foreground"
                    title="Copiar URL"
                  >
                    {copiedUrl === linkItem.url ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </Button>

                  {canEdit && onEditLink && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditLink(linkItem.url);
                      }}
                      className="size-6 rounded-md text-muted-foreground hover:text-foreground"
                      title="Editar link"
                    >
                      <Edit3 className="size-3" />
                    </Button>
                  )}

                  {canEdit && onRemoveLink && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveLink(linkItem.url);
                      }}
                      className="size-6 rounded-md text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                      title="Remover link"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
