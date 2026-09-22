export type ShortcutCategory = 'Navegación' | 'Reproducción' | 'Visualizadores' | 'Edición' | 'Sistema';

export interface KeyboardShortcut {
  id: string;
  category: ShortcutCategory;
  keys: string[]; // e.g. ['Cmd', 'K'] or ['Space']
  description: string;
  action: string; // Action ID for dispatcher
  context?: 'global' | 'playlist' | 'visualizer' | 'modal';
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // ── Navegación ──
  {
    id: 'open-command',
    category: 'Navegación',
    keys: ['Cmd', 'K'],
    description: 'Abrir Paleta de Comandos Universal',
    action: 'OPEN_COMMAND_PALETTE',
    context: 'global',
  },
  {
    id: 'open-library',
    category: 'Navegación',
    keys: ['B'],
    description: 'Abrir / Cerrar Biblioteca de Estudio',
    action: 'TOGGLE_SIDEBAR',
    context: 'global',
  },
  {
    id: 'open-help',
    category: 'Navegación',
    keys: ['?'],
    description: 'Mostrar Ayuda y Atajos de Teclado',
    action: 'OPEN_HELP',
    context: 'global',
  },
  {
    id: 'close-modal',
    category: 'Navegación',
    keys: ['Esc'],
    description: 'Cerrar modal o panel activo',
    action: 'CLOSE_MODAL',
    context: 'global',
  },

  // ── Reproducción ──
  {
    id: 'play-pause',
    category: 'Reproducción',
    keys: ['Espacio'],
    description: 'Reproducir / Pausar audio',
    action: 'TOGGLE_PLAY',
    context: 'global',
  },
  {
    id: 'next-track',
    category: 'Reproducción',
    keys: ['Cmd', '→'],
    description: 'Siguiente pista de la lista',
    action: 'NEXT_TRACK',
    context: 'global',
  },
  {
    id: 'prev-track',
    category: 'Reproducción',
    keys: ['Cmd', '←'],
    description: 'Pista anterior',
    action: 'PREV_TRACK',
    context: 'global',
  },
  {
    id: 'seek-fwd',
    category: 'Reproducción',
    keys: ['Shift', '→'],
    description: 'Avanzar 5 segundos',
    action: 'SEEK_FORWARD',
    context: 'global',
  },
  {
    id: 'seek-back',
    category: 'Reproducción',
    keys: ['Shift', '←'],
    description: 'Retroceder 5 segundos',
    action: 'SEEK_BACKWARD',
    context: 'global',
  },
  {
    id: 'mute',
    category: 'Reproducción',
    keys: ['M'],
    description: 'Silenciar / Activar audio',
    action: 'TOGGLE_MUTE',
    context: 'global',
  },

  // ── Visualizadores ──
  {
    id: 'cycle-visualizer',
    category: 'Visualizadores',
    keys: ['V'],
    description: 'Cambiar modo de visualizador 3D',
    action: 'CYCLE_VISUALIZER',
    context: 'global',
  },
  {
    id: 'fullscreen',
    category: 'Visualizadores',
    keys: ['F'],
    description: 'Alternar modo Pantalla Completa',
    action: 'TOGGLE_FULLSCREEN',
    context: 'global',
  },
  {
    id: 'toggle-lyrics',
    category: 'Visualizadores',
    keys: ['L'],
    description: 'Mostrar / Ocultar Letras sincronizadas',
    action: 'TOGGLE_LYRICS',
    context: 'global',
  },
  {
    id: 'screenshot',
    category: 'Visualizadores',
    keys: ['Cmd', 'S'],
    description: 'Capturar Wallpaper Full HD / 4K del visualizador',
    action: 'CAPTURE_SCREENSHOT',
    context: 'visualizer',
  },

  // ── Edición & Captura ──
  {
    id: 'open-recorder',
    category: 'Edición',
    keys: ['R'],
    description: 'Abrir grabador de clips y Social Suite',
    action: 'OPEN_RECORDER',
    context: 'global',
  },
  {
    id: 'open-cards',
    category: 'Edición',
    keys: ['Cmd', 'Shift', 'C'],
    description: 'Generar Story Card 9:16 para Instagram',
    action: 'OPEN_CARD_EDITOR',
    context: 'global',
  },
  {
    id: 'open-eq',
    category: 'Edición',
    keys: ['E'],
    description: 'Abrir Ecualizador Gráfico de 10 Bandas',
    action: 'TOGGLE_EQUALIZER',
    context: 'global',
  },

  // ── Sistema ──
  {
    id: 'open-settings',
    category: 'Sistema',
    keys: ['Cmd', ','],
    description: 'Abrir panel de Ajustes y Sistema',
    action: 'OPEN_SETTINGS',
    context: 'global',
  },
  {
    id: 'ai-mode',
    category: 'Sistema',
    keys: ['Cmd', 'Shift', 'A'],
    description: 'Alternar Modo IA / Análisis Armónico',
    action: 'TOGGLE_AI_MODE',
    context: 'global',
  },
  {
    id: 'lucid-mode',
    category: 'Sistema',
    keys: ['U'],
    description: 'Alternar Modo Lúcido & Neón Estético',
    action: 'TOGGLE_LUCID',
    context: 'global',
  },
];
