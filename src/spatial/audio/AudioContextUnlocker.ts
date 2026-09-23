/**
 * AudioContextUnlocker — Desbloquea de forma transparente el AudioContext en Safari y iOS.
 *
 * Trampa de navegador #2 de DESING_DECAMARA.md:
 * "AudioContext arranca en suspended en Safari desktop y móvil -> Desbloqueo mediante evento de usuario".
 */
export class AudioContextUnlocker {
  private static instance: AudioContextUnlocker | null = null;
  private isUnlocked = false;
  private listeners: Set<(unlocked: boolean) => void> = new Set();

  private constructor() {}

  public static getInstance(): AudioContextUnlocker {
    if (!AudioContextUnlocker.instance) {
      AudioContextUnlocker.instance = new AudioContextUnlocker();
    }
    return AudioContextUnlocker.instance;
  }

  /**
   * Intenta desbloquear el AudioContext de inmediato si ya hay interacción,
   * o instala escuchadores únicos pasivos para desbloquear en el primer clic/toque.
   */
  public attach(ctx: AudioContext): void {
    if (ctx.state === 'running') {
      this.isUnlocked = true;
      this.notify();
      return;
    }

    const unlockHandler = async () => {
      try {
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        // Tocar micro-buffer silencioso para forzar el hardware de audio en iOS Safari
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);

        this.isUnlocked = true;
        this.notify();

        // Remover escuchadores una vez desbloqueado
        events.forEach((evt) => {
          window.removeEventListener(evt, unlockHandler);
        });
      } catch {
        // Reintentará en el próximo evento
      }
    };

    const events = ['click', 'touchstart', 'touchend', 'keydown'];
    events.forEach((evt) => {
      window.addEventListener(evt, unlockHandler, { once: true, passive: true });
    });
  }

  public isContextUnlocked(): boolean {
    return this.isUnlocked;
  }

  public subscribe(listener: (unlocked: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.isUnlocked);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn(this.isUnlocked));
  }
}
