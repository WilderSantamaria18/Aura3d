import { airSynth } from './airSynthEngine';
import { usePlayerStore } from '../stores/playerStore';

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
  state: string;
  type: 'input' | 'output';
}

class MidiService {
  private static instance: MidiService;
  private midiAccess: any = null;
  private connectedInputs: Map<string, any> = new Map();
  private isSupported: boolean = false;
  private listeners: ((devices: MidiDevice[]) => void)[] = [];

  private constructor() {
    this.isSupported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  }

  public static getInstance(): MidiService {
    if (!MidiService.instance) {
      MidiService.instance = new MidiService();
    }
    return MidiService.instance;
  }

  public isMidiAvailable(): boolean {
    return this.isSupported;
  }

  public async init(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('[MidiService] Web MIDI API no soportada en este navegador.');
      return false;
    }

    if (this.midiAccess) return true;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = navigator as any;
      this.midiAccess = await nav.requestMIDIAccess({ sysex: false });

      this.setupInputs();

      this.midiAccess.onstatechange = () => {
        this.setupInputs();
        this.notifyListeners();
      };

      this.notifyListeners();
      return true;
    } catch (err) {
      console.warn('[MidiService] Permiso MIDI denegado o no disponible:', err);
      return false;
    }
  }

  private setupInputs() {
    if (!this.midiAccess) return;

    this.connectedInputs.clear();
    const inputs = this.midiAccess.inputs.values();

    for (const input of inputs) {
      this.connectedInputs.set(input.id, input);
      input.onmidimessage = this.handleMidiMessage.bind(this);
    }
  }

  private handleMidiMessage(event: any) {
    const [status, noteOrCc, velocity] = event.data;
    const command = status >> 4;
    const store = usePlayerStore.getState();

    // 1. Note On (0x9)
    if (command === 0x9 && velocity > 0) {
      const midiNote = noteOrCc;
      const velNormalized = velocity / 127;

      // Check for General MIDI Drum keys (35-50) if in drum mode
      if (store.airInstrumentType === 'drums') {
        if (midiNote === 36 || midiNote === 35) airSynth.triggerDrum('kick', velNormalized);
        else if (midiNote === 38 || midiNote === 40) airSynth.triggerDrum('snare', velNormalized);
        else if (midiNote === 42 || midiNote === 44) airSynth.triggerDrum('hihat', velNormalized);
        else if (midiNote === 45 || midiNote === 47) airSynth.triggerDrum('tom', velNormalized);
        else if (midiNote === 39) airSynth.triggerDrum('clap', velNormalized);
        else if (midiNote === 49 || midiNote === 57) airSynth.triggerDrum('crash', velNormalized);
        else airSynth.triggerDrum('kick', velNormalized);
      } else {
        // Melodic Synthesizer: standard equal temperament tuning
        const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const noteName = `${noteNames[midiNote % 12]}${Math.floor(midiNote / 12) - 1}`;

        airSynth.triggerFrequency(freq, velNormalized);
        store.setLastTriggeredNote(noteName);
      }
    }

    // 2. Control Change (0xB)
    if (command === 0xB) {
      const ccNumber = noteOrCc;
      const ccValue = velocity / 127;

      // CC 7: Master Volume
      if (ccNumber === 7) {
        store.setVolume(ccValue);
      }
      // CC 1: Modulation Wheel -> Wave Effect Intensity
      else if (ccNumber === 1) {
        store.setWaveEffectIntensity(ccValue);
      }
      // CC 71 or 74: Brightness/Cutoff -> Music Sensitivity
      else if (ccNumber === 71 || ccNumber === 74) {
        store.setMusicSensitivity(0.60 + ccValue * 0.25);
      }
    }
  }

  public getConnectedDevices(): MidiDevice[] {
    if (!this.midiAccess) return [];
    const devices: MidiDevice[] = [];

    for (const input of this.midiAccess.inputs.values()) {
      devices.push({
        id: input.id,
        name: input.name || 'Dispositivo MIDI de Entrada',
        manufacturer: input.manufacturer || 'Genérico',
        state: input.state,
        type: 'input',
      });
    }

    for (const output of this.midiAccess.outputs.values()) {
      devices.push({
        id: output.id,
        name: output.name || 'Puerto MIDI de Salida',
        manufacturer: output.manufacturer || 'Genérico',
        state: output.state,
        type: 'output',
      });
    }

    return devices;
  }

  public subscribeDevices(listener: (devices: MidiDevice[]) => void): () => void {
    this.listeners.push(listener);
    listener(this.getConnectedDevices());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    const devices = this.getConnectedDevices();
    this.listeners.forEach((l) => l(devices));
  }
}

export const midiService = MidiService.getInstance();
