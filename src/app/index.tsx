import { useFocusEffect, useRouter } from 'expo-router';
import {
  CheckSquare,
  Gear,
  Link as LinkIcon,
  MagnifyingGlass,
  NotePencil,
  Plus,
  X,
} from 'phosphor-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInUp,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookmarkCard } from '@/components/bookmark-card';
import { ConfirmModal } from '@/components/confirm-modal';
import { LayoutChooser, type FeedLayout } from '@/components/layout-chooser';
import { NoteCard } from '@/components/note-card';
import { Sticker } from '@/components/sticker';
import { StickerButton } from '@/components/sticker-button';
import { TapeStrip } from '@/components/tape-strip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TodoPin } from '@/components/todo-pin';
import {
  Borders,
  FolderColors,
  Fonts,
  Radius,
  Shadows,
  Spacing,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  createNote,
  deleteBookmark,
  deleteNote,
  deleteTodo,
  getSetting,
  listFeed,
  listFolders,
  setSetting,
  toggleTodo,
} from '@/lib/db';
import type { FeedItem, Folder } from '@/lib/types';

const ALL_FOLDER = -1;
const NO_FOLDER = -2;
const SEARCH_HEIGHT = 64;
const LAYOUT_SETTING_KEY = 'feed_layout';

type DeleteTarget =
  | { kind: 'bookmark'; id: number; label: string }
  | { kind: 'note'; id: number; label: string }
  | { kind: 'todo'; id: number; label: string };

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState<number>(ALL_FOLDER);
  const [fabOpen, setFabOpen] = useState(false);
  const [layout, setLayout] = useState<FeedLayout>('list');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // 2 columns up to ~520dp (phones), 3 above (large phones, foldables, tablets).
  const wallColumns = screenWidth >= 520 ? 3 : 2;
  const isWall = layout === 'wall';
  const numColumns = isWall ? wallColumns : 1;

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });
  const searchAnim = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [0, 80],
      [SEARCH_HEIGHT, 0],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollY.value,
      [0, 60],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [0, 80],
      [0, -SEARCH_HEIGHT / 2],
      Extrapolation.CLAMP,
    );
    return { height, opacity, transform: [{ translateY }] };
  });

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const [feed, fldrs, savedLayout] = await Promise.all([
          listFeed(),
          listFolders(),
          getSetting(LAYOUT_SETTING_KEY),
        ]);
        if (alive) {
          setItems(feed);
          setFolders(fldrs);
          if (savedLayout === 'list' || savedLayout === 'wall') setLayout(savedLayout);
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
      const [feed, fldrs] = await Promise.all([listFeed(), listFolders()]);
      setItems(feed);
      setFolders(fldrs);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const onLayoutChange = (next: FeedLayout) => {
    setLayout(next);
    setSetting(LAYOUT_SETTING_KEY, next).catch(() => { });
  };

  const folderById = useMemo(() => {
    const m = new Map<number, Folder>();
    for (const f of folders) m.set(f.id, f);
    return m;
  }, [folders]);

  const folderCounts = useMemo(() => {
    const counts = new Map<number, number>();
    let uncategorized = 0;
    for (const it of items) {
      const folderId = pickFolderId(it);
      if (folderId == null) uncategorized++;
      else counts.set(folderId, (counts.get(folderId) ?? 0) + 1);
    }
    return { counts, uncategorized };
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      const folderId = pickFolderId(it);
      if (activeFolder === NO_FOLDER && folderId != null) return false;
      if (
        activeFolder !== ALL_FOLDER &&
        activeFolder !== NO_FOLDER &&
        folderId !== activeFolder
      )
        return false;
      if (!q) return true;
      return haystack(it).includes(q);
    });
  }, [items, query, activeFolder]);

  const onAddLink = () => {
    setFabOpen(false);
    router.push('/add');
  };

  const onAddNote = async () => {
    setFabOpen(false);
    const id = await createNote();
    router.push(`/note/${id}` as never);
  };

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    const t = deleteTarget;
    setDeleteTarget(null);
    if (t.kind === 'bookmark') await deleteBookmark(t.id);
    if (t.kind === 'note') await deleteNote(t.id);
    if (t.kind === 'todo') await deleteTodo(t.id);
    setItems((prev) =>
      prev.filter((it) => {
        if (t.kind === 'bookmark' && it.kind === 'bookmark') return it.bookmark.id !== t.id;
        if (t.kind === 'note' && it.kind === 'note') return it.note.id !== t.id;
        if (t.kind === 'todo' && it.kind === 'todo') return it.todo.id !== t.id;
        return true;
      }),
    );
  };

  const onToggleTodo = async (id: number, currentDone: boolean) => {
    await toggleTodo(id, !currentDone);
    // If toggled to done, remove from feed (feed shows only open todos).
    setItems((prev) =>
      prev.filter((it) => !(it.kind === 'todo' && it.todo.id === id)),
    );
  };

  const renderItem = ({ item }: { item: FeedItem }) => {
    if (item.kind === 'bookmark') {
      const folder =
        item.bookmark.folderId != null
          ? folderById.get(item.bookmark.folderId) ?? null
          : null;
      return (
        <BookmarkCard
          bookmark={item.bookmark}
          folder={folder}
          compact={isWall}
          onPress={() => router.push(`/bookmark/${item.bookmark.id}`)}
          onLongPress={() =>
            setDeleteTarget({
              kind: 'bookmark',
              id: item.bookmark.id,
              label: item.bookmark.title,
            })
          }
        />
      );
    }
    if (item.kind === 'note') {
      const folder =
        item.note.folderId != null ? folderById.get(item.note.folderId) ?? null : null;
      return (
        <NoteCard
          note={item.note}
          folder={folder}
          compact={isWall}
          onPress={() => router.push(`/note/${item.note.id}` as never)}
          onLongPress={() =>
            setDeleteTarget({
              kind: 'note',
              id: item.note.id,
              label: item.note.title || 'this note',
            })
          }
        />
      );
    }
    const folder =
      item.todo.folderId != null ? folderById.get(item.todo.folderId) ?? null : null;
    return (
      <TodoPin
        todo={item.todo}
        folder={folder}
        compact={isWall}
        onToggle={() => onToggleTodo(item.todo.id, item.todo.done)}
        onLongPress={() =>
          setDeleteTarget({ kind: 'todo', id: item.todo.id, label: item.todo.text })
        }
      />
    );
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.brandRow}>
              <ThemedText
                style={[styles.brand, { color: theme.text, fontFamily: Fonts.display }]}>
                BOOKIE
              </ThemedText>
              <TapeStrip
                color={theme.primary}
                width={56}
                height={14}
                rotate={-4}
                style={{ marginLeft: -8, marginTop: 14 }}
              />
            </View>
            <ThemedText
              style={[styles.tagline, { color: theme.textSecondary, fontFamily: Fonts.marker }]}>
              a scrapbook for your brain
            </ThemedText>
          </View>
          <View style={styles.headerRight}>
            <StickerButton
              onPress={() => router.push('/notes')}
              radius={Radius.md}
              padding={10}
              background={theme.backgroundElement}>
              <NotePencil size={24} color={theme.text} weight="duotone" />
            </StickerButton>
            <StickerButton
              onPress={() => router.push('/todos')}
              radius={Radius.md}
              padding={10}
              background={theme.backgroundElement}>
              <CheckSquare size={24} color={theme.text} weight="duotone" />
            </StickerButton>
            <StickerButton
              onPress={() => router.push('/settings')}
              radius={Radius.md}
              padding={10}
              background={theme.backgroundElement}>
              <Gear size={24} color={theme.text} weight="duotone" />
            </StickerButton>
          </View>
        </View>

        {items.length > 0 ? (
          <>
            <Animated.View style={[styles.searchWrap, searchAnim]}>
              <Sticker
                background={theme.backgroundElement}
                radius={Radius.md}
                style={styles.searchSticker}>
                <View style={styles.searchInner}>
                  <MagnifyingGlass size={22} color={theme.text} weight="bold" />
                  <ThemedText
                    style={[
                      styles.searchLabel,
                      { color: theme.text, fontFamily: Fonts.marker },
                    ]}>
                    FIND:
                  </ThemedText>
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="title · tags · notes"
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[
                      styles.searchInput,
                      { color: theme.text, fontFamily: Fonts.sansBold },
                    ]}
                  />
                </View>
              </Sticker>
            </Animated.View>

            {(folders.length > 0 || folderCounts.uncategorized > 0) ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.folderRowContent}
                style={styles.folderRow}>
                <FolderChip
                  label="ALL"
                  count={items.length}
                  active={activeFolder === ALL_FOLDER}
                  stripeColor={theme.primary}
                  onPress={() => setActiveFolder(ALL_FOLDER)}
                />
                {folders.map((f) => {
                  const count = folderCounts.counts.get(f.id) ?? 0;
                  if (count === 0) return null;
                  return (
                    <FolderChip
                      key={f.id}
                      label={f.name}
                      count={count}
                      active={activeFolder === f.id}
                      stripeColor={FolderColors[f.color]}
                      onPress={() => setActiveFolder(f.id)}
                      onLongPress={() => router.push(`/folder/${f.id}` as never)}
                    />
                  );
                })}
                {folderCounts.uncategorized > 0 ? (
                  <FolderChip
                    label="LOOSE"
                    count={folderCounts.uncategorized}
                    active={activeFolder === NO_FOLDER}
                    stripeColor={theme.textSecondary}
                    onPress={() => setActiveFolder(NO_FOLDER)}
                  />
                ) : null}
              </ScrollView>
            ) : null}

            <View style={styles.layoutRow}>
              <ThemedText
                style={[
                  styles.layoutHint,
                  { color: theme.textSecondary, fontFamily: Fonts.marker },
                ]}>
                {filtered.length} items
              </ThemedText>
              <LayoutChooser value={layout} onChange={onLayoutChange} />
            </View>
          </>
        ) : null}

        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : items.length === 0 ? (
          <EmptyState
            title="NOTHING PINNED"
            hint="tap + to drop a link or jot a note"
          />
        ) : filtered.length === 0 ? (
          <EmptyState title="NO MATCHES" hint="try a different word or folder" />
        ) : (
          <Animated.FlatList
            key={`${layout}-${numColumns}`}
            data={filtered}
            keyExtractor={feedKey}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            numColumns={numColumns}
            columnWrapperStyle={isWall ? styles.wallRow : undefined}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            }
            renderItem={renderItem}
          />
        )}

        {fabOpen ? (
          <Pressable
            onPress={() => setFabOpen(false)}
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        {fabOpen ? (
          <Animated.View
            entering={FadeInUp.duration(180)}
            style={styles.fabChoices}>
            <FabChoice
              icon={<LinkIcon size={22} color={theme.text} weight="bold" />}
              label="LINK"
              onPress={onAddLink}
            />
            <FabChoice
              icon={<NotePencil size={22} color={theme.text} weight="bold" />}
              label="NOTE"
              onPress={onAddNote}
            />
          </Animated.View>
        ) : null}

        <View style={styles.fabWrap}>
          <StickerButton
            onPress={() => setFabOpen((v) => !v)}
            background={theme.primary}
            radius={Radius.md}
            padding={18}
            shadowOffset={Shadows.hard.offset + 2}>
            {fabOpen ? (
              <X size={32} color={theme.textOnPrimary} weight="bold" />
            ) : (
              <Plus size={32} color={theme.textOnPrimary} weight="bold" />
            )}
          </StickerButton>
        </View>

        <ConfirmModal
          visible={deleteTarget !== null}
          title={
            deleteTarget?.kind === 'bookmark'
              ? 'DELETE BOOKMARK?'
              : deleteTarget?.kind === 'note'
                ? 'DELETE NOTE?'
                : 'DELETE TODO?'
          }
          message={deleteTarget?.label}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={onConfirmDelete}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const pickFolderId = (it: FeedItem): number | null => {
  if (it.kind === 'bookmark') return it.bookmark.folderId;
  if (it.kind === 'note') return it.note.folderId;
  return it.todo.folderId;
};

const haystack = (it: FeedItem): string => {
  if (it.kind === 'bookmark') {
    const b = it.bookmark;
    return [b.title, b.summary, b.note, b.tags.join(' ')].join(' ').toLowerCase();
  }
  if (it.kind === 'note') {
    const stripped = it.note.bodyHtml.replace(/<\/?[^>]+>/g, ' ');
    return [it.note.title, stripped].join(' ').toLowerCase();
  }
  return it.todo.text.toLowerCase();
};

const feedKey = (it: FeedItem) =>
  it.kind === 'bookmark'
    ? `b-${it.bookmark.id}`
    : it.kind === 'note'
      ? `n-${it.note.id}`
      : `t-${it.todo.id}`;

function FolderChip({
  label,
  count,
  active,
  stripeColor,
  onPress,
  onLongPress,
}: {
  label: string;
  count: number;
  active: boolean;
  stripeColor: string;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <StickerButton
      onPress={onPress}
      onLongPress={onLongPress}
      background={active ? theme.backgroundSelected : theme.backgroundElement}
      radius={Radius.sm}
      shadowOffset={3}
      style={{ marginRight: Spacing.three }}>
      <View style={styles.chipInner}>
        <View style={[styles.chipStripe, { backgroundColor: stripeColor }]} />
        <ThemedText
          style={[
            styles.chipLabel,
            { color: theme.text, fontFamily: Fonts.sansBold },
          ]}
          numberOfLines={1}>
          {label.toUpperCase()}
        </ThemedText>
        <View style={[styles.chipCountWrap, { borderColor: theme.border }]}>
          <ThemedText
            style={[styles.chipCount, { color: theme.text, fontFamily: Fonts.marker }]}>
            {count}
          </ThemedText>
        </View>
      </View>
    </StickerButton>
  );
}

function FabChoice({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <StickerButton
      onPress={onPress}
      background={theme.backgroundElement}
      radius={Radius.md}
      shadowOffset={3}
      style={styles.fabChoice}>
      <View style={styles.fabChoiceInner}>
        {icon}
        <ThemedText
          style={[
            styles.fabChoiceLabel,
            { color: theme.text, fontFamily: Fonts.sansBold },
          ]}>
          {label}
        </ThemedText>
      </View>
    </StickerButton>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeIn} style={styles.empty}>
      <Sticker
        background={theme.backgroundSelected}
        radius={Radius.sm}
        style={styles.emptyStamp}>
        <ThemedText
          style={[styles.emptyStampText, { color: theme.text, fontFamily: Fonts.display }]}>
          {title}
        </ThemedText>
      </Sticker>
      <ThemedText
        style={[styles.emptyHint, { color: theme.textSecondary, fontFamily: Fonts.marker }]}>
        {hint}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.three,
  },
  headerLeft: {
    flex: 1,
    gap: Spacing.one,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  brand: {
    fontSize: 32,
    lineHeight: 48,
    letterSpacing: -1.5,
  },
  tagline: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  searchWrap: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  searchSticker: {},
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  searchLabel: {
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    paddingVertical: Spacing.one,
  },
  folderRow: {
    flexGrow: 0,
    flexShrink: 0,
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
  },
  folderRowContent: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  chipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    minHeight: 40,
  },
  chipStripe: {
    width: 8,
    alignSelf: 'stretch',
    marginRight: Spacing.two,
    marginLeft: -Spacing.one,
    borderRightWidth: Borders.thin,
    borderRightColor: '#0A0A0A',
  },
  chipLabel: {
    fontSize: 14,
    letterSpacing: 1,
    paddingRight: Spacing.two,
  },
  chipCountWrap: {
    borderWidth: Borders.thin,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginRight: Spacing.two,
  },
  chipCount: {
    fontSize: 14,
    lineHeight: 18,
  },
  layoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.one,
  },
  layoutHint: {
    fontSize: 14,
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six * 2,
  },
  wallRow: {
    gap: Spacing.two,
    paddingHorizontal: 0,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  emptyStamp: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    transform: [{ rotate: '-3deg' }],
  },
  emptyStampText: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  emptyHint: {
    fontSize: 18,
    textAlign: 'center',
  },
  fabWrap: {
    position: 'absolute',
    bottom: Spacing.four,
    right: Spacing.four,
  },
  fabChoices: {
    position: 'absolute',
    bottom: Spacing.four + 76,
    right: Spacing.four,
    gap: Spacing.two,
    alignItems: 'flex-end',
  },
  fabChoice: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  fabChoiceInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  fabChoiceLabel: {
    fontSize: 16,
    letterSpacing: 1,
  },
});
