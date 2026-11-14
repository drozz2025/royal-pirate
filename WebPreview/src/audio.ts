import type { BattleEvent } from './battle';

/** Original synthesized audio for the independent browser preview.
 * Audio starts only after an explicit user gesture; no licensed recordings.
 */
export class PirateAudio {
  private context: AudioContext | null = null;
  private musicBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBeat = 0;
  private beat = 0;
  private hidden = document.hidden;
  private disposed = false;
  musicEnabled = false;
  effectsEnabled = false;

  private async unlock(): Promise<boolean> {
    if (this.disposed || typeof AudioContext === 'undefined') return false;
    try {
      if (!this.context) {
        const context = new AudioContext();
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.ratio.value = 4;
        compressor.connect(context.destination);
        this.musicBus = context.createGain();
        this.musicBus.gain.value = 0;
        this.musicBus.connect(compressor);
        this.effectsBus = context.createGain();
        this.effectsBus.gain.value = 0.28;
        this.effectsBus.connect(compressor);
        this.context = context;
      }
      if (!this.hidden && this.context.state !== 'running') await this.context.resume();
      return !this.hidden && this.context.state === 'running';
    } catch {
      return false;
    }
  }

  async toggleMusic(): Promise<boolean> {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled) { this.stopMusic(); return false; }
    if (!(await this.unlock())) {
      this.musicEnabled = false;
      return false;
    }
    if (this.musicEnabled) this.startMusic();
    return this.musicEnabled;
  }

  async toggleEffects(): Promise<boolean> {
    this.effectsEnabled = !this.effectsEnabled;
    if (!this.effectsEnabled) return false;
    if (!(await this.unlock())) { this.effectsEnabled = false; return false; }
    return this.effectsEnabled;
  }

  private tone(frequency: number, duration: number, level: number, type: OscillatorType,
    bus: GainNode, time: number, finishFrequency = frequency) {
    const context = this.context;
    if (!context) return;
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), time);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, finishFrequency), time + duration);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), time + Math.min(0.025, duration / 5));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(gain);
    gain.connect(bus);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.01);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  private hiss(time: number, duration: number, level: number, cutoff: number, type: BiquadFilterType) {
    const context = this.context, bus = this.effectsBus;
    if (!context || !bus) return;
    if (!this.noise) {
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.75), context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      this.noise = buffer;
    }
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = this.noise;
    filter.type = type;
    filter.frequency.setValueAtTime(cutoff, time);
    if (type === 'lowpass') filter.frequency.exponentialRampToValueAtTime(Math.max(150, cutoff / 4), time + duration);
    gain.gain.setValueAtTime(Math.max(0.0002, level), time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter); filter.connect(gain); gain.connect(bus);
    source.start(time);
    source.stop(time + duration);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  play(event: BattleEvent) {
    const context = this.context, bus = this.effectsBus;
    if (this.disposed || this.hidden || !this.effectsEnabled || !context || !bus || context.state !== 'running') return;
    const t = context.currentTime + 0.002;
    switch (event.type) {
      case 'fire':
        this.tone(124, 0.46, 0.95, 'triangle', bus, t, 34);
        this.hiss(t, 0.16, 0.25, 1400, 'lowpass');
        break;
      case 'hit':
        this.tone(88, 0.32, 0.6, 'sawtooth', bus, t, 46);
        this.hiss(t, 0.28, 0.32, 1050, 'bandpass');
        this.tone(330, 0.13, 0.12, 'square', bus, t, 110);
        break;
      case 'splash':
        this.hiss(t, 0.6, 0.31, 3200, 'lowpass');
        this.tone(230, 0.24, 0.09, 'sine', bus, t, 100);
        break;
      case 'result': {
        const notes = event.side === 'enemy' ? [392, 493.88, 587.33, 783.99] : [392, 349.23, 293.66, 196];
        notes.forEach((note, i) => this.tone(note, 0.31, 0.18, 'triangle', bus, t + i * 0.18));
        break;
      }
    }
  }

  private scheduleMusic() {
    const context = this.context, bus = this.musicBus;
    if (this.disposed || this.hidden || !this.musicEnabled || !context || !bus || context.state !== 'running') return;
    // Original 16-beat maritime motif in D minor; synthesized rather than sampled.
    const melody = [293.66, 440, 523.25, 440, 349.23, 392, 587.33, 440,
      293.66, 392, 493.88, 392, 261.63, 349.23, 440, 349.23];
    const bass = [146.83, 174.61, 196, 130.81];
    let scheduled = 0;
    while (this.nextBeat < context.currentTime + 0.36 && scheduled++ < 6) {
      const step = this.beat % 16;
      this.tone(melody[step], 0.25, 0.22, 'triangle', bus, this.nextBeat);
      if (step % 4 === 0) this.tone(bass[Math.floor(step / 4)], 1.05, 0.18, 'sine', bus, this.nextBeat);
      if (step % 2 === 0) this.tone(146.83, 0.07, 0.07, 'triangle', bus, this.nextBeat, 110);
      this.nextBeat += 0.36;
      this.beat++;
    }
  }

  private startMusic() {
    const context = this.context, bus = this.musicBus;
    if (!context || !bus || this.hidden || this.timer !== null) return;
    bus.gain.setTargetAtTime(0.21, context.currentTime, 0.06);
    this.nextBeat = context.currentTime + 0.05;
    this.scheduleMusic();
    this.timer = setInterval(() => this.scheduleMusic(), 90);
  }

  private stopMusic() {
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
    if (this.context && this.musicBus) this.musicBus.gain.setTargetAtTime(0, this.context.currentTime, 0.05);
  }

  setHidden(hidden: boolean) {
    this.hidden = hidden;
    if (hidden) {
      this.stopMusic();
      if (this.context?.state === 'running') void this.context.suspend().catch(() => {});
    } else if (this.context && (this.musicEnabled || this.effectsEnabled)) {
      void this.context.resume().then(() => {
        if (!this.disposed && !this.hidden && this.musicEnabled) this.startMusic();
      }).catch(() => {});
    }
  }

  dispose() {
    this.disposed = true;
    this.stopMusic();
    this.musicEnabled = this.effectsEnabled = false;
    if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => {});
    this.context = null;
    this.musicBus = this.effectsBus = null;
    this.noise = null;
  }
}
