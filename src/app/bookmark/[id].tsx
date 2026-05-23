import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteBookmark, getBookmark, updateBookmarkNote } from '@/lib/db';
import type { Bookmark } from '@/lib/types';

export default function BookmarkDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const [bookmark, setBookmark] = useState<Bookmark | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const numericId = Number(id);
      if (!Number.isFinite(numericId)) {
        setLoading(false);
        return;
      }
      const b = await getBookmark(numericId);
      if (alive) {
        setBookmark(b);
        setNote(b?.note ?? '');
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const handleNoteChange = (next: string) => {
    setNote(next);
    setNoteSaved(false);
    if (!bookmark) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await updateBookmarkNote(bookmark.id, next);
      setNoteSaved(true);
    }, 500);
  };

  const handleDelete = () => {
    if (!bookmark) return;
    Alert.alert('Delete bookmark?', bookmark.title, [
      { text: 'cancel', style: 'cancel' },
      {
        text: 'delete',
        style: 'destructive',
        onPress: async () => {
          await deleteBookmark(bookmark.id);
          router.back();
        },
      },
    ]);
  };

  if (loading) {
    return <ThemedView style={styles.flex} />;
  }

  if (!bookmark) {
    return (
      <ThemedView style={[styles.flex, styles.center]}>
        <SafeAreaView>
          <ThemedText>Bookmark not found.</ThemedText>
          <Pressable onPress={() => router.back()}>
            <ThemedText themeColor="primary">Go back</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ThemedText style={[styles.back, { color: theme.textSecondary }]}>
              ← back
            </ThemedText>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {bookmark.thumbnail ? (
            <Image
              source={{ uri: bookmark.thumbnail }}
              style={styles.hero}
              contentFit="cover"
              transition={300}
            />
          ) : null}

          {bookmark.category ? (
            <View
              style={[
                styles.categoryPill,
                { backgroundColor: theme.accent + '33', borderColor: theme.accent },
              ]}>
              <ThemedText
                type="small"
                style={[styles.categoryText, { color: theme.accent }]}>
                {bookmark.category}
              </ThemedText>
            </View>
          ) : null}

          <ThemedText
            style={[styles.title, { fontFamily: Fonts.rounded }]}>
            {bookmark.title}
          </ThemedText>

          <ThemedText
            type="small"
            themeColor="textSecondary"
            onPress={() => Linking.openURL(bookmark.url)}
            style={styles.url}
            numberOfLines={1}>
            {bookmark.url}
          </ThemedText>

          <ThemedText style={styles.summary}>{bookmark.summary}</ThemedText>

          {bookmark.tags.length > 0 ? (
            <View style={styles.tagRow}>
              {bookmark.tags.map((tag) => (
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

          <View style={styles.noteSection}>
            <View style={styles.noteHeader}>
              <ThemedText style={[styles.noteLabel, { fontFamily: Fonts.rounded }]}>
                your note
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.noteStatus}>
                {noteSaved ? 'saved' : 'saving…'}
              </ThemedText>
            </View>
            <TextInput
              value={note}
              onChangeText={handleNoteChange}
              placeholder="jot a thought, why you saved this, anything…"
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[
                styles.noteInput,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}
            />
          </View>

          <Pressable
            onPress={() => Linking.openURL(bookmark.url)}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: theme.primary,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}>
            <ThemedText
              style={[
                styles.ctaText,
                { color: theme.textOnPrimary, fontFamily: Fonts.rounded },
              ]}>
              open original ↗
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.6 : 1 }]}>
            <ThemedText themeColor="danger" style={styles.deleteText}>
              delete bookmark
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  back: {
    fontSize: 14,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.lg,
    backgroundColor: '#00000010',
  },
  categoryPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  categoryText: {
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  url: {
    textDecorationLine: 'underline',
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
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
  cta: {
    marginTop: Spacing.three,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '800',
  },
  deleteBtn: {
    alignSelf: 'center',
    padding: Spacing.three,
  },
  deleteText: {
    fontWeight: '600',
  },
  noteSection: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  noteLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  noteStatus: {
    fontWeight: '500',
  },
  noteInput: {
    minHeight: 120,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
});
