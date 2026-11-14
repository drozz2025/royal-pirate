/** Original, procedural ROYAL PIRATE soundtrack and effects. No media downloads or autoplay. */
export const ORIGINAL_MELODY: readonly (number | null)[] = [
  69, null, 72, 74, 76, 74, 72, null,
  67, 69, 71, 72, 71, null, 67, null,
  69, 72, 76, 74, 72, 71, 69, null,
  64, 67, 69, 71, 69, null, 64, null,
];
export const ORIGINAL_BASS: readonly number[] = [45, 43, 41, 40];
export const TEMPO_BPM = 108;
export const STEP_SECONDS = 60 / TEMPO_BPM / 2;
export const midiHz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);
export type AudioCue = 'fire' | 'hit' | 'splash' | 'result';
export type AudioSide = 'player' | 'enemy';

/** AudioContext creation must stay inside a click/touch handler on mobile Safari. */
export class PirateSoundscape {
  musicEnabled = false;
  effectsEnabled = false;
  private context: AudioContext | null = null;
  private musicBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextAt = 0;
  private disposed = false;

  private async activate(): Promise<boolean> {
    if (this.disposed || typeof window === 'undefined' || !window.AudioContext) return false;
    try {
      if (!this.context) {
        const context = new window.AudioContext();
        const music = context.createGain(), effects = context.createGain();
        music.gain.value = 0;
        effects.gain.value = 0.20;
        music.connect(context.destination);
        effects.connect(context.destination);
        this.context = context;
        this.musicBus = music;
        this.effectsBus = effects;
      }
      if (this.context.state !== 'running') await this.context.resume();
      return this.context.state === 'running';
    } catch {
      return false; // Browser audio restrictions must never break the battle.
    }
  }

  async toggleMusic(): Promise<boolean> {
    if (this.musicEnabled) {
      this.musicEnabled = false;
      this.stopMusic();
      return false;
    }
    if (!(await this.activate()) || this.disposed) return false;
    this.musicEnabled = true;
    this.startMusic();
    return true;
  }

  async toggleEffects(): Promise<boolean> {
    if (this.effectsEnabled) {
      this.effectsEnabled = false;
      return false;
    }
    if (!(await this.activate()) || this.disposed) return false;
    this.effectsEnabled = true;
    return true;
  }

  /** A short original nautical motif: 4 bars, no samples and no third-party music. */
  private scheduleMusic() {
    const context = this.context;
    if (!context || !this.musicBus || !this.musicEnabled || context.state !== 'running') return;
    while (this.nextAt < context.currentTime + 0.30) {
      const index = this.step % ORIGINAL_MELODY.length;
      const note = ORIGINAL_MELODY[index];
      if (note !== null) this.tone(midiHz(note), this.nextAt, STEP_SECONDS * 0.82, 0.24, 'triangle', this.musicBus);
      if (index % 8 === 0) {
        const root = ORIGINAL_BASS[Math.floor(index / 8)];
        this.tone(midiHz(root), this.nextAt, STEP_SECONDS * 3.4, 0.24, 'sawtooth', this.musicBus);
        this.tone(midiHz(root + 7), this.nextAt, STEP_SECONDS * 2.3, 0.075, 'triangle', this.musicBus);
      }
      if (index % 4 === 0) this.noiseBurst(this.nextAt, 0.075, 0.07, 500, 'lowpass', this.musicBus);
      if (index % 2 === 0) this.noiseBurst(this.nextAt, 0.025, 0.025, 3300, 'highpass', this.musicBus);
      this.step++;
      this.nextAt += STEP_SECONDS;
    }
  }

  private startMusic() {
    const context = this.context, music = this.musicBus;
    if (!context || !music || !this.musicEnabled || this.disposed || typeof document === 'undefined' || document.hidden) return;
    if (this.timer !== null) return;
    this.nextAt = context.currentTime + 0.08;
    this.step = 0;
    music.gain.cancelScheduledValues(context.currentTime);
    music.gain.setTargetAtTime(0.10, context.currentTime, 0.09);
    this.scheduleMusic();
    this.timer = setInterval(() => this.scheduleMusic(), 120);
  }

  private stopMusic() {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    if (this.context && this.musicBus) {
      this.musicBus.gain.cancelScheduledValues(this.context.currentTime);
      this.musicBus.gain.setTargetAtTime(0, this.context.currentTime, 0.035);
    }
  }

  /** Stops all audio on page hide and resumes only when browser permits it. */
  onVisibility(hidden: boolean) {
    if (!this.context || this.disposed) return;
    if (hidden) {
      this.stopMusic();
      void this.context.suspend().catch(() => {});
    } else if (this.musicEnabled || this.effectsEnabled) {
      void this.context.resume().then(() => {
        if (!this.disposed && this.musicEnabled) this.startMusic();
      }).catch(() => {});
    }
  }

  play(cue: AudioCue, damagedSide?: AudioSide) {
    const context = this.context, bus = this.effectsBus;
    if (!this.effectsEnabled || !context || !bus || context.state !== 'running' || this.disposed) return;
    const t = context.currentTime + 0.005;
    switch (cue) {
      case 'fire':
        this.tone(110, t, 0.48, 0.72, 'triangle', bus, 34);
        this.noiseBurst(t, 0.39, 0.62, 560, 'lowpass', bus);
        break;
      case 'hit':
        this.noiseBurst(t, 0.20, 0.73, 1400, 'bandpass', bus);
        this.tone(150, t, 0.28, 0.39, 'sawtooth', bus, 64);
        this.noiseBurst(t + 0.08, 0.25, 0.15, 900, 'lowpass', bus);
        break;
      case 'splash':
        this.noiseBurst(t, 0.70, 0.54, 1400, 'highpass', bus);
        this.tone(230, t, 0.22, 0.12, 'sine', bus, 75);
        break;
      case 'result': {
        const victory = damagedSide === 'enemy';
        const tones = victory ? [69, 72, 76, 81] : [69, 67, 64, 57];
        tones.forEach((note, i) => this.tone(midiHz(note), t + i * 0.17, 0.34, 0.17, 'triangle', bus));
        break;
      }
    }
  }

  private tone(freq: number, at: number, duration: number, gain: number, wave: OscillatorType, bus: AudioNode, sweep?: number) {
    const context = this.context;
    if (!context) return;
    const oscillator = context.createOscillator(), envelope = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(freq, at);
    if (sweep) oscillator.frequency.exponentialRampToValueAtTime(sweep, at + duration);
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.linearRampToValueAtTime(gain, at + Math.min(0.018, duration * 0.2));
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(envelope);
    envelope.connect(bus);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.02);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }

  private noiseBurst(at: number, duration: number, gain: number, cutoff: number, kind: BiquadFilterType, bus: AudioNode) {
    const context = this.context;
    if (!context) return;
    if (!this.noise) {
      const buffer = context.createBuffer(1, Math.round(context.sampleRate * 2), context.sampleRate);
      const data = buffer.getChannelData(0);
      let seed = 20261114;
      for (let i = 0; i < data.length; i++) {
        seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
        data[i] = (seed / 2147483648) - 1;
      }
      this.noise = buffer;
    }
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), envelope = context.createGain();
    source.buffer = this.noise;
    filter.type = kind;
    filter.frequency.value = cutoff;
    envelope.gain.setValueAtTime(gain, at);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(bus);
    source.start(at);
    source.stop(at + duration + 0.01);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.musicEnabled = false;
    this.effectsEnabled = false;
    this.stopMusic();
    const context = this.context;
    this.context = null;
    this.musicBus = null;
    this.effectsBus = null;
    this.noise = null;
    if (context) void context.close().catch(() => {});
  }
}
