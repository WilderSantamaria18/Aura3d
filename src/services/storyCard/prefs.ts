/**
 * Persistencia de las preferencias del estudio de tarjetas (plantilla, paleta, perfil, efectos…).
 * Lo leído se sanea siempre: el almacenamiento puede estar vacío, corrupto o venir de otra versión.
 */
import { DEFAULT_CARD_CONFIG, sanitizeCardConfig, type CardConfig } from './config';

const KEY = 'aura3d_story_card_v2';

export function loadCardConfig(): CardConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_CARD_CONFIG;
    return sanitizeCardConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_CARD_CONFIG;
  }
}

export function saveCardConfig(config: CardConfig): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(config));
  } catch (err) {
    // Cuota llena (la foto de perfil es lo único grande): se avisa pero no se rompe nada
    console.warn('[storyCard] No se pudieron guardar las preferencias:', err);
  }
}
