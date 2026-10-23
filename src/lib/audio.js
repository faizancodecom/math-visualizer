/**
 * Authentic Drawing Waveform Synthesizer (Web Audio API)
 * 1. Constructs a custom PeriodicWave directly from the user drawing's Fourier (re, im) coefficients.
 * 2. Modulates frequency, filter cutoff, and stereo/harmonic balance in real-time
 *    as the pendulum tip traces (x(t), y(t)).
 */

class WaveAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.filterNode = null;
    this.oscY = null; // Primary oscillator driven by custom PeriodicWave & y(t)
    this.oscX = null; // Secondary harmonic oscillator driven by x(t)
    this.gainY = null;
    this.gainX = null;
    this.isPlaying = false;
    this.baseFreq = 180; // Base center frequency in Hz
    this.lastTip = { x: 0, y: 0 };
    this.maxRadius = 150;
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();

      // Master volume with soft limiter behavior
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

      // Low-pass filter that opens/closes with pen drawing velocity
      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(1400, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(2.5, this.ctx.currentTime);

      this.filterNode.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Builds a native Web Audio PeriodicWave directly from the drawing's Fourier coefficients
   */
  buildPeriodicWaveFromDrawing(fourierData) {
    if (!this.ctx || !fourierData || fourierData.length === 0) return null;

    const numCoeffs = 64;
    const real = new Float32Array(numCoeffs);
    const imag = new Float32Array(numCoeffs);

    real[0] = 0; // DC offset zeroed for audio speaker safety
    imag[0] = 0;

    // Estimate overall scale for normalization
    const maxR = fourierData[0]?.radius || 1;
    this.maxRadius = Math.max(40, maxR * 1.5);

    fourierData.forEach(term => {
      const k = Math.abs(term.freq);
      if (k > 0 && k < numCoeffs) {
        // Combine positive and negative frequency modes into the harmonic table
        real[k] += term.re / maxR;
        imag[k] += term.im / maxR;
      }
    });

    // Ensure at least fundamental has some presence if drawing is tiny
    if (Math.hypot(real[1], imag[1]) < 0.05) {
      imag[1] = 0.5;
    }

    try {
      return this.ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    } catch (e) {
      return null;
    }
  }

  updateHarmonics(fourierData) {
    if (!this.isPlaying || !this.ctx || !fourierData || fourierData.length === 0) return;

    const customWave = this.buildPeriodicWaveFromDrawing(fourierData);

    // If oscillators aren't running yet, create them
    if (!this.oscY) {
      this.oscY = this.ctx.createOscillator();
      this.oscX = this.ctx.createOscillator();
      this.gainY = this.ctx.createGain();
      this.gainX = this.ctx.createGain();

      this.gainY.gain.setValueAtTime(0.65, this.ctx.currentTime);
      this.gainX.gain.setValueAtTime(0.35, this.ctx.currentTime);

      this.oscY.connect(this.gainY);
      this.oscX.connect(this.gainX);
      this.gainY.connect(this.filterNode);
      this.gainX.connect(this.filterNode);

      this.oscY.frequency.setValueAtTime(this.baseFreq, this.ctx.currentTime);
      this.oscX.frequency.setValueAtTime(this.baseFreq * 1.5, this.ctx.currentTime);

      this.oscY.start();
      this.oscX.start();
    }

    if (customWave) {
      try {
        this.oscY.setPeriodicWave(customWave);
        this.oscX.setPeriodicWave(customWave);
      } catch (e) {
        this.oscY.type = 'sawtooth';
        this.oscX.type = 'triangle';
      }
    }
  }

  /**
   * Called every animation frame with the live pen tip (x, y)
   * so the sound pitch and timbre trace the drawing's exact wave motion!
   */
  modulateWithTip(tip) {
    if (!this.isPlaying || !this.ctx || !this.oscY || !this.oscX || !tip) return;

    const now = this.ctx.currentTime;
    const normX = Math.max(-1.5, Math.min(1.5, tip.x / this.maxRadius));
    const normY = Math.max(-1.5, Math.min(1.5, -tip.y / this.maxRadius)); // invert Y so higher on screen = higher pitch

    // Instantaneous pen speed (dx, dy)
    const dx = tip.x - this.lastTip.x;
    const dy = tip.y - this.lastTip.y;
    const speed = Math.hypot(dx, dy);
    this.lastTip = { x: tip.x, y: tip.y };

    // Map Y wave position to primary frequency (glides smoothly with the wave!)
    const freqY = this.baseFreq * Math.pow(2, normY * 0.55);
    // Map X wave position to secondary harmonic frequency
    const freqX = (this.baseFreq * 1.25) * Math.pow(2, normX * 0.4);

    // Map pen velocity to filter brightness (faster strokes = brighter harmonics)
    const cutoff = Math.min(4500, Math.max(350, 700 + speed * 85));

    try {
      this.oscY.frequency.setTargetAtTime(freqY, now, 0.015);
      this.oscX.frequency.setTargetAtTime(freqX, now, 0.015);
      this.filterNode.frequency.setTargetAtTime(cutoff, now, 0.02);
    } catch (e) {}
  }

  stopOscillators() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    try {
      if (this.gainY) this.gainY.gain.setTargetAtTime(0, now, 0.015);
      if (this.gainX) this.gainX.gain.setTargetAtTime(0, now, 0.015);
    } catch (e) {}

    const oldOscY = this.oscY;
    const oldOscX = this.oscX;
    this.oscY = null;
    this.oscX = null;
    this.gainY = null;
    this.gainX = null;

    setTimeout(() => {
      try { if (oldOscY) oldOscY.stop(); } catch (e) {}
      try { if (oldOscX) oldOscX.stop(); } catch (e) {}
    }, 60);
  }

  start(fourierData) {
    this.init();
    this.isPlaying = true;
    this.updateHarmonics(fourierData);
  }

  stop() {
    this.isPlaying = false;
    this.stopOscillators();
  }

  toggle(fourierData) {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start(fourierData);
      return true;
    }
  }
}

export const audioEngine = new WaveAudioEngine();
