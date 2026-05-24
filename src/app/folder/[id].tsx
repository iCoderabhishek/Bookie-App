import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'phosphor-react-native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookmarkCard } from '@/components/bookmark-card';
import { ConfirmModal } from '@/components/confirm-modal';
import { NoteCard } from '@/components/note-card';
import { StickerButton } from '@/components/sticker-button';
import { TapeStrip } from '@/components/tape-strip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TodoPin } from '@/components/todo-pin';
import { Fonts, FolderColors, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  deleteBookmark,
  deleteNote,
  deleteTodo,
  getFolder,
  listFeed,
  toggleTodo,
} from '@/lib/db';
import type { FeedItem, Folder } from '@/lib/types';

type DeleteTarget =
  | { kind: 'bookmark'; id: number; label: string }
  | { kind: 'note'; id: number; label: string }
  | { kind: 'todo'; id: number; label: string };

export default function FolderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const [folder, setFolder] = useState<Folder | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const numericId = Number(id);
        if (!Number.isFinite(numericId)) {
          setLoading(false);
          return;
        }
        const [f, feed] = await Promise.all([
          getFolder(numericId),
          listFeed(numericId),
        ]);
        if (alive) {
          setFolder(f);
          setItems(feed);
          setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [id]),
  );

  const counts = useMemo(() => {
    let b = 0,
      n = 0,
      t = 0;
    for (const it of items) {
      if (it.kind === 'bookmark') b++;
      else if (it.kind === 'note') n++;
      else t++;
    }
    return { b, n, t };
  }, [items]);

  const onConfirmDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    if (!target) return;
    if (target.kind === 'bookmark') await deleteBookmark(target.id);
    if (target.kind === 'note') await deleteNote(target.id);
    if (target.kind === 'todo') await deleteTodo(target.id);
    setItems((prev) =>
      prev.filter((it) => {
        if (target.kind === 'bookmark' && it.kind === 'bookmark')
          return it.bookmark.id !== target.id;
        if (target.kind === 'note' && it.kind === 'note')
          return it.note.id !== target.id;
        if (target.kind === 'todo' && it.kind === 'todo')
          return it.todo.id !== target.id;
        return true;
      }),
    );
  };

  const onToggleTodo = async (todoId: number, currentDone: boolean) => {
    await toggleTodo(todoId, !currentDone);
    setItems((prev) =>
      prev.filter((it) => !(it.kind === 'todo' && it.todo.id === todoId)),
    );
  };

  if (loading || !folder) return <ThemedView style={styles.flex} />;

  const stripe = FolderColors[folder.color];

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <StickerButton onPress={() => router.back()} padding={10} radius={Radius.md}>
            <ArrowLeft size={22} color={theme.text} weight="bold" />
          </StickerButton>
          <View style={styles.headerTextWrap}>
            <View style={styles.titleRow}>
              <View style={[styles.folderStripe, { backgroundColor: stripe }]} />
              <ThemedText
                style={[styles.title, { color: theme.text, fontFamily: Fonts.display }]}
                numberOfLines={1}>
                {folder.name.toUpperCase()}
              </ThemedText>
              <TapeStrip color={stripe} width={32} height={10} rotate={-6} />
            </View>
            <ThemedText
              style={[styles.tagline, { color: theme.textSecondary, fontFamily: Fonts.marker }]}>
              {counts.b} links · {counts.n} notes · {counts.t} todos
            </ThemedText>
          </View>
        </View>

        <FlatList
          data={items}
          keyExtractor={(it) =>
            it.kind === 'bookmark'
              ? `b-${it.bookmark.id}`
              : it.kind === 'note'
                ? `n-${it.note.id}`
                : `t-${it.todo.id}`
          }
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            if (item.kind === 'bookmark') {
              return (
                <BookmarkCard
                  bookmark={item.bookmark}
                  folder={folder}
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
              return (
                <NoteCard
                  note={item.note}
                  folder={folder}
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
            return (
              <TodoPin
                todo={item.todo}
                folder={folder}
                onToggle={() => onToggleTodo(item.todo.id, item.todo.done)}
                onLongPress={() =>
                  setDeleteTarget({
                    kind: 'todo',
                    id: item.todo.id,
                    label: item.todo.text,
                  })
                }
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <ThemedText
                style={[styles.emptyHint, { color: theme.textSecondary, fontFamily: Fonts.marker }]}>
                nothing in here yet
              </ThemedText>
            </View>
          }
        />

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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  headerTextWrap: {
    flex: 1,
    gap: Spacing.one,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  folderStripe: {
    width: 14,
    height: 28,
    borderWidth: 1.5,
    borderColor: '#0A0A0A',
  },
  title: {
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1,
    flexShrink: 1,
  },
  tagline: {
    fontSize: 15,
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six * 2,
  },
  empty: {
    alignItems: 'center',
    paddingTop: Spacing.six,
  },
  emptyHint: {
    fontSize: 18,
  },
});
