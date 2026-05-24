import type { FolderColor } from '@/constants/theme';

export type ProcessOk = {
  url: string;
  status: 'ok';
  title: string;
  summary: string;
  tags: string[];
  category: string;
  thumbnail: string | null;
};

export type ProcessPreview = {
  url: string;
  status: 'preview';
  title: string;
  summary: string;
  thumbnail: string | null;
};

export type ProcessUnsupported = {
  url: string;
  status: 'unsupported';
  reason: string;
};

export type ProcessFailed = {
  url: string;
  status: 'failed';
  error: string;
};

export type ProcessResult = ProcessOk | ProcessPreview | ProcessUnsupported | ProcessFailed;

export type Bookmark = {
  id: number;
  url: string;
  status: 'ok' | 'preview';
  title: string;
  summary: string;
  tags: string[];
  category: string | null;
  thumbnail: string | null;
  note: string;
  folderId: number | null;
  createdAt: number;
  lastViewedAt: number | null;
};

export type Folder = {
  id: number;
  name: string;
  color: FolderColor;
  createdAt: number;
};

export type Note = {
  id: number;
  title: string;
  bodyHtml: string;
  folderId: number | null;
  createdAt: number;
  updatedAt: number;
  lastViewedAt: number | null;
};

export type FeedItem =
  | { kind: 'bookmark'; recency: number; bookmark: Bookmark }
  | { kind: 'note'; recency: number; note: Note }
  | { kind: 'todo'; recency: number; todo: Todo };

export type Todo = {
  id: number;
  text: string;
  done: boolean;
  folderId: number | null;
  createdAt: number;
  completedAt: number | null;
};
