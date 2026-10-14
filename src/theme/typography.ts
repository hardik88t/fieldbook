import type { TextStyle } from 'react-native';

/**
 * Type scale from the reference. The reference uses Nunito Sans; Phase A uses the platform
 * system font with the same sizes and weights. Swap `fontFamily` here to change the face.
 */
export const fontFamily: string | undefined = undefined;

export const fontSize = {
  caption: 11.5,
  small: 12.5,
  body: 14,
  bodyLarge: 14.5,
  label: 15,
  subtitle: 16,
  heading: 18,
  title: 26,
  price: 15,
  totalLarge: 17,
} as const;

export const fontWeight = {
  regular: '400',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const;

type TextToken = Pick<TextStyle, 'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing'>;

/** Named text styles. Screens should use these rather than ad-hoc sizes. */
export const textStyles = {
  greeting: { fontSize: fontSize.small, fontWeight: fontWeight.semibold, lineHeight: 17 },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.extrabold,
    lineHeight: 30,
    letterSpacing: -0.52,
  },
  headingCenter: { fontSize: fontSize.heading, fontWeight: fontWeight.extrabold, lineHeight: 22 },
  subtitle: { fontSize: fontSize.subtitle, fontWeight: fontWeight.extrabold, lineHeight: 20 },
  shopName: { fontSize: fontSize.subtitle, fontWeight: fontWeight.extrabold, lineHeight: 20 },
  stopName: { fontSize: fontSize.label, fontWeight: fontWeight.extrabold, lineHeight: 19 },
  productName: { fontSize: fontSize.bodyLarge, fontWeight: fontWeight.extrabold, lineHeight: 18 },
  body: { fontSize: fontSize.body, fontWeight: fontWeight.regular, lineHeight: 20 },
  bodyStrong: { fontSize: fontSize.body, fontWeight: fontWeight.bold, lineHeight: 20 },
  meta: { fontSize: fontSize.small, fontWeight: fontWeight.regular, lineHeight: 18 },
  metaStrong: { fontSize: fontSize.small, fontWeight: fontWeight.bold, lineHeight: 18 },
  chip: { fontSize: fontSize.small, fontWeight: fontWeight.bold, lineHeight: 16 },
  tabLabel: { fontSize: fontSize.caption, fontWeight: fontWeight.bold, lineHeight: 14 },
  price: { fontSize: fontSize.price, fontWeight: fontWeight.black, lineHeight: 18 },
  totalLarge: { fontSize: fontSize.totalLarge, fontWeight: fontWeight.black, lineHeight: 22 },
  button: { fontSize: fontSize.subtitle, fontWeight: fontWeight.black, lineHeight: 20 },
  buttonSmall: { fontSize: 13.5, fontWeight: fontWeight.extrabold, lineHeight: 18 },
} satisfies Record<string, TextToken>;
