/**
 * Colour tokens taken from the Fieldbook portfolio reference (src/mocks/Fieldbook.module.css).
 * Light UI only. Violet is the accent. Text colours meet WCAG AA on their surfaces; the lighter
 * tone inks are for decorative glyphs only, not for text.
 */
export const colors = {
  background: '#FBFAFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F7F5FF',
  surfaceTint: '#F1ECFF',
  surfaceAccent: '#EFE9FF',

  ink: '#1E1A33',
  inkStrong: '#3D3560',
  inkBody: '#4A4469',
  inkMuted: '#6F6A88',
  inkFaint: '#8A84A3',

  accent: '#7C52EE',
  accentInk: '#5B3FD0',
  accentSoft: '#E8E1FF',
  onAccent: '#FFFFFF',
  shadowAccent: 'rgba(92, 56, 200, 0.6)',

  success: '#1F9D73',
  successInk: '#17704F',
  successSoft: '#E4F6EF',
  danger: '#E2683A',
  dangerInk: '#B4441C',
  dangerSoft: '#FFEDE3',

  chip: '#EFEDF7',
  chipInk: '#3D3560',
  border: '#ECE8F6',
  borderStrong: '#E6E1F5',
  borderDashed: '#CFC6E6',
  divider: '#EFEDF6',
  railIdle: '#E0D9F0',
  nodeIdle: '#D3CBE6',
  progressTrack: '#E5E0F3',
  tabBar: 'rgba(255, 255, 255, 0.96)',
  /** Backdrop behind the phone-width column on a wide web window. */
  stage: '#E9E5F3',

  /** Product tile backgrounds and glyph inks, keyed by ProductTone. */
  tone: {
    violet: { background: '#EEE8FF', ink: '#7C52EE' },
    peach: { background: '#FFEDE3', ink: '#E2683A' },
    mint: { background: '#E4F6EF', ink: '#1F9D73' },
    sand: { background: '#FFF6D9', ink: '#C98A10' },
  },
} as const;

export type Colors = typeof colors;
