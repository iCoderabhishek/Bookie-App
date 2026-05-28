import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowsClockwise,
  ClipboardText,
  Sparkle,
  X,
} from 'phosphor-react-native';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Sticker } from '@/components/sticker';
import { StickerButton } from '@/components/sticker-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Borders, Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { prettifyError, streamProcess } from '@/lib/api';
import { saveBookmark } from '@/lib/db';
import { Sentry } from '@/lib/sentry';
import type { ProcessResult } from '@/lib/types';
import { normalizeUrl, stripScheme } from '@/lib/url';

type Item = ProcessResult & { saved?: boolean; saveError?: boolean };

export default function AddScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ url?: string }>();
  const [input, setInput] = useState(params.url ? stripScheme(params.url) : '');
  const [items, setItems] = useState<Item[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  // Intentionally NOT aborting on unmount — bookmarks save as soon as each
  // result streams in, so leaving the screen mid-stream just lets the rest
  // finish saving in the background. The user is not locked in here.

  const failedUrls = items
    .filter((it) => it.status === 'failed' || it.status === 'unsupported')
    .map((it) => it.url);

  const parseUrls = (raw: string): string[] => {
    return raw
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map(normalizeUrl)
      .slice(0, 10);
  };

  const onPaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text) return;
    // Strip schemes from each URL in the pasted blob so the input stays clean.
    const cleaned = text
      .split(/[\s,]+/)
      .map((s) => stripScheme(s.trim()))
      .filter(Boolean)
      .join('\n');
    setInput((prev) => (prev.trim() ? `${prev.trim()}\n${cleaned}` : cleaned));
  };

  const runUrls = useCallback((urls: string[]) => {
    if (!urls.length) {
      setError('drop in at least one URL');
      return;
    }
    setError(null);
    setItems([]);
    setStreaming(true);

    abortRef.current = streamProcess(urls, {
      onResult: async (r) => {
        setItems((prev) => [...prev, r]);
        if (r.status === 'ok' || r.status === 'preview') {
          try {
            await saveBookmark(r);
            setItems((prev) =>
              prev.map((it) => (it.url === r.url ? { ...it, saved: true } : it)),
            );
          } catch (e) {
            Sentry.captureException(e, { tags: { where: 'saveBookmark' } });
            setItems((prev) =>
              prev.map((it) => (it.url === r.url ? { ...it, saveError: true } : it)),
            );
          }
        }
      },
      onDone: () => {
        setStreaming(false);
        abortRef.current = null;
      },
      onError: (e) => {
        setError(e.message);
        setStreaming(false);
        abortRef.current = null;
      },
    });
  }, []);

  const start = useCallback(() => runUrls(parseUrls(input)), [input, runUrls]);
  const retryFailed = useCallback(() => runUrls(failedUrls), [failedUrls, runUrls]);

  const cancel = () => {
    abortRef.current?.();
    abortRef.current = null;
    setStreaming(false);
  };

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
            <View style={styles.headerTextWrap}>
              <ThemedText
                style={[styles.title, { color: theme.text, fontFamily: Fonts.display }]}>
                NEW LINK
              </ThemedText>
              <ThemedText
                style={[styles.subtitle, { color: theme.textSecondary, fontFamily: Fonts.marker }]}>
                up to 10 — one per line
              </ThemedText>
            </View>
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag">
            <Sticker background={theme.backgroundElement} style={styles.inputSticker}>
              <TextInput
                value={input}
                onChangeText={(s) => setInput(stripScheme(s))}
                placeholder="0bhishek.tech"
                placeholderTextColor={theme.textSecondary}
                multiline
                editable={!streaming}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={[
                  styles.input,
                  { color: theme.text, fontFamily: Fonts.sans },
                ]}
              />
              <View style={styles.inputFooter}>
                <ThemedText
                  style={[
                    styles.schemeHint,
                    { color: theme.textSecondary, fontFamily: Fonts.marker },
                  ]}>
                  https:// added for you
                </ThemedText>
                <StickerButton
                  onPress={onPaste}
                  disabled={streaming}
                  background={theme.backgroundSelected}
                  padding={Spacing.two}>
                  <View style={styles.pasteInner}>
                    <ClipboardText size={16} color={theme.text} weight="bold" />
                    <ThemedText
                      style={[
                        styles.pasteLabel,
                        { color: theme.text, fontFamily: Fonts.sansBold },
                      ]}>
                      PASTE
                    </ThemedText>
                  </View>
                </StickerButton>
              </View>
            </Sticker>

            {error ? (
              <ThemedText
                style={[styles.error, { color: theme.danger, fontFamily: Fonts.sansBold }]}>
                {error}
              </ThemedText>
            ) : null}

            {items.length > 0 ? (
              <Animated.View style={styles.results} layout={LinearTransition.duration(220)}>
                {items.map((item, i) => (
                  <ResultRow key={`${item.url}-${i}`} item={item} />
                ))}

                {streaming ? (
                  <Animated.View
                    entering={FadeInDown.duration(220)}
                    exiting={FadeOut.duration(150)}>
                    <Sticker
                      background={theme.backgroundElement}
                      style={styles.streamingPill}>
                      <View style={styles.streamingInner}>
                        <ActivityIndicator size="small" color={theme.primary} />
                        <ThemedText
                          style={{ color: theme.textSecondary, fontFamily: Fonts.marker }}>
                          summarising… {items.length} in
                        </ThemedText>
                      </View>
                    </Sticker>
                  </Animated.View>
                ) : null}

                {!streaming && failedUrls.length > 0 ? (
                  <Animated.View entering={FadeInDown.duration(220)}>
                    <StickerButton
                      onPress={retryFailed}
                      background={theme.backgroundSelected}
                      radius={Radius.md}
                      padding={Spacing.two}>
                      <View style={styles.retryInner}>
                        <ArrowsClockwise size={18} color={theme.text} weight="bold" />
                        <ThemedText
                          style={{ color: theme.text, fontFamily: Fonts.sansBold, fontSize: 16 }}>
                          retry {failedUrls.length} failed
                        </ThemedText>
                      </View>
                    </StickerButton>
                  </Animated.View>
                ) : null}
              </Animated.View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <StickerButton
              onPress={streaming ? cancel : start}
              background={streaming ? theme.backgroundSelected : theme.primary}
              radius={Radius.md}
              padding={Spacing.three}>
              <View style={styles.ctaInner}>
                {streaming ? (
                  <X size={22} color={theme.text} weight="bold" />
                ) : (
                  <Sparkle size={22} color={theme.textOnPrimary} weight="fill" />
                )}
                <ThemedText
                  style={[
                    styles.ctaText,
                    {
                      color: streaming ? theme.text : theme.textOnPrimary,
                      fontFamily: Fonts.display,
                    },
                  ]}>
                  {streaming ? 'CANCEL' : 'SUMMARISE'}
                </ThemedText>
              </View>
            </StickerButton>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function ResultRow({ item }: { item: Item }) {
  const theme = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.duration(260).springify().damping(18)}
      layout={LinearTransition.duration(220)}>
      <ResultRowInner item={item} theme={theme} />
    </Animated.View>
  );
}

type Theme = ReturnType<typeof useTheme>;

function ResultRowInner({ item, theme }: { item: Item; theme: Theme }) {
  const accent =
    item.status === 'ok'
      ? theme.success
      : item.status === 'preview'
        ? theme.accent
        : item.status === 'unsupported'
          ? theme.warning
          : theme.danger;

  const label =
    item.status === 'ok'
      ? 'SUMMARISED'
      : item.status === 'preview'
        ? 'PREVIEW'
        : item.status === 'unsupported'
          ? 'UNSUPPORTED'
          : 'FAILED';

  const title =
    item.status === 'ok' || item.status === 'preview' ? item.title : item.url;

  const subtitle =
    item.status === 'ok' || item.status === 'preview'
      ? item.summary
      : item.status === 'unsupported'
        ? item.reason
        : prettifyError(item.error);

  const thumb =
    item.status === 'ok' || item.status === 'preview' ? item.thumbnail : null;

  return (
    <Sticker
      background={theme.backgroundElement}
      style={styles.resultCard}>
      <View style={styles.resultHeader}>
        <View style={[styles.statusBox, { backgroundColor: accent, borderColor: theme.border }]}>
          <ThemedText
            style={[styles.statusLabel, { color: '#0A0A0A', fontFamily: Fonts.display }]}>
            {label}
          </ThemedText>
        </View>
        {item.saved ? (
          <ThemedText
            style={[styles.savedText, { color: theme.success, fontFamily: Fonts.marker }]}>
            saved
          </ThemedText>
        ) : null}
        {item.saveError ? (
          <ThemedText
            style={[styles.savedText, { color: theme.danger, fontFamily: Fonts.marker }]}>
            save failed
          </ThemedText>
        ) : null}
      </View>
      {thumb ? (
        <View style={[styles.thumbWrap, { borderColor: theme.border }]}>
          <Image
            source={{ uri: thumb }}
            style={styles.resultThumb}
            contentFit="cover"
            transition={200}
          />
        </View>
      ) : null}
      <ThemedText
        numberOfLines={2}
        style={[styles.resultTitle, { color: theme.text, fontFamily: Fonts.display }]}>
        {title}
      </ThemedText>
      {subtitle ? (
        <ThemedText
          numberOfLines={3}
          style={[styles.resultSummary, { color: theme.textSecondary, fontFamily: Fonts.sans }]}>
          {subtitle}
        </ThemedText>
      ) : null}
    </Sticker>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  headerTextWrap: {
    flex: 1,
    gap: Spacing.one,
  },
  title: {
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
  },
  body: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  inputSticker: {
    padding: 0,
  },
  input: {
    minHeight: 140,
    padding: Spacing.three,
    fontSize: 18,
    lineHeight: 26,
    textAlignVertical: 'top',
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  schemeHint: {
    fontSize: 13,
    flex: 1,
  },
  pasteInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.two,
  },
  pasteLabel: {
    fontSize: 12,
    letterSpacing: 1,
  },
  error: {
    fontSize: 16,
  },
  results: {
    marginTop: Spacing.two,
    gap: Spacing.three,
  },
  streamingPill: {
    alignSelf: 'flex-start',
  },
  streamingInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  retryInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  resultCard: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  statusBox: {
    borderWidth: Borders.thin,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  statusLabel: {
    fontSize: 13,
    letterSpacing: 1,
  },
  savedText: {
    fontSize: 14,
  },
  thumbWrap: {
    borderWidth: Borders.thick,
    overflow: 'hidden',
  },
  resultThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#00000010',
  },
  resultTitle: {
    fontSize: 22,
    lineHeight: 26,
  },
  resultSummary: {
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  ctaText: {
    fontSize: 22,
    letterSpacing: 1,
  },
});
