import { Check } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { Sticker } from '@/components/sticker';
import { ThemedText } from '@/components/themed-text';
import { Fonts, FolderColors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useVibe } from '@/hooks/use-vibe';
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
  const vibe = useVibe();
  const accent = folder ? FolderColors[folder.color] : theme.warning;
  return (
    <Animated.View
      layout={LinearTransition.duration(220)}
      style={[styles.outer, compact && styles.outerCompact]}>
      <Animated.View entering={FadeInDown.duration(280).springify().damping(18)}>
      <Pressable onPress={onToggle} onLongPress={onLongPress} delayLongPress={400}>
        <Sticker
          background={theme.backgroundElement}
          style={[styles.card, { borderLeftWidth: 8, borderLeftColor: accent }]}
          shadowOffset={compact ? 3 : 4}>
          <View
            style={[
              styles.inner,
              compact && styles.innerCompact,
              !vibe.showDecorations && (compact ? styles.innerCompactTight : styles.innerTight),
            ]}>
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: theme.border,
                  backgroundColor: todo.done ? theme.primary : theme.background,
                  // Checkbox border honors the vibe — thick for retro/brutalist,
                  // hairline for minimal/glass, none for clay.
                  borderWidth: vibe.borderWidth > 0 ? Math.max(vibe.borderWidth, 1.5) : 1,
                  borderRadius: vibe.radiusSmall,
                },
              ]}>
              {todo.done ? <Check size={18} color={theme.textOnPrimary} weight="bold" /> : null}
            </View>
            <View style={styles.textWrap}>
              <View style={styles.kindRow}>
                <View
                  style={[
                    styles.kindBadge,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      borderWidth: vibe.borderWidth > 0 ? 1 : 0,
                      borderRadius: vibe.radiusSmall,
                    },
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
    padding: Spacing.four,
  },
  innerCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  // Non-retro vibe overrides — tighter padding outside the sticker look.
  innerTight: {
    padding: Spacing.three,
  },
  innerCompactTight: {
    padding: Spacing.two,
  },
  textCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  checkbox: {
    width: 28,
    height: 28,
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
