import * as SQLite from 'expo-sqlite';

import type { Bookmark, ProcessOk, ProcessPreview } from './types';

const DB_NAME = 'bookie.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const getDb = () => {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
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
      `);
      return db;
    })();
  }
  return dbPromise;
};

type Row = {
  id: number;
  url: string;
  status: 'ok' | 'preview';
  title: string;
  summary: string;
  tags: string;
  category: string | null;
  thumbnail: string | null;
  note: string;
  created_at: number;
};

const rowToBookmark = (r: Row): Bookmark => ({
  id: r.id,
  url: r.url,
  status: r.status,
  title: r.title,
  summary: r.summary,
  tags: safeParseTags(r.tags),
  category: r.category,
  thumbnail: r.thumbnail,
  note: r.note,
  createdAt: r.created_at,
});

const safeParseTags = (raw: string): string[] => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === 'string') : [];
  } catch {
    return [];
  }
};

export const saveBookmark = async (
  r: ProcessOk | ProcessPreview,
): Promise<number> => {
  const db = await getDb();
  const tags = r.status === 'ok' ? r.tags : [];
  const category = r.status === 'ok' ? r.category : null;
  const result = await db.runAsync(
    `INSERT INTO bookmarks (url, status, title, summary, tags, category, thumbnail, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    r.url,
    r.status,
    r.title,
    r.summary,
    JSON.stringify(tags),
    category,
    r.thumbnail,
    '',
    Date.now(),
  );
  return result.lastInsertRowId;
};

export const listBookmarks = async (): Promise<Bookmark[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM bookmarks ORDER BY created_at DESC`,
  );
  return rows.map(rowToBookmark);
};

export const updateBookmarkNote = async (id: number, note: string): Promise<void> => {
  const db = await getDb();
  await db.runAsync(`UPDATE bookmarks SET note = ? WHERE id = ?`, note, id);
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
  const row = await db.getFirstAsync<Row>(
    `SELECT * FROM bookmarks WHERE id = ?`,
    id,
  );
  return row ? rowToBookmark(row) : null;
};

export const deleteBookmark = async (id: number): Promise<void> => {
  const db = await getDb();
  await db.runAsync(`DELETE FROM bookmarks WHERE id = ?`, id);
};
