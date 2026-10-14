import { colors } from './colors';
import { radius } from './radius';
import { PAGE_GUTTER, space, TOUCH_TARGET } from './spacing';
import { fontFamily, fontSize, fontWeight, textStyles } from './typography';

export { colors, type Colors } from './colors';
export { radius } from './radius';
export { PAGE_GUTTER, space, TOUCH_TARGET } from './spacing';
export { fontFamily, fontSize, fontWeight, textStyles } from './typography';

export const theme = {
  colors,
  space,
  radius,
  fontFamily,
  fontSize,
  fontWeight,
  textStyles,
  touchTarget: TOUCH_TARGET,
  pageGutter: PAGE_GUTTER,
} as const;

export type Theme = typeof theme;
