import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Coffee, Copy, Check, QrCode } from 'lucide-react';
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

interface BuyMeACoffeeModalProps {
  trigger?: React.ReactNode;
  className?: string;
}

export const BuyMeACoffeeModal: React.FC<BuyMeACoffeeModalProps> = ({ trigger, className }) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | undefined>(10);
  const [customAmountText, setCustomAmountText] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copiedPayload, setCopiedPayload] = useState(false);

  useEffect(() => {
    const payload = generatePixPayload({
      pixKey: PIX_KEY,
      amount: amount && amount > 0 ? amount : undefined,
    });

    QRCode.toDataURL(payload, {
      width: 260,
      margin: 1,
      color: {
        dark: '#09090b',
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error('Erro ao gerar QRCode:', err));
  }, [amount]);

  const handleCopyPayload = async () => {
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
  };

  const handleSelectPreset = (val?: number) => {
    setAmount(val);
    setCustomAmountText('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setCustomAmountText(raw);
    const num = parseFloat(raw);
    if (!isNaN(num) && num > 0) {
      setAmount(num);
    } else {
      setAmount(undefined);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={`group h-8 gap-2 px-2.5 text-xs font-medium rounded-lg border-border/80 bg-background/80 dark:bg-card/80 backdrop-blur-md shadow-xs hover:bg-muted/80 hover:border-border active:scale-[0.98] transition-all ${className || ''}`}
          >
            <div className="flex size-4 items-center justify-center rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20 group-hover:scale-110 transition-all">
              <Coffee className="size-3" />
            </div>
            <span className="text-foreground">Apoiar</span>
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              PIX
            </span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-xs p-5">
        <DialogHeader className="text-center sm:text-center items-center space-y-1">
          <div className="flex size-9 items-center justify-center rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-0.5 shadow-xs">
            <Coffee className="size-4" />
          </div>
          <DialogTitle className="text-base font-semibold tracking-tight">
            Apoiar o Mirio via PIX
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Qualquer valor ajuda a manter os servidores e a evolução contínua do projeto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 my-1">
          {/* Presets de Valor em Botões Segmentados */}
          <div className="grid grid-cols-4 gap-1 p-0.5 bg-muted/50 rounded-md border border-border">
            {[5, 10, 25, undefined].map((val) => {
              const isSelected = amount === val && !customAmountText;
              const label = val === undefined ? 'Livre' : `R$ ${val}`;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleSelectPreset(val)}
                  className={`h-7 text-xs font-medium rounded transition-all active:scale-[0.98] ${
                    isSelected
                      ? 'bg-background text-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Campo para valor customizado se quiser valor livre */}
          {amount === undefined && (
            <div className="flex items-center gap-1.5 max-w-[140px] mx-auto animate-in fade-in-0 zoom-in-95 duration-100">
              <span className="text-xs font-mono text-muted-foreground">R$</span>
              <Input
                type="text"
                autoFocus
                placeholder="Valor..."
                value={customAmountText}
                onChange={handleCustomChange}
                className="h-7 text-xs text-center font-mono"
              />
            </div>
          )}

          {/* QR Code Container Limpo e Centralizado */}
          <div className="flex flex-col items-center justify-center p-3 rounded-md border border-border bg-muted/20">
            {qrCodeUrl ? (
              <div className="p-2.5 bg-white rounded-md border border-border shadow-xs">
                <img
                  src={qrCodeUrl}
                  alt="QR Code Pix"
                  className="size-44 object-contain"
                />
              </div>
            ) : (
              <div className="size-44 flex items-center justify-center">
                <QrCode className="size-8 text-muted-foreground animate-pulse" />
              </div>
            )}

            <p className="text-[11px] text-muted-foreground text-center mt-2.5 font-medium">
              {amount && amount > 0
                ? `Valor selecionado: R$ ${amount.toFixed(2)}`
                : 'Escaneie no app do seu banco e defina a quantia desejada'}
            </p>
          </div>

          {/* Botão de Cópia Pix Copia e Cola */}
          <Button
            type="button"
            size="sm"
            onClick={handleCopyPayload}
            className="w-full h-9 text-xs font-medium gap-1.5 shadow-xs"
          >
            {copiedPayload ? (
              <>
                <Check className="size-3.5 text-emerald-400" />
                <span>Código Copiado com Sucesso!</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span>Copiar Pix Copia e Cola</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
