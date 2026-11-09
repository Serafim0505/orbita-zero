import { STORAGE_KEYS } from '../config.js';

// =============================================================================
// AudioManager — todos os sons do jogo são SINTETIZADOS com a Web Audio API.
// Não existe nenhum arquivo .mp3/.wav: cada efeito é uma combinação de
// osciladores (ondas quadrada, senoidal, dente-de-serra...) e ruído branco,
// com envelopes de volume/frequência. Isso evita problemas de direitos autorais
// e de arquivos faltando.
//
// Navegadores só permitem tocar áudio depois de uma interação do usuário,
// por isso o AudioContext só é criado em unlock() (chamado no primeiro
// clique/tecla — veja main.js).
// =============================================================================

const NOISE_SAMPLE_RATE = 44100;

// "Receitas" de cada som. Cada uma recebe o AudioManager e agenda notas.
const SOUNDS = {
  shoot: (a) => a.tone({ type: 'square', from: 900, to: 380, duration: 0.07, volume: 0.05 }),
  enemyShoot: (a) => a.tone({ type: 'triangle', from: 520, to: 200, duration: 0.12, volume: 0.07 }),
  hit: (a) => a.tone({ type: 'square', from: 260, to: 140, duration: 0.05, volume: 0.06 }),
  explosion: (a) => {
    a.noise({ duration: 0.35, volume: 0.3, from: 2200, to: 160 });
    a.tone({ type: 'sine', from: 150, to: 40, duration: 0.3, volume: 0.22 });
  },
  bigExplosion: (a) => {
    a.noise({ duration: 1.1, volume: 0.45, from: 3000, to: 80 });
    a.tone({ type: 'sine', from: 110, to: 30, duration: 0.9, volume: 0.3 });
  },
  damage: (a) => {
    a.tone({ type: 'sawtooth', from: 320, to: 60, duration: 0.35, volume: 0.16 });
    a.noise({ duration: 0.25, volume: 0.22, from: 1400, to: 200 });
  },
  shieldBreak: (a) => a.tone({ type: 'triangle', from: 1300, to: 260, duration: 0.28, volume: 0.15 }),
  powerUp: (a) =>
    [523, 659, 784, 1047].forEach((f, i) =>
      a.tone({ type: 'sine', from: f, duration: 0.1, volume: 0.14, delay: i * 0.06 }),
    ),
  wave: (a) =>
    [440, 660].forEach((f, i) =>
      a.tone({ type: 'triangle', from: f, duration: 0.14, volume: 0.12, delay: i * 0.12 }),
    ),
  alarm: (a) => {
    for (let i = 0; i < 3; i += 1) {
      a.tone({ type: 'square', from: 460, to: 300, duration: 0.28, volume: 0.09, delay: i * 0.4 });
    }
  },
  start: (a) => a.tone({ type: 'square', from: 300, to: 900, duration: 0.18, volume: 0.08 }),
  gameOver: (a) =>
    [392, 330, 262, 196].forEach((f, i) =>
      a.tone({ type: 'sawtooth', from: f, to: f * 0.97, duration: 0.32, volume: 0.1, delay: i * 0.26 }),
    ),
  victory: (a) =>
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) =>
      a.tone({ type: 'triangle', from: f, duration: i === 5 ? 0.5 : 0.16, volume: 0.13, delay: i * 0.15 }),
    ),
};

class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseSamples = null;
    this.noiseBuffer = null;
    this.muted = this.loadMuted();
  }

  /** Chamado pelo BootScene: gera as amostras de ruído (usadas nas explosões). */
  prepare() {
    if (this.noiseSamples) return;
    this.noiseSamples = new Float32Array(NOISE_SAMPLE_RATE);
    for (let i = 0; i < this.noiseSamples.length; i += 1) {
      this.noiseSamples[i] = Math.random() * 2 - 1;
    }
  }

  /** Cria/retoma o AudioContext. Precisa acontecer após uma interação do usuário. */
  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.prepare();
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.6;
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this.ctx.createBuffer(1, this.noiseSamples.length, NOISE_SAMPLE_RATE);
      this.noiseBuffer.copyToChannel(this.noiseSamples, 0);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  play(name) {
    if (!this.ctx || this.muted || this.ctx.state !== 'running') return;
    SOUNDS[name]?.(this);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.6;
    try {
      localStorage.setItem(STORAGE_KEYS.muted, this.muted ? '1' : '0');
    } catch {
      // localStorage pode estar bloqueado (modo privado); o jogo segue sem salvar.
    }
    return this.muted;
  }

  loadMuted() {
    try {
      return localStorage.getItem(STORAGE_KEYS.muted) === '1';
    } catch {
      return false;
    }
  }

  /** Uma nota com frequência que desliza de `from` para `to` e volume em envelope. */
  tone({ type = 'sine', from, to = from, duration, volume = 0.1, delay = 0 }) {
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t0 + duration);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  /** Ruído branco passando por um filtro passa-baixa que "fecha" (som de explosão). */
  noise({ duration, volume = 0.2, from = 2000, to = 200, delay = 0 }) {
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(from, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t0 + duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0, Math.random() * 0.3, duration);
    src.stop(t0 + duration + 0.02);
  }
}

// Exportamos UMA instância (singleton): todas as cenas compartilham o mesmo áudio.
export default new AudioManager();
