import type { InstrumentVoice } from './types';

/**
 * KarplusStrongVoice — Modelado físico de cuerda pulsada (Guitarra Acústica/Eléctrica).
 *
 * Algoritmo Karplus-Strong:
 * Disparo de excitación de ruido blanco de longitud L = 1/frecuencia
 * recirculado a través de una línea de retardo con filtrado paso-bajo y realimentación (0.988).
 *
 *              Ráfaga de Ruido (1 / f)
 *                        │
 *                        ▼
 *                      [ + ] <─────────────────────────┐
 *                        │                             │
 *                        ▼                             │
 *                   DelayNode (tiempo = 1 / f)         │
 *                        │                             │
 *                        ▼                             │
 *                   BiquadFilter (Lowpass 4800 Hz)      │
 *                        │                             │
 *                        ▼                             │
 *                   GainNode (Feedback 0.986) ─────────┘
 *                        │
 *                        ▼
 *                    Voice Gain
 *                        │
 *                        ▼
 *                  InstrumentBus
 */
export class KarplusStrongVoice implements InstrumentVoice {
  private delayNode: DelayNode;
  private feedbackFilter: BiquadFilterNode;
  private feedbackGain: GainNode;
  private voiceGain: GainNode;
  private noiseSource: AudioBufferSourceNode | null = null;
  private ctx: AudioContext;
  private outputNode: AudioNode;
  private active = false;

  constructor(ctx: AudioContext, outputNode: AudioNode) {
    this.ctx = ctx;
    this.outputNode = outputNode;
    this.delayNode = ctx.createDelay(0.08); // Hasta 12.5 Hz mínimo
    this.feedbackFilter = ctx.createBiquadFilter();
    this.feedbackFilter.type = 'lowpass';
    this.feedbackFilter.frequency.setValueAtTime(5200, ctx.currentTime);

    this.feedbackGain = ctx.createGain();
    this.feedbackGain.gain.setValueAtTime(0.986, ctx.currentTime);

    this.voiceGain = ctx.createGain();
    this.voiceGain.gain.setValueAtTime(0, ctx.currentTime);

    // Bucle de realimentación resonante de la cuerda
    this.delayNode.connect(this.feedbackFilter);
    this.feedbackFilter.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayNode);

    // Salida hacia el bus de instrumentos
    this.feedbackFilter.connect(this.voiceGain);
    this.voiceGain.connect(this.outputNode);
  }

  public isAvailable(): boolean {
    return !this.active;
  }

  public start(freq: number, velocity: number = 0.9, time: number): void {
    this.stop(time);
    this.active = true;

    const vel = Math.max(0.1, Math.min(1.0, velocity));

    // Periodo de retardo correspondiente a la frecuencia fundamental
    const period = Math.max(0.0008, Math.min(0.04, 1.0 / freq));
    this.delayNode.delayTime.setValueAtTime(period, time);

    // Amortiguamiento según la velocidad de pulsación
    const feedback = Math.min(0.992, 0.978 + vel * 0.012);
    this.feedbackGain.gain.setValueAtTime(feedback, time);

    // Generar buffer de ruido para la pulsación de la púa (duración = 1 periodo)
    const bufferSize = Math.max(64, Math.floor(this.ctx.sampleRate * period));
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Disipación de energía triangular para suavizar el chasquido
      const decay = 1.0 - i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * decay;
    }

    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;

    this.voiceGain.gain.cancelScheduledValues(time);
    this.voiceGain.gain.setValueAtTime(vel * 0.65, time);

    // Conectar la excitación al bucle
    this.noiseSource.connect(this.delayNode);
    this.noiseSource.start(time);
  }

  public stop(time: number): void {
    if (!this.active) return;
    this.active = false;

    // Apagar la vibración de la cuerda
    this.voiceGain.gain.cancelScheduledValues(time);
    this.voiceGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);

    try {
      this.noiseSource?.stop(time + 0.05);
      this.noiseSource?.disconnect();
    } catch {
      // Seguro
    }
    this.noiseSource = null;
  }

  public dispose(): void {
    this.stop(this.ctx.currentTime);
    this.delayNode.disconnect();
    this.feedbackFilter.disconnect();
    this.feedbackGain.disconnect();
    this.voiceGain.disconnect();
  }
}
