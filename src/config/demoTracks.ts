/**
 * demoTracks.ts — Pistas de demostración integradas y Generador Procedural Web Audio
 *
 * Provee pistas predeterminadas de alta calidad y un sintetizador procedural nativo
 * a 124 BPM para garantizar que los visualizadores 3D SIEMPRE reaccionen con sonido
 * desde el primer segundo sin requerir conexión a internet ni archivos externos.
 */

import type { Track } from '../types/audio';

export const DEMO_TRACKS: Track[] = [
  {
    id: 'demo_synthwave_01',
    title: 'Neon Odyssey (124 BPM)',
    artist: 'Aura3D Cyber Engine',
    duration: 180,
    sourceType: 'demo',
    album: 'Auralis Studio Sessions',
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&h=300&fit=crop&q=80',
    addedAt: Date.now(),
  },
  {
    id: 'demo_lofi_03',
    title: 'Midnight Velvet Chill',
    artist: 'Atmospheric Waves',
    duration: 195,
    sourceType: 'demo',
    album: 'Auralis Studio Sessions',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop&q=80',
    addedAt: Date.now(),
  },
];

/**
 * Generador Procedural de Beat Musical en Web Audio API nativo.
 * Produce:
 *  - Bombo punchy sub-bass (55Hz -> 20Hz envelope) en cada tiempo (4/4).
 *  - Snare / Clap en tiempos 2 y 4 con ruido blanco filtrado.
 *  - Hi-hats rítmicos en corcheas.
 *  - Sintetizador arpegiado pentatónico con filtro resonante para medios y agudos.
 */
export class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private destNode: AudioNode | null = null;
  private isRunning = false;
  private timerId: number | null = null;
  private step = 0;
  public readonly bpm = 124;
  public readonly secondsPerBeat = 60 / 124;
  private stepInterval = (60 / 124) / 4; // semicorcheas

  // Escala pentatónica menor en Hz (A2, C3, D3, E3, G3, A3, C4...)
  private bassNotes = [110, 130.81, 146.83, 164.81, 196.0, 220.0];

  public start(ctx: AudioContext, destination: AudioNode): void {
    if (this.isRunning) return;
    this.ctx = ctx;
    this.destNode = destination;
    this.isRunning = true;
    this.step = 0;

    const schedule = () => {
      if (!this.isRunning || !this.ctx || !this.destNode) return;
      this.playStep(this.ctx.currentTime + 0.05);
      this.step = (this.step + 1) % 16;
      this.timerId = window.setTimeout(schedule, this.stepInterval * 1000);
    };

    schedule();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private playStep(time: number): void {
    if (!this.ctx || !this.destNode) return;

    // 1. Kick en los tiempos principales (pasos 0, 4, 8, 12)
    if (this.step % 4 === 0) {
      this.triggerKick(time);
    }

    // 2. Snare en pasos 4 y 12
    if (this.step === 4 || this.step === 12) {
      this.triggerSnare(time);
    }

    // 3. Hi-Hat en cada paso impar
    if (this.step % 2 === 1) {
      this.triggerHiHat(time, this.step % 4 === 2 ? 0.35 : 0.2);
    }

    // 4. Synth Bassline arpegiada
    if (this.step % 2 === 0) {
      const noteIdx = (Math.floor(this.step / 2) + Math.floor(this.step / 8) * 2) % this.bassNotes.length;
      this.triggerSynth(time, this.bassNotes[noteIdx]);
    }
  }

  private triggerKick(time: number): void {
    if (!this.ctx || !this.destNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Frequency drop: 150Hz -> 38Hz (potente golpe de sub-bass)
    osc.frequency.setValueAtTime(145, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.16);

    gain.gain.setValueAtTime(1.1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc.connect(gain);
    gain.connect(this.destNode);

    osc.start(time);
    osc.stop(time + 0.36);
  }

  private triggerSnare(time: number): void {
    if (!this.ctx || !this.destNode) return;

    // Noise buffer
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.45, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.destNode);

    noise.start(time);
    noise.stop(time + 0.15);
  }

  private triggerHiHat(time: number, vol: number): void {
    if (!this.ctx || !this.destNode) return;

    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(9500, time);
    filter.Q.setValueAtTime(3.5, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.destNode);

    noise.start(time);
    noise.stop(time + 0.045);
  }

  private triggerSynth(time: number, freq: number): void {
    if (!this.ctx || !this.destNode) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    // Resonant sweep
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, time);
    filter.frequency.exponentialRampToValueAtTime(1800, time + 0.06);
    filter.frequency.exponentialRampToValueAtTime(450, time + 0.22);
    filter.Q.setValueAtTime(4.0, time);

    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.destNode);

    osc.start(time);
    osc.stop(time + 0.26);
  }
}

export const proceduralAudio = new ProceduralAudioEngine();
