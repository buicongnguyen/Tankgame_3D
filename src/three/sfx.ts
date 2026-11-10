/**
 * Synthesised battle and menu sounds: filtered noise for guns and blasts, short tones for the interface.
 * No audio files. Every voice is short, voices are capped, and repeats of one sound are spaced out,
 * so a busy fight cannot pile up nodes or clip.
 */
export type Sfx =
  | 'cannon' | 'rocket' | 'rapid' | 'laser'
  | 'hit' | 'weak' | 'kill' | 'bossKill' | 'blast' | 'hurt'
  | 'buy' | 'deploy' | 'win' | 'star' | 'medal' | 'fail';

/** Shortest gap between two plays of the same sound, in seconds. */
const GAP: Record<Sfx, number> = {
  cannon: .05, rocket: .06, rapid: .045, laser: .08,
  hit: .05, weak: .08, kill: .08, bossKill: .5, blast: .09, hurt: .12,
  buy: .05, deploy: .3, win: .5, star: .05, medal: .05, fail: .5,
};
const MAX_VOICES = 14;

export class SoundBank {
  private ctx?: AudioContext;
  private out?: AudioNode;
  private noise?: AudioBuffer;
  private voices = 0;
  private last = new Map<Sfx, number>();
  /** Sounds started since the page loaded, by name (tests and tuning). */
  readonly played: Partial<Record<Sfx, number>> = {};

  private enabled: () => boolean;
  constructor(enabled: () => boolean) { this.enabled = enabled; }

  private ready(): AudioContext | null {
    if (!this.enabled()) return null;
    try {
      if (!this.ctx) {
        const ctx = new AudioContext();
        // A gentle limiter keeps overlapping blasts from clipping.
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -14; limiter.ratio.value = 8; limiter.attack.value = .003; limiter.release.value = .12;
        limiter.connect(ctx.destination);
        const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), data = buffer.getChannelData(0);
        let seed = 9173;
        for (let i = 0; i < data.length; i++) { seed = (seed * 16807) % 2147483647; data[i] = seed / 1073741823.5 - 1; }
        this.ctx = ctx; this.out = limiter; this.noise = buffer;
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch { return null; /* Audio is optional. */ }
  }

  private track(node: AudioScheduledSourceNode, tail: AudioNode[]) {
    this.voices++;
    node.onended = () => { this.voices--; node.disconnect(); for (const n of tail) n.disconnect(); };
  }

  /** A pitched voice that glides from `from` to `to` Hz. */
  private sweep(type: OscillatorType, from: number, to: number, duration: number, volume: number, delay = 0) {
    const ctx = this.ctx!, t = ctx.currentTime + delay, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(from, t); osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + duration);
    gain.gain.setValueAtTime(.0001, t); gain.gain.linearRampToValueAtTime(volume, t + .006); gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    osc.connect(gain); gain.connect(this.out!); this.track(osc, [gain]); osc.start(t); osc.stop(t + duration + .02);
  }

  /** A burst of noise through a closing low-pass filter: the body of every gun and explosion. */
  private burst(from: number, to: number, duration: number, volume: number, delay = 0, kind: BiquadFilterType = 'lowpass') {
    const ctx = this.ctx!, t = ctx.currentTime + delay, src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    src.buffer = this.noise!; src.loop = true; src.loopStart = 0; src.loopEnd = 1;
    filter.type = kind; filter.frequency.setValueAtTime(from, t); filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + duration);
    gain.gain.setValueAtTime(volume, t); gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    src.connect(filter); filter.connect(gain); gain.connect(this.out!); this.track(src, [filter, gain]);
    src.start(t, (t * 7.3) % .9); src.stop(t + duration + .02);
  }

  /** The original single beep, kept for callers that pick their own pitch. */
  tone(frequency: number, duration: number, volume: number) {
    if (!this.ready() || this.voices >= MAX_VOICES) return;
    try { this.sweep('triangle', frequency, frequency * .4, duration, volume); } catch { /* Audio is optional. */ }
  }

  play(name: Sfx, scale = 1) {
    const ctx = this.ready(); if (!ctx) return;
    const now = ctx.currentTime, last = this.last.get(name) ?? -1;
    if (now - last < GAP[name] || this.voices >= MAX_VOICES) return;
    this.last.set(name, now); this.played[name] = (this.played[name] ?? 0) + 1;
    const v = Math.max(.2, Math.min(1.4, scale));
    try {
      switch (name) {
        case 'cannon': this.burst(1900, 140, .22, .2 * v); this.sweep('sine', 120, 42, .2, .22 * v); break;
        case 'rocket': this.burst(700, 2600, .28, .1 * v, 0, 'bandpass'); this.sweep('sawtooth', 210, 90, .22, .035 * v); break;
        case 'rapid': this.burst(2600, 500, .06, .1 * v); this.sweep('square', 180, 90, .05, .03 * v); break;
        case 'laser': this.sweep('sawtooth', 1500, 320, .16, .045 * v); this.sweep('sine', 2200, 600, .12, .03 * v); break;
        case 'hit': this.burst(3200, 900, .05, .07 * v, 0, 'bandpass'); this.sweep('triangle', 520, 260, .05, .035 * v); break;
        case 'weak': this.burst(3600, 1200, .07, .08 * v, 0, 'bandpass'); this.sweep('triangle', 880, 1320, .09, .05 * v); break;
        case 'kill': this.burst(1500, 90, .34, .2 * v); this.sweep('sine', 150, 38, .3, .2 * v); this.sweep('triangle', 660, 990, .12, .04 * v, .05); break;
        case 'bossKill': this.burst(1300, 60, .9, .26); this.sweep('sine', 130, 30, .8, .26); this.burst(900, 80, .5, .16, .28); this.sweep('triangle', 523, 1046, .4, .05, .2); break;
        case 'blast': this.burst(1100, 70, .4, .2 * v); this.sweep('sine', 95, 32, .34, .2 * v); break;
        case 'hurt': this.burst(900, 180, .1, .12 * v); this.sweep('square', 110, 55, .12, .05 * v); break;
        case 'buy': this.sweep('triangle', 660, 660, .06, .05); this.sweep('triangle', 990, 990, .1, .05, .06); break;
        case 'deploy': this.sweep('sawtooth', 70, 150, .5, .04); this.burst(300, 900, .5, .04); break;
        case 'win': [523, 659, 784, 1046].forEach((f, i) => this.sweep('triangle', f, f, i === 3 ? .5 : .16, .07, i * .11)); break;
        case 'star': this.sweep('triangle', 880 * v, 880 * v, .05, .06); this.sweep('sine', 1760 * v, 1760 * v, .22, .05, .03); break;
        case 'medal': this.sweep('triangle', 1175, 1175, .07, .05); this.sweep('sine', 1568, 1568, .26, .05, .06); break;
        case 'fail': [392, 330, 262].forEach((f, i) => this.sweep('triangle', f, f * .97, i === 2 ? .5 : .2, .06, i * .17)); break;
      }
    } catch { /* Audio is optional. */ }
  }
}
