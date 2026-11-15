import http from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync, d1Adapter } from './lib/d1-local.mjs';

const root = new URL('../', import.meta.url);
const mediaRoot = path.resolve(fileURLToPath(new URL('data/exam-media', root)));
await mkdir(new URL('.sites-runtime/', root), { recursive: true });
const db = new DatabaseSync(fileURLToPath(new URL('.sites-runtime/preview.sqlite', root)));
if (!db.prepare("SELECT name FROM sqlite_master WHERE name='user_backups'").get()) db.exec(await readFile(new URL('drizzle/0000_learning_accounts.sql', root), 'utf8'));
if (!db.prepare("SELECT name FROM sqlite_master WHERE name='question_revisions'").get()) db.exec(await readFile(new URL('drizzle/0001_content_review.sql', root), 'utf8'));
if (!db.prepare("SELECT name FROM sqlite_master WHERE name='import_jobs'").get()) db.exec(await readFile(new URL('drizzle/0002_document_imports.sql', root), 'utf8'));
if (!db.prepare("SELECT name FROM sqlite_master WHERE name='exam_versions'").get()) db.exec(await readFile(new URL('drizzle/0003_exam_room.sql', root), 'utf8'));
const worker = (await import('../dist/server/index.js')).default;

const mediaMime = {
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf'
};

async function tryServeMedia(req, res, pathname) {
  if (!pathname.startsWith('/exam-media/')) return false;
  const rel = decodeURIComponent(pathname.slice('/exam-media/'.length));
  const full = path.resolve(mediaRoot, rel);
  if (!full.startsWith(mediaRoot + path.sep)) return false;
  const info = await stat(full).catch(() => null);
  if (!info || !info.isFile()) {
    if (rel.endsWith('/manifest.json')) {
      const body = JSON.stringify({ available: false });
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : body);
      return true;
    }
    return false;
  }
  const ext = path.extname(full).toLowerCase();
  const type = mediaMime[ext] || 'application/octet-stream';
  const range = req.headers.range;
  if (range && info.size > 0) {
    const m = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (m) {
      const start = Math.min(info.size - 1, Number(m[1]));
      const end = m[2] ? Math.min(info.size - 1, Number(m[2])) : info.size - 1;
      res.writeHead(206, {
        'content-type': type,
        'accept-ranges': 'bytes',
        'content-range': `bytes ${start}-${end}/${info.size}`,
        'content-length': end - start + 1,
        'cache-control': 'no-cache'
      });
      if (req.method === 'HEAD') return res.end(), true;
      createReadStream(full, { start, end }).pipe(res);
      return true;
    }
  }
  res.writeHead(200, {
    'content-type': type,
    'accept-ranges': 'bytes',
    'content-length': info.size,
    'cache-control': 'no-cache'
  });
  if (req.method === 'HEAD') return res.end(), true;
  createReadStream(full).pipe(res);
  return true;
}

const port = Number(process.env.PORT || 4173);
const server = http.createServer(async (req, res) => {
  try {
    const origin = `http://127.0.0.1:${port}`, url = new URL(req.url, origin);
    if (url.pathname === '/signin-with-chatgpt') {
      res.writeHead(302, { 'set-cookie': 'toeic_local_preview=1; HttpOnly; SameSite=Lax; Path=/', location: '/#account' });
      res.end();
      return;
    }
    if (['GET', 'HEAD'].includes(req.method) && await tryServeMedia(req, res, url.pathname)) return;
    const headers = new Headers(req.headers);
    headers.delete('oai-authenticated-user-id');
    if ((req.headers.cookie || '').includes('toeic_local_preview=1')) headers.set('oai-authenticated-user-id', 'local-preview-user');
    let body;
    if (!['GET', 'HEAD'].includes(req.method)) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = Buffer.concat(chunks);
    }
    const request = new Request(url, { method: req.method, headers, body, duplex: 'half' });
    const response = await worker.fetch(request, { DB: d1Adapter(db), TOEIC_ADMIN_USER_IDS: 'local-preview-user' });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500);
    res.end('Preview error');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Local preview: http://127.0.0.1:${port} · localhost identity simulation only`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { db.close(); process.exit(0); }));
