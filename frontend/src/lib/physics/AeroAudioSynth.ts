/**
 * Aerodynamic & Multivector Web Audio Synthesizer
 * Procedural Web Audio API sound generator for wind noise, Aeolian vortex tones,
 * rotor hums, and bifurcation alert sonification.
 */

export class AeroAudioSynth {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;
  private masterGain: GainNode | null = null;

  // Noise generator for wind
  private noiseNode: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;

  // Aeolian vortex tone (bivector vorticity sonification)
  private vortexOsc: OscillatorNode | null = null;
  private vortexGain: GainNode | null = null;

  // Sub-bass divergence alert oscillator
  private alertOsc: OscillatorNode | null = null;
  private alertGain: GainNode | null = null;

  private isInitialized = false;

  constructor() {
    // AudioContext will be initialized on user gesture
  }

  public init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Setup Procedural Wind Noise
      this.setupWindNoise();

      // Setup Aeolian Vortex Tone (Vorticity Grade 2 sonification)
      this.setupVortexTone();

      // Setup Divergence Alert (D-Bifurcation alarm)
      this.setupDivergenceAlert();

      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported or context blocked:', e);
    }
  }

  private setupWindNoise() {
    if (!this.ctx || !this.masterGain) return;

    // Create 2-second pink-ish noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11; // scale down
      b6 = white * 0.115926;
    }

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;

    // Filter wind noise with dynamic Low-Pass
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.setValueAtTime(250, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

    this.noiseNode.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    this.noiseNode.start();
  }

  private setupVortexTone() {
    if (!this.ctx || !this.masterGain) return;

    this.vortexOsc = this.ctx.createOscillator();
    this.vortexOsc.type = 'sine';
    this.vortexOsc.frequency.setValueAtTime(180, this.ctx.currentTime);

    this.vortexGain = this.ctx.createGain();
    this.vortexGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

    this.vortexOsc.connect(this.vortexGain);
    this.vortexGain.connect(this.masterGain);

    this.vortexOsc.start();
  }

  private setupDivergenceAlert() {
    if (!this.ctx || !this.masterGain) return;

    this.alertOsc = this.ctx.createOscillator();
    this.alertOsc.type = 'sawtooth';
    this.alertOsc.frequency.setValueAtTime(65, this.ctx.currentTime);

    this.alertGain = this.ctx.createGain();
    this.alertGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

    this.alertOsc.connect(this.alertGain);
    this.alertGain.connect(this.masterGain);

    this.alertOsc.start();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!this.isInitialized && !muted) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended' && !muted) {
      this.ctx.resume();
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.15, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Update audio parameters based on live synthetic telemetry sample
   */
  public update(windSpeed: number, bivectorNorm: number, divergence: number, label: number) {
    if (this.isMuted || !this.ctx || !this.isInitialized) return;

    const now = this.ctx.currentTime;

    // 1. Modulate Wind Noise filter cutoff by wind speed (0 to 30 m/s)
    if (this.windFilter && this.windGain) {
      const cutoff = 150 + Math.pow(windSpeed / 30, 1.4) * 1800; // 150Hz to 1950Hz
      const targetGain = Math.min(0.4, 0.05 + (windSpeed / 30) * 0.35);

      this.windFilter.frequency.setTargetAtTime(cutoff, now, 0.05);
      this.windGain.gain.setTargetAtTime(targetGain, now, 0.05);
    }

    // 2. Modulate Aeolian Vortex tone (Grade 2 bivector vorticity)
    if (this.vortexOsc && this.vortexGain) {
      // Frequency rises with vorticity (Aeolian whistle effect)
      const pitch = 180 + bivectorNorm * 320; // 180Hz to 500Hz
      const vGain = Math.min(0.25, bivectorNorm * 0.15);

      this.vortexOsc.frequency.setTargetAtTime(pitch, now, 0.05);
      this.vortexGain.gain.setTargetAtTime(vGain, now, 0.08);
    }

    // 3. Modulate Divergence & Bifurcation Alarm
    if (this.alertOsc && this.alertGain) {
      if (label === 2) { // D-Bifurcation divergence
        const alertPitch = 70 + Math.sin(now * 15) * 20; // Pulsing alarm tone
        this.alertOsc.frequency.setTargetAtTime(alertPitch, now, 0.02);
        this.alertGain.gain.setTargetAtTime(0.18, now, 0.03);
      } else if (label === 1) { // P-Bifurcation gust pulse
        const alertPitch = 120 + Math.sin(now * 8) * 10;
        this.alertOsc.frequency.setTargetAtTime(alertPitch, now, 0.05);
        this.alertGain.gain.setTargetAtTime(0.06, now, 0.05);
      } else {
        this.alertGain.gain.setTargetAtTime(0.001, now, 0.1);
      }
    }
  }

  public playClickSound() {
    if (this.isMuted || !this.ctx || !this.isInitialized) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.035);
    } catch (e) {
      // ignore
    }
  }
}

export const aeroAudio = new AeroAudioSynth();
