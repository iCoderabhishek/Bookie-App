import { API_BASE_URL } from './config';
import type { ProcessResult } from './types';

export type StreamHandlers = {
  onResult: (r: ProcessResult) => void;
  onDone: () => void;
  onError: (e: Error) => void;
};

/**
 * Streams NDJSON from POST /api/v1/process.
 * RN's fetch does not expose response.body as a stream, so we use XHR.
 * Each progress tick we slice the new chunk off responseText and parse complete lines.
 */
export function streamProcess(urls: string[], h: StreamHandlers): () => void {
  const xhr = new XMLHttpRequest();
  let processed = 0;
  let buffer = '';

  const flushChunk = () => {
    const fresh = xhr.responseText.slice(processed);
    processed = xhr.responseText.length;
    buffer += fresh;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        h.onResult(JSON.parse(trimmed) as ProcessResult);
      } catch {
        // skip malformed line
      }
    }
  };

  console.log('[api] POST', `${API_BASE_URL}/api/v1/process`);
  xhr.open('POST', `${API_BASE_URL}/api/v1/process`);
  xhr.setRequestHeader('Content-Type', 'application/json');
  // Backend allows up to 10 URLs * 10s fetch + AI summarisation; 90s is a comfortable ceiling.
  xhr.timeout = 90_000;

  xhr.onreadystatechange = () => {
    if (xhr.readyState === XMLHttpRequest.LOADING || xhr.readyState === XMLHttpRequest.DONE) {
      flushChunk();
    }
    if (xhr.readyState === XMLHttpRequest.DONE) {
      if (buffer.trim()) {
        try {
          h.onResult(JSON.parse(buffer.trim()) as ProcessResult);
        } catch {
          // ignore
        }
        buffer = '';
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        h.onDone();
      } else {
        h.onError(new Error(`Request failed (${xhr.status})`));
      }
    }
  };

  xhr.onerror = () => h.onError(new Error('Network error — is the backend running?'));
  xhr.ontimeout = () => h.onError(new Error('Request timed out'));

  xhr.send(JSON.stringify({ urls }));

  return () => xhr.abort();
}

/**
 * Single-URL helper for the note editor's "summarise" action.
 * Wraps streamProcess and resolves with an HTML bullet list ready to paste.
 */
export function summarizeUrl(url: string): Promise<{ html: string; title: string }> {
  return new Promise((resolve, reject) => {
    let captured: ProcessResult | null = null;
    streamProcess([url], {
      onResult: (r) => {
        captured = r;
      },
      onDone: () => {
        if (!captured) {
          reject(new Error('No summary returned'));
          return;
        }
        if (captured.status === 'failed') {
          reject(new Error(captured.error));
          return;
        }
        if (captured.status === 'unsupported') {
          reject(new Error(captured.reason));
          return;
        }
        const bullets = parseBulletsFromSummary(captured.summary);
        const liItems = bullets
          .map((b) => `<li>${escapeHtml(b)}</li>`)
          .join('');
        const html = `<p><strong>${escapeHtml(captured.title)}</strong></p><ul>${liItems}</ul><p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>`;
        resolve({ html, title: captured.title });
      },
      onError: reject,
    });
  });
}

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const parseBulletsFromSummary = (raw: string): string[] => {
  if (!raw) return [];
  const stripped = raw
    .replace(/<\/li\s*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ');
  const normalised = stripped.replace(/\s*•\s*/g, '\n• ');
  return normalised
    .split('\n')
    .map((line) => line.replace(/^\s*•\s*/, '').trim())
    .filter(Boolean);
};
