import React, { useState, useRef, useEffect } from 'react';
import {
  Smile,
  Search,
  Plus,
  X,
  Upload,
  ImagePlus,
  Link2,
  Sparkles,
  Loader2,
} from '@/components/ui/icons';
import EmojiPicker, { EmojiStyle, Theme as EmojiTheme, type EmojiClickData } from 'emoji-picker-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/context/ThemeContext';
import { getAppleEmojiUrl } from '@/utils/appleEmoji';
import {
  processImageFiles,
  validateDroppedFiles,
  formatUnsupportedFileMessage,
} from '@/utils/imageUpload';
import { getImageDimensions } from '@/utils/clipboard';

// Badges ágeis com Emojis estilo Apple
const TRENDING_TAGS = ['celebrate', 'agile', 'yes', 'coffee', 'mind blown', 'ship it', 'cat', 'bug', 'applause'];

interface GifItem {
  id: string;
  name: string;
  url: string;
  previewUrl?: string;
}

// Memes populares e reações consagradas na CDN da Klipy (fallback instantâneo)
const CURATED_GIFS: GifItem[] = [
  {
    name: 'Brinde DiCaprio',
    id: '7916368356156483',
    url: 'https://static.klipy.com/ii/4e7bea9f7a3371424e6c16ebc93252fe/46/6a/IGemk23TDHctPwlki1.gif',
    previewUrl: 'https://static.klipy.com/ii/4e7bea9f7a3371424e6c16ebc93252fe/46/6a/pcUbbCo9Qc8wrN0C.gif',
  },
  {
    name: 'Travolta Confuso',
    id: '3061683536704476',
    url: 'https://static.klipy.com/ii/d7aec6f6f171607374b2065c836f92f4/67/fc/eYsqvnbO.gif',
    previewUrl: 'https://static.klipy.com/ii/d7aec6f6f171607374b2065c836f92f4/67/fc/Ggluv1A2.gif',
  },
  {
    name: 'Não Não Deus Não!',
    id: '6149379373338412',
    url: 'https://static.klipy.com/ii/d7aec6f6f171607374b2065c836f92f4/8c/39/FmFDzsho.gif',
    previewUrl: 'https://static.klipy.com/ii/d7aec6f6f171607374b2065c836f92f4/8c/39/1bDCcmPi.gif',
  },
  {
    name: 'Pense Nisso (Roll Safe)',
    id: '1251982231578481',
    url: 'https://static.klipy.com/ii/925f17378dd1893b674a723c07535afe/4d/6f/jVcYzyp9.gif',
    previewUrl: 'https://static.klipy.com/ii/925f17378dd1893b674a723c07535afe/4d/6f/QsvtvV9u.gif',
  },
  {
    name: 'This is Fine (Cachorro)',
    id: '7889848656714426',
    url: 'https://static.klipy.com/ii/c3a19a0b747a76e98651f2b9a3cca5ff/49/f8/zl1Y5fjP.gif',
    previewUrl: 'https://static.klipy.com/ii/c3a19a0b747a76e98651f2b9a3cca5ff/49/f8/cG6oLGC8.gif',
  },
  {
    name: 'Gato Digitador Focado',
    id: '5122090673266753',
    url: 'https://static.klipy.com/ii/c3a19a0b747a76e98651f2b9a3cca5ff/9c/63/z1XLwIWS.gif',
    previewUrl: 'https://static.klipy.com/ii/c3a19a0b747a76e98651f2b9a3cca5ff/9c/63/E3MfOMq9.gif',
  },
  {
    name: 'Comer Pipoca na Treta',
    id: '7267495775780009',
    url: 'https://static.klipy.com/ii/35ccce3d852f7995dd2da910f2abd795/ec/59/uGVtiiAZ.gif',
    previewUrl: 'https://static.klipy.com/ii/35ccce3d852f7995dd2da910f2abd795/ec/59/RsxO4agf.gif',
  },
  {
    name: 'Bebê Vitória (Success)',
    id: '2492622719539599',
    url: 'https://static.klipy.com/ii/d6b0ce929193df3c242ac34b5654d2ce/35/88/KiVLVpaQ.gif',
    previewUrl: 'https://static.klipy.com/ii/d6b0ce929193df3c242ac34b5654d2ce/35/88/cRKlOJf7.gif',
  },
  {
    name: 'Cabeça Explodindo',
    id: '4532624641600511',
    url: 'https://static.klipy.com/ii/d6b0ce929193df3c242ac34b5654d2ce/9a/57/CCtgUPsD.gif',
    previewUrl: 'https://static.klipy.com/ii/d6b0ce929193df3c242ac34b5654d2ce/9a/57/xhKlDpCw.gif',
  },
  {
    name: 'Comemorando (Celebrate)',
    id: '8168425300051009',
    url: 'https://static.klipy.com/ii/35ccce3d852f7995dd2da910f2abd795/32/bf/zFtdVhji.gif',
    previewUrl: 'https://static.klipy.com/ii/35ccce3d852f7995dd2da910f2abd795/32/bf/D2RxVsDJ.gif',
  },
  {
    name: 'Aplausos Entusiasmados',
    id: '4596653737650329',
    url: 'https://static.klipy.com/ii/f87f46a2c5aeaeed4c68910815f73eaf/08/b7/hK8oyGl2.gif',
    previewUrl: 'https://static.klipy.com/ii/f87f46a2c5aeaeed4c68910815f73eaf/08/b7/McUpzTeD.gif',
  },
  {
    name: 'Gargalhada Épica',
    id: '3478590164151568',
    url: 'https://static.klipy.com/ii/d6b0ce929193df3c242ac34b5654d2ce/79/f2/VyNapEfQ.gif',
    previewUrl: 'https://static.klipy.com/ii/d6b0ce929193df3c242ac34b5654d2ce/79/f2/OfDbEjjb.gif',
  },
];

interface KlipyMediaVariant {
  gif?: { url?: string };
  webp?: { url?: string };
}

interface KlipyRawItem {
  id?: string | number;
  slug?: string;
  title?: string;
  file?: {
    hd?: KlipyMediaVariant;
    md?: KlipyMediaVariant;
    sm?: KlipyMediaVariant;
    xs?: KlipyMediaVariant;
  };
  files?: {
    gif?: { url?: string };
    mediumgif?: { url?: string };
    tinygif?: { url?: string };
  };
}

const parseKlipyResponse = (payload: unknown): GifItem[] => {
  const root = payload as {
    data?: { data?: KlipyRawItem[] } | KlipyRawItem[];
  };
  const rawList: KlipyRawItem[] = Array.isArray(root?.data)
    ? root.data
    : Array.isArray(root?.data?.data)
    ? root.data.data
    : [];

  return rawList
    .map((item): GifItem => {
      const fullUrl =
        item.file?.md?.gif?.url ||
        item.file?.hd?.gif?.url ||
        item.file?.sm?.gif?.url ||
        item.files?.gif?.url ||
        item.files?.mediumgif?.url ||
        '';
      const previewUrl =
        item.file?.sm?.gif?.url ||
        item.file?.md?.gif?.url ||
        item.files?.tinygif?.url ||
        fullUrl;
      const name =
        item.title?.trim() ||
        item.slug?.replace(/-/g, ' ').trim() ||
        'GIF animado';

      return {
        id: String(item.id || fullUrl),
        name,
        url: fullUrl,
        previewUrl,
      };
    })
    .filter((item) => Boolean(item.url));
};

export interface MediaInsertItem {
  type: 'sticker' | 'gif';
  src: string;
  alt?: string;
  text?: string;
  width?: number;
  height?: number;
}

interface StickersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsertMedia: (
    type: 'sticker' | 'gif',
    src: string,
    alt?: string,
    text?: string,
    dimensions?: { width: number; height: number }
  ) => void;
  onBatchInsertMedia?: (items: MediaInsertItem[]) => void;
}

export const StickersModal: React.FC<StickersModalProps> = ({
  open,
  onOpenChange,
  onInsertMedia,
  onBatchInsertMedia,
}) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'upload' | 'emojis' | 'gifs'>('upload');
  const [gifSearch, setGifSearch] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [trendingGifs, setTrendingGifs] = useState<GifItem[]>(CURATED_GIFS);
  const [searchResults, setSearchResults] = useState<GifItem[]>(CURATED_GIFS);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedTrendingRef = useRef(false);

  const klipyApiKey =
    (import.meta.env.VITE_KLIPY_API_KEY as string) || '';
  const giphyApiKey = (import.meta.env.VITE_GIPHY_API_KEY as string) || '';

  useEffect(() => {
    if (open) {
      setUploadError(null);
      setIsDraggingFiles(false);
    }
  }, [open]);

  // Carrega GIFs em alta na Klipy ao abrir a aba de GIFs pela primeira vez
  useEffect(() => {
    if (!open || activeTab !== 'gifs' || hasLoadedTrendingRef.current || !klipyApiKey) {
      return;
    }
    hasLoadedTrendingRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `https://api.klipy.com/api/v1/${klipyApiKey}/gifs/trending?per_page=24&locale=pt`
        );
        if (!res.ok) return;
        const data = await res.json();
        const parsed = parseKlipyResponse(data);
        if (!cancelled && parsed.length > 0) {
          setTrendingGifs(parsed);
          setSearchResults((prev) => (prev === CURATED_GIFS ? parsed : prev));
        }
      } catch (err) {
        console.warn('Falha ao carregar GIFs em alta no Klipy:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, activeTab, klipyApiKey]);

  const fetchGifs = async (query: string) => {
    setIsSearching(true);
    try {
      // 1. Provedor principal: Klipy API
      if (klipyApiKey) {
        const res = await fetch(
          `https://api.klipy.com/api/v1/${klipyApiKey}/gifs/search?q=${encodeURIComponent(
            query
          )}&per_page=24&locale=pt`
        );
        if (res.ok) {
          const data = await res.json();
          const formatted = parseKlipyResponse(data);
          if (formatted.length > 0) {
            setSearchResults(formatted);
            return;
          }
        }
      }

      // 2. Fallback secundário: Giphy API (caso configurada)
      if (giphyApiKey) {
        const res = await fetch(
          `https://api.giphy.com/v1/gifs/search?api_key=${giphyApiKey}&q=${encodeURIComponent(
            query
          )}&limit=24&rating=g`
        );
        if (res.ok) {
          const data = await res.json();
          const formatted: GifItem[] = (data.data || [])
            .map(
              (item: {
                id: string;
                title: string;
                images?: {
                  fixed_height?: { url?: string };
                  downsized?: { url?: string };
                  original?: { url?: string };
                };
              }): GifItem => {
                const directUrl =
                  item.images?.fixed_height?.url ||
                  item.images?.downsized?.url ||
                  item.images?.original?.url ||
                  `https://i.giphy.com/media/${item.id}/giphy.gif`;
                return {
                  name: item.title || 'GIF animado',
                  id: item.id,
                  url: directUrl,
                  previewUrl: item.images?.fixed_height?.url || directUrl,
                };
              }
            )
            .filter((item: GifItem) => Boolean(item.url));

          setSearchResults(formatted);
          return;
        }
      }

      // 3. Fallback local: filtra destaques
      const qLower = query.toLowerCase();
      const localMatches = trendingGifs.filter((g) =>
        g.name.toLowerCase().includes(qLower)
      );
      setSearchResults(localMatches);
    } catch (err) {
      console.warn('Falha ao buscar GIFs:', err);
      setSearchResults(trendingGifs);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setGifSearch(value);
    setActiveTag(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!value.trim()) {
      setSearchResults(trendingGifs);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(() => {
      fetchGifs(value.trim());
    }, 350);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleSelectTag = (tag: string) => {
    if (activeTag === tag) {
      setActiveTag(null);
      setGifSearch('');
      setSearchResults(trendingGifs);
      return;
    }
    setActiveTag(tag);
    setGifSearch(tag);
    fetchGifs(tag);
  };

  const handleFilesSelected = async (filesList: FileList | File[] | null) => {
    if (!filesList || filesList.length === 0) return;
    setUploadError(null);

    const rawFiles = Array.from(filesList);
    const validation = validateDroppedFiles(rawFiles);

    if (validation.validFiles.length === 0) {
      const { message } = formatUnsupportedFileMessage(validation);
      setUploadError(message);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsProcessingFiles(true);

    try {
      const processed = await processImageFiles(validation.validFiles);
      if (processed.length === 0) {
        setUploadError('Não foi possível processar as imagens selecionadas. Verifique os arquivos.');
        return;
      }

      if (onBatchInsertMedia) {
        onBatchInsertMedia(
          processed.map((img) => ({
            type: img.type,
            src: img.src,
            alt: img.alt,
            width: img.width,
            height: img.height,
          }))
        );
      } else {
        for (const img of processed) {
          onInsertMedia(img.type, img.src, img.alt, undefined, {
            width: img.width,
            height: img.height,
          });
        }
      }

      onOpenChange(false);
    } catch (err) {
      console.warn('Erro ao processar imagens do computador:', err);
      setUploadError('Não foi possível processar esta imagem. Tente outro arquivo.');
    } finally {
      setIsProcessingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSelectEmojiClick = (emojiData: EmojiClickData) => {
    // Insere sticker com a URL oficial da Apple para garantir 100% estilo Mac no canvas
    onInsertMedia(
      'sticker',
      emojiData.imageUrl || getAppleEmojiUrl(emojiData.emoji),
      emojiData.names?.[0] || emojiData.emoji,
      emojiData.emoji
    );
    onOpenChange(false);
  };

  const handleSelectGif = (url: string, name: string) => {
    onInsertMedia('gif', url, name);
    onOpenChange(false);
  };

  const handleInsertCustomUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customUrl.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    const isGif =
      lower.includes('.gif') ||
      lower.includes('.webp') ||
      lower.includes('klipy.com') ||
      lower.includes('giphy.com') ||
      lower.includes('tenor.com');

    const dims = await getImageDimensions(trimmed);
    onInsertMedia(isGif ? 'gif' : 'sticker', trimmed, 'Mídia personalizada', undefined, dims);
    setCustomUrl('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl p-4 sm:p-5 overflow-hidden rounded-2xl">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <ImagePlus className="size-4" />
            </div>
            <span>Imagens, Emojis & GIFs</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Envie imagens do seu computador, cole um link direto ou adicione emojis Apple e GIFs animados ao quadro.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="w-full mt-2"
        >
          <TabsList className="grid grid-cols-3 w-full h-9 p-1 bg-muted/60 rounded-xl">
            <TabsTrigger
              value="upload"
              className="text-xs font-medium rounded-lg gap-1.5 data-[state=active]:shadow-xs transition-all duration-150"
            >
              <Upload className="size-3.5" />
              <span>Imagens & Upload</span>
            </TabsTrigger>
            <TabsTrigger
              value="emojis"
              className="text-xs font-medium rounded-lg gap-1.5 data-[state=active]:shadow-xs transition-all duration-150"
            >
              <Smile className="size-3.5" />
              <span>Emojis</span>
            </TabsTrigger>
            <TabsTrigger
              value="gifs"
              className="text-xs font-medium rounded-lg gap-1.5 data-[state=active]:shadow-xs transition-all duration-150"
            >
              <Sparkles className="size-3.5" />
              <span>GIFs</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Upload do Computador + Galeria de Recentes + Link URL */}
          <TabsContent value="upload" className="space-y-3.5 pt-3 focus-visible:outline-none">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/*"
              multiple
              className="sr-only"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />

            {/* Dropzone Interativa com Micro-interações (Emil Design Engineering) */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Selecionar ou arrastar imagens do computador"
              onClick={() => !isProcessingFiles && fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !isProcessingFiles) {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingFiles(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isDraggingFiles) setIsDraggingFiles(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setIsDraggingFiles(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingFiles(false);
                if (e.dataTransfer?.files?.length) {
                  void handleFilesSelected(e.dataTransfer.files);
                }
              }}
              className={`group relative flex flex-col items-center justify-center text-center rounded-xl border-2 border-dashed px-4 py-6 sm:py-7 cursor-pointer select-none transition-[transform,border-color,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.985] ${
                isDraggingFiles
                  ? 'border-primary bg-primary/8 scale-[1.01]'
                  : 'border-border/80 bg-muted/25 hover:border-primary/60 hover:bg-muted/45'
              }`}
            >
              <div
                className={`mb-2.5 flex size-11 items-center justify-center rounded-xl border transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                  isDraggingFiles
                    ? 'bg-primary text-primary-foreground border-primary scale-105 shadow-sm'
                    : 'bg-background text-primary border-border/80 shadow-2xs group-hover:scale-105'
                }`}
              >
                {isProcessingFiles ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Upload className="size-5" />
                )}
              </div>

              <p className="text-xs sm:text-sm font-semibold text-foreground">
                {isProcessingFiles
                  ? 'Otimizando e inserindo no quadro...'
                  : isDraggingFiles
                  ? 'Solte as imagens para adicionar ao quadro'
                  : 'Clique para escolher do computador ou arraste aqui'}
              </p>

              <p className="mt-1 text-[11px] text-muted-foreground max-w-md leading-relaxed">
                Suporta <strong>PNG, JPG, WebP, GIF e SVG</strong> (inclusive várias imagens de uma vez).
                Compressão inteligente automática para sincronizar em tempo real.
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-background/90 border border-border/70 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow-2xs">
                  <span>✨ Múltiplos arquivos em grade</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-background/90 border border-border/70 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow-2xs">
                  <span>📋 Ou use Ctrl+V direto no canvas</span>
                </span>
              </div>
            </div>

            {uploadError && (
              <p className="text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                {uploadError}
              </p>
            )}

            {/* Divisor sutil + Inserção rápida por Link / URL */}
            <div className="pt-2.5 border-t border-border/70">
              <form onSubmit={handleInsertCustomUrl} className="space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Link2 className="size-3 text-primary" />
                  <span>Ou inserir por Link URL direto (.png, .jpg, .webp, .gif)</span>
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="url"
                    placeholder="https://exemplo.com/diagrama-arquitetura.png"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="h-9 text-xs flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={!customUrl.trim()}
                    className="h-9 px-3.5 text-xs font-medium gap-1.5 shrink-0 active:scale-[0.97] transition-transform"
                  >
                    <Plus className="size-3.5" />
                    <span>Inserir URL</span>
                  </Button>
                </div>

                {customUrl.trim() && (
                  <div className="p-2.5 bg-muted/30 rounded-lg border border-border flex items-center justify-center max-h-[110px] overflow-hidden">
                    <img
                      src={customUrl}
                      alt="Preview"
                      referrerPolicy="no-referrer"
                      className="max-h-[92px] rounded object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </form>
            </div>
          </TabsContent>

          {/* Tab 2: Emojis Apple Oficiais */}
          <TabsContent value="emojis" className="pt-2 focus-visible:outline-none">
            <div className="rounded-xl overflow-hidden border border-border/80 shadow-xs flex justify-center">
              <EmojiPicker
                onEmojiClick={handleSelectEmojiClick}
                emojiStyle={EmojiStyle.APPLE}
                theme={isDark ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                width="100%"
                height={390}
                searchPlaceholder="Buscar emojis da Apple..."
                previewConfig={{ showPreview: false }}
                lazyLoadEmojis={true}
              />
            </div>
          </TabsContent>

          {/* Tab 3: GIFs Animados */}
          <TabsContent value="gifs" className="space-y-3 pt-2 focus-visible:outline-none">
            {/* Campo de Busca de GIFs */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar GIFs (ex: celebrate, bug, applause)..."
                value={gifSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-8 pr-8 h-9 text-xs"
              />
              {gifSearch && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Tags rápidas de busca */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {TRENDING_TAGS.map((tag) => {
                const isSelected = activeTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSelectTag(tag)}
                    className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full transition-colors whitespace-nowrap border active:scale-[0.97] ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 text-muted-foreground hover:text-foreground border-border'
                    }`}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>

            {/* Grid de GIFs Animados com Loading Skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1">
              {isSearching ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="aspect-video w-full rounded-md bg-muted/60 border border-border/40"
                  />
                ))
              ) : searchResults.length === 0 ? (
                <div className="col-span-full py-10 flex flex-col items-center justify-center text-xs text-muted-foreground gap-1">
                  <span>Nenhum GIF encontrado para &quot;{gifSearch}&quot;</span>
                  <button
                    type="button"
                    onClick={() => {
                      setGifSearch('');
                      setActiveTag(null);
                      setSearchResults(trendingGifs);
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    Ver destaques
                  </button>
                </div>
              ) : (
                searchResults.map((gif, idx) => (
                  <button
                    key={gif.id || idx}
                    type="button"
                    onClick={() => handleSelectGif(gif.url, gif.name)}
                    className="group relative rounded-lg overflow-hidden border border-border bg-muted/30 aspect-video hover:border-primary transition-[transform,border-color] duration-150 active:scale-[0.98]"
                    title={gif.name}
                  >
                    <img
                      src={gif.previewUrl || gif.url}
                      alt={gif.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.dataset.retried && gif.url && target.src !== gif.url) {
                          target.dataset.retried = 'true';
                          target.src = gif.url;
                        }
                      }}
                    />
                    <div className="absolute inset-x-0 bottom-0 p-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white truncate text-left font-medium">
                        {gif.name}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
