// Singleton de AudioContext reutilizável para evitar criação de múltiplas threads nativas de áudio
// (que causam engasgos e estouram o limite do navegador em cliques rápidos repetidos).
let sharedAudioCtx: AudioContext | null = null;
let lastPopPlayedAt = 0;
const MIN_POP_INTERVAL_MS = 60;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (sharedAudioCtx && sharedAudioCtx.state !== 'closed') {
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  }
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  sharedAudioCtx = new AudioContextClass();
  return sharedAudioCtx;
}

// Alerta sonoro agradável para finalização de timer e comemoração de votação via Web Audio API nativo
export function playChimeSound(): void {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Nota 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.onended = () => {
      osc1.disconnect();
      gain1.disconnect();
    };
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Nota 2: A5 (880 Hz) com leve atraso
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.2);
    gain2.gain.setValueAtTime(0.18, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.onended = () => {
      osc2.disconnect();
      gain2.disconnect();
    };
    osc2.start(now + 0.2);
    osc2.stop(now + 0.9);
  } catch {
    // Falha silenciosa se o navegador bloquear autoplay de áudio
  }
}

// Micro-feedback sonoro sutil estilo bolha/cork pop para reações rápidas (com throttle de alta frequência)
export function playReactionPopSound(): void {
  try {
    const perfNow = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (perfNow - lastPopPlayedAt < MIN_POP_INTERVAL_MS) return;
    lastPopPlayedAt = perfNow;

    const ctx = getSharedAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.05);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };

    osc.start(now);
    osc.stop(now + 0.08);
  } catch {
    // Falha silenciosa
  }
}

// Alerta suave e elegante estilo "campainha de entrada / batida na porta" quando um convidado solicita acesso à sala
export function playKnockChimeSound(): void {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Toque 1: C5 (523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.onended = () => {
      osc1.disconnect();
      gain1.disconnect();
    };
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Toque 2: G5 (783.99 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.12);
    gain2.gain.setValueAtTime(0.15, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.onended = () => {
      osc2.disconnect();
      gain2.disconnect();
    };
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch {
    // Falha silenciosa
  }
}
