import {
  computeAudioEnvelope,
  encodeWavBuffer,
  mapRegionsToListeningGroups,
  segmentToeicAudio
} from './exam-audio-core.mjs';

const DB_NAME = 'toeic-exam-media-v1';
const DB_VERSION = 1;
const STORE_CLIPS = 'audioClips';
const STORE_SOURCES = 'audioSources';
const STORE_PDFS = 'pdfFiles';
const STORE_IMAGES = 'groupImages';

const objectUrlCache = new Map();
const staticManifestCache = new Map();

function hasIndexedDb() {
  return typeof indexedDB !== 'undefined';
}

function openMediaDb() {
  if (!hasIndexedDb()) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CLIPS)) {
        const s = db.createObjectStore(STORE_CLIPS, { keyPath: 'key' });
        s.createIndex('byExam', 'examId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_SOURCES)) {
        db.createObjectStore(STORE_SOURCES, { keyPath: 'examId' });
      }
      if (!db.objectStoreNames.contains(STORE_PDFS)) {
        db.createObjectStore(STORE_PDFS, { keyPath: 'sourceId' });
      }
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        const s = db.createObjectStore(STORE_IMAGES, { keyPath: 'key' });
        s.createIndex('byExam', 'examId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txRun(db, storeName, mode, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = fn(store);
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error || req?.error);
  });
}

function getAllByIndex(db, storeName, indexName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const idx = tx.objectStore(storeName).index(indexName);
    const req = idx.getAll(key);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function makeCachedUrl(cacheKey, blob) {
  if (!blob || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return null;
  if (objectUrlCache.has(cacheKey)) return objectUrlCache.get(cacheKey);
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(cacheKey, url);
  return url;
}

function revokeCachedUrl(cacheKey) {
  const prev = objectUrlCache.get(cacheKey);
  if (prev && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(prev);
  }
  objectUrlCache.delete(cacheKey);
}

async function decodeAudioBlob(blob) {
  const AudioCtx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AudioCtx) throw new Error('Trình duyệt không hỗ trợ Web Audio API để giải mã file MP3.');
  const ctx = new AudioCtx();
  try {
    const arrBuf = await blob.arrayBuffer();
    const audioBuf = await ctx.decodeAudioData(arrBuf);
    const channels = [];
    const chCount = Math.min(2, audioBuf.numberOfChannels || 1);
    for (let c = 0; c < chCount; c++) {
      channels.push(audioBuf.getChannelData(c));
    }
    return { channels, sampleRate: audioBuf.sampleRate, durationSec: audioBuf.duration };
  } finally {
    await ctx.close().catch(() => {});
  }
}

export async function fetchStaticExamManifest(examId) {
  if (!examId || typeof fetch !== 'function') return null;
  if (staticManifestCache.has(examId)) return staticManifestCache.get(examId);
  try {
    const res = await fetch(`/exam-media/${encodeURIComponent(examId)}/manifest.json`, { cache: 'no-store' });
    if (!res.ok) {
      staticManifestCache.set(examId, null);
      return null;
    }
    const json = await res.json();
    if (json && json.available === false) {
      staticManifestCache.set(examId, null);
      return null;
    }
    staticManifestCache.set(examId, json);
    return json;
  } catch {
    staticManifestCache.set(examId, null);
    return null;
  }
}

export async function loadExamMediaState(examId, sourceIds = []) {
  const manifest = await fetchStaticExamManifest(examId);
  const state = {
    examId,
    audioMeta: null,
    audioClips: new Map(), // groupId -> { ...meta, url, origin }
    groupImages: new Map(), // groupId -> { url, caption, origin }
    pdfFiles: new Map(), // sourceId -> { url, fileName, origin }
    staticPages: manifest?.pages || {}
  };

  if (manifest?.audio) {
    for (const [gid, seg] of Object.entries(manifest.audio)) {
      state.audioClips.set(gid, {
        groupId: gid,
        startSec: seg.startSec,
        endSec: seg.endSec,
        durationSec: seg.durationSec,
        questionCues: Array.isArray(seg.questionCues) ? seg.questionCues : undefined,
        url: seg.url,
        origin: 'server'
      });
    }
    state.audioMeta = {
      fileName: manifest.audioFile || 'Pre-cut server audio',
      totalDurationSec: manifest.totalDurationSec || 0,
      clipOffset: manifest.clipOffset || 0,
      strategy: manifest.audioStrategy || 'server-precute',
      origin: 'server'
    };
  }

  if (manifest?.images) {
    for (const [gid, img] of Object.entries(manifest.images)) {
      state.groupImages.set(gid, {
        url: img.url,
        caption: img.caption || '',
        cropped: Boolean(img.cropped),
        origin: 'server'
      });
    }
  }

  const db = await openMediaDb().catch(() => null);
  if (!db) return state;

  try {
    const srcMeta = await txRun(db, STORE_SOURCES, 'readonly', (s) => s.get(examId));
    if (srcMeta) {
      state.audioMeta = {
        fileName: srcMeta.fileName,
        totalDurationSec: srcMeta.totalDurationSec,
        candidateRegions: srcMeta.candidateRegions || [],
        clipOffset: srcMeta.clipOffset || 0,
        strategy: srcMeta.strategy,
        origin: 'indexeddb',
        hasRawBlob: Boolean(srcMeta.rawAudioBlob)
      };
    }

    const clips = await getAllByIndex(db, STORE_CLIPS, 'byExam', examId);
    for (const c of clips) {
      const url = makeCachedUrl(`clip::${c.key}`, c.blob);
      if (url) {
        state.audioClips.set(c.groupId, {
          groupId: c.groupId,
          part: c.part,
          startQ: c.startQ,
          endQ: c.endQ,
          startSec: c.startSec,
          endSec: c.endSec,
          durationSec: c.durationSec,
          regionIndex: c.regionIndex,
          url,
          origin: 'indexeddb'
        });
      }
    }

    const imgs = await getAllByIndex(db, STORE_IMAGES, 'byExam', examId);
    for (const im of imgs) {
      const url = makeCachedUrl(`img::${im.key}`, im.blob);
      if (url) {
        state.groupImages.set(im.groupId, {
          url,
          caption: im.caption || '',
          fileName: im.fileName || '',
          origin: 'indexeddb'
        });
      }
    }

    for (const sid of new Set(sourceIds.filter(Boolean))) {
      const pdfRec = await txRun(db, STORE_PDFS, 'readonly', (s) => s.get(sid));
      if (pdfRec?.blob) {
        const url = makeCachedUrl(`pdf::${sid}`, pdfRec.blob);
        if (url) {
          state.pdfFiles.set(sid, { url, fileName: pdfRec.fileName, origin: 'indexeddb' });
        }
      }
    }
  } finally {
    db.close();
  }

  return state;
}

export async function sliceAndStoreExamAudio(examId, audioFile, groups, onProgress) {
  onProgress?.('Đang giải mã file âm thanh MP3…');
  const { channels, sampleRate, durationSec } = await decodeAudioBlob(audioFile);

  onProgress?.('Đang dò khoảng lặng và tách từng câu Part 1–4…');
  const { envelope, windowSec, totalDurationSec } = computeAudioEnvelope(channels, sampleRate, 0.05);
  const segmented = segmentToeicAudio(envelope, totalDurationSec || durationSec, groups, windowSec);

  const db = await openMediaDb();
  if (!db) throw new Error('Trình duyệt không hỗ trợ IndexedDB để lưu audio đã cắt.');

  try {
    // Remove old clips for this exam first
    const oldClips = await getAllByIndex(db, STORE_CLIPS, 'byExam', examId);
    if (oldClips.length) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_CLIPS, 'readwrite');
        const store = tx.objectStore(STORE_CLIPS);
        for (const c of oldClips) {
          revokeCachedUrl(`clip::${c.key}`);
          store.delete(c.key);
        }
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }

    await txRun(db, STORE_SOURCES, 'readwrite', (s) =>
      s.put({
        examId,
        fileName: audioFile.name || 'exam-audio.mp3',
        totalDurationSec: segmented.totalDurationSec,
        candidateRegions: segmented.candidateRegions,
        clipOffset: segmented.clipOffset,
        strategy: segmented.strategy,
        rawAudioBlob: audioFile,
        createdAt: new Date().toISOString()
      })
    );

    onProgress?.(`Đang cắt ${segmented.segments.length} đoạn theo câu/nhóm…`);
    const total = segmented.segments.length;
    for (let i = 0; i < total; i++) {
      const seg = segmented.segments[i];
      const wavBytes = encodeWavBuffer(channels, sampleRate, seg.startSec, seg.endSec, 22050);
      const blob = new Blob([wavBytes], { type: 'audio/wav' });
      const key = `${examId}::${seg.groupId}`;
      revokeCachedUrl(`clip::${key}`);
      await txRun(db, STORE_CLIPS, 'readwrite', (s) =>
        s.put({
          key,
          examId,
          groupId: seg.groupId,
          part: seg.part,
          startQ: seg.startQ,
          endQ: seg.endQ,
          startSec: seg.startSec,
          endSec: seg.endSec,
          durationSec: seg.durationSec,
          regionIndex: seg.regionIndex,
          blob
        })
      );
      if ((i + 1) % 10 === 0 || i + 1 === total) {
        onProgress?.(`Đã cắt ${i + 1}/${total} đoạn âm thanh…`);
      }
    }

    return segmented;
  } finally {
    db.close();
  }
}

export async function shiftExamAudioOffset(examId, groups, deltaOffset) {
  const db = await openMediaDb();
  if (!db) throw new Error('Thiếu IndexedDB.');
  try {
    const srcMeta = await txRun(db, STORE_SOURCES, 'readonly', (s) => s.get(examId));
    if (!srcMeta?.rawAudioBlob) throw new Error('Chưa có file MP3 gốc trong bộ nhớ đệm để căn chỉnh.');
    const listeningGroups = groups.filter((g) => g.part <= 4).sort((a, b) => a.order - b.order);
    const regions = srcMeta.candidateRegions || [];
    const maxOffset = Math.max(0, regions.length - 1);
    const nextOffset = Math.max(0, Math.min(maxOffset, (srcMeta.clipOffset || 0) + deltaOffset));
    const mapped = mapRegionsToListeningGroups(regions, listeningGroups, srcMeta.totalDurationSec, nextOffset);
    const { channels, sampleRate } = await decodeAudioBlob(srcMeta.rawAudioBlob);

    await txRun(db, STORE_SOURCES, 'readwrite', (s) =>
      s.put({
        ...srcMeta,
        clipOffset: nextOffset,
        strategy: mapped.strategy
      })
    );

    for (const seg of mapped.segments) {
      const wavBytes = encodeWavBuffer(channels, sampleRate, seg.startSec, seg.endSec, 22050);
      const blob = new Blob([wavBytes], { type: 'audio/wav' });
      const key = `${examId}::${seg.groupId}`;
      revokeCachedUrl(`clip::${key}`);
      await txRun(db, STORE_CLIPS, 'readwrite', (s) =>
        s.put({
          key,
          examId,
          groupId: seg.groupId,
          part: seg.part,
          startQ: seg.startQ,
          endQ: seg.endQ,
          startSec: seg.startSec,
          endSec: seg.endSec,
          durationSec: seg.durationSec,
          regionIndex: seg.regionIndex,
          blob
        })
      );
    }
    return mapped;
  } finally {
    db.close();
  }
}

export async function resliceSingleClip(examId, group, startSec, endSec) {
  const db = await openMediaDb();
  if (!db) throw new Error('Thiếu IndexedDB.');
  try {
    const srcMeta = await txRun(db, STORE_SOURCES, 'readonly', (s) => s.get(examId));
    if (!srcMeta?.rawAudioBlob) throw new Error('Chưa có file MP3 gốc để cắt lại đoạn này.');
    const clampedStart = Math.max(0, Math.min(srcMeta.totalDurationSec - 1, Number(startSec) || 0));
    const clampedEnd = Math.max(clampedStart + 1, Math.min(srcMeta.totalDurationSec, Number(endSec) || clampedStart + 15));
    const { channels, sampleRate } = await decodeAudioBlob(srcMeta.rawAudioBlob);
    const wavBytes = encodeWavBuffer(channels, sampleRate, clampedStart, clampedEnd, 22050);
    const blob = new Blob([wavBytes], { type: 'audio/wav' });
    const key = `${examId}::${group.id}`;
    revokeCachedUrl(`clip::${key}`);
    await txRun(db, STORE_CLIPS, 'readwrite', (s) =>
      s.put({
        key,
        examId,
        groupId: group.id,
        part: group.part,
        startQ: group.startQ,
        endQ: group.endQ,
        startSec: Number(clampedStart.toFixed(2)),
        endSec: Number(clampedEnd.toFixed(2)),
        durationSec: Number((clampedEnd - clampedStart).toFixed(2)),
        blob
      })
    );
    return { startSec: clampedStart, endSec: clampedEnd };
  } finally {
    db.close();
  }
}

export async function clearExamSlicedAudio(examId) {
  const db = await openMediaDb();
  if (!db) return;
  try {
    const oldClips = await getAllByIndex(db, STORE_CLIPS, 'byExam', examId);
    await new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_CLIPS, STORE_SOURCES], 'readwrite');
      const cs = tx.objectStore(STORE_CLIPS);
      for (const c of oldClips) {
        revokeCachedUrl(`clip::${c.key}`);
        cs.delete(c.key);
      }
      tx.objectStore(STORE_SOURCES).delete(examId);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function storeExamPdf(sourceId, file) {
  const db = await openMediaDb();
  if (!db) throw new Error('Trình duyệt không hỗ trợ IndexedDB.');
  try {
    revokeCachedUrl(`pdf::${sourceId}`);
    await txRun(db, STORE_PDFS, 'readwrite', (s) =>
      s.put({
        sourceId,
        fileName: file.name || 'exam.pdf',
        blob: file,
        createdAt: new Date().toISOString()
      })
    );
  } finally {
    db.close();
  }
}

export async function storeGroupImage(examId, groupId, file, meta = {}) {
  const db = await openMediaDb();
  if (!db) throw new Error('Trình duyệt không hỗ trợ IndexedDB.');
  try {
    const key = `${examId}::${groupId}`;
    revokeCachedUrl(`img::${key}`);
    await txRun(db, STORE_IMAGES, 'readwrite', (s) =>
      s.put({
        key,
        examId,
        groupId,
        sourceId: meta.sourceId || '',
        sourcePage: meta.sourcePage || 1,
        fileName: file.name || 'image.png',
        caption: meta.caption || '',
        blob: file,
        createdAt: new Date().toISOString()
      })
    );
  } finally {
    db.close();
  }
}

export async function clearGroupImage(examId, groupId) {
  const db = await openMediaDb();
  if (!db) return;
  try {
    const key = `${examId}::${groupId}`;
    revokeCachedUrl(`img::${key}`);
    await txRun(db, STORE_IMAGES, 'readwrite', (s) => s.delete(key));
  } finally {
    db.close();
  }
}
