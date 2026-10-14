/** Spacing scale in logical pixels. Page gutter is 20 px, as in the reference. */
export const space = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Minimum touch target (Apple HIG 44 pt). Every touchable must be at least this size. */
export const TOUCH_TARGET = 44;

/** Horizontal page padding, as in the reference. */
export const PAGE_GUTTER = space.xl;
