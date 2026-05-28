import { useFocusEffect, useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  FolderSimple,
  Plus,
  Trash,
} from 'phosphor-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ConfirmModal } from '@/components/confirm-modal';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Sticker } from '@/components/sticker';
import { StickerButton } from '@/components/sticker-button';
import { TapeStrip } from '@/components/tape-strip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  Borders,
  Fonts,
  FolderColorList,
  FolderColors,
  Radius,
  Shadows,
  Spacing,
  type FolderColor,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  createFolder,
  createNote,
  deleteFolder,
  deleteNote,
  listFolders,
  listNotes,
  renameFolder,
  updateNote,
} from '@/lib/db';
import type { Folder, Note } from '@/lib/types';

const ALL_FOLDER = -1;
const NO_FOLDER = -2;

export default function NotesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolder, setActiveFolder] = useState<number>(ALL_FOLDER);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);
  const [folderDeleteTarget, setFolderDeleteTarget] = useState<Folder | null>(null);
  // Long-press a note → open an actions sheet (Move / Delete) instead of
  // jumping straight to delete.
  const [actionsTarget, setActionsTarget] = useState<Note | null>(null);
  const [moveTarget, setMoveTarget] = useState<Note | null>(null);

  const refresh = useCallback(async () => {
    const [ns, fs] = await Promise.all([listNotes(), listFolders()]);
    setNotes(ns);
    setFolders(fs);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const [ns, fs] = await Promise.all([listNotes(), listFolders()]);
        if (alive) {
          setNotes(ns);
          setFolders(fs);
        }
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  const folderById = useMemo(() => {
    const m = new Map<number, Folder>();
    for (const f of folders) m.set(f.id, f);
    return m;
  }, [folders]);

  const noteCounts = useMemo(() => {
    const counts = new Map<number, number>();
    let unfiled = 0;
    for (const n of notes) {
      if (n.folderId == null) unfiled++;
      else counts.set(n.folderId, (counts.get(n.folderId) ?? 0) + 1);
    }
    return { counts, unfiled };
  }, [notes]);

  const visible = useMemo(() => {
    if (activeFolder === ALL_FOLDER) return notes;
    if (activeFolder === NO_FOLDER) return notes.filter((n) => n.folderId == null);
    return notes.filter((n) => n.folderId === activeFolder);
  }, [notes, activeFolder]);

  const onNewNote = async () => {
    const folderId = activeFolder > 0 ? activeFolder : undefined;
    const id = await createNote(folderId);
    router.push(`/note/${id}` as never);
  };

  const onLongPressFolder = (folder: Folder) => {
    setFolderDeleteTarget(folder);
  };

  const onConfirmFolderDelete = async () => {
    const f = folderDeleteTarget;
    setFolderDeleteTarget(null);
    if (!f) return;
    await deleteFolder(f.id);
    await refresh();
    if (activeFolder === f.id) setActiveFolder(ALL_FOLDER);
  };

  const onConfirmNoteDelete = async () => {
    const t = deleteTarget;
    setDeleteTarget(null);
    if (!t) return;
    await deleteNote(t.id);
    setNotes((p) => p.filter((n) => n.id !== t.id));
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <StickerButton onPress={() => router.back()} padding={10} radius={Radius.md}>
            <ArrowLeft size={22} color={theme.text} weight="bold" />
          </StickerButton>
          <View style={styles.headerTitleWrap}>
            <View style={styles.titleBrandRow}>
              <ThemedText
                style={[styles.title, { color: theme.text, fontFamily: Fonts.display }]}>
                NOTES
              </ThemedText>
              <TapeStrip
                color={FolderColors.bubblegum}
                width={48}
                height={12}
                rotate={-5}
                style={{ marginLeft: -6, marginTop: 8 }}
              />
            </View>
            <ThemedText
              style={[styles.tagline, { color: theme.textSecondary, fontFamily: Fonts.marker }]}>
              jot it. pin it. forget about it.
            </ThemedText>
          </View>
        </View>

        <View style={styles.folderRowOuter}>
          <FlatList
            data={[
              { id: ALL_FOLDER, label: 'ALL', count: notes.length, stripe: theme.primary },
              ...folders.map((f) => ({
                id: f.id,
                label: f.name,
                count: noteCounts.counts.get(f.id) ?? 0,
                stripe: FolderColors[f.color],
                folder: f,
              })),
              ...(noteCounts.unfiled > 0
                ? [
                    {
                      id: NO_FOLDER,
                      label: 'UNFILED',
                      count: noteCounts.unfiled,
                      stripe: theme.textSecondary,
                    },
                  ]
                : []),
            ]}
            keyExtractor={(i) => String(i.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.folderRow}
            renderItem={({ item }) => (
              <FolderChip
                label={item.label}
                count={item.count}
                stripeColor={item.stripe}
                active={activeFolder === item.id}
                onPress={() => setActiveFolder(item.id)}
                onLongPress={
                  'folder' in item && item.folder
                    ? () => onLongPressFolder(item.folder as Folder)
                    : undefined
                }
              />
            )}
            ListFooterComponent={
              <StickerButton
                onPress={() => setCreateOpen(true)}
                background={theme.backgroundSelected}
                radius={Radius.sm}
                shadowOffset={3}
                style={styles.newFolderBtn}>
                <View style={styles.newFolderInner}>
                  <Plus size={18} color={theme.text} weight="bold" />
                  <ThemedText
                    style={[styles.newFolderLabel, { color: theme.text, fontFamily: Fonts.sansBold }]}>
                    NEW FOLDER
                  </ThemedText>
                </View>
              </StickerButton>
            }
          />
        </View>

        {visible.length === 0 ? (
          <Animated.View entering={FadeIn} style={styles.empty}>
            <Sticker
              background={theme.backgroundSelected}
              radius={Radius.sm}
              style={styles.emptyStamp}>
              <ThemedText
                style={[styles.emptyStampText, { color: theme.text, fontFamily: Fonts.display }]}>
                FRESH PAGE
              </ThemedText>
            </Sticker>
            <ThemedText
              style={[styles.emptyHint, { color: theme.textSecondary, fontFamily: Fonts.marker }]}>
              tap + to start a new note
            </ThemedText>
          </Animated.View>
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(n) => String(n.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <NoteRow
                note={item}
                folder={item.folderId != null ? folderById.get(item.folderId) ?? null : null}
                rotation={(index % 2 === 0 ? -1 : 1) * 0.5}
                onPress={() => router.push(`/note/${item.id}` as never)}
                onLongPress={() => setActionsTarget(item)}
              />
            )}
          />
        )}

        <View style={styles.fabWrap}>
          <StickerButton
            onPress={onNewNote}
            background={theme.primary}
            radius={Radius.md}
            padding={18}
            shadowOffset={Shadows.hard.offset + 2}>
            <Plus size={32} color={theme.textOnPrimary} weight="bold" />
          </StickerButton>
        </View>

        <NewFolderModal
          visible={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreate={async (name, color) => {
            await createFolder(name, color);
            setCreateOpen(false);
            await refresh();
          }}
        />

        <ConfirmModal
          visible={deleteTarget !== null}
          title="DELETE NOTE?"
          message={deleteTarget?.label}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={onConfirmNoteDelete}
        />
        <ConfirmModal
          visible={folderDeleteTarget !== null}
          title="DELETE FOLDER?"
          message={
            folderDeleteTarget
              ? `${folderDeleteTarget.name} — items inside become unfiled (kept).`
              : undefined
          }
          onCancel={() => setFolderDeleteTarget(null)}
          onConfirm={onConfirmFolderDelete}
        />

        <NoteActionsSheet
          target={actionsTarget}
          onClose={() => setActionsTarget(null)}
          onMove={() => {
            const t = actionsTarget;
            setActionsTarget(null);
            if (t) setMoveTarget(t);
          }}
          onDelete={() => {
            const t = actionsTarget;
            setActionsTarget(null);
            if (t) setDeleteTarget({ id: t.id, label: t.title || 'this note' });
          }}
        />

        <FolderPickerModal
          target={moveTarget}
          folders={folders}
          onClose={() => setMoveTarget(null)}
          onPick={async (folderId) => {
            const t = moveTarget;
            setMoveTarget(null);
            if (!t) return;
            await updateNote(t.id, { folderId });
            await refresh();
          }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

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
      <View style={chipStyles.inner}>
        <View style={[chipStyles.stripe, { backgroundColor: stripeColor }]} />
        <ThemedText
          style={[chipStyles.label, { color: theme.text, fontFamily: Fonts.sansBold }]}
          numberOfLines={1}>
          {label.toUpperCase()}
        </ThemedText>
        <View style={[chipStyles.countWrap, { borderColor: theme.border }]}>
          <ThemedText
            style={[chipStyles.count, { color: theme.text, fontFamily: Fonts.marker }]}>
            {count}
          </ThemedText>
        </View>
      </View>
    </StickerButton>
  );
}

function NoteRow({
  note,
  folder,
  rotation,
  onPress,
  onLongPress,
}: {
  note: Note;
  folder: Folder | null;
  rotation: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const theme = useTheme();
  const preview = useMemo(() => stripHtml(note.bodyHtml).slice(0, 140), [note.bodyHtml]);
  const title = note.title.trim() || preview.slice(0, 40) || 'untitled scratch';
  return (
    <Animated.View
      entering={FadeInDown.duration(220).springify().damping(18)}
      layout={LinearTransition.duration(200)}
      style={[noteStyles.outer, { transform: [{ rotate: `${rotation}deg` }] }]}>
      <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={400}>
        <Sticker background={theme.backgroundElement} style={noteStyles.card}>
          <ThemedText
            style={[noteStyles.title, { color: theme.text, fontFamily: Fonts.display }]}
            numberOfLines={1}>
            {title}
          </ThemedText>
          {preview ? (
            <ThemedText
              style={[noteStyles.body, { color: theme.textSecondary, fontFamily: Fonts.sans }]}
              numberOfLines={2}>
              {preview}
            </ThemedText>
          ) : null}
          {folder ? (
            <View style={noteStyles.folderRow}>
              <FolderSimple size={14} color={theme.text} weight="duotone" />
              <ThemedText
                style={[noteStyles.folderName, { color: theme.text, fontFamily: Fonts.sansBold }]}>
                {folder.name.toUpperCase()}
              </ThemedText>
              <View style={[noteStyles.folderStripe, { backgroundColor: FolderColors[folder.color] }]} />
            </View>
          ) : null}
        </Sticker>
      </Pressable>
    </Animated.View>
  );
}

function NewFolderModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, color: FolderColor) => void;
}) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [color, setColor] = useState<FolderColor>('tomato');

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Sticker background={theme.background} style={modalStyles.box}>
            <View style={modalStyles.headerRow}>
              <ThemedText
                style={[modalStyles.heading, { color: theme.text, fontFamily: Fonts.display }]}>
                NEW FOLDER
              </ThemedText>
              <StickerButton onPress={onClose} padding={6} radius={Radius.sm}>
                <Trash size={16} color={theme.text} weight="bold" />
              </StickerButton>
            </View>
            <Sticker background={theme.backgroundElement} style={modalStyles.inputWrap}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="folder name"
                placeholderTextColor={theme.textSecondary}
                style={[modalStyles.input, { color: theme.text, fontFamily: Fonts.sansBold }]}
                autoFocus
              />
            </Sticker>
            <ThemedText
              style={[modalStyles.colorLabel, { color: theme.text, fontFamily: Fonts.marker }]}>
              pick a color
            </ThemedText>
            <View style={modalStyles.colorRow}>
              {FolderColorList.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={[
                    modalStyles.swatch,
                    {
                      backgroundColor: FolderColors[c],
                      borderColor: theme.border,
                      borderWidth: color === c ? Borders.chonk : Borders.thin,
                    },
                  ]}
                />
              ))}
            </View>
            <StickerButton
              onPress={() => {
                if (!name.trim()) return;
                onCreate(name.trim(), color);
                setName('');
                setColor('tomato');
              }}
              background={theme.primary}
              radius={Radius.md}
              padding={Spacing.three}>
              <ThemedText
                style={[modalStyles.cta, { color: theme.textOnPrimary, fontFamily: Fonts.display }]}>
                CREATE
              </ThemedText>
            </StickerButton>
          </Sticker>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function NoteActionsSheet({
  target,
  onClose,
  onMove,
  onDelete,
}: {
  target: Note | null;
  onClose: () => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const visible = target !== null;
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Sticker background={theme.background} style={modalStyles.box}>
            <ThemedText
              style={[modalStyles.heading, { color: theme.text, fontFamily: Fonts.display }]}
              numberOfLines={1}>
              {target?.title?.trim() || 'NOTE'}
            </ThemedText>
            <StickerButton
              onPress={onMove}
              background={theme.backgroundElement}
              radius={Radius.md}
              padding={Spacing.three}>
              <View style={actionStyles.actionRow}>
                <ArrowRight size={18} color={theme.text} weight="bold" />
                <ThemedText
                  style={[actionStyles.actionLabel, { color: theme.text, fontFamily: Fonts.display }]}>
                  MOVE TO FOLDER
                </ThemedText>
              </View>
            </StickerButton>
            <StickerButton
              onPress={onDelete}
              background={theme.danger}
              radius={Radius.md}
              padding={Spacing.three}>
              <View style={actionStyles.actionRow}>
                <Trash size={18} color={theme.textOnPrimary} weight="bold" />
                <ThemedText
                  style={[
                    actionStyles.actionLabel,
                    { color: theme.textOnPrimary, fontFamily: Fonts.display },
                  ]}>
                  DELETE
                </ThemedText>
              </View>
            </StickerButton>
          </Sticker>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function FolderPickerModal({
  target,
  folders,
  onClose,
  onPick,
}: {
  target: Note | null;
  folders: Folder[];
  onClose: () => void;
  onPick: (folderId: number | null) => void;
}) {
  const theme = useTheme();
  const visible = target !== null;
  const currentId = target?.folderId ?? null;
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Sticker background={theme.background} style={modalStyles.box}>
            <ThemedText
              style={[modalStyles.heading, { color: theme.text, fontFamily: Fonts.display }]}>
              MOVE TO
            </ThemedText>
            <Pressable onPress={() => onPick(null)}>
              <Sticker
                background={
                  currentId == null ? theme.backgroundSelected : theme.backgroundElement
                }
                radius={Radius.sm}
                shadowOffset={2}
                style={actionStyles.pickerRow}>
                <ThemedText
                  style={[
                    actionStyles.pickerText,
                    { color: theme.text, fontFamily: Fonts.sansBold },
                  ]}>
                  UNFILED
                </ThemedText>
              </Sticker>
            </Pressable>
            {folders.map((f) => (
              <Pressable key={f.id} onPress={() => onPick(f.id)}>
                <Sticker
                  background={
                    currentId === f.id ? theme.backgroundSelected : theme.backgroundElement
                  }
                  radius={Radius.sm}
                  shadowOffset={2}
                  style={actionStyles.pickerRow}>
                  <View style={actionStyles.pickerInner}>
                    <View
                      style={[
                        actionStyles.swatch,
                        { backgroundColor: FolderColors[f.color], borderColor: theme.border },
                      ]}
                    />
                    <ThemedText
                      style={[
                        actionStyles.pickerText,
                        { color: theme.text, fontFamily: Fonts.sansBold },
                      ]}>
                      {f.name.toUpperCase()}
                    </ThemedText>
                  </View>
                </Sticker>
              </Pressable>
            ))}
          </Sticker>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const stripHtml = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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
  headerTitleWrap: {
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
  folderRowOuter: {
    paddingBottom: Spacing.two,
  },
  folderRow: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  newFolderBtn: {
    marginRight: Spacing.three,
  },
  newFolderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    minHeight: 40,
  },
  newFolderLabel: {
    fontSize: 14,
    letterSpacing: 1,
  },
  list: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six * 2,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
});

const chipStyles = StyleSheet.create({
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    minHeight: 40,
  },
  stripe: {
    width: 8,
    alignSelf: 'stretch',
    marginRight: Spacing.two,
    marginLeft: -Spacing.one,
    borderRightWidth: Borders.thin,
    borderRightColor: '#0A0A0A',
  },
  label: {
    fontSize: 14,
    letterSpacing: 1,
    paddingRight: Spacing.two,
  },
  countWrap: {
    borderWidth: Borders.thin,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginRight: Spacing.two,
  },
  count: {
    fontSize: 14,
    lineHeight: 18,
  },
});

const noteStyles = StyleSheet.create({
  outer: {
    marginBottom: Spacing.three,
  },
  card: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  title: {
    fontSize: 22,
    lineHeight: 26,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: 4,
  },
  folderName: {
    fontSize: 13,
    letterSpacing: 1,
  },
  folderStripe: {
    width: 16,
    height: 6,
    marginLeft: Spacing.one,
    borderWidth: Borders.thin,
    borderColor: '#0A0A0A',
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000aa',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  box: {
    width: '100%',
    maxWidth: 360,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heading: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  inputWrap: {
    padding: 0,
  },
  input: {
    fontSize: 18,
    padding: Spacing.three,
  },
  colorLabel: {
    fontSize: 16,
  },
  colorRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
  },
  cta: {
    fontSize: 22,
    letterSpacing: 1,
  },
});

const actionStyles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  actionLabel: {
    fontSize: 18,
    letterSpacing: 1,
  },
  pickerRow: {
    padding: Spacing.two,
  },
  pickerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pickerText: {
    fontSize: 16,
    letterSpacing: 0.5,
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: Radius.sm,
    borderWidth: Borders.thin,
  },
});
