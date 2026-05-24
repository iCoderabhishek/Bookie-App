import { FolderSimple, NotePencil } from 'phosphor-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { Sticker } from '@/components/sticker';
import { TapeStrip } from '@/components/tape-strip';
import { ThemedText } from '@/components/themed-text';
import { Borders, Fonts, FolderColors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Folder, Note } from '@/lib/types';

type Props = {
  note: Note;
  folder?: Folder | null;
  compact?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
};

export function NoteCard({ note, folder, compact, onPress, onLongPress }: Props) {
  const theme = useTheme();
  const rotation = useMemo(() => {
    const seed = note.id;
    const t = ((seed * 9301 + 49297) % 233280) / 233280;
    return (t - 0.5) * 1.6;
  }, [note.id]);

  const tapeColor = useMemo(() => {
    const colors = ['#FFE45C', '#FF9DC5', '#7BB7FF', '#7FE0B8'];
    return colors[(note.id + 2) % colors.length];
  }, [note.id]);

  const preview = useMemo(
    () =>
      note.bodyHtml
        .replace(/<\/?[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, compact ? 80 : 180),
    [note.bodyHtml, compact],
  );
  const title = note.title.trim() || preview.slice(0, 40) || 'untitled scratch';

  return (
    <Animated.View
      entering={FadeInDown.duration(280).springify().damping(18)}
      layout={LinearTransition.duration(220)}
      style={[styles.outer, compact && styles.outerCompact]}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={400}
        style={({ pressed }) => [
          { transform: [{ rotate: `${rotation}deg` }, { scale: pressed ? 0.98 : 1 }] },
        ]}>
        <Sticker
          background={folder ? FolderColors[folder.color] : theme.backgroundElement}
          style={[styles.card, compact && styles.cardCompact]}
          shadowOffset={compact ? 3 : 4}>
          <View style={styles.kindRow}>
            <View
              style={[
                styles.kindBadge,
                { backgroundColor: theme.background, borderColor: theme.border },
              ]}>
              <NotePencil size={14} color={theme.text} weight="duotone" />
              <ThemedText
                style={[styles.kindLabel, { color: theme.text, fontFamily: Fonts.sansBold }]}>
                NOTE
              </ThemedText>
            </View>
          </View>
          <ThemedText
            style={[
              styles.title,
              compact && styles.titleCompact,
              { color: theme.text, fontFamily: Fonts.display },
            ]}
            numberOfLines={2}>
            {title}
          </ThemedText>
          {preview ? (
            <ThemedText
              style={[
                styles.body,
                compact && styles.bodyCompact,
                { color: theme.text, fontFamily: Fonts.sans },
              ]}
              numberOfLines={compact ? 3 : 4}>
              {preview}
            </ThemedText>
          ) : null}
          {folder ? (
            <View style={styles.folderRow}>
              <FolderSimple size={14} color={theme.text} weight="duotone" />
              <ThemedText
                style={[styles.folderName, { color: theme.text, fontFamily: Fonts.sansBold }]}>
                {folder.name.toUpperCase()}
              </ThemedText>
            </View>
          ) : null}
        </Sticker>
        <TapeStrip
          color={tapeColor}
          style={styles.tape}
          rotate={rotation > 0 ? -10 : 10}
        />
      </Pressable>
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
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardCompact: {
    padding: Spacing.two,
    gap: Spacing.one,
  },
  titleCompact: {
    fontSize: 17,
    lineHeight: 21,
  },
  bodyCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  kindRow: {
    flexDirection: 'row',
  },
  kindBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderWidth: Borders.thin,
  },
  kindLabel: {
    fontSize: 12,
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    lineHeight: 26,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: 2,
  },
  folderName: {
    fontSize: 12,
    letterSpacing: 1,
  },
  tape: {
    position: 'absolute',
    top: -6,
    right: 14,
    zIndex: 2,
  },
});
