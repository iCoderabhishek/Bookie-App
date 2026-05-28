import {
  BridgeExtension,
  darkEditorTheme,
  defaultEditorTheme,
  LinkBridge,
  RichText,
  TenTapStartKit,
  Toolbar,
  useEditorBridge,
  useEditorContent,
  type EditorBridge,
} from '@10play/tentap-editor';
import Link from '@tiptap/extension-link';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  ClipboardText,
  FolderSimple,
  Link as LinkIcon,
  Sparkle,
  Trash,
} from 'phosphor-react-native';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmModal } from '@/components/confirm-modal';
import { Sticker } from '@/components/sticker';
import { StickerButton } from '@/components/sticker-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  Borders,
  FolderColors,
  Fonts,
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
import { normalizeUrl, stripScheme } from '@/lib/url';

/**
 * A bridge extension that injects custom CSS into the editor's WebView at
 * init time (via `getInjectedJS` — much more reliable than the post-mount
 * `editor.injectCSS()` which silently no-ops if the WebView ref isn't
 * attached yet). High-specificity selectors `#root div .ProseMirror`
 * outrank tentap's built-in stylesheet.
 */
const notePaddingExtension = new BridgeExtension({
  forceName: 'note-padding',
  extendCSS: `
    html, body { margin: 0 !important; padding: 0 !important; background: transparent !important; }
    /* Fill the WebView entirely — no min/max-height. The container
       (editorWrap) is flex:1 in RN; ProseMirror takes 100% of that.
       html/body height: 100% chain is required for % heights to resolve. */
    html, body { height: 100% !important; }
    #root, #root > div { height: 100% !important; }

    /* Body: native serif stack for prose. iA Writer / Bear / Apple Notes
       use the same family on iOS (Charter), Android (Noto Serif). It reads
       like a real notebook page — minimal, readable, slightly literary. */
    body {
      font-family: "Charter", "Iowan Old Style", "Iowan", "Palatino", "Georgia", "Noto Serif", serif !important;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }

    #root div .ProseMirror {
      padding: 16px !important;
      font-size: 17px !important;
      line-height: 1.65 !important;
      letter-spacing: -0.003em !important;
      height: 100% !important;
      box-sizing: border-box !important;
      caret-color: currentColor;
      -webkit-tap-highlight-color: transparent;
    }

    #root div .ProseMirror p {
      margin: 0 0 14px 0 !important;
    }

    /* Headings: switch to sans-serif for visual contrast against the serif body.
       Tight tracking + heavier weight gives them a strong, modern feel. */
    #root div .ProseMirror h1,
    #root div .ProseMirror h2,
    #root div .ProseMirror h3 {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif !important;
      font-weight: 700 !important;
      line-height: 1.25 !important;
    }
    #root div .ProseMirror h1 {
      font-size: 28px !important;
      letter-spacing: -0.02em !important;
      margin: 24px 0 10px 0 !important;
    }
    #root div .ProseMirror h2 {
      font-size: 22px !important;
      letter-spacing: -0.015em !important;
      margin: 20px 0 8px 0 !important;
    }
    #root div .ProseMirror h3 {
      font-size: 18px !important;
      letter-spacing: -0.01em !important;
      margin: 16px 0 6px 0 !important;
    }

    #root div .ProseMirror ul,
    #root div .ProseMirror ol {
      padding-left: 24px !important;
      margin: 10px 0 !important;
    }
    #root div .ProseMirror li {
      margin-bottom: 6px !important;
      padding-left: 4px !important;
    }
    #root div .ProseMirror li > p {
      margin: 0 !important;
    }

    #root div .ProseMirror blockquote {
      margin: 14px 0 !important;
      padding: 4px 14px !important;
      border-left: 3px solid currentColor !important;
      opacity: 0.75;
      font-style: italic;
    }

    #root div .ProseMirror a {
      text-decoration: underline !important;
      text-decoration-thickness: 1px !important;
      text-underline-offset: 3px !important;
      text-decoration-color: rgba(127,127,127,0.5) !important;
    }

    #root div .ProseMirror code {
      font-family: ui-monospace, "SF Mono", "JetBrains Mono", "Menlo", "Consolas", monospace !important;
      background: rgba(127,127,127,0.15) !important;
      padding: 1px 6px !important;
      border-radius: 4px !important;
      font-size: 0.9em !important;
    }
    #root div .ProseMirror pre {
      font-family: ui-monospace, "SF Mono", "JetBrains Mono", "Menlo", "Consolas", monospace !important;
      background: rgba(127,127,127,0.12) !important;
      padding: 12px 14px !important;
      border-radius: 8px !important;
      font-size: 14px !important;
      line-height: 1.5 !important;
      overflow-x: auto !important;
    }
    #root div .ProseMirror pre code {
      background: transparent !important;
      padding: 0 !important;
      font-size: inherit !important;
    }

    /* Selection — themed-ish highlight that works on light and dark */
    #root div .ProseMirror ::selection {
      background: rgba(255, 196, 0, 0.35);
    }
  `,
});

/**
 * Tiptap's Link extension defaults to `inclusive: true` — typing right after
 * a link extends the link mark to cover the new text, which feels broken
 * (every char after a URL becomes part of the link). Subclass to flip it.
 */
const NonInclusiveLink = Link.extend({ inclusive: false }).configure({
  openOnClick: false,
  autolink: true,
});

/**
 * Replace the default LinkBridge in tentap's start kit with one whose
 * tiptap extension is non-inclusive. We clone the original bridge so we
 * inherit its onBridgeMessage / extendEditorState / extendEditorInstance
 * (the wiring tentap's toolbar link button depends on) and just swap the
 * underlying tiptap extension.
 */
const nonInclusiveLinkBridge = LinkBridge.clone();
nonInclusiveLinkBridge.tiptapExtension = NonInclusiveLink;

const bridgeExtensions = TenTapStartKit.map((b) =>
  b === LinkBridge ? nonInclusiveLinkBridge : b,
);

/**
 * Returns true when an HTML string has no actual text content — only empty
 * tags, whitespace, or non-breaking spaces. Used to detect "empty" notes
 * that should be discarded instead of persisted.
 */
function isHtmlEmpty(html: string): boolean {
  if (!html) return true;
  const text = html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length === 0;
}

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

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
      setFolders(fs);
      setLoading(false);
      if (n) touchNote(n.id).catch(() => { });
    })();
    return () => {
      alive = false;
    };
  }, [id]);

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

  // Mounting NoteEditor only AFTER the note is loaded lets us pass the
  // saved bodyHtml as `initialContent` — this avoids the race where
  // `editor.setContent()` fires before the WebView is ready and silently
  // does nothing. `key={note.id}` resets the editor if the route param changes.
  return <NoteEditor key={note.id} initialNote={note} folders={folders} />;
}

function NoteEditor({
  initialNote,
  folders,
}: {
  initialNote: Note;
  folders: Folder[];
}) {
  const router = useRouter();
  const theme = useTheme();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const [title, setTitle] = useState(initialNote.title);
  const [folderId, setFolderId] = useState<number | null>(initialNote.folderId);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [summarizeOpen, setSummarizeOpen] = useState(false);
  const [summarizeUrlInput, setSummarizeUrlInput] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);
  const [saveLabel, setSaveLabel] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Editor is created ONCE with the saved content. No setContent race.
  // `bridgeExtensions` includes our padding extension so CSS is baked in
  // at WebView init time, not retried after mount.
  //
  // `avoidIosKeyboard: false` — tentap would otherwise inject a HUGE
  // padding-bottom (= keyboardHeight + 10px on iOS, TOOLBAR_HEIGHT on
  // Android) into the ProseMirror element when the keyboard opens. The
  // outer KeyboardAvoidingView already shifts the entire column up, so
  // letting tentap also pad creates the visible gap between the editor
  // and the toolbar (the "wasted space" above the toolbar). We rely on
  // only the outer KAV.
  const editor = useEditorBridge({
    autofocus: true,
    avoidIosKeyboard: false,
    initialContent: initialNote.bodyHtml || '',
    bridgeExtensions: [...bridgeExtensions, notePaddingExtension],
    theme: isDark ? darkEditorTheme : defaultEditorTheme,
  }) as EditorBridge & {
    injectJS: (js: string) => void;
  };

  // Short debounce — long delays here are how "I just typed and left" becomes
  // "I came back to an empty note" if the unmount races the save.
  const html = useEditorContent(editor, { type: 'html', debounceInterval: 150 });

  // Track keyboard visibility so the format toolbar is pinned above it
  // whenever it's up — independent of selection state or the editor's
  // own focus reporting (which is unreliable across platforms).
  const [kbVisible, setKbVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKbVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Refs let the SYNCHRONOUS unmount cleanup read the latest state.
  const titleRef = useRef(title);
  const htmlRef = useRef<string>(initialNote.bodyHtml || '');
  const folderIdRef = useRef<number | null>(folderId);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);
  useEffect(() => {
    if (typeof html === 'string') htmlRef.current = html;
  }, [html]);
  useEffect(() => {
    folderIdRef.current = folderId;
  }, [folderId]);

  // Was the note non-empty when opened? Existing notes with content should
  // NEVER auto-delete, even if the user clears them — that's what the
  // Trash button is for.
  const hadContentAtMount = useRef(
    (initialNote.title?.trim().length ?? 0) > 0 ||
    !isHtmlEmpty(initialNote.bodyHtml ?? ''),
  );

  // SYNCHRONOUS unmount cleanup. No `await`. No `editor.getHTML()` — that
  // bridge call hangs forever during unmount because the WebView is being
  // torn down before the response message can arrive. We trust htmlRef
  // (at most ~150ms stale) and fire delete/update as background promises.
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }

      const nid = initialNote.id;
      const liveTitle = titleRef.current;
      const liveHtml = htmlRef.current;
      const liveFolderId = folderIdRef.current;

      const titleEmpty = liveTitle.trim().length === 0;
      const bodyEmpty = isHtmlEmpty(liveHtml);

      if (!hadContentAtMount.current && titleEmpty && bodyEmpty) {
        // Drive-by "new note" with nothing typed — discard the stub.
        deleteNote(nid).catch(() => { });
        return;
      }

      updateNote(nid, {
        title: liveTitle,
        bodyHtml: liveHtml,
        folderId: liveFolderId,
      }).catch(() => { });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback(
    (patch: { title?: string; bodyHtml?: string; folderId?: number | null }) => {
      setSaveLabel('saving');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        saveTimer.current = null;
        try {
          await updateNote(initialNote.id, patch);
          setSaveLabel('saved');
        } catch {
          setSaveLabel('idle');
        }
      }, 250);
    },
    [initialNote.id],
  );

  useEffect(() => {
    if (typeof html !== 'string') return;
    if (html === initialNote.bodyHtml) return;
    persist({ bodyHtml: html });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  const onTitleChange = (next: string) => {
    setTitle(next);
    persist({ title: next });
  };

  const onPickFolder = (next: number | null) => {
    setFolderId(next);
    setFolderPickerOpen(false);
    persist({ folderId: next });
  };

  const folder = useMemo(
    () => (folderId != null ? folders.find((f) => f.id === folderId) ?? null : null),
    [folderId, folders],
  );

  const onSummarize = async () => {
    const url = normalizeUrl(summarizeUrlInput);
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

  const onConfirmDelete = async () => {
    setConfirmDelete(false);
    // Mark "had content" false-y so the unmount cleanup doesn't double-fire
    // an updateNote on the row we're about to delete.
    hadContentAtMount.current = false;
    titleRef.current = '';
    htmlRef.current = '';
    await deleteNote(initialNote.id);
    router.back();
  };

  return (
    <ThemedView style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
              <StickerButton onPress={() => setConfirmDelete(true)} padding={10} radius={Radius.md}>
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

          <View style={styles.editorWrap}>
            <RichText editor={editor} />
          </View>

          {/* Toolbar lives at the end of the flex column. The outer
              KeyboardAvoidingView shifts the whole column up when the
              keyboard opens, so the toolbar ends up sitting directly on
              top of the keyboard. `hidden={!kbVisible}` keeps it out of
              the way when the keyboard is down. */}
          {/* Fixed 44px height — tentap's Toolbar style is `flex: 1, height: 44`,
              and inside a flex column the `flex: 1` lets it grow beyond 44px.
              Wrapping in a fixed-height View pins it so it can't push the
              editor up. */}
          <View style={styles.toolbarSlot}>
            <Toolbar editor={editor} hidden={!kbVisible} />
          </View>

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
            onUrlChange={(s) => setSummarizeUrlInput(stripScheme(s))}
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
            message={initialNote.title || 'this note'}
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
                <ThemedText
                  style={[
                    modalStyles.schemePrefix,
                    { color: theme.textSecondary, fontFamily: Fonts.sans },
                  ]}>
                  https://
                </ThemedText>
                <TextInput
                  value={url}
                  onChangeText={onUrlChange}
                  placeholder="0bhishek.tech"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={[modalStyles.input, { color: theme.text, fontFamily: Fonts.sansBold }]}
                  autoFocus
                />
                <Pressable
                  onPress={async () => {
                    const text = await Clipboard.getStringAsync();
                    if (text) onUrlChange(text);
                  }}
                  hitSlop={8}
                  style={({ pressed }) => [
                    modalStyles.pasteBtn,
                    {
                      backgroundColor: theme.backgroundSelected,
                      borderColor: theme.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}>
                  <ClipboardText size={14} color={theme.text} weight="bold" />
                  <ThemedText
                    style={[
                      modalStyles.pasteLabel,
                      { color: theme.text, fontFamily: Fonts.sansBold },
                    ]}>
                    PASTE
                  </ThemedText>
                </Pressable>
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
    // No border, no outer padding — the whole vertical space below the title
    // is one big writing surface and the comfortable padding lives INSIDE
    // the WebView (via editor.injectCSS) so taps in the padded area still
    // focus the editor.
  },
  toolbarSlot: {
    height: 44,
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
  schemePrefix: {
    fontSize: 15,
    opacity: 0.6,
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderWidth: Borders.thin,
    marginRight: Spacing.one,
  },
  pasteLabel: {
    fontSize: 11,
    letterSpacing: 1,
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
