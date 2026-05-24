import { Check } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { Sticker } from '@/components/sticker';
import { ThemedText } from '@/components/themed-text';
import { Borders, Fonts, FolderColors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Folder, Todo } from '@/lib/types';

type Props = {
  todo: Todo;
  folder?: Folder | null;
  compact?: boolean;
  onToggle: () => void;
  onLongPress?: () => void;
};

export function TodoPin({ todo, folder, compact, onToggle, onLongPress }: Props) {
  const theme = useTheme();
  const accent = folder ? FolderColors[folder.color] : theme.warning;
  return (
    <Animated.View
      entering={FadeInDown.duration(280).springify().damping(18)}
      layout={LinearTransition.duration(220)}
      style={[styles.outer, compact && styles.outerCompact]}>
      <Pressable onPress={onToggle} onLongPress={onLongPress} delayLongPress={400}>
        <Sticker
          background={theme.backgroundElement}
          style={[styles.card, { borderLeftWidth: 8, borderLeftColor: accent }]}
          shadowOffset={compact ? 3 : 4}>
          <View style={[styles.inner, compact && styles.innerCompact]}>
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: theme.border,
                  backgroundColor: todo.done ? theme.primary : theme.background,
                },
              ]}>
              {todo.done ? <Check size={18} color={theme.textOnPrimary} weight="bold" /> : null}
            </View>
            <View style={styles.textWrap}>
              <View style={styles.kindRow}>
                <View
                  style={[
                    styles.kindBadge,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}>
                  <ThemedText
                    style={[styles.kindLabel, { color: theme.text, fontFamily: Fonts.sansBold }]}>
                    TODO
                  </ThemedText>
                </View>
              </View>
              <ThemedText
                style={[
                  styles.text,
                  compact && styles.textCompact,
                  {
                    color: todo.done ? theme.textSecondary : theme.text,
                    fontFamily: Fonts.sansBold,
                    textDecorationLine: todo.done ? 'line-through' : 'none',
                  },
                ]}
                numberOfLines={compact ? 4 : 3}>
                {todo.text}
              </ThemedText>
              {folder ? (
                <ThemedText
                  style={[styles.folderName, { color: theme.text, fontFamily: Fonts.marker }]}>
                  in {folder.name}
                </ThemedText>
              ) : null}
            </View>
          </View>
        </Sticker>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    marginBottom: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  outerCompact: {
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  card: {
    padding: 0,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  innerCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.two,
  },
  textCompact: {
    fontSize: 14,
    lineHeight: 19,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderWidth: Borders.thick,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  kindRow: {
    flexDirection: 'row',
  },
  kindBadge: {
    paddingHorizontal: Spacing.one,
    paddingVertical: 2,
    borderWidth: Borders.thin,
  },
  kindLabel: {
    fontSize: 11,
    letterSpacing: 1,
  },
  text: {
    fontSize: 17,
    lineHeight: 24,
  },
  folderName: {
    fontSize: 13,
  },
});
