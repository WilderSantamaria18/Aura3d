import { usePlayerStore } from '../stores/playerStore';

export const useAudioColor = () => {
  const dynamicColor = usePlayerStore((s) => s.dynamicColor || '#00f2fe');

  return {
    dominantColor: dynamicColor,
    secondaryColor: dynamicColor,
    accentColor: dynamicColor,
    colorRef: { current: { primary: dynamicColor, secondary: dynamicColor, accent: dynamicColor } },
  };
};

export default useAudioColor;


