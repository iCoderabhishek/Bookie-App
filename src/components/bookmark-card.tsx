import { Image } from 'expo-image';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { MarkerTag } from '@/components/marker-tag';
import { Sticker } from '@/components/sticker';
import { TapeStrip } from '@/components/tape-strip';
import { ThemedText } from '@/components/themed-text';
import { Fonts, FolderColors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useVibe } from '@/hooks/use-vibe';
import { parseSummaryBullets } from '@/lib/summary';
import type { Bookmark, Folder } from '@/lib/types';

type Props = {
  bookmark: Bookmark;
  folder?: Folder | null;
  compact?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
};

export function BookmarkCard({ bookmark, folder, compact, onPress, onLongPress }: Props) {
  const theme = useTheme();
  const vibe = useVibe();

  // Only the retro vibe gets the playful sticker-tilt. Other vibes (glass,
  // minimal, clay, brutalist) stay axis-aligned.
  const rotation = useMemo(() => {
    if (!vibe.showDecorations) return 0;
    const seed = bookmark.id;
    const t = ((seed * 9301 + 49297) % 233280) / 233280;
    return (t - 0.5) * 2;
  }, [bookmark.id, vibe.showDecorations]);

  const tapeColor = useMemo(() => {
    const colors = ['#FFE45C', '#FF9DC5', '#7BB7FF', '#7FE0B8'];
    return colors[bookmark.id % colors.length];
  }, [bookmark.id]);

  const bullets = parseSummaryBullets(bookmark.summary);
  const maxTags = compact ? 2 : 3;
  const visibleTags = bookmark.tags.slice(0, maxTags);
  const overflow = bookmark.tags.length - visibleTags.length;

  return (
    <Animated.View
      layout={LinearTransition.duration(220)}
      style={[styles.outer, compact && styles.outerCompact]}>
      <Animated.View entering={FadeInDown.duration(280).springify().damping(18)}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={400}
        style={({ pressed }) => [
          {
            transform: [
              { rotate: `${rotation}deg` },
              { scale: pressed ? 0.98 : 1 },
            ],
          },
        ]}>
        <Sticker
          background={theme.backgroundElement}
          style={[
            styles.card,
            compact && styles.cardCompact,
            // Retro keeps the roomy sticker padding; tighter vibes
            // (minimal, glass, clay, brutalist) feel bloated with it.
            !vibe.showDecorations && (compact ? styles.cardCompactTight : styles.cardTight),
          ]}
          shadowOffset={compact ? 3 : 4}>

          {visibleTags.length > 0 && !compact ? (
            <View style={styles.tagRow}>
              {visibleTags.map((tag) => (
                <MarkerTag key={tag} label={tag} size="sm" />
              ))}
              {overflow > 0 ? (
                <View
                  style={[
                    styles.overflow,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.backgroundSelected,
                      borderWidth: vibe.borderWidth > 0 ? 1 : 0,
                      borderRadius: vibe.radiusSmall,
                    },
                  ]}>
                  <ThemedText style={[styles.overflowText, { color: theme.text }]}>
                    +{overflow}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          ) : null}

          {bookmark.thumbnail ? (
            <View
              style={[
                styles.thumbWrap,
                {
                  borderColor: theme.border,
                  borderWidth: vibe.borderWidth > 0 ? 1 : 0,
                  borderRadius: vibe.radiusSmall,
                },
              ]}>
              <Image
                source={{ uri: bookmark.thumbnail }}
                style={[
                  styles.thumb,
                  compact && styles.thumbCompact,
                  { borderRadius: vibe.radiusSmall },
                ]}
                contentFit="cover"
                transition={200}
              />
            </View>
          ) : null}

          <View style={styles.body}>
            <ThemedText
              style={[styles.title, compact && styles.titleCompact, { color: theme.text }]}
              numberOfLines={compact ? 3 : 2}>
              {bookmark.title || bookmark.url}
            </ThemedText>
            {!compact && bullets.length > 0 ? (
              <View style={styles.bullets}>
                {bullets.slice(0, 2).map((b, i) => (
                  <ThemedText
                    key={i}
                    style={[styles.bullet, { color: theme.textSecondary }]}
                    numberOfLines={2}>
                    →  {b}
                  </ThemedText>
                ))}
              </View>
            ) : null}

            {folder ? (
              <View style={styles.folderRow}>
                <View
                  style={[
                    styles.folderStripe,
                    {
                      backgroundColor: FolderColors[folder.color],
                      borderWidth: vibe.borderWidth > 0 ? 1 : 0,
                      borderRadius: vibe.radiusSmall,
                    },
                  ]}
                />
                <ThemedText
                  style={[styles.folderName, { color: theme.text }]}
                  numberOfLines={1}>
                  {folder.name}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </Sticker>

        <TapeStrip
          color={tapeColor}
          style={styles.tape}
          rotate={rotation > 0 ? -10 : 10}
        />
      </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    marginBottom: Spacing.four,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  outerCompact: {
    marginBottom: Spacing.three,
    paddingHorizontal: Spacing.one,
  },
  card: {
    padding: Spacing.four,
    gap: Spacing.three,
    overflow: 'hidden',
  },
  cardCompact: {
    padding: Spacing.three,
    gap: Spacing.two,
    overflow: 'hidden',
    // Cap card height in grid mode so a long summary doesn't make this card
    // dwarf the one next to it in its column.
    maxHeight: 220,
  },
  // Non-retro vibe overrides — tighter padding so cards don't feel bloated
  // outside the playful sticker aesthetic.
  cardTight: {
    padding: Spacing.three,
  },
  cardCompactTight: {
    padding: Spacing.two,
  },
  thumbCompact: {
    aspectRatio: 16 / 9,
  },
  titleCompact: {
    fontSize: 14,
    lineHeight: 17,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  overflow: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    justifyContent: 'center',
  },
  overflowText: {
    fontFamily: Fonts.sansBold,
    fontSize: 13,
    lineHeight: 18,
  },
  thumbWrap: {
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#00000010',
  },
  body: {
    gap: Spacing.two,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 26,
    lineHeight: 30,
  },
  bullets: {
    gap: 4,
  },
  bullet: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    lineHeight: 22,
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: 2,
  },
  folderStripe: {
    width: 14,
    height: 14,
    borderColor: '#0A0A0A',
  },
  folderName: {
    fontFamily: Fonts.sansBold,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tape: {
    position: 'absolute',
    top: -6,
    right: 14,
    zIndex: 2,
  },
});
