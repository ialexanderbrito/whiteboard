import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  X, 
  Music,
  Volume2,
  Volume1,
  VolumeX,
  Check,
  Headphones,
  Minimize2,
  Maximize2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { timerService, type BoardTimerState } from '@/services/timerService';
import { playChimeSound } from '@/utils/audioChime';

interface BoardTimerWidgetProps {
  boardId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_DURATIONS = [
  { label: '1m', seconds: 60 },
  { label: '3m', seconds: 180 },
  { label: '5m', seconds: 300 },
  { label: '10m', seconds: 600 },
  { label: '15m', seconds: 900 },
];

const MUSIC_PRESETS = [
  { id: 'lofi', label: '🎧 Lofi Focus', url: 'https://www.youtube.com/watch?v=wF2JZZPL7G4' },
  { id: 'synthwave', label: '⚡ Synthwave Chill', url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY' },
  { id: 'nature', label: '🌿 Natureza Relax', url: 'https://www.youtube.com/watch?v=eKFTSSKCzWA' },
];

export function extractYouTubeVideoId(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

export const BoardTimerWidget: React.FC<BoardTimerWidgetProps> = ({
  boardId,
  userName,
  isOpen,
  onClose,
}) => {
  const [timerState, setTimerState] = useState<BoardTimerState>({
    durationSeconds: 300,
    remainingSeconds: 300,
    isRunning: false,
    startedAt: null,
    endsAt: null,
    youtubeUrl: 'https://www.youtube.com/watch?v=wF2JZZPL7G4',
    musicEnabled: false,
    volume: 70,
    isOpenForEveryone: false,
  });

  const [displaySeconds, setDisplaySeconds] = useState(300);
  const [isMusicPanelOpen, setIsMusicPanelOpen] = useState(false);
  const [showCustomUrlInput, setShowCustomUrlInput] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  
  // Controle de fechamento manual local:
  // Se o usuário fechar com X, armazena o timestamp para ocultar temporariamente
  const [closedTimestamp, setClosedTimestamp] = useState<number | null>(null);

  // Modo compacto do timer (pílula minimalista)
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    return localStorage.getItem('mirio_timer_compact') === 'true';
  });

  const toggleCompact = () => {
    setIsCompact((prev) => {
      const next = !prev;
      localStorage.setItem('mirio_timer_compact', String(next));
      return next;
    });
  };

  // Áudio Local: por padrão NÃO toca para outros participantes na sala.
  // Somente toca no fone/alto-falante de quem ativou explicitamente.
  const [localAudioActive, setLocalAudioActive] = useState(false);

  const [localVolume, setLocalVolume] = useState<number>(() => {
    const saved = localStorage.getItem('mirio_timer_volume');
    return saved !== null ? Number(saved) : 70;
  });
  const [isMuted, setIsMuted] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const chimeTriggeredRef = useRef(false);

  // Se o usuário clicar para abrir via menu, reseta fechamento manual
  useEffect(() => {
    if (isOpen) {
      setClosedTimestamp(null);
    }
  }, [isOpen]);

  // Assina sincronização em tempo real (Firestore + RTDB + BroadcastChannel)
  useEffect(() => {
    if (!boardId) return;

    const unsubscribe = timerService.subscribeTimer(boardId, (state) => {
      setTimerState(state);
      chimeTriggeredRef.current = false;
    });

    return unsubscribe;
  }, [boardId]);

  // Se houver uma nova ação de timer (iniciado, reiniciado, etc.) posterior ao fechamento manual, reabre o widget
  useEffect(() => {
    if (
      timerState.lastActionTimestamp &&
      closedTimestamp &&
      timerState.lastActionTimestamp > closedTimestamp
    ) {
      setClosedTimestamp(null);
    }
  }, [timerState.lastActionTimestamp, closedTimestamp]);

  // Se o timer estiver rodando e seu início for posterior ao fechamento, reabre
  useEffect(() => {
    if (timerState.isRunning && closedTimestamp && timerState.startedAt) {
      if (timerState.startedAt > closedTimestamp) {
        setClosedTimestamp(null);
      }
    }
  }, [timerState.isRunning, timerState.startedAt, closedTimestamp]);

  const handleCloseWidget = () => {
    setClosedTimestamp(Date.now());
    onClose();
    // Se o timer estiver pausado/parado ou finalizado, encerra o estado para a sala também
    if (!timerState.isRunning) {
      timerService.closeTimer(boardId, userName);
    }
  };

  // Loop de contagem regressiva baseado em timestamps reais sem desvio de tempo
  useEffect(() => {
    if (!timerState.isRunning || !timerState.endsAt) {
      setDisplaySeconds(timerState.remainingSeconds);
      return;
    }

    const updateDisplay = () => {
      const now = Date.now();
      const left = Math.max(0, Math.ceil((timerState.endsAt! - now) / 1000));
      setDisplaySeconds(left);

      if (left === 0 && !chimeTriggeredRef.current) {
        chimeTriggeredRef.current = true;
        playChimeSound();
        try {
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.2 },
          });
        } catch {
          // ignora
        }
      }
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 250);

    return () => clearInterval(interval);
  }, [timerState.isRunning, timerState.endsAt, timerState.remainingSeconds]);

  const videoId = useMemo(() => {
    return extractYouTubeVideoId(timerState.youtubeUrl || 'https://www.youtube.com/watch?v=wF2JZZPL7G4');
  }, [timerState.youtubeUrl]);

  const activePreset = useMemo(() => {
    return MUSIC_PRESETS.find((p) => p.url === timerState.youtubeUrl);
  }, [timerState.youtubeUrl]);

  // Controle de volume no IFrame do YouTube via PostMessage API
  const sendVolumeToYouTube = (vol: number, muted: boolean) => {
    if (!iframeRef.current?.contentWindow) return;
    try {
      const targetVol = muted ? 0 : vol;
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'setVolume', args: [targetVol] }),
        '*'
      );
      if (muted) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'mute', args: [] }),
          '*'
        );
      } else {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'unMute', args: [] }),
          '*'
        );
      }
    } catch {
      // ignora se cross-origin ainda inicializando
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setLocalVolume(newVol);
    setIsMuted(false);
    localStorage.setItem('mirio_timer_volume', String(newVol));
    sendVolumeToYouTube(newVol, false);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sendVolumeToYouTube(localVolume, nextMuted);
  };

  const minutes = Math.floor(displaySeconds / 60);
  const seconds = displaySeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const progressPercent = timerState.durationSeconds > 0
    ? Math.max(0, Math.min(100, (displaySeconds / timerState.durationSeconds) * 100))
    : 0;

  const isFinished = displaySeconds === 0 && timerState.durationSeconds > 0;

  const handleTogglePlay = async () => {
    if (timerState.isRunning) {
      await timerService.pauseTimer(boardId, displaySeconds, timerState.durationSeconds, userName);
    } else {
      const remainingToStart = displaySeconds > 0 ? displaySeconds : timerState.durationSeconds;
      await timerService.startTimer(boardId, timerState.durationSeconds, remainingToStart, userName);
    }
  };

  const handleReset = async () => {
    await timerService.resetTimer(boardId, timerState.durationSeconds, userName);
  };

  const handleSelectPresetDuration = async (secs: number) => {
    await timerService.setDuration(boardId, secs, userName);
  };

  const handleAddOneMinute = async () => {
    await timerService.addOneMinute(boardId, userName);
  };

  // Alterna música global e ativa o som local para este usuário
  const handleToggleGlobalMusic = async () => {
    const nextState = !timerState.musicEnabled;
    if (nextState) {
      setLocalAudioActive(true);
    } else {
      setLocalAudioActive(false);
    }
    await timerService.setMusicConfig(boardId, timerState.youtubeUrl || MUSIC_PRESETS[0].url, nextState);
  };

  // Ativa preset de música e liga o som local
  const handleApplyPresetMusic = async (url: string) => {
    setShowCustomUrlInput(false);
    setLocalAudioActive(true);
    await timerService.setMusicConfig(boardId, url, true);
  };

  // Salva link customizado e liga o som local
  const handleSaveCustomMusic = async () => {
    if (!customUrlInput.trim()) return;
    setLocalAudioActive(true);
    await timerService.setMusicConfig(boardId, customUrlInput.trim(), true);
    setShowCustomUrlInput(false);
  };

  // Alterna apenas o áudio local do participante atual
  const handleToggleLocalAudioOnly = () => {
    const next = !localAudioActive;
    setLocalAudioActive(next);
    // Se o timer não tiver música configurada ainda, configura com preset padrão
    if (next && !timerState.musicEnabled) {
      timerService.setMusicConfig(boardId, timerState.youtubeUrl || MUSIC_PRESETS[0].url, true);
    }
  };

  // Regra crítica de áudio:
  // A música NUNCA toca para todos os participantes automaticamente para evitar eco em reuniões/chamadas.
  // Ela toca APENAS se o timer estiver rodando E o usuário local ativou o áudio para si mesmo.
  const shouldPlayMusic = timerState.isRunning && timerState.musicEnabled && Boolean(videoId) && !isFinished && localAudioActive;

  // Regra de visibilidade do cronômetro:
  // O cronômetro é visível para TODOS os usuários quando:
  // 1. O timer está rodando (contagem ativa do grupo)
  // 2. isOpenForEveryone está ativo (aberto na sala)
  // 3. isOpen local está ativo (o usuário abriu pelo menu)
  // E o usuário não fechou manualmente após a última ação desta sessão
  const isClosedManually = closedTimestamp !== null && (
    !timerState.lastActionTimestamp || closedTimestamp >= timerState.lastActionTimestamp
  );

  const isWidgetVisible = (
    isOpen || 
    timerState.isRunning || 
    Boolean(timerState.isOpenForEveryone)
  ) && (!isClosedManually || isOpen);

  return (
    <>
      {/* 1. Iframe de Áudio de Fundo — Toca APENAS no dispositivo do usuário que ativou áudio local */}
      {shouldPlayMusic && videoId && (
        <div className="fixed -bottom-96 -right-96 pointer-events-none opacity-0 select-none overflow-hidden size-1">
          <iframe
            ref={iframeRef}
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&playsinline=1&controls=0&loop=1`}
            title="Música de Foco"
            allow="autoplay"
            onLoad={() => {
              setTimeout(() => {
                sendVolumeToYouTube(localVolume, isMuted);
              }, 600);
            }}
            className="size-1"
          />
        </div>
      )}

      {/* 2. Cronômetro / Widget Flutuante Sincronizado para Todos */}
      {isWidgetVisible && (
        <div className="pointer-events-auto animate-in fade-in-0 slide-in-from-top-3 duration-200">
          {isCompact ? (
            /* Modo Compacto: Pílula minimalista e elegante */
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border bg-background/95 dark:bg-card/95 backdrop-blur-xl shadow-lg transition-all ${
                isFinished
                  ? 'border-destructive ring-2 ring-destructive/20 animate-pulse'
                  : 'border-border/80 hover:border-border'
              }`}
            >
              {/* Ícone e status */}
              <div
                className={`flex size-6 items-center justify-center rounded-full transition-colors ${
                  isFinished
                    ? 'bg-destructive/15 text-destructive'
                    : timerState.isRunning
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <Clock className={`size-3 ${timerState.isRunning ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
              </div>

              {/* Tempo tabular */}
              <span
                className={`font-mono text-sm font-bold tracking-tight leading-none tabular-nums ${
                  isFinished ? 'text-destructive font-black' : 'text-foreground'
                }`}
              >
                {formattedTime}
              </span>

              {/* Indicador de áudio se ativo */}
              {localAudioActive && (
                <Headphones className="size-3 text-amber-500 animate-pulse" />
              )}

              {/* Play / Pause Mini */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant={timerState.isRunning ? 'secondary' : 'default'}
                    onClick={handleTogglePlay}
                    className="size-6 rounded-full active:scale-[0.94] cursor-pointer"
                  >
                    {timerState.isRunning ? (
                      <Pause className="size-3" />
                    ) : (
                      <Play className="size-3 fill-current ml-0.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{timerState.isRunning ? 'Pausar' : 'Iniciar'}</TooltipContent>
              </Tooltip>

              <div className="w-px h-3.5 bg-border/60" />

              {/* Botão de Expandir */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => toggleCompact()}
                    className="size-6 text-muted-foreground hover:text-foreground rounded-full active:scale-[0.94] cursor-pointer"
                  >
                    <Maximize2 className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Expandir cronômetro</TooltipContent>
              </Tooltip>

              {/* Botão de Fechar */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={handleCloseWidget}
                    className="size-6 text-muted-foreground hover:text-foreground rounded-full active:scale-[0.94] cursor-pointer"
                  >
                    <X className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Fechar cronômetro</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div 
              className={`relative flex flex-col rounded-2xl border bg-background/95 dark:bg-card/95 backdrop-blur-xl shadow-2xl transition-all ${
                isFinished 
                  ? 'border-destructive ring-4 ring-destructive/20 animate-pulse' 
                  : 'border-border/90'
              }`}
            >
              {/* Barra Principal do Timer */}
              <div className="flex items-center gap-3 px-3.5 py-2">
                {/* Ícone e Indicador */}
                <div 
                  className={`flex size-8 items-center justify-center rounded-xl transition-colors ${
                    isFinished 
                      ? 'bg-destructive/15 text-destructive' 
                      : timerState.isRunning 
                      ? 'bg-primary/15 text-primary' 
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Clock className={`size-4 ${timerState.isRunning ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                </div>

                {/* Display do Tempo */}
                <div className="flex flex-col select-none">
                  <span 
                    className={`font-mono text-2xl font-black tracking-tight leading-none tabular-nums ${
                      isFinished ? 'text-destructive font-black' : 'text-foreground'
                    }`}
                  >
                    {formattedTime}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                    {timerState.isRunning ? (
                      <>
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Em andamento</span>
                      </>
                    ) : isFinished ? (
                      <span className="text-destructive font-bold">Tempo esgotado!</span>
                    ) : (
                      <span>Pausado</span>
                    )}
                  </span>
                </div>

                {/* Controles de Reprodução */}
                <div className="flex items-center gap-1 pl-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant={timerState.isRunning ? 'secondary' : 'default'}
                        onClick={handleTogglePlay}
                        className="size-8 rounded-xl active:scale-[0.96] transition-all cursor-pointer shadow-xs"
                      >
                        {timerState.isRunning ? (
                          <Pause className="size-4" />
                        ) : (
                          <Play className="size-4 fill-current ml-0.5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{timerState.isRunning ? 'Pausar' : 'Iniciar'}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={handleReset}
                        className="size-8 text-muted-foreground hover:text-foreground rounded-xl active:scale-[0.96] cursor-pointer"
                      >
                        <RotateCcw className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reiniciar tempo</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={handleAddOneMinute}
                        className="size-8 text-muted-foreground hover:text-foreground rounded-xl active:scale-[0.96] cursor-pointer font-mono text-[11px] font-bold"
                      >
                        +1m
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Adicionar 1 minuto</TooltipContent>
                  </Tooltip>

                  {/* Botão de Música Individual (YouTube) */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant={localAudioActive ? 'default' : 'ghost'}
                        onClick={() => setIsMusicPanelOpen((prev) => !prev)}
                        className={`size-8 rounded-xl active:scale-[0.96] transition-all cursor-pointer relative ${
                          localAudioActive
                            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                            : timerState.musicEnabled
                            ? 'text-amber-500 hover:bg-amber-500/10'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {localAudioActive ? (
                          <Headphones className="size-3.5" />
                        ) : (
                          <Music className="size-3.5" />
                        )}
                        {/* Indicador de música disponível para este timer sem tocar automaticamente */}
                        {timerState.musicEnabled && !localAudioActive && (
                          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-amber-500 animate-pulse" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {localAudioActive
                        ? 'Música de foco ativa no seu fone (Clique para ajustar)'
                        : timerState.musicEnabled
                        ? 'Música de foco disponível (Clique para ouvir no seu dispositivo)'
                        : 'Configurar música de foco (YouTube)'}
                    </TooltipContent>
                  </Tooltip>

                  {/* Minimizar para modo compacto */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => toggleCompact()}
                        className="size-7 text-muted-foreground hover:text-foreground rounded-lg ml-0.5 cursor-pointer"
                      >
                        <Minimize2 className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Minimizar cronômetro</TooltipContent>
                  </Tooltip>

                  {/* Fechar Widget */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={handleCloseWidget}
                        className="size-7 text-muted-foreground hover:text-foreground rounded-lg ml-0.5 cursor-pointer"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {timerState.isRunning ? 'Ocultar cronômetro no meu quadro' : 'Fechar cronômetro'}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

            {/* Barra de Progresso Fina */}
            <div className="h-1 w-full bg-muted/60 overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ease-out ${
                  isFinished 
                    ? 'bg-destructive' 
                    : timerState.isRunning 
                    ? 'bg-primary' 
                    : 'bg-muted-foreground/40'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Seletor Rápido de Duração Pré-definida */}
            <div className="flex items-center justify-between gap-1 px-3 py-1.5 border-t border-border/60 bg-muted/15">
              <span className="text-[10px] font-medium text-muted-foreground">Predefinições:</span>
              <div className="flex items-center gap-1">
                {PRESET_DURATIONS.map((p) => {
                  const isCur = timerState.durationSeconds === p.seconds;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleSelectPresetDuration(p.seconds)}
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition cursor-pointer ${
                        isCur
                          ? 'bg-primary/20 text-primary font-bold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gaveta de Configurações de Música Individual (YouTube) */}
            {isMusicPanelOpen && (
              <div className="p-3 border-t border-border/60 bg-muted/30 rounded-b-2xl space-y-2.5 animate-in fade-in-0 slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Music className="size-3.5 text-amber-500" />
                    <span className="text-xs font-semibold text-foreground">Música de Foco</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Botão de habilitar música para a sessão */}
                    <Button
                      type="button"
                      variant={timerState.musicEnabled ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={handleToggleGlobalMusic}
                      className="h-6 text-[10px] px-2 rounded-md cursor-pointer"
                      title="Habilitar/desabilitar música para esta sessão"
                    >
                      {timerState.musicEnabled ? 'Música na sala' : 'Sem música'}
                    </Button>

                    {/* Botão de ouvir apenas no dispositivo local */}
                    <Button
                      type="button"
                      variant={localAudioActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={handleToggleLocalAudioOnly}
                      className={`h-6 text-[10px] font-bold px-2 rounded-md cursor-pointer ${
                        localAudioActive ? 'bg-amber-500 text-white hover:bg-amber-600' : ''
                      }`}
                    >
                      {localAudioActive ? 'Ouvindo no meu fone' : 'Ouvir no meu fone'}
                    </Button>
                  </div>
                </div>

                {/* Nota explicativa amigável */}
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Áudio individual: toca apenas no seu dispositivo para não atrapalhar outros participantes na chamada.
                </p>

                {/* Controle de Volume Individual */}
                {localAudioActive && (
                  <div className="flex items-center gap-2 px-1 py-1 rounded-lg bg-background/60 border border-border/60 animate-in fade-in-0 duration-150">
                    <button
                      type="button"
                      onClick={handleToggleMute}
                      className="text-muted-foreground hover:text-foreground p-1 rounded transition cursor-pointer"
                      title={isMuted ? 'Desmutar' : 'Mutar'}
                    >
                      {isMuted || localVolume === 0 ? (
                        <VolumeX className="size-3.5 text-destructive" />
                      ) : localVolume < 50 ? (
                        <Volume1 className="size-3.5" />
                      ) : (
                        <Volume2 className="size-3.5" />
                      )}
                    </button>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={isMuted ? 0 : localVolume}
                      onChange={(e) => handleVolumeChange(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />

                    <span className="text-[10px] font-mono text-muted-foreground w-7 text-right">
                      {isMuted ? '0%' : `${localVolume}%`}
                    </span>
                  </div>
                )}

                {/* Presets de Música */}
                <div className="space-y-1">
                  <div className="grid grid-cols-3 gap-1">
                    {MUSIC_PRESETS.map((m) => {
                      const isSelected = timerState.youtubeUrl === m.url;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleApplyPresetMusic(m.url)}
                          className={`text-[10px] py-1.5 px-1.5 rounded-lg border font-medium transition text-center truncate flex items-center justify-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold shadow-xs'
                              : 'border-border bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          <span className="truncate">{m.label}</span>
                          {isSelected && <Check className="size-2.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Indicação do Preset ou Campo de URL Customizada */}
                {!showCustomUrlInput && activePreset ? (
                  <div className="flex items-center justify-between text-[11px] pt-0.5">
                    <span className="text-muted-foreground text-[10px]">
                      Playlist: <strong className="text-foreground">{activePreset.label}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCustomUrlInput(true)}
                      className="text-[10px] text-primary hover:underline font-medium cursor-pointer"
                    >
                      Outro link...
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1 pt-0.5">
                    <div className="flex items-center gap-1">
                      <Input
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={customUrlInput}
                        onChange={(e) => setCustomUrlInput(e.target.value)}
                        className="h-7 text-xs flex-1 bg-background/80"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveCustomMusic}
                        disabled={!customUrlInput.trim()}
                        className="h-7 px-2 text-xs cursor-pointer"
                      >
                        Salvar
                      </Button>
                    </div>
                    {activePreset && (
                      <button
                        type="button"
                        onClick={() => setShowCustomUrlInput(false)}
                        className="text-[10px] text-muted-foreground hover:underline cursor-pointer"
                      >
                        ← Voltar para presets
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          )}
        </div>
      )}
    </>
  );
};
