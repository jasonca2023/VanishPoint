/** VanishPoint visual language: dark, calm, "privacy vault" feel. */
export const Palette = {
  bg: '#0B0F14',
  surface: '#141B23',
  surfaceRaised: '#1C2630',
  border: '#27333F',
  text: '#E8EEF4',
  textDim: '#8A99A8',
  accent: '#5EEAD4', // teal — scout/positive
  danger: '#F87171', // vanish/red
  warn: '#FBBF24', // dormant/amber
  keep: '#60A5FA', // whitelist/blue
} as const;

export function riskColor(score: number): string {
  if (score >= 70) return Palette.danger;
  if (score >= 40) return Palette.warn;
  return Palette.accent;
}
