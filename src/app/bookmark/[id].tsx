import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ArrowSquareOut, PencilSimple, Trash } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmModal } from '@/components/confirm-modal';
import { MarkerTag } from '@/components/marker-tag';
import { Sticker } from '@/components/sticker';
import { StickerButton } from '@/components/sticker-button';
import { TapeStrip } from '@/components/tape-strip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Borders, Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  deleteBookmark,
  getBookmark,
  touchBookmark,
  updateBookmarkNote,
  updateBookmarkSummary,
} from '@/lib/db';
import { parseSummaryBullets } from '@/lib/summary';
import type { Bookmark } from '@/lib/types';

export default function BookmarkDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const [bookmark, setBookmark] = useState<Bookmark | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(true);
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const summarySaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        setSummaryDraft(b?.summary ?? '');
        setLoading(false);
        if (b) touchBookmark(b.id).catch(() => {});
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (summarySaveTimer.current) clearTimeout(summarySaveTimer.current);
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

  const handleSummaryChange = (next: string) => {
    setSummaryDraft(next);
    if (!bookmark) return;
    if (summarySaveTimer.current) clearTimeout(summarySaveTimer.current);
    summarySaveTimer.current = setTimeout(async () => {
      await updateBookmarkSummary(bookmark.id, next);
      setBookmark((prev) => (prev ? { ...prev, summary: next } : prev));
    }, 500);
  };

  const handleDelete = async () => {
    if (!bookmark) return;
    setConfirmDelete(false);
    await deleteBookmark(bookmark.id);
    router.back();
  };

  if (loading) {
    return <ThemedView style={styles.flex} />;
  }

  if (!bookmark) {
    return (
      <ThemedView style={[styles.flex, styles.center]}>
        <SafeAreaView>
          <ThemedText>Bookmark not found.</ThemedText>
          <StickerButton onPress={() => router.back()}>
            <ThemedText style={{ padding: Spacing.two }}>Go back</ThemedText>
          </StickerButton>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const bullets = parseSummaryBullets(summaryDraft || bookmark.summary);

  return (
    <ThemedView style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
          <View style={styles.header}>
            <StickerButton onPress={() => router.back()} padding={10} radius={Radius.md}>
              <ArrowLeft size={22} color={theme.text} weight="bold" />
            </StickerButton>
          </View>
          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {bookmark.thumbnail ? (
              <Sticker style={styles.heroWrap}>
                <Image
                  source={{ uri: bookmark.thumbnail }}
                  style={styles.hero}
                  contentFit="cover"
                  transition={300}
                />
                <TapeStrip
                  color={theme.primary}
                  style={styles.heroTape}
                  rotate={-6}
                />
              </Sticker>
            ) : null}

            <ThemedText
              style={[styles.title, { color: theme.text, fontFamily: Fonts.display }]}>
              {bookmark.title}
            </ThemedText>

            <ThemedText
              onPress={() => Linking.openURL(bookmark.url)}
              style={[styles.url, { color: theme.textSecondary, fontFamily: Fonts.sans }]}
              numberOfLines={1}>
              {bookmark.url}
            </ThemedText>

            {bullets.length > 0 ? (
              <Sticker
                background={theme.backgroundElement}
                style={styles.tldrCard}>
                <View style={styles.tldrHeader}>
                  <View
                    style={[
                      styles.tldrStampBox,
                      { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
                    ]}>
                    <ThemedText
                      style={[
                        styles.tldrStampText,
                        { color: theme.text, fontFamily: Fonts.display },
                      ]}>
                      TL;DR
                    </ThemedText>
                  </View>
                  <StickerButton
                    onPress={() => setEditingSummary((v) => !v)}
                    padding={6}
                    radius={Radius.sm}
                    shadowOffset={2}
                    background={editingSummary ? theme.primary : theme.backgroundElement}>
                    <PencilSimple
                      size={16}
                      color={editingSummary ? theme.textOnPrimary : theme.text}
                      weight="bold"
                    />
                  </StickerButton>
                </View>
                {editingSummary ? (
                  <TextInput
                    value={summaryDraft}
                    onChangeText={handleSummaryChange}
                    multiline
                    placeholder="one bullet per line, prefix with • or →"
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.summaryInput,
                      {
                        color: theme.text,
                        fontFamily: Fonts.sans,
                        borderColor: theme.border,
                      },
                    ]}
                  />
                ) : (
                  <View style={styles.tldrList}>
                    {bullets.map((bullet, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <ThemedText
                          style={[
                            styles.bulletDot,
                            { fontFamily: Fonts.marker, color: theme.primary },
                          ]}>
                          →
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.bulletText,
                            { color: theme.text, fontFamily: Fonts.sans },
                          ]}>
                          {bullet}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                )}
              </Sticker>
            ) : null}

            {bookmark.tags.length > 0 ? (
              <View style={styles.tagRow}>
                {bookmark.tags.map((tag) => (
                  <MarkerTag key={tag} label={tag} />
                ))}
              </View>
            ) : null}

            <View style={styles.noteSection}>
              <View style={styles.noteHeader}>
                <ThemedText style={[styles.noteLabel, { color: theme.text, fontFamily: Fonts.display }]}>
                  YOUR NOTE
                </ThemedText>
                <ThemedText
                  style={[styles.noteStatus, { color: theme.textSecondary, fontFamily: Fonts.marker }]}>
                  {noteSaved ? '✓ saved' : 'saving…'}
                </ThemedText>
              </View>
              <Sticker background={theme.backgroundElement} style={styles.noteSticker}>
                <TextInput
                  value={note}
                  onChangeText={handleNoteChange}
                  placeholder="jot a thought, why you saved this, anything…"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  style={[
                    styles.noteInput,
                    { color: theme.text, fontFamily: Fonts.sans },
                  ]}
                />
              </Sticker>
            </View>

            <StickerButton
              onPress={() => Linking.openURL(bookmark.url)}
              background={theme.primary}
              radius={Radius.md}
              padding={Spacing.three}
              style={styles.cta}>
              <View style={styles.ctaInner}>
                <ThemedText
                  style={[
                    styles.ctaText,
                    { color: theme.textOnPrimary, fontFamily: Fonts.display },
                  ]}>
                  OPEN ORIGINAL
                </ThemedText>
                <ArrowSquareOut size={22} color={theme.textOnPrimary} weight="bold" />
              </View>
            </StickerButton>

            <StickerButton
              onPress={() => setConfirmDelete(true)}
              background={theme.backgroundElement}
              radius={Radius.md}
              padding={Spacing.two}
              style={styles.deleteBtn}>
              <View style={styles.deleteInner}>
                <Trash size={18} color={theme.danger} weight="bold" />
                <ThemedText
                  style={[
                    styles.deleteText,
                    { color: theme.danger, fontFamily: Fonts.sansBold },
                  ]}>
                  delete bookmark
                </ThemedText>
              </View>
            </StickerButton>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
      <ConfirmModal
        visible={confirmDelete}
        title="DELETE BOOKMARK?"
        message={bookmark.title}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    flexDirection: 'row',
  },
  body: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  heroWrap: {
    overflow: 'hidden',
    padding: 0,
  },
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#00000010',
  },
  heroTape: {
    position: 'absolute',
    top: -8,
    left: 20,
  },
  title: {
    fontSize: 36,
    lineHeight: 40,
  },
  url: {
    textDecorationLine: 'underline',
    fontSize: 15,
  },
  tldrCard: {
    padding: Spacing.three,
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  tldrStamp: {
    flexDirection: 'row',
  },
  tldrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryInput: {
    minHeight: 120,
    padding: Spacing.three,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
    borderWidth: Borders.thin,
  },
  tldrStampBox: {
    borderWidth: Borders.thick,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    transform: [{ rotate: '-2deg' }],
  },
  tldrStampText: {
    fontSize: 18,
    letterSpacing: 1,
  },
  tldrList: {
    gap: Spacing.two,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  bulletDot: {
    fontSize: 20,
    lineHeight: 26,
  },
  bulletText: {
    flex: 1,
    fontSize: 17,
    lineHeight: 26,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    rowGap: Spacing.two,
  },
  noteSection: {
    gap: Spacing.two,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteLabel: {
    fontSize: 22,
    letterSpacing: -0.5,
  },
  noteStatus: {
    fontSize: 14,
  },
  noteSticker: {
    padding: 0,
  },
  noteInput: {
    minHeight: 140,
    padding: Spacing.three,
    fontSize: 17,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  cta: {
    marginTop: Spacing.two,
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  ctaText: {
    fontSize: 20,
    letterSpacing: 0.5,
  },
  deleteBtn: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
  },
  deleteInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  deleteText: {
    fontSize: 15,
  },
});
