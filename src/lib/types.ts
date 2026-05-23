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
  createdAt: number;
};
