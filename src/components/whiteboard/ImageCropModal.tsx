import React, { useState, useRef } from 'react';
import { Check, Crop, RotateCcw } from '@/components/ui/icons';
import {
  ResponsiveModalRoot,
  ResponsiveModalContent,
} from '@/components/ui/responsive-modal';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { CanvasElement, NormalizedImageCrop } from '../../types/element';
import {
  FULL_IMAGE_CROP,
  clampNormalizedCrop,
  computeAspectPresetCrop,
} from '../../utils/imageCrop';

interface ImageCropModalProps {
  open: boolean;
  element: CanvasElement | null;
  onOpenChange: (open: boolean) => void;
  onApplyCrop: (elementId: string, crop: NormalizedImageCrop | undefined, newDims?: { width: number; height: number }) => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  open,
  element,
  onOpenChange,
  onApplyCrop,
}) => {
  const [prevElemId, setPrevElemId] = useState<string | undefined>(element?.id);
  const [crop, setCrop] = useState<NormalizedImageCrop>(
    () => element?.crop ? clampNormalizedCrop(element.crop) : { ...FULL_IMAGE_CROP }
  );
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number }>({ w: 400, h: 300 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    mode: 'move' | 'nw' | 'ne' | 'sw' | 'se';
    startClientX: number;
    startClientY: number;
    initialCrop: NormalizedImageCrop;
  } | null>(null);

  if (element?.id !== prevElemId) {
    setPrevElemId(element?.id);
    setCrop(element?.crop ? clampNormalizedCrop(element.crop) : { ...FULL_IMAGE_CROP });
  }

  if (!element || !element.src) return null;

  const handlePointerDown = (
    mode: 'move' | 'nw' | 'ne' | 'sw' | 'se',
    e: React.PointerEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStateRef.current = {
      mode,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialCrop: { ...crop },
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragStateRef.current;
    const box = containerRef.current?.getBoundingClientRect();
    if (!drag || !box || box.width <= 0 || box.height <= 0) return;

    const dx = (e.clientX - drag.startClientX) / box.width;
    const dy = (e.clientY - drag.startClientY) / box.height;
    const init = drag.initialCrop;

    if (drag.mode === 'move') {
      setCrop(
        clampNormalizedCrop({
          x: init.x + dx,
          y: init.y + dy,
          width: init.width,
          height: init.height,
        })
      );
      return;
    }

    let left = init.x;
    let top = init.y;
    let right = init.x + init.width;
    let bottom = init.y + init.height;

    if (drag.mode === 'nw' || drag.mode === 'sw') {
      left = Math.max(0, Math.min(right - 0.08, init.x + dx));
    }
    if (drag.mode === 'ne' || drag.mode === 'se') {
      right = Math.min(1, Math.max(left + 0.08, init.x + init.width + dx));
    }
    if (drag.mode === 'nw' || drag.mode === 'ne') {
      top = Math.max(0, Math.min(bottom - 0.08, init.y + dy));
    }
    if (drag.mode === 'sw' || drag.mode === 'se') {
      bottom = Math.min(1, Math.max(top + 0.08, init.y + init.height + dy));
    }

    setCrop(
      clampNormalizedCrop({
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
      })
    );
  };

  const handlePointerUp = () => {
    dragStateRef.current = null;
  };

  const handleSave = () => {
    const safe = clampNormalizedCrop(crop);
    const isFull =
      safe.x < 0.003 &&
      safe.y < 0.003 &&
      safe.width > 0.994 &&
      safe.height > 0.994;

    const baseW = element.width || 240;
    const croppedAspect =
      (safe.width * naturalSize.w) / Math.max(1, safe.height * naturalSize.h);
    const nextHeight = Math.max(48, Math.round(baseW / Math.max(0.2, croppedAspect)));

    onApplyCrop(element.id, isFull ? undefined : safe, {
      width: baseW,
      height: nextHeight,
    });
    onOpenChange(false);
  };

  return (
    <ResponsiveModalRoot open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="sm:max-w-lg p-5 gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Crop className="size-4" />
            <span>Recortar Imagem</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Arraste os cantos ou escolha uma proporção rápida. O recorte é não-destrutivo e pode ser redefinido a qualquer momento.
          </DialogDescription>
        </DialogHeader>

        {/* Área interativa de recorte */}
        <div className="flex items-center justify-center bg-muted/40 rounded-xl p-3 border border-border/60 select-none overflow-hidden">
          <div
            ref={containerRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative inline-block max-h-[320px] max-w-full touch-none"
          >
            <img
              src={element.src}
              alt={element.alt || 'Imagem para recorte'}
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                }
              }}
              className="max-h-[300px] w-auto object-contain block pointer-events-none opacity-45 rounded"
            />

            {/* Janela ativa do recorte */}
            <div
              onPointerDown={(e) => handlePointerDown('move', e)}
              style={{
                left: `${crop.x * 100}%`,
                top: `${crop.y * 100}%`,
                width: `${crop.width * 100}%`,
                height: `${crop.height * 100}%`,
              }}
              className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.42)] cursor-move"
            >
              {/* Alças de canto */}
              {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
                <div
                  key={corner}
                  onPointerDown={(e) => handlePointerDown(corner, e)}
                  className={`absolute size-3.5 bg-white border border-slate-900 rounded-xs shadow-sm ${
                    corner === 'nw'
                      ? '-top-1.5 -left-1.5 cursor-nwse-resize'
                      : corner === 'ne'
                        ? '-top-1.5 -right-1.5 cursor-nesw-resize'
                        : corner === 'sw'
                          ? '-bottom-1.5 -left-1.5 cursor-nesw-resize'
                          : '-bottom-1.5 -right-1.5 cursor-nwse-resize'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Presets rápidos de proporção */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {[
              { label: 'Original', ratio: null },
              { label: '1:1', ratio: 1 },
              { label: '16:9', ratio: 16 / 9 },
              { label: '4:3', ratio: 4 / 3 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  setCrop(
                    preset.ratio === null
                      ? { ...FULL_IMAGE_CROP }
                      : computeAspectPresetCrop(naturalSize.w, naturalSize.h, preset.ratio)
                  )
                }
                className="px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted transition-colors cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCrop({ ...FULL_IMAGE_CROP })}
            className="h-8 text-xs gap-1"
          >
            <RotateCcw className="size-3.5" />
            <span>Redefinir</span>
          </Button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={handleSave} className="gap-1.5">
            <Check className="size-3.5" />
            <span>Aplicar recorte</span>
          </Button>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModalRoot>
  );
};
