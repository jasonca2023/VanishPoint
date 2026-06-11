/* Hallmark · genre: atmospheric · theme: custom "Ember" (dark / grotesk-sans / warm)
 * design-system: design.md · designed-as-app
 * display: Geist 600 · body: Geist 400 · outlier: Geist Mono (machine-data role)
 * paper oklch(13.5% 0.012 40) · accent oklch(68% 0.17 40)
 */

export const Color = {
  paper: '#0c0705',
  paper2: '#140c0a',
  paper3: '#1b130f',
  rule: '#2f2724',
  neutral: '#90837e',
  ink2: '#b9aeaa',
  ink: '#f1ece8',
  accent: '#ec6d3d',
  accentDim: '#c85b32',
  accentInk: '#180804',
  focus: '#eb883b',
} as const;

export const Space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Type = {
  xs: 11,
  sm: 13,
  base: 16,
  md: 20,
  lg: 25,
  xl: 31,
  display: 39,
} as const;

export const Radius = {
  card: 16,
  control: 12,
  pill: 999,
} as const;

export const Font = {
  display: 'Geist_600SemiBold',
  body: 'Geist_400Regular',
  mono: 'GeistMono_400Regular',
} as const;

/** 11px mono uppercase section label — shared across every screen. */
export const labelStyle = {
  fontFamily: Font.mono,
  fontSize: Type.xs,
  letterSpacing: 1,
  textTransform: 'uppercase' as const,
  color: Color.neutral,
};
