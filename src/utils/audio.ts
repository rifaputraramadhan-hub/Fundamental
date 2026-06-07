class Synthesizer {
  audioCtx: AudioContext | null = null;
  isEnabled: boolean = false;

  bgmInterval: NodeJS.Timeout | null = null;
  bgmStep = 0;
  // A simple pentatonic/synthwave arpeggio
  bgmFreqs = [220.00, 261.63, 329.63, 392.00, 329.63, 261.63, 220.00, 196.00];

  init() {
    if (!this.audioCtx) {
      try {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.isEnabled = true;
      } catch (e) {
        console.warn('Web Audio API not supported');
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  startBGM() {
    if (!this.isEnabled || !this.audioCtx) return;
    if (this.bgmInterval) return; // Already running

    this.bgmStep = 0;
    this.bgmInterval = setInterval(() => {
      // Soft, plucky background arpeggiator
      this.playTone(this.bgmFreqs[this.bgmStep], 'triangle', 0.15, 0.02);
      this.bgmStep = (this.bgmStep + 1) % this.bgmFreqs.length;
    }, 300); // ~200 BPM 8th notes
  }

  stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1) {
    if (!this.isEnabled || !this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      
      gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      // Ignore audio errors
    }
  }

  playClick() {
    this.playTone(800, 'sine', 0.1, 0.05);
  }

  playTick() {
    this.playTone(1200, 'square', 0.05, 0.02);
  }

  playWin() {
    if (!this.isEnabled || !this.audioCtx) return;
    const t = this.audioCtx.currentTime;
    this.playTone(400, 'sine', 0.1, 0.1);
    setTimeout(() => this.playTone(600, 'sine', 0.1, 0.1), 100);
    setTimeout(() => this.playTone(800, 'sine', 0.3, 0.1), 200);
  }

  playLose() {
    if (!this.isEnabled || !this.audioCtx) return;
    this.playTone(300, 'sawtooth', 0.3, 0.1);
    setTimeout(() => this.playTone(250, 'sawtooth', 0.4, 0.1), 200);
    setTimeout(() => this.playTone(200, 'sawtooth', 0.5, 0.1), 400);
  }

  playDrama() {
    if (!this.isEnabled || !this.audioCtx) return;
    this.playTone(80, 'sawtooth', 2.0, 0.15);
  }
}

export const sysAudio = new Synthesizer();
