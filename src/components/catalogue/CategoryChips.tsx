import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Category } from '@/domain/types';
import { colors, PAGE_GUTTER, radius, space, TOUCH_TARGET, textStyles } from '@/theme';

interface CategoryChipsProps {
  categories: Category[];
  /** Selected category id, or null for "All". */
  selectedId: string | null;
  onSelect: (categoryId: string | null) => void;
}

interface ChipOption {
  id: string | null;
  name: string;
}

/** Horizontal category filter with a leading "All" chip. Scrolls edge to edge. */
export function CategoryChips({ categories, selectedId, onSelect }: CategoryChipsProps) {
  const options: ChipOption[] = [
    { id: null, name: 'All' },
    ...categories.map((category) => ({ id: category.id, name: category.name })),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroller}
    >
      {options.map((option) => {
        const selected = option.id === selectedId;
        return (
          <Pressable
            key={option.id ?? 'all'}
            accessibilityRole="button"
            accessibilityLabel={option.name}
            accessibilityState={{ selected }}
            onPress={() => onSelect(option.id)}
            style={({ pressed }) => [styles.target, pressed && styles.pressed]}
          >
            <View style={[styles.chip, selected && styles.chipSelected]}>
              <Text style={[styles.label, selected && styles.labelSelected]}>{option.name}</Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Negative margin lets the row bleed to the screen edges while keeping the gutter on scroll.
  scroller: { flexGrow: 0, marginHorizontal: -PAGE_GUTTER },
  row: { paddingHorizontal: PAGE_GUTTER, gap: space.sm },
  target: { minHeight: TOUCH_TARGET, justifyContent: 'center' },
  chip: {
    height: 32,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  chipSelected: { borderColor: colors.ink, backgroundColor: colors.ink },
  label: { ...textStyles.chip, color: colors.inkBody },
  labelSelected: { color: colors.onAccent },
  pressed: { opacity: 0.8 },
});
