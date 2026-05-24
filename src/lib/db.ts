import * as SQLite from 'expo-sqlite';

import { FolderColorList, type FolderColor } from '@/constants/theme';

import type {
  Bookmark,
  FeedItem,
  Folder,
  Note,
  ProcessOk,
  ProcessPreview,
  Todo,
} from './types';

const DB_NAME = 'bookie.db';
const SCHEMA_VERSION = 3;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const getDb = () => {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`PRAGMA journal_mode = WAL;`);
      await db.execAsync(`PRAGMA foreign_keys = ON;`);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS bookmarks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          url TEXT NOT NULL,
          status TEXT NOT NULL,
          title TEXT NOT NULL,
          summary TEXT NOT NULL,
          tags TEXT NOT NULL DEFAULT '[]',
          category TEXT,
          thumbnail TEXT,
          note TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON bookmarks(created_at DESC);

        CREATE TABLE IF NOT EXISTS folders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          color TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL DEFAULT '',
          body_html TEXT NOT NULL DEFAULT '',
          folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);

        CREATE TABLE IF NOT EXISTS todos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          text TEXT NOT NULL,
          done INTEGER NOT NULL DEFAULT 0,
          folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
          created_at INTEGER NOT NULL,
          completed_at INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_todos_done_created ON todos(done, created_at DESC);

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

      const versionRow = await db.getFirstAsync<{ user_version: number }>(
        `PRAGMA user_version`,
      );
      const currentVersion = versionRow?.user_version ?? 0;

      if (currentVersion < 2) {
        const cols = await db.getAllAsync<{ name: string }>(
          `PRAGMA table_info(bookmarks)`,
        );
        const hasFolderId = cols.some((c) => c.name === 'folder_id');
        if (!hasFolderId) {
          await db.execAsync(
            `ALTER TABLE bookmarks ADD COLUMN folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL`,
          );
        }

        const distinctCats = await db.getAllAsync<{ category: string }>(
          `SELECT DISTINCT category FROM bookmarks WHERE category IS NOT NULL AND category != ''`,
        );
        for (const { category } of distinctCats) {
          const existing = await db.getFirstAsync<{ id: number }>(
            `SELECT id FROM folders WHERE name = ?`,
            category,
          );
          let folderId: number;
          if (existing) {
            folderId = existing.id;
          } else {
            const color = pickColorForName(category);
            const result = await db.runAsync(
              `INSERT INTO folders (name, color, created_at) VALUES (?, ?, ?)`,
              category,
              color,
              Date.now(),
            );
            folderId = result.lastInsertRowId;
          }
          await db.runAsync(
            `UPDATE bookmarks SET folder_id = ? WHERE category = ? AND folder_id IS NULL`,
            folderId,
            category,
          );
        }

        await db.execAsync(`PRAGMA user_version = 2`);
      }

      if (currentVersion < 3) {
        const bcols = await db.getAllAsync<{ name: string }>(
          `PRAGMA table_info(bookmarks)`,
        );
        if (!bcols.some((c) => c.name === 'last_viewed_at')) {
          await db.execAsync(
            `ALTER TABLE bookmarks ADD COLUMN last_viewed_at INTEGER`,
          );
        }
        const ncols = await db.getAllAsync<{ name: string }>(
          `PRAGMA table_info(notes)`,
        );
        if (!ncols.some((c) => c.name === 'last_viewed_at')) {
          await db.execAsync(
            `ALTER TABLE notes ADD COLUMN last_viewed_at INTEGER`,
          );
        }
        await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
      }

      return db;
    })();
  }
  return dbPromise;
};

const pickColorForName = (name: string): FolderColor => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return FolderColorList[Math.abs(hash) % FolderColorList.length];
};

type BookmarkRow = {
  id: number;
  url: string;
  status: 'ok' | 'preview';
  title: string;
  summary: string;
  tags: string;
  category: string | null;
  thumbnail: string | null;
  note: string;
  folder_id: number | null;
  created_at: number;
  last_viewed_at: number | null;
};

const rowToBookmark = (r: BookmarkRow): Bookmark => ({
  id: r.id,
  url: r.url,
  status: r.status,
  title: r.title,
  summary: r.summary,
  tags: safeParseTags(r.tags),
  category: r.category,
  thumbnail: r.thumbnail,
  note: r.note,
  folderId: r.folder_id,
  createdAt: r.created_at,
  lastViewedAt: r.last_viewed_at,
});

const safeParseTags = (raw: string): string[] => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === 'string') : [];
  } catch {
    return [];
  }
};

const isFolderColor = (v: string): v is FolderColor =>
  (FolderColorList as readonly string[]).includes(v);

type FolderRow = {
  id: number;
  name: string;
  color: string;
  created_at: number;
};

const rowToFolder = (r: FolderRow): Folder => ({
  id: r.id,
  name: r.name,
  color: isFolderColor(r.color) ? r.color : 'tomato',
  createdAt: r.created_at,
});

type NoteRow = {
  id: number;
  title: string;
  body_html: string;
  folder_id: number | null;
  created_at: number;
  updated_at: number;
  last_viewed_at: number | null;
};

const rowToNote = (r: NoteRow): Note => ({
  id: r.id,
  title: r.title,
  bodyHtml: r.body_html,
  folderId: r.folder_id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  lastViewedAt: r.last_viewed_at,
});

type TodoRow = {
  id: number;
  text: string;
  done: number;
  folder_id: number | null;
  created_at: number;
  completed_at: number | null;
};

const rowToTodo = (r: TodoRow): Todo => ({
  id: r.id,
  text: r.text,
  done: r.done === 1,
  folderId: r.folder_id,
  createdAt: r.created_at,
  completedAt: r.completed_at,
});

// ───────── Bookmarks ─────────

export const saveBookmark = async (
  r: ProcessOk | ProcessPreview,
): Promise<number> => {
  const db = await getDb();
  const tags = r.status === 'ok' ? r.tags : [];
  const category = r.status === 'ok' ? r.category : null;

  let folderId: number | null = null;
  if (category) {
    const existing = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM folders WHERE name = ?`,
      category,
    );
    if (existing) {
      folderId = existing.id;
    } else {
      const ins = await db.runAsync(
        `INSERT INTO folders (name, color, created_at) VALUES (?, ?, ?)`,
        category,
        pickColorForName(category),
        Date.now(),
      );
      folderId = ins.lastInsertRowId;
    }
  }

  const result = await db.runAsync(
    `INSERT INTO bookmarks (url, status, title, summary, tags, category, thumbnail, note, folder_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    r.url,
    r.status,
    r.title,
    r.summary,
    JSON.stringify(tags),
    category,
    r.thumbnail,
    '',
    folderId,
    Date.now(),
  );
  return result.lastInsertRowId;
};

export const listBookmarks = async (folderId?: number | null): Promise<Bookmark[]> => {
  const db = await getDb();
  if (folderId === undefined) {
    const rows = await db.getAllAsync<BookmarkRow>(
      `SELECT * FROM bookmarks ORDER BY created_at DESC`,
    );
    return rows.map(rowToBookmark);
  }
  if (folderId === null) {
    const rows = await db.getAllAsync<BookmarkRow>(
      `SELECT * FROM bookmarks WHERE folder_id IS NULL ORDER BY created_at DESC`,
    );
    return rows.map(rowToBookmark);
  }
  const rows = await db.getAllAsync<BookmarkRow>(
    `SELECT * FROM bookmarks WHERE folder_id = ? ORDER BY created_at DESC`,
    folderId,
  );
  return rows.map(rowToBookmark);
};

export const updateBookmarkNote = async (id: number, note: string): Promise<void> => {
  const db = await getDb();
  await db.runAsync(`UPDATE bookmarks SET note = ? WHERE id = ?`, note, id);
};

export const setBookmarkFolder = async (
  id: number,
  folderId: number | null,
): Promise<void> => {
  const db = await getDb();
  await db.runAsync(`UPDATE bookmarks SET folder_id = ? WHERE id = ?`, folderId, id);
};

export const listCategories = async (): Promise<string[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync<{ category: string }>(
    `SELECT DISTINCT category FROM bookmarks WHERE category IS NOT NULL ORDER BY category`,
  );
  return rows.map((r) => r.category);
};

export const getBookmark = async (id: number): Promise<Bookmark | null> => {
  const db = await getDb();
  const row = await db.getFirstAsync<BookmarkRow>(
    `SELECT * FROM bookmarks WHERE id = ?`,
    id,
  );
  return row ? rowToBookmark(row) : null;
};

export const deleteBookmark = async (id: number): Promise<void> => {
  const db = await getDb();
  await db.runAsync(`DELETE FROM bookmarks WHERE id = ?`, id);
};

// ───────── Folders ─────────

export const listFolders = async (): Promise<Folder[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync<FolderRow>(
    `SELECT * FROM folders ORDER BY created_at DESC`,
  );
  return rows.map(rowToFolder);
};

export const getFolder = async (id: number): Promise<Folder | null> => {
  const db = await getDb();
  const row = await db.getFirstAsync<FolderRow>(
    `SELECT * FROM folders WHERE id = ?`,
    id,
  );
  return row ? rowToFolder(row) : null;
};

export const createFolder = async (
  name: string,
  color?: FolderColor,
): Promise<number> => {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO folders (name, color, created_at) VALUES (?, ?, ?)`,
    name,
    color ?? pickColorForName(name),
    Date.now(),
  );
  return result.lastInsertRowId;
};

export const renameFolder = async (id: number, name: string): Promise<void> => {
  const db = await getDb();
  await db.runAsync(`UPDATE folders SET name = ? WHERE id = ?`, name, id);
};

export const updateFolderColor = async (
  id: number,
  color: FolderColor,
): Promise<void> => {
  const db = await getDb();
  await db.runAsync(`UPDATE folders SET color = ? WHERE id = ?`, color, id);
};

export const deleteFolder = async (id: number): Promise<void> => {
  const db = await getDb();
  await db.runAsync(`DELETE FROM folders WHERE id = ?`, id);
};

export const folderCounts = async (
  folderId: number,
): Promise<{ bookmarks: number; notes: number }> => {
  const db = await getDb();
  const b = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM bookmarks WHERE folder_id = ?`,
    folderId,
  );
  const n = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM notes WHERE folder_id = ?`,
    folderId,
  );
  return { bookmarks: b?.c ?? 0, notes: n?.c ?? 0 };
};

// ───────── Notes ─────────

export const listNotes = async (folderId?: number | null): Promise<Note[]> => {
  const db = await getDb();
  if (folderId === undefined) {
    const rows = await db.getAllAsync<NoteRow>(
      `SELECT * FROM notes ORDER BY updated_at DESC`,
    );
    return rows.map(rowToNote);
  }
  if (folderId === null) {
    const rows = await db.getAllAsync<NoteRow>(
      `SELECT * FROM notes WHERE folder_id IS NULL ORDER BY updated_at DESC`,
    );
    return rows.map(rowToNote);
  }
  const rows = await db.getAllAsync<NoteRow>(
    `SELECT * FROM notes WHERE folder_id = ? ORDER BY updated_at DESC`,
    folderId,
  );
  return rows.map(rowToNote);
};

export const getNote = async (id: number): Promise<Note | null> => {
  const db = await getDb();
  const row = await db.getFirstAsync<NoteRow>(
    `SELECT * FROM notes WHERE id = ?`,
    id,
  );
  return row ? rowToNote(row) : null;
};

export const createNote = async (folderId?: number | null): Promise<number> => {
  const db = await getDb();
  const now = Date.now();
  const result = await db.runAsync(
    `INSERT INTO notes (title, body_html, folder_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    '',
    '',
    folderId ?? null,
    now,
    now,
  );
  return result.lastInsertRowId;
};

export const updateNote = async (
  id: number,
  patch: { title?: string; bodyHtml?: string; folderId?: number | null },
): Promise<void> => {
  const db = await getDb();
  const fields: string[] = [];
  const args: (string | number | null)[] = [];
  if (patch.title !== undefined) {
    fields.push('title = ?');
    args.push(patch.title);
  }
  if (patch.bodyHtml !== undefined) {
    fields.push('body_html = ?');
    args.push(patch.bodyHtml);
  }
  if (patch.folderId !== undefined) {
    fields.push('folder_id = ?');
    args.push(patch.folderId);
  }
  if (fields.length === 0) return;
  fields.push('updated_at = ?');
  args.push(Date.now());
  args.push(id);
  await db.runAsync(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?`, ...args);
};

export const deleteNote = async (id: number): Promise<void> => {
  const db = await getDb();
  await db.runAsync(`DELETE FROM notes WHERE id = ?`, id);
};

// ───────── Todos ─────────

export const listTodos = async (): Promise<Todo[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync<TodoRow>(
    `SELECT * FROM todos ORDER BY done ASC, created_at DESC`,
  );
  return rows.map(rowToTodo);
};

export const createTodo = async (
  text: string,
  folderId?: number | null,
): Promise<number> => {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO todos (text, done, folder_id, created_at) VALUES (?, 0, ?, ?)`,
    text,
    folderId ?? null,
    Date.now(),
  );
  return result.lastInsertRowId;
};

export const toggleTodo = async (id: number, done: boolean): Promise<void> => {
  const db = await getDb();
  await db.runAsync(
    `UPDATE todos SET done = ?, completed_at = ? WHERE id = ?`,
    done ? 1 : 0,
    done ? Date.now() : null,
    id,
  );
};

export const updateTodoText = async (id: number, text: string): Promise<void> => {
  const db = await getDb();
  await db.runAsync(`UPDATE todos SET text = ? WHERE id = ?`, text, id);
};

export const deleteTodo = async (id: number): Promise<void> => {
  const db = await getDb();
  await db.runAsync(`DELETE FROM todos WHERE id = ?`, id);
};

// ───────── View tracking ─────────

export const touchBookmark = async (id: number): Promise<void> => {
  const db = await getDb();
  await db.runAsync(
    `UPDATE bookmarks SET last_viewed_at = ? WHERE id = ?`,
    Date.now(),
    id,
  );
};

export const touchNote = async (id: number): Promise<void> => {
  const db = await getDb();
  await db.runAsync(
    `UPDATE notes SET last_viewed_at = ? WHERE id = ?`,
    Date.now(),
    id,
  );
};

export const updateBookmarkSummary = async (
  id: number,
  summary: string,
): Promise<void> => {
  const db = await getDb();
  await db.runAsync(`UPDATE bookmarks SET summary = ? WHERE id = ?`, summary, id);
};

// ───────── Settings ─────────

export const getSetting = async (key: string): Promise<string | null> => {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = ?`,
    key,
  );
  return row?.value ?? null;
};

export const setSetting = async (key: string, value: string): Promise<void> => {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
};

// ───────── Mixed feed ─────────

const bookmarkRecency = (b: BookmarkRow) => b.last_viewed_at ?? b.created_at;
const noteRecency = (n: NoteRow) =>
  n.last_viewed_at ?? n.updated_at ?? n.created_at;
const todoRecency = (t: TodoRow) => t.created_at;

export const listFeed = async (folderId?: number | null): Promise<FeedItem[]> => {
  const db = await getDb();
  let bRows: BookmarkRow[];
  let nRows: NoteRow[];
  let tRows: TodoRow[];

  if (folderId === undefined) {
    bRows = await db.getAllAsync<BookmarkRow>(`SELECT * FROM bookmarks`);
    nRows = await db.getAllAsync<NoteRow>(`SELECT * FROM notes`);
    tRows = await db.getAllAsync<TodoRow>(`SELECT * FROM todos WHERE done = 0`);
  } else if (folderId === null) {
    bRows = await db.getAllAsync<BookmarkRow>(
      `SELECT * FROM bookmarks WHERE folder_id IS NULL`,
    );
    nRows = await db.getAllAsync<NoteRow>(
      `SELECT * FROM notes WHERE folder_id IS NULL`,
    );
    tRows = await db.getAllAsync<TodoRow>(
      `SELECT * FROM todos WHERE folder_id IS NULL AND done = 0`,
    );
  } else {
    bRows = await db.getAllAsync<BookmarkRow>(
      `SELECT * FROM bookmarks WHERE folder_id = ?`,
      folderId,
    );
    nRows = await db.getAllAsync<NoteRow>(
      `SELECT * FROM notes WHERE folder_id = ?`,
      folderId,
    );
    tRows = await db.getAllAsync<TodoRow>(
      `SELECT * FROM todos WHERE folder_id = ? AND done = 0`,
      folderId,
    );
  }

  const items: FeedItem[] = [
    ...bRows.map<FeedItem>((r) => ({
      kind: 'bookmark',
      recency: bookmarkRecency(r),
      bookmark: rowToBookmark(r),
    })),
    ...nRows.map<FeedItem>((r) => ({
      kind: 'note',
      recency: noteRecency(r),
      note: rowToNote(r),
    })),
    ...tRows.map<FeedItem>((r) => ({
      kind: 'todo',
      recency: todoRecency(r),
      todo: rowToTodo(r),
    })),
  ];

  items.sort((a, b) => b.recency - a.recency);
  return items;
};
