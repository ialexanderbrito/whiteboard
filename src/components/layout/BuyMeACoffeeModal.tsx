import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { Coffee, Copy, Check, QrCode } from '@/components/ui/icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generatePixPayload } from '@/utils/pix';

const PIX_KEY = 'pix@ialexanderbrito.dev';

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
      variant="outline"
      size="sm"
      className={`group h-8 gap-2 px-2.5 text-xs font-medium rounded-lg border-border/80 bg-background/80 dark:bg-card/80 backdrop-blur-md shadow-2xs hover:bg-muted/80 active:scale-[0.97] transition-all duration-150 cursor-pointer ${className || ''}`}
    >
      <div className="flex size-4 items-center justify-center rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform duration-150">
        <Coffee className="size-3" />
      </div>
      <span className="text-foreground">Apoiar</span>
      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        PIX
      </span>
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          {trigger || defaultTrigger}
        </DialogTrigger>
      )}

      <DialogContent className="max-w-[320px] p-5 gap-3.5">
        <DialogHeader className="text-center sm:text-center items-center space-y-1">
          <div className="flex size-8 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-0.5 shadow-2xs">
            <Coffee className="size-4" />
          </div>
          <DialogTitle className="text-sm font-semibold tracking-tight text-foreground">
            Apoiar o Mirio via PIX
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-normal">
            Ajude a manter os servidores ativos e o projeto em evolução contínua.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Segmented Control Minimalista (Emil Kowalski) */}
          <div className="grid grid-cols-4 gap-1 p-0.5 bg-muted/60 rounded-lg border border-border/70">
            {PRESETS.map(({ label, value }) => {
              const isSelected = isCustomMode ? value === undefined : amount === value;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleSelectPreset(value)}
                  className={`h-7 text-xs font-medium rounded-md transition-all duration-150 active:scale-[0.97] cursor-pointer ${
                    isSelected
                      ? 'bg-background text-foreground shadow-2xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Input de Valor Livre quando ativo */}
          {isCustomMode && (
            <div className="flex items-center gap-1.5 max-w-[130px] mx-auto animate-in fade-in-0 duration-150">
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

            <p className="text-[11px] font-mono text-muted-foreground text-center mt-2">
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
            className="w-full h-8 text-xs font-medium gap-1.5 shadow-2xs active:scale-[0.97] transition-all duration-150 cursor-pointer"
          >
            {copiedPayload ? (
              <>
                <Check className="size-3.5 text-emerald-500 stroke-[2.5]" />
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
      </DialogContent>
    </Dialog>
  );
};
