import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, QrCode } from '@/components/ui/icons';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ResponsiveModalRoot,
  ResponsiveModalContent,
} from '@/components/ui/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { generatePixPayload } from '@/utils/pix';

const PIX_KEY = 'pix@ialexanderbrito.dev';

/**
 * Caneca Stroke Rounded (1.5px, geometria Hugeicons Coffee02) com vapor
 * sutilmente escalonado em dispositivos de ponteiro fino.
 */
const SupportCupIcon: React.FC<{ className?: string; animatedSteam?: boolean }> = ({
  className,
  animatedSteam = false,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className={cn('shrink-0 select-none inline-block align-middle', className)}
  >
    <path
      d="M18.2505 10.5H19.6403C21.4918 10.5 22.0421 10.7655 21.9975 12.0838C21.9237 14.2674 20.939 16.8047 17 17.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M5.94627 20.6145C2.57185 18.02 2.07468 14.3401 2.00143 10.5001C1.96979 8.8413 2.45126 8.5 4.65919 8.5H15.3408C17.5487 8.5 18.0302 8.8413 17.9986 10.5001C17.9253 14.3401 17.4281 18.02 14.0537 20.6145C13.0934 21.3528 12.2831 21.5 10.9194 21.5H9.08064C7.71686 21.5 6.90658 21.3528 5.94627 20.6145Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M7.53971 4C7.53971 4 7 4.5 7 5.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        animatedSteam &&
          'opacity-70 transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover:-translate-y-[1px] [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100'
      )}
    />
    <path
      d="M11.3089 2.5C10.7622 2.83861 10.0012 4 10.0012 5.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        animatedSteam &&
          'opacity-75 transition-[transform,opacity] duration-200 delay-[35ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover:-translate-y-[1.25px] [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100'
      )}
    />
    <path
      d="M14.0012 4C13.7279 4.1693 13.5 5 13.5 5.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        animatedSteam &&
          'opacity-70 transition-[transform,opacity] duration-200 delay-[70ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover:-translate-y-[1px] [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100'
      )}
    />
  </svg>
);

export interface BuyMeACoffeeModalProps {
  trigger?: React.ReactNode;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

const PRESETS = [
  { label: 'R$ 5', value: 5 },
  { label: 'R$ 15', value: 15 },
  { label: 'R$ 30', value: 30 },
  { label: 'Livre', value: undefined },
] as const;

export const BuyMeACoffeeModal: React.FC<BuyMeACoffeeModalProps> = ({
  trigger,
  className,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  hideTrigger = false,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (setControlledOpen || (() => {})) : setInternalOpen;

  const [amount, setAmount] = useState<number | undefined>(15);
  const [customAmountText, setCustomAmountText] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Geração do QR Code dinâmico conforme o valor muda
  useEffect(() => {
    const payload = generatePixPayload({
      pixKey: PIX_KEY,
      amount: amount && amount > 0 ? amount : undefined,
    });

    QRCode.toDataURL(payload, {
      width: 240,
      margin: 1,
      color: {
        dark: '#09090b',
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error('Erro ao gerar QRCode:', err));
  }, [amount]);

  const handleCopyCode = useCallback(async () => {
    try {
      const payload = generatePixPayload({
        pixKey: PIX_KEY,
        amount: amount && amount > 0 ? amount : undefined,
      });
      await navigator.clipboard.writeText(payload);
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
    } catch (e) {
      console.error(e);
    }
  }, [amount]);

  const handleSelectPreset = useCallback((val?: number) => {
    if (val === undefined) {
      setIsCustomMode(true);
      setAmount(undefined);
      setCustomAmountText('');
    } else {
      setIsCustomMode(false);
      setAmount(val);
      setCustomAmountText('');
    }
  }, []);

  const handleCustomChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setCustomAmountText(raw);
    const num = parseFloat(raw);
    if (!isNaN(num) && num > 0) {
      setAmount(num);
    } else {
      setAmount(undefined);
    }
  }, []);

  const defaultTrigger = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label="Apoiar o Projeto Mirio (PIX)"
      className={cn(
        'group h-8 gap-1.5 px-2.5 text-xs font-medium tracking-[-0.01em] rounded-lg border border-border bg-background/80 dark:bg-card/80 backdrop-blur-md shadow-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 hover:border-foreground/20 active:scale-[0.97] transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none cursor-pointer',
        open && 'bg-muted/90 border-foreground/30 text-foreground ring-1 ring-border',
        className
      )}
    >
      <SupportCupIcon className="size-3.5" animatedSteam />
      <span>Apoiar</span>
    </Button>
  );

  return (
    <ResponsiveModalRoot open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              {trigger || defaultTrigger}
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Apoiar o Projeto Mirio (PIX)</TooltipContent>
        </Tooltip>
      )}

      <ResponsiveModalContent className="max-w-[320px] p-5 gap-3.5">
        <DialogHeader className="flex flex-col items-center gap-1 text-center sm:text-center">
          <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground mb-0.5 shadow-2xs">
            <SupportCupIcon className="size-4" />
          </div>
          <DialogTitle className="text-sm font-semibold tracking-tight text-foreground">
            Apoiar o Mirio via PIX
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-normal">
            Ajude a manter os servidores ativos e o projeto em evolução contínua.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* Segmented Control Minimalista (Emil Kowalski) */}
          <div className="grid grid-cols-4 gap-1 p-0.5 bg-muted/60 rounded-lg border border-border/70">
            {PRESETS.map(({ label, value }) => {
              const isSelected = isCustomMode ? value === undefined : amount === value;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleSelectPreset(value)}
                  className={cn(
                    'h-7 text-xs font-medium rounded-md transition-[transform,background-color,color,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] motion-reduce:transition-none cursor-pointer',
                    isSelected
                      ? 'bg-background text-foreground shadow-2xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Input de Valor Livre quando ativo */}
          {isCustomMode && (
            <div className="flex items-center gap-1.5 max-w-[130px] mx-auto animate-in fade-in-0 zoom-in-95 duration-150">
              <span className="text-xs font-mono font-medium text-muted-foreground">R$</span>
              <Input
                type="text"
                autoFocus
                placeholder="0,00"
                value={customAmountText}
                onChange={handleCustomChange}
                className="h-7 text-xs text-center font-mono font-medium bg-background"
              />
            </div>
          )}

          {/* QR Code Container Limpo e Centralizado */}
          <div className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-border/80 bg-muted/20">
            <div className="p-2 bg-white rounded-lg border border-border/60 shadow-2xs">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="QR Code Pix"
                  className="size-36 object-contain select-none"
                />
              ) : (
                <div className="size-36 flex items-center justify-center">
                  <QrCode className="size-7 text-muted-foreground animate-pulse" />
                </div>
              )}
            </div>

            <p className="text-[11px] font-mono text-muted-foreground text-center mt-2 tabular-nums">
              {amount && amount > 0
                ? `R$ ${amount.toFixed(2)}`
                : 'Definir no app bancário'}
            </p>
          </div>

          {/* Botão de Cópia no padrão exato do Mirio (ShareModal / CreateBoardModal) */}
          <Button
            type="button"
            size="sm"
            onClick={handleCopyCode}
            className="w-full h-8 text-xs font-medium gap-1.5 shadow-2xs active:scale-[0.97] transition-[transform,background-color,color,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none cursor-pointer"
          >
            {copiedPayload ? (
              <>
                <Check className="size-3.5 stroke-[2.25] animate-in fade-in-0 zoom-in-95 duration-150" />
                <span>Código copiado!</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span>Copiar código Pix</span>
              </>
            )}
          </Button>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModalRoot>
  );
};
