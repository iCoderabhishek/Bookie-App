import { useFocusEffect, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Check,
  Plus,
  Trash,
} from 'phosphor-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ConfirmModal } from '@/components/confirm-modal';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Sticker } from '@/components/sticker';
import { StickerButton } from '@/components/sticker-button';
import { TapeStrip } from '@/components/tape-strip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  Borders,
  Fonts,
  FolderColors,
  Radius,
  Spacing,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createTodo, deleteTodo, listTodos, toggleTodo } from '@/lib/db';
import type { Todo } from '@/lib/types';

export default function TodosScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [draft, setDraft] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Todo | null>(null);
  const inputRef = useRef<TextInput>(null);

  const refresh = useCallback(async () => {
    const ts = await listTodos();
    setTodos(ts);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const ts = await listTodos();
        if (alive) setTodos(ts);
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  const { open, done } = useMemo(() => {
    const o: Todo[] = [];
    const d: Todo[] = [];
    for (const t of todos) {
      if (t.done) d.push(t);
      else o.push(t);
    }
    return { open: o, done: d };
  }, [todos]);

  const onAdd = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    const id = await createTodo(text);
    setTodos((prev) => [
      {
        id,
        text,
        done: false,
        folderId: null,
        createdAt: Date.now(),
        completedAt: null,
      },
      ...prev,
    ]);
  };

  const onToggle = async (todo: Todo) => {
    const next = !todo.done;
    await toggleTodo(todo.id, next);
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todo.id
          ? { ...t, done: next, completedAt: next ? Date.now() : null }
          : t,
      ),
    );
  };

  const onDelete = (todo: Todo) => {
    setDeleteTarget(todo);
  };

  const onConfirmDelete = async () => {
    const t = deleteTarget;
    setDeleteTarget(null);
    if (!t) return;
    await deleteTodo(t.id);
    setTodos((prev) => prev.filter((x) => x.id !== t.id));
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <StickerButton onPress={() => router.back()} padding={10} radius={Radius.md}>
            <ArrowLeft size={22} color={theme.text} weight="bold" />
          </StickerButton>
          <View style={styles.headerTextWrap}>
            <View style={styles.titleBrandRow}>
              <ThemedText
                style={[styles.title, { color: theme.text, fontFamily: Fonts.display }]}>
                TODOS
              </ThemedText>
              <TapeStrip
                color={FolderColors.mint}
                width={48}
                height={12}
                rotate={-5}
                style={{ marginLeft: -6, marginTop: 8 }}
              />
            </View>
            <ThemedText
              style={[styles.tagline, { color: theme.textSecondary, fontFamily: Fonts.marker }]}>
              cross 'em off, feel a little smug
            </ThemedText>
          </View>
        </View>

        <View style={styles.addRow}>
          <Sticker background={theme.backgroundElement} style={styles.addSticker}>
            <View style={styles.addInner}>
              <TextInput
                ref={inputRef}
                value={draft}
                onChangeText={setDraft}
                placeholder="what's next?"
                placeholderTextColor={theme.textSecondary}
                returnKeyType="done"
                onSubmitEditing={onAdd}
                style={[
                  styles.addInput,
                  { color: theme.text, fontFamily: Fonts.sansBold },
                ]}
              />
            </View>
          </Sticker>
          <StickerButton
            onPress={onAdd}
            background={theme.primary}
            padding={12}
            radius={Radius.md}>
            <Plus size={24} color={theme.textOnPrimary} weight="bold" />
          </StickerButton>
        </View>

        <FlatList
          data={[
            { type: 'header' as const, label: 'TO DO', count: open.length, key: 'h-open' },
            ...open.map((t) => ({ type: 'todo' as const, todo: t, key: `o-${t.id}` })),
            ...(done.length > 0
              ? [{ type: 'header' as const, label: 'DONE', count: done.length, key: 'h-done' }]
              : []),
            ...done.map((t) => ({ type: 'todo' as const, todo: t, key: `d-${t.id}` })),
          ]}
          keyExtractor={(i) => i.key}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <View style={styles.sectionHeader}>
                  <View
                    style={[
                      styles.sectionStamp,
                      {
                        backgroundColor: theme.backgroundSelected,
                        borderColor: theme.border,
                      },
                    ]}>
                    <ThemedText
                      style={[
                        styles.sectionStampText,
                        { color: theme.text, fontFamily: Fonts.display },
                      ]}>
                      {item.label} · {item.count}
                    </ThemedText>
                  </View>
                </View>
              );
            }
            return (
              <TodoRow
                todo={item.todo}
                onToggle={() => onToggle(item.todo)}
                onLongPress={() => onDelete(item.todo)}
              />
            );
          }}
          ListEmptyComponent={
            <Animated.View entering={FadeIn} style={styles.empty}>
              <Sticker
                background={theme.backgroundSelected}
                radius={Radius.sm}
                style={styles.emptyStamp}>
                <ThemedText
                  style={[styles.emptyStampText, { color: theme.text, fontFamily: Fonts.display }]}>
                  ALL CLEAR
                </ThemedText>
              </Sticker>
              <ThemedText
                style={[styles.emptyHint, { color: theme.textSecondary, fontFamily: Fonts.marker }]}>
                go touch grass
              </ThemedText>
            </Animated.View>
          }
        />
        <ConfirmModal
          visible={deleteTarget !== null}
          title="DELETE TODO?"
          message={deleteTarget?.text}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={onConfirmDelete}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

function TodoRow({
  todo,
  onToggle,
  onLongPress,
}: {
  todo: Todo;
  onToggle: () => void;
  onLongPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.duration(220).springify().damping(18)}
      exiting={FadeOut.duration(140)}
      layout={LinearTransition.duration(220)}
      style={rowStyles.outer}>
      <Pressable onPress={onToggle} onLongPress={onLongPress} delayLongPress={400}>
        <Sticker
          background={todo.done ? theme.background : theme.backgroundElement}
          style={rowStyles.card}
          flat={todo.done}>
          <View style={rowStyles.inner}>
            <View
              style={[
                rowStyles.checkbox,
                {
                  borderColor: theme.border,
                  backgroundColor: todo.done ? theme.primary : theme.background,
                },
              ]}>
              {todo.done ? (
                <Check size={18} color={theme.textOnPrimary} weight="bold" />
              ) : null}
            </View>
            <View style={rowStyles.textWrap}>
              <ThemedText
                style={[
                  rowStyles.text,
                  {
                    color: todo.done ? theme.textSecondary : theme.text,
                    fontFamily: Fonts.sansBold,
                    textDecorationLine: todo.done ? 'line-through' : 'none',
                  },
                ]}
                numberOfLines={3}>
                {todo.text}
              </ThemedText>
            </View>
            {todo.done ? (
              <Pressable onPress={onLongPress} hitSlop={10}>
                <Trash size={18} color={theme.textSecondary} weight="bold" />
              </Pressable>
            ) : null}
          </View>
        </Sticker>
      </Pressable>
    </Animated.View>
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
  titleBrandRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1.5,
  },
  tagline: {
    fontSize: 15,
  },
  addRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
    alignItems: 'center',
  },
  addSticker: {
    flex: 1,
    padding: 0,
  },
  addInner: {
    paddingHorizontal: Spacing.three,
  },
  addInput: {
    fontSize: 18,
    paddingVertical: Spacing.three,
  },
  list: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six * 2,
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
  },
  sectionStamp: {
    borderWidth: Borders.thick,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    transform: [{ rotate: '-2deg' }],
  },
  sectionStampText: {
    fontSize: 18,
    letterSpacing: 1,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.six,
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
});

const rowStyles = StyleSheet.create({
  outer: {
    marginBottom: Spacing.two,
  },
  card: {
    padding: 0,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderWidth: Borders.thick,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  text: {
    fontSize: 17,
    lineHeight: 24,
  },
});
