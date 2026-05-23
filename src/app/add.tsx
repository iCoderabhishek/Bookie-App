import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { streamProcess } from '@/lib/api';
import { saveBookmark } from '@/lib/db';
import { Sentry } from '@/lib/sentry';
import type { ProcessResult } from '@/lib/types';

type Item = ProcessResult & { saved?: boolean; saveError?: boolean };

export default function AddScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ url?: string }>();
  const [input, setInput] = useState(params.url ?? '');
  const [items, setItems] = useState<Item[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.();
    },
    [],
  );

  const failedUrls = items
    .filter((it) => it.status === 'failed' || it.status === 'unsupported')
    .map((it) => it.url);

  const parseUrls = (raw: string): string[] => {
    return raw
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);
  };

  const runUrls = useCallback((urls: string[]) => {
    if (!urls.length) {
      setError('Drop in at least one URL');
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
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <ThemedText style={[styles.back, { color: theme.textSecondary }]}>
                ← back
              </ThemedText>
            </Pressable>
            <ThemedText
              style={[styles.title, { fontFamily: Fonts.rounded }]}>
              new bookmark
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              paste up to 10 links — one per line, or comma-separated
            </ThemedText>
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="https://..."
              placeholderTextColor={theme.textSecondary}
              multiline
              editable={!streaming}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}
            />

            {error ? (
              <ThemedText themeColor="danger" style={styles.error}>
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
                    exiting={FadeOut.duration(150)}
                    style={[styles.streamingPill, { backgroundColor: theme.backgroundElement }]}>
                    <ActivityIndicator size="small" color={theme.primary} />
                    <ThemedText type="small" themeColor="textSecondary">
                      summarising… {items.length} in
                    </ThemedText>
                  </Animated.View>
                ) : null}

                {!streaming && failedUrls.length > 0 ? (
                  <Animated.View entering={FadeInDown.duration(220)}>
                    <Pressable
                      onPress={retryFailed}
                      style={({ pressed }) => [
                        styles.retryBtn,
                        {
                          backgroundColor: theme.backgroundSelected,
                          borderColor: theme.border,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}>
                      <ThemedText
                        style={[styles.retryText, { fontFamily: Fonts.rounded }]}>
                        ↻ retry {failedUrls.length} failed
                      </ThemedText>
                    </Pressable>
                  </Animated.View>
                ) : null}
              </Animated.View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={streaming ? cancel : start}
              style={({ pressed }) => [
                styles.cta,
                {
                  backgroundColor: streaming ? theme.backgroundSelected : theme.primary,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}>
              <ThemedText
                style={[
                  styles.ctaText,
                  {
                    color: streaming ? theme.text : theme.textOnPrimary,
                    fontFamily: Fonts.rounded,
                  },
                ]}>
                {streaming ? 'cancel' : 'summarise ✨'}
              </ThemedText>
            </Pressable>
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
      ? 'summarised'
      : item.status === 'preview'
        ? 'preview only'
        : item.status === 'unsupported'
          ? 'unsupported'
          : 'failed';

  const title =
    item.status === 'ok' || item.status === 'preview' ? item.title : item.url;

  const subtitle =
    item.status === 'ok' || item.status === 'preview'
      ? item.summary
      : item.status === 'unsupported'
        ? item.reason
        : item.error;

  const thumb =
    item.status === 'ok' || item.status === 'preview' ? item.thumbnail : null;

  return (
    <View
      style={[
        styles.resultCard,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <View style={styles.resultHeader}>
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <ThemedText type="small" style={[styles.statusLabel, { color: accent }]}>
          {label}
        </ThemedText>
        {item.saved ? (
          <ThemedText type="small" themeColor="textSecondary">
            · saved
          </ThemedText>
        ) : null}
        {item.saveError ? (
          <ThemedText type="small" themeColor="danger">
            · save failed
          </ThemedText>
        ) : null}
      </View>
      {thumb ? (
        <Image
          source={{ uri: thumb }}
          style={styles.resultThumb}
          contentFit="cover"
          transition={200}
        />
      ) : null}
      <ThemedText
        numberOfLines={2}
        style={[styles.resultTitle, { fontFamily: Fonts.rounded }]}>
        {title}
      </ThemedText>
      {subtitle ? (
        <ThemedText
          type="small"
          themeColor="textSecondary"
          numberOfLines={3}>
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.one,
  },
  back: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.one,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  body: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  input: {
    minHeight: 140,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  error: {
    marginTop: Spacing.two,
    fontWeight: '600',
  },
  results: {
    marginTop: Spacing.four,
    gap: Spacing.three,
  },
  retryBtn: {
    marginTop: Spacing.one,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
  },
  retryText: {
    fontSize: 15,
    fontWeight: '700',
  },
  streamingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  resultCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    overflow: 'hidden',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  resultThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.md,
    backgroundColor: '#00000010',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  cta: {
    borderRadius: Radius.pill,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});
