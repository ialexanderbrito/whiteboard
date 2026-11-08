import React, { useState, useRef, useEffect } from 'react';
import { Smile, Search, Plus, X } from 'lucide-react';
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

// Badges ágeis com Emojis estilo Apple
const TRENDING_TAGS = ['celebrate', 'agile', 'yes', 'coffee', 'mind blown', 'ship it', 'cat', 'bug', 'applause'];

// Memes populares e reações engraçadas consagradas da internet
const CURATED_GIFS = [
  { name: 'Brinde DiCaprio', id: 'GkVM3PcFipxEk', url: 'https://i.giphy.com/media/GkVM3PcFipxEk/giphy.gif' },
  { name: 'Travolta Confuso', id: 'g01ZnwAUvutuK8GIQn', url: 'https://i.giphy.com/media/g01ZnwAUvutuK8GIQn/giphy.gif' },
  { name: 'Não Não Deus Não!', id: 'vyTnNTrs3IZdfAUQVW', url: 'https://i.giphy.com/media/vyTnNTrs3IZdfAUQVW/giphy.gif' },
  { name: 'Pense Nisso (Roll Safe)', id: 'd3mlE7uhX8KFgEmY', url: 'https://i.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif' },
  { name: 'This is Fine (Cachorro)', id: '9M5jK4GXmD5o1irGrF', url: 'https://i.giphy.com/media/9M5jK4GXmD5o1irGrF/giphy.gif' },
  { name: 'Gato Digitador Focado', id: 'MDJ9IbxxvDUQM', url: 'https://i.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif' },
  { name: 'Comer Pipoca na Treta', id: 't3dLl0TGHCxTG', url: 'https://i.giphy.com/media/t3dLl0TGHCxTG/giphy.gif' },
  { name: 'Bebê Vitória (Success)', id: 'nXxOjZrbnbRxS', url: 'https://i.giphy.com/media/nXxOjZrbnbRxS/giphy.gif' },
  { name: 'Cabeça Explodindo', id: '26ufdipQqU2lhNA4g', url: 'https://i.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
  { name: 'Drake Dançando', id: '3o7TKTDnU76u2EPNDG', url: 'https://i.giphy.com/media/3o7TKTDnU76u2EPNDG/giphy.gif' },
  { name: 'Aplausos Entusiasmados', id: 'nbvFVPiEiJH6Q', url: 'https://i.giphy.com/media/nbvFVPiEiJH6Q/giphy.gif' },
  { name: 'Gargalhada Épica', id: '10JhviFuU2gWD6', url: 'https://i.giphy.com/media/10JhviFuU2gWD6/giphy.gif' },
];

interface StickersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsertMedia: (type: 'sticker' | 'gif', src: string, alt?: string, text?: string) => void;
}

export const StickersModal: React.FC<StickersModalProps> = ({
  open,
  onOpenChange,
  onInsertMedia,
}) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'emojis' | 'gifs' | 'url'>('emojis');
  const [gifSearch, setGifSearch] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [searchResults, setSearchResults] = useState(CURATED_GIFS);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Chave pública Giphy ou variável de ambiente personalizada
  const apiKey = (import.meta.env.VITE_GIPHY_API_KEY as string) || '[REDACTED_GIPHY_API_KEY]';

  const fetchGifs = async (query: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(
          query
        )}&limit=24&rating=g`
      );
      if (res.ok) {
        const data = await res.json();
        const formatted = (data.data || [])
          .map((item: { id: string; title: string }) => ({
            name: item.title || 'GIF animado',
            id: item.id,
            // Link direto unauthenticated via CDN i.giphy.com sem restrições de referer
            url: `https://i.giphy.com/media/${item.id}/giphy.gif`,
          }))
          .filter((item: { url: string }) => Boolean(item.url));

        setSearchResults(formatted.length > 0 ? formatted : CURATED_GIFS);
      }
    } catch (err) {
      console.warn('Falha ao buscar GIFs no Giphy:', err);
      setSearchResults(CURATED_GIFS);
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
      setSearchResults(CURATED_GIFS);
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
      setSearchResults(CURATED_GIFS);
      return;
    }
    setActiveTag(tag);
    setGifSearch(tag);
    fetchGifs(tag);
  };

  const handleSelectEmojiClick = (emojiData: EmojiClickData) => {
    // Insere sticker com a URL oficial da Apple para garantir 100% estilo Mac no canvas
    onInsertMedia('sticker', emojiData.imageUrl || getAppleEmojiUrl(emojiData.emoji), emojiData.names?.[0] || emojiData.emoji, emojiData.emoji);
    onOpenChange(false);
  };

  const handleSelectGif = (url: string, name: string) => {
    onInsertMedia('gif', url, name);
    onOpenChange(false);
  };

  const handleInsertCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    const isGif = customUrl.toLowerCase().includes('.gif');
    onInsertMedia(isGif ? 'gif' : 'sticker', customUrl.trim(), 'Mídia personalizada');
    setCustomUrl('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-5 overflow-hidden">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Smile className="size-4 text-primary" />
            <span>Emojis Apple & GIFs</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Selecione emojis oficiais no padrão Apple (Mac) ou GIFs animados para o seu board.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full mt-2">
          <TabsList className="grid grid-cols-3 w-full h-8">
            <TabsTrigger value="emojis" className="text-xs">
              Emojis
            </TabsTrigger>
            <TabsTrigger value="gifs" className="text-xs">
              GIFs Animados
            </TabsTrigger>
            <TabsTrigger value="url" className="text-xs">
              Colar Link URL
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Emojis Apple Oficiais */}
          <TabsContent value="emojis" className="pt-2">
            {/* Seletor Oficial Apple via emoji-picker-react */}
            <div className="rounded-lg overflow-hidden border border-border/80 shadow-xs flex justify-center">
              <EmojiPicker
                onEmojiClick={handleSelectEmojiClick}
                emojiStyle={EmojiStyle.APPLE}
                theme={isDark ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                width="100%"
                height={400}
                searchPlaceholder="Buscar emojis da Apple..."
                previewConfig={{ showPreview: false }}
                lazyLoadEmojis={true}
              />
            </div>
          </TabsContent>

          {/* Tab 2: GIFs Animados */}
          <TabsContent value="gifs" className="space-y-3 pt-2">
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
                    className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full transition-colors whitespace-nowrap border ${
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
            <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1">
              {isSearching ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="aspect-video w-full rounded-md bg-muted/60 border border-border/40"
                  />
                ))
              ) : searchResults.length === 0 ? (
                <div className="col-span-3 py-10 flex flex-col items-center justify-center text-xs text-muted-foreground gap-1">
                  <span>Nenhum GIF encontrado para &quot;{gifSearch}&quot;</span>
                  <button
                    type="button"
                    onClick={() => {
                      setGifSearch('');
                      setSearchResults(CURATED_GIFS);
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    Ver destaques
                  </button>
                </div>
              ) : (
                searchResults.map((gif, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectGif(gif.url, gif.name)}
                    className="group relative rounded-md overflow-hidden border border-border bg-muted/30 aspect-video hover:border-primary transition-all active:scale-[0.98]"
                    title={gif.name}
                  >
                    <img
                      src={gif.url}
                      alt={gif.name}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        // Se falhar, tenta thumbnail direto
                        const target = e.target as HTMLImageElement;
                        if (!target.dataset.retried && gif.id) {
                          target.dataset.retried = 'true';
                          target.src = `https://media.giphy.com/media/${gif.id}/giphy.gif`;
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

          {/* Tab 3: Colar Link / URL */}
          <TabsContent value="url" className="pt-2">
            <form onSubmit={handleInsertCustomUrl} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Cole o link direto de uma imagem ou GIF (.gif, .png, .jpg, .webp):
                </label>
                <Input
                  type="url"
                  placeholder="https://exemplo.com/animacao.gif"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              {customUrl && (
                <div className="p-3 bg-muted/30 rounded-md border border-border flex items-center justify-center max-h-[140px] overflow-hidden">
                  <img
                    src={customUrl}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="max-h-[120px] rounded object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              <Button type="submit" className="w-full gap-1.5 h-9 text-xs font-medium">
                <Plus className="size-3.5" />
                <span>Inserir no Quadro</span>
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
