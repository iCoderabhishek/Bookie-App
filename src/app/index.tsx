import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookmarkCard } from '@/components/bookmark-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteBookmark, listBookmarks } from '@/lib/db';
import type { Bookmark } from '@/lib/types';

const ALL = '__all__';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(ALL);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const items = await listBookmarks();
        if (alive) {
          setBookmarks(items);
          setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const items = await listBookmarks();
      setBookmarks(items);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const b of bookmarks) if (b.category) set.add(b.category);
    return [ALL, ...Array.from(set).sort()];
  }, [bookmarks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookmarks.filter((b) => {
      if (activeCategory !== ALL && b.category !== activeCategory) return false;
      if (!q) return true;
      const haystack = [
        b.title,
        b.summary,
        b.note,
        b.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [bookmarks, query, activeCategory]);

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText
            style={[styles.brand, { fontFamily: Fonts.rounded, color: theme.primary }]}>
            bookie
          </ThemedText>
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.tagline}>
            your pookie for links ✨
          </ThemedText>
        </View>

        {bookmarks.length > 0 ? (
          <>
            <View style={styles.searchWrap}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="search title, tags, notes…"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.search,
                  {
                    color: theme.text,
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                  },
                ]}
              />
            </View>

            {categories.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
                style={styles.chipScroll}>
                {categories.map((cat) => {
                  const active = cat === activeCategory;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setActiveCategory(cat)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active
                            ? theme.primary
                            : theme.backgroundElement,
                          borderColor: active ? theme.primary : theme.border,
                        },
                      ]}>
                      <ThemedText
                        style={[
                          styles.chipText,
                          {
                            color: active ? theme.textOnPrimary : theme.text,
                            fontFamily: Fonts.rounded,
                          },
                        ]}>
                        {cat === ALL ? 'all' : cat}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
          </>
        ) : null}

        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : bookmarks.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText style={styles.emptyEmoji}>📚</ThemedText>
            <ThemedText style={[styles.emptyTitle, { fontFamily: Fonts.rounded }]}>
              No bookmarks yet
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.emptyHint}>
              Tap the big button to drop in your first link
            </ThemedText>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText style={styles.emptyEmoji}>🔍</ThemedText>
            <ThemedText style={[styles.emptyTitle, { fontFamily: Fonts.rounded }]}>
              No matches
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.emptyHint}>
              Try a different search or category
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(b) => String(b.id)}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            }
            renderItem={({ item }) => (
              <BookmarkCard
                bookmark={item}
                onPress={() => router.push(`/bookmark/${item.id}`)}
                onLongPress={() => {
                  Alert.alert(
                    'Delete bookmark?',
                    item.title,
                    [
                      { text: 'cancel', style: 'cancel' },
                      {
                        text: 'delete',
                        style: 'destructive',
                        onPress: async () => {
                          await deleteBookmark(item.id);
                          setBookmarks((prev) => prev.filter((b) => b.id !== item.id));
                        },
                      },
                    ],
                  );
                }}
              />
            )}
          />
        )}

        <Pressable
          onPress={() => router.push('/add')}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: theme.primary,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            },
          ]}>
          <ThemedText
            style={[styles.fabText, { color: theme.textOnPrimary, fontFamily: Fonts.rounded }]}>
            +
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.half,
  },
  brand: {
    fontSize: 48,
    lineHeight: 52,
    fontWeight: '800',
    letterSpacing: -1,
  },
  tagline: {
    fontWeight: '500',
  },
  searchWrap: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  search: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  chipScroll: {
    flexGrow: 0,
    marginTop: Spacing.two,
  },
  chipRow: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.one,
    paddingVertical: Spacing.one,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six * 2,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: Spacing.two,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  emptyHint: {
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.four,
    right: Spacing.four,
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabText: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '700',
    marginTop: -2,
  },
});
