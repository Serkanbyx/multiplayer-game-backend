export type SynthSoundName =
  | 'click'
  | 'turn'
  | 'move'
  | 'win'
  | 'lose'
  | 'draw'
  | 'chat'
  | 'match-found'
  | 'hit'
  | 'miss'
  | 'sunk'
  | 'deploy';

let audioContext: AudioContext | null = null;

const getContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }
  return audioContext;
};

const playTone = (
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
): void => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0001), start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
};

const playNoiseBurst = (
  ctx: AudioContext,
  start: number,
  duration: number,
  volume: number,
): void => {
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  source.buffer = buffer;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(start);
  source.stop(start + duration + 0.05);
};

export const playSynthSound = (name: SynthSoundName, volume = 0.7): void => {
  const ctx = getContext();
  if (!ctx) return;

  const t = ctx.currentTime;
  const v = Math.min(1, Math.max(0, volume));

  switch (name) {
    case 'click':
      playTone(ctx, 880, t, 0.06, v * 0.35, 'square');
      break;
    case 'turn':
      playTone(ctx, 523, t, 0.08, v * 0.45, 'triangle');
      playTone(ctx, 659, t + 0.09, 0.1, v * 0.4, 'triangle');
      break;
    case 'move':
      playTone(ctx, 440, t, 0.07, v * 0.4, 'sine');
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((freq, i) => {
        playTone(ctx, freq, t + i * 0.1, 0.18, v * 0.45, 'triangle');
      });
      break;
    case 'lose':
      [392, 330, 262].forEach((freq, i) => {
        playTone(ctx, freq, t + i * 0.12, 0.2, v * 0.4, 'sawtooth');
      });
      break;
    case 'draw':
      playTone(ctx, 440, t, 0.15, v * 0.35, 'sine');
      playTone(ctx, 440, t + 0.16, 0.15, v * 0.35, 'sine');
      break;
    case 'chat':
      playTone(ctx, 1200, t, 0.05, v * 0.25, 'sine');
      break;
    case 'match-found':
      [440, 554, 659, 880].forEach((freq, i) => {
        playTone(ctx, freq, t + i * 0.08, 0.12, v * 0.5, 'triangle');
      });
      break;
    case 'hit':
      playNoiseBurst(ctx, t, 0.12, v * 0.55);
      playTone(ctx, 120, t, 0.15, v * 0.5, 'square');
      break;
    case 'miss':
      playTone(ctx, 180, t, 0.08, v * 0.35, 'sine');
      playNoiseBurst(ctx, t + 0.02, 0.18, v * 0.2);
      break;
    case 'sunk':
      playNoiseBurst(ctx, t, 0.25, v * 0.65);
      [220, 165, 110].forEach((freq, i) => {
        playTone(ctx, freq, t + 0.05 + i * 0.1, 0.2, v * 0.45, 'sawtooth');
      });
      break;
    case 'deploy':
      playTone(ctx, 330, t, 0.1, v * 0.4, 'triangle');
      playTone(ctx, 494, t + 0.12, 0.15, v * 0.45, 'triangle');
      playTone(ctx, 659, t + 0.28, 0.2, v * 0.5, 'triangle');
      break;
    default:
      break;
  }
};
