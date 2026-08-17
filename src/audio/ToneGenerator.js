/**
 * Web Audio API Signal & Tone Generator
 * Generates calibrated Sine waves (100Hz, 440Hz, 1kHz, 10kHz), Pink Noise, and White Noise
 * for testing XR18 signal paths, gain staging, and IEM monitor levels.
 */
export class ToneGenerator {
  constructor() {
    this.audioCtx = null;
    this.oscNode = null;
    this.gainNode = null;
    this.noiseNode = null;
    this.isPlaying = false;
    this.type = 'sine'; // 'sine' | 'pink' | 'white'
    this.frequency = 1000; // 1kHz test tone
    this.levelDb = -18; // -18 dBFS nominal broadcast/digital mixer calibration
  }

  ensureContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  dbToGain(db) {
    if (db <= -60) return 0;
    return Math.pow(10, db / 20);
  }

  start(type = this.type, freq = this.frequency, db = this.levelDb) {
    this.ensureContext();
    this.stop();

    this.type = type;
    this.frequency = freq;
    this.levelDb = db;

    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.setValueAtTime(this.dbToGain(db), this.audioCtx.currentTime);
    this.gainNode.connect(this.audioCtx.destination);

    if (type === 'sine') {
      this.oscNode = this.audioCtx.createOscillator();
      this.oscNode.type = 'sine';
      this.oscNode.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      this.oscNode.connect(this.gainNode);
      this.oscNode.start();
    } else if (type === 'white' || type === 'pink') {
      const bufferSize = this.audioCtx.sampleRate * 2;
      const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      if (type === 'white') {
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
      } else {
        // Pink noise filter algorithm (Paul Kellet's method)
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
      }

      this.noiseNode = this.audioCtx.createBufferSource();
      this.noiseNode.buffer = noiseBuffer;
      this.noiseNode.loop = true;
      this.noiseNode.connect(this.gainNode);
      this.noiseNode.start();
    }

    this.isPlaying = true;
  }

  setFrequency(freq) {
    this.frequency = freq;
    if (this.oscNode && this.isPlaying) {
      this.oscNode.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
    }
  }

  setLevel(db) {
    this.levelDb = db;
    if (this.gainNode && this.isPlaying) {
      this.gainNode.gain.setValueAtTime(this.dbToGain(db), this.audioCtx.currentTime);
    }
  }

  stop() {
    if (this.oscNode) {
      try { this.oscNode.stop(); } catch (e) {}
      this.oscNode.disconnect();
      this.oscNode = null;
    }
    if (this.noiseNode) {
      try { this.noiseNode.stop(); } catch (e) {}
      this.noiseNode.disconnect();
      this.noiseNode = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    this.isPlaying = false;
  }

  toggle(type, freq, db) {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start(type, freq, db);
    }
    return this.isPlaying;
  }
}
