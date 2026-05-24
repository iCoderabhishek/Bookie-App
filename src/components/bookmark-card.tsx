import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parseSummaryBullets } from '@/lib/summary';
import type { Bookmark } from '@/lib/types';

type Props = {
  bookmark: Bookmark;
  onPress: () => void;
  onLongPress?: () => void;
};

export function BookmarkCard({ bookmark, onPress, onLongPress }: Props) {
  const theme = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.duration(280).springify().damping(18)}
      layout={LinearTransition.duration(220)}>
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}>
      {bookmark.thumbnail ? (
        <Image
          source={{ uri: bookmark.thumbnail }}
          style={styles.thumb}
          contentFit="cover"
          transition={200}
        />
      ) : null}

      <View style={styles.body}>
        <ThemedText
          style={[styles.title, { fontFamily: Fonts.rounded }]}
          numberOfLines={2}>
          {bookmark.title}
        </ThemedText>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          numberOfLines={2}
          style={styles.summary}>
          {parseSummaryBullets(bookmark.summary).map((b) => `• ${b}`).join('\n')}
        </ThemedText>

        {bookmark.tags.length > 0 ? (
          <View style={styles.tagRow}>
            {bookmark.tags.slice(0, 3).map((tag) => (
              <View
                key={tag}
                style={[styles.tag, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="small" style={styles.tagText}>
                  #{tag}
                </ThemedText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.three,
  },
  thumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#00000010',
  },
  body: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  summary: {
    lineHeight: 20,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  tag: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
