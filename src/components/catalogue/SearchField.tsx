import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, radius, space, TOUCH_TARGET, fontSize } from '@/theme';

interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
}

/** Search box for products. The screen debounces the value before querying. */
export function SearchField({ value, onChangeText }: SearchFieldProps) {
  return (
    <View style={styles.field}>
      <Ionicons name="search" size={18} color={colors.inkFaint} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search products"
        placeholderTextColor={colors.inkFaint}
        accessibilityLabel="Search products"
        accessibilityRole="search"
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="never"
        style={styles.input}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChangeText('')}
          style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
        >
          <Ionicons name="close-circle" size={20} color={colors.inkFaint} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 46,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    height: 46,
    paddingVertical: 0,
    fontSize: fontSize.bodyLarge,
    color: colors.ink,
  },
  clear: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
});
