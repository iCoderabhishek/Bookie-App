import {
  darkEditorTheme,
  defaultEditorTheme,
  RichText,
  Toolbar,
  useEditorBridge,
  useEditorContent,
  type EditorBridge,
} from '@10play/tentap-editor';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  FolderSimple,
  Link as LinkIcon,
  Sparkle,
  Trash,
} from 'phosphor-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';

import { ConfirmModal } from '@/components/confirm-modal';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Sticker } from '@/components/sticker';
import { StickerButton } from '@/components/sticker-button';
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
import { summarizeUrl } from '@/lib/api';
import {
  deleteNote,
  getNote,
  listFolders,
  touchNote,
  updateNote,
} from '@/lib/db';
import type { Folder, Note } from '@/lib/types';

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderId, setFolderId] = useState<number | null>(null);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [summarizeOpen, setSummarizeOpen] = useState(false);
  const [summarizeUrlInput, setSummarizeUrlInput] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);
  const [saveLabel, setSaveLabel] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,
    initialContent: '',
    theme: isDark ? darkEditorTheme : defaultEditorTheme,
  }) as EditorBridge & {
    setContent: (content: string) => void;
    injectJS: (js: string) => void;
  };

  const html = useEditorContent(editor, { type: 'html', debounceInterval: 500 });

  useEffect(() => {
    let alive = true;
    (async () => {
      const numericId = Number(id);
      if (!Number.isFinite(numericId)) {
        setLoading(false);
        return;
      }
      const [n, fs] = await Promise.all([getNote(numericId), listFolders()]);
      if (!alive) return;
      setNote(n);
      setTitle(n?.title ?? '');
      setFolderId(n?.folderId ?? null);
      setFolders(fs);
      if (n?.bodyHtml) {
        editor.setContent(n.bodyHtml);
      }
      setLoading(false);
      if (n) touchNote(n.id).catch(() => {});
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const persist = useCallback(
    (patch: { title?: string; bodyHtml?: string; folderId?: number | null }) => {
      if (!note) return;
      setSaveLabel('saving');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        await updateNote(note.id, patch);
        setSaveLabel('saved');
      }, 350);
    },
    [note],
  );

  useEffect(() => {
    if (loading || html === undefined || !note) return;
    if (html === note.bodyHtml) return;
    persist({ bodyHtml: html as string });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  const onTitleChange = (next: string) => {
    setTitle(next);
    persist({ title: next });
  };

  const onPickFolder = async (next: number | null) => {
    setFolderId(next);
    setFolderPickerOpen(false);
    persist({ folderId: next });
  };

  const folder = useMemo(
    () => (folderId != null ? folders.find((f) => f.id === folderId) ?? null : null),
    [folderId, folders],
  );

  const onSummarize = async () => {
    const url = summarizeUrlInput.trim();
    if (!url) return;
    setSummarizing(true);
    setSummarizeError(null);
    try {
      const { html: summaryHtml } = await summarizeUrl(url);
      editor.injectJS(`
        (function() {
          try {
            window.editor.commands.focus();
            window.editor.commands.insertContent(${JSON.stringify(summaryHtml + '<p></p>')});
          } catch (e) {}
        })();
      `);
      setSummarizeOpen(false);
      setSummarizeUrlInput('');
    } catch (e) {
      setSummarizeError(e instanceof Error ? e.message : 'failed to summarise');
    } finally {
      setSummarizing(false);
    }
  };

  const onDelete = () => {
    if (!note) return;
    setConfirmDelete(true);
  };

  const onConfirmDelete = async () => {
    if (!note) return;
    setConfirmDelete(false);
    await deleteNote(note.id);
    router.back();
  };

  if (loading) return <ThemedView style={styles.flex} />;
  if (!note) {
    return (
      <ThemedView style={[styles.flex, styles.center]}>
        <SafeAreaView>
          <ThemedText>note not found</ThemedText>
          <StickerButton onPress={() => router.back()}>
            <ThemedText style={{ padding: Spacing.two }}>back</ThemedText>
          </StickerButton>
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
            <StickerButton onPress={() => router.back()} padding={10} radius={Radius.md}>
              <ArrowLeft size={22} color={theme.text} weight="bold" />
            </StickerButton>
            <View style={styles.headerCenter}>
              <ThemedText
                style={[styles.saveLabel, { color: theme.textSecondary, fontFamily: Fonts.marker }]}>
                {saveLabel === 'saving'
                  ? 'saving…'
                  : saveLabel === 'saved'
                    ? '✓ saved'
                    : ''}
              </ThemedText>
            </View>
            <View style={styles.headerRight}>
              <StickerButton
                onPress={() => setSummarizeOpen(true)}
                padding={10}
                radius={Radius.md}
                background={theme.backgroundSelected}>
                <Sparkle size={22} color={theme.text} weight="fill" />
              </StickerButton>
              <StickerButton onPress={onDelete} padding={10} radius={Radius.md}>
                <Trash size={22} color={theme.danger} weight="bold" />
              </StickerButton>
            </View>
          </View>

          <View style={styles.titleWrap}>
            <TextInput
              value={title}
              onChangeText={onTitleChange}
              placeholder="title"
              placeholderTextColor={theme.textSecondary}
              style={[styles.title, { color: theme.text, fontFamily: Fonts.display }]}
              multiline
            />
            <Pressable onPress={() => setFolderPickerOpen(true)} style={styles.folderChipWrap}>
              <Sticker
                background={folder ? FolderColors[folder.color] : theme.backgroundElement}
                radius={Radius.sm}
                shadowOffset={2}
                borderWidth={Borders.thin}>
                <View style={styles.folderChipInner}>
                  <FolderSimple size={14} color="#0A0A0A" weight="duotone" />
                  <ThemedText
                    style={[
                      styles.folderChipText,
                      { color: '#0A0A0A', fontFamily: Fonts.sansBold },
                    ]}>
                    {folder ? folder.name.toUpperCase() : 'UNFILED'}
                  </ThemedText>
                </View>
              </Sticker>
            </Pressable>
          </View>

          <View style={[styles.editorWrap, { borderColor: theme.border }]}>
            <RichText editor={editor} />
          </View>

          <Toolbar editor={editor} />

          <FolderPickerModal
            visible={folderPickerOpen}
            folders={folders}
            value={folderId}
            onClose={() => setFolderPickerOpen(false)}
            onSelect={onPickFolder}
          />

          <SummarizeModal
            visible={summarizeOpen}
            url={summarizeUrlInput}
            onUrlChange={setSummarizeUrlInput}
            onClose={() => {
              setSummarizeOpen(false);
              setSummarizeError(null);
            }}
            onSubmit={onSummarize}
            loading={summarizing}
            error={summarizeError}
          />

          <ConfirmModal
            visible={confirmDelete}
            title="DELETE NOTE?"
            message={note?.title || 'this note'}
            onCancel={() => setConfirmDelete(false)}
            onConfirm={onConfirmDelete}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function FolderPickerModal({
  visible,
  folders,
  value,
  onClose,
  onSelect,
}: {
  visible: boolean;
  folders: Folder[];
  value: number | null;
  onClose: () => void;
  onSelect: (id: number | null) => void;
}) {
  const theme = useTheme();
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Sticker background={theme.background} style={modalStyles.box}>
            <ThemedText
              style={[modalStyles.heading, { color: theme.text, fontFamily: Fonts.display }]}>
              FILE IN
            </ThemedText>
            <Pressable onPress={() => onSelect(null)}>
              <Sticker
                background={value == null ? theme.backgroundSelected : theme.backgroundElement}
                radius={Radius.sm}
                shadowOffset={2}
                style={modalStyles.row}>
                <ThemedText
                  style={[modalStyles.rowText, { color: theme.text, fontFamily: Fonts.sansBold }]}>
                  UNFILED
                </ThemedText>
              </Sticker>
            </Pressable>
            {folders.map((f) => (
              <Pressable key={f.id} onPress={() => onSelect(f.id)}>
                <Sticker
                  background={value === f.id ? theme.backgroundSelected : theme.backgroundElement}
                  radius={Radius.sm}
                  shadowOffset={2}
                  style={modalStyles.row}>
                  <View style={modalStyles.rowInner}>
                    <View
                      style={[
                        modalStyles.swatch,
                        { backgroundColor: FolderColors[f.color], borderColor: theme.border },
                      ]}
                    />
                    <ThemedText
                      style={[modalStyles.rowText, { color: theme.text, fontFamily: Fonts.sansBold }]}>
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

function SummarizeModal({
  visible,
  url,
  onUrlChange,
  onClose,
  onSubmit,
  loading,
  error,
}: {
  visible: boolean;
  url: string;
  onUrlChange: (s: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
}) {
  const theme = useTheme();
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Sticker background={theme.background} style={modalStyles.box}>
            <View style={modalStyles.headerRow}>
              <Sparkle size={22} color={theme.text} weight="fill" />
              <ThemedText
                style={[modalStyles.heading, { color: theme.text, fontFamily: Fonts.display }]}>
                SUMMARIZE URL
              </ThemedText>
            </View>
            <ThemedText
              style={[modalStyles.colorLabel, { color: theme.textSecondary, fontFamily: Fonts.marker }]}>
              we'll fetch the page, summarise it, and drop a bullet list into your note
            </ThemedText>
            <Sticker background={theme.backgroundElement} style={modalStyles.inputWrap}>
              <View style={modalStyles.inputRow}>
                <LinkIcon size={18} color={theme.text} weight="bold" />
                <TextInput
                  value={url}
                  onChangeText={onUrlChange}
                  placeholder="https://..."
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={[modalStyles.input, { color: theme.text, fontFamily: Fonts.sansBold }]}
                  autoFocus
                />
              </View>
            </Sticker>
            {error ? (
              <ThemedText style={{ color: theme.danger, fontFamily: Fonts.sansBold }}>
                {error}
              </ThemedText>
            ) : null}
            <StickerButton
              onPress={onSubmit}
              disabled={loading}
              background={theme.primary}
              radius={Radius.md}
              padding={Spacing.three}>
              <View style={modalStyles.ctaInner}>
                {loading ? (
                  <ActivityIndicator color={theme.textOnPrimary} />
                ) : (
                  <Sparkle size={18} color={theme.textOnPrimary} weight="fill" />
                )}
                <ThemedText
                  style={[modalStyles.cta, { color: theme.textOnPrimary, fontFamily: Fonts.display }]}>
                  {loading ? 'SUMMARISING' : 'GO'}
                </ThemedText>
              </View>
            </StickerButton>
          </Sticker>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  saveLabel: {
    fontSize: 15,
  },
  titleWrap: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  title: {
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1,
    paddingVertical: Spacing.one,
  },
  folderChipWrap: {
    alignSelf: 'flex-start',
  },
  folderChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  folderChipText: {
    fontSize: 13,
    letterSpacing: 1,
  },
  editorWrap: {
    flex: 1,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    borderWidth: Borders.thick,
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
    alignItems: 'center',
    gap: Spacing.two,
  },
  heading: {
    fontSize: 24,
    letterSpacing: -0.5,
  },
  row: {
    padding: Spacing.two,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowText: {
    fontSize: 16,
    letterSpacing: 0.5,
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: Radius.sm,
    borderWidth: Borders.thin,
  },
  colorLabel: {
    fontSize: 15,
    lineHeight: 22,
  },
  inputWrap: {
    padding: 0,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  input: {
    flex: 1,
    fontSize: 17,
    paddingVertical: Spacing.three,
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cta: {
    fontSize: 22,
    letterSpacing: 1,
  },
});
