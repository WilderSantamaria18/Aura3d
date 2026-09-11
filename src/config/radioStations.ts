export interface RadioStation {
  id: string;
  name: string;
  genre: string;
  description: string;
  streamUrl: string;
  bitrate: string;
  accentColor: string;
  suggestedPresetId: string;
  tags: string[];
}

export const RADIO_STATIONS: RadioStation[] = [
  {
    id: 'radio_groove_salad',
    name: 'Groove Salad',
    genre: 'Lo-Fi / Downtempo',
    description: 'Ambiente relajante, beats downtempo y electrónica suave con textura cálida.',
    streamUrl: 'https://ice1.somafm.com/groovesalad-128-mp3',
    bitrate: '128 kbps',
    accentColor: '#00ff88',
    suggestedPresetId: 'factory_ethereal_aurora',
    tags: ['Ambient', 'Lo-Fi', 'Chill', 'Smooth'],
  },
  {
    id: 'radio_defcon',
    name: 'DEF CON Cyberpunk',
    genre: 'Cyberpunk / Darksynth',
    description: 'Música electrónica underground, ritmos cyberpunk y ondas de hacking.',
    streamUrl: 'https://ice1.somafm.com/defcon-128-mp3',
    bitrate: '128 kbps',
    accentColor: '#00f5ff',
    suggestedPresetId: 'factory_cyberpunk_club',
    tags: ['Cyberpunk', 'EDM', 'Laser', 'Fast'],
  },
  {
    id: 'radio_vaporwaves',
    name: 'Vaporwaves & Synth',
    genre: 'Synthwave / Retro 80s',
    description: 'Nostalgia ochentera, sintetizadores analógicos y ritmos chillwave.',
    streamUrl: 'https://ice1.somafm.com/vaporwaves-128-mp3',
    bitrate: '128 kbps',
    accentColor: '#ff007f',
    suggestedPresetId: 'factory_retro_synthwave',
    tags: ['Retro', 'Synthwave', '80s', 'Neon'],
  },
  {
    id: 'radio_drone_zone',
    name: 'Drone Zone Space',
    genre: 'Cosmic Ambient',
    description: 'Paisajes sonoros del espacio profundo, texturas etéreas sin beats para meditación.',
    streamUrl: 'https://ice1.somafm.com/dronezone-128-mp3',
    bitrate: '128 kbps',
    accentColor: '#8a2be2',
    suggestedPresetId: 'factory_deep_space_void',
    tags: ['Cosmic', 'Space', 'Drone', 'Relax'],
  },
  {
    id: 'radio_dubstep',
    name: 'Dub Step Beyond',
    genre: 'Dubstep / Sub-Bass',
    description: 'Bajos masivos, sub-bass estremecedor y percusión agresiva para visuales de impacto.',
    streamUrl: 'https://ice1.somafm.com/dubstep-128-mp3',
    bitrate: '128 kbps',
    accentColor: '#ff6600',
    suggestedPresetId: 'factory_golden_sunset',
    tags: ['Bass', 'Dubstep', 'Club', 'Heavy'],
  },
  {
    id: 'radio_cliqhop',
    name: 'Cliqhop IDM',
    genre: 'Glitch / IDM / Breakbeat',
    description: 'Electrónica experimental con micro-beats, glitches rítmicos y texturas inteligentes.',
    streamUrl: 'https://ice1.somafm.com/cliqhop-128-mp3',
    bitrate: '128 kbps',
    accentColor: '#39ff14',
    suggestedPresetId: 'factory_acid_reactor',
    tags: ['IDM', 'Glitch', 'Breakbeat', 'Acid'],
  },
];
