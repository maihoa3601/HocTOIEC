const MAX_CUES = 5000;
const MAX_TEXT = 2 * 1024 * 1024;

export function parseTimestamp(value) {
  const match = String(value).trim().match(/^(?:(\d{1,3}):)?(\d{2}):(\d{2})[.,](\d{3})$/);
  if (!match || Number(match[2]) >= 60 || Number(match[3]) >= 60) throw Error('Mốc thời gian không hợp lệ.');
  return Number(match[1] || 0) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
}

function cleanText(value) {
  return String(value ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeCues(items) {
  if (!Array.isArray(items) || !items.length || items.length > MAX_CUES) throw Error('Transcript cần từ 1 đến 5.000 câu.');
  return items.map((item, index) => {
    const start = item?.start, end = item?.end, text = cleanText(item?.text);
    if (typeof start !== 'number' || typeof end !== 'number' || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > 24 * 3600 || !text || text.length > 10000) {
      throw Error(`Câu ${index + 1}: kiểm tra nội dung và thời gian bắt đầu/kết thúc.`);
    }
    return { start, end, text };
  }).sort((a, b) => a.start - b.start || a.end - b.end);
}

export function parseTranscript(input) {
  const text = String(input).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  if (!text || text.length > MAX_TEXT) throw Error('Chọn transcript có nội dung, tối đa 2 MB.');
  if (/^[{[]/.test(text)) {
    let data;
    try { data = JSON.parse(text); } catch { throw Error('Transcript JSON không hợp lệ.'); }
    return normalizeCues(Array.isArray(data) ? data : data?.cues || data?.segments);
  }
  const blocks = text.split(/\n\s*\n/), cues = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    if (/^(WEBVTT(?:\s|$)|NOTE(?:\s|$)|STYLE(?:\s|$)|REGION(?:\s|$))/.test(lines[0])) continue;
    const timingIndex = lines.findIndex(line => line.includes('-->'));
    if (timingIndex < 0) throw Error('Không nhận diện được phụ đề. Dùng SRT, WebVTT hoặc JSON WhisperX.');
    const timing = lines[timingIndex].match(/^\s*(\S+)\s+-->\s+(\S+)(?:\s+.*)?$/);
    if (!timing) throw Error('Dòng thời gian phụ đề không hợp lệ.');
    cues.push({ start: parseTimestamp(timing[1]), end: parseTimestamp(timing[2]), text: lines.slice(timingIndex + 1).join(' ') });
  }
  return normalizeCues(cues);
}

const words = value => String(value).normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'").match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu) || [];

// LCS alignment identifies missing/extra words without shifting every later word.
export function compareDictation(reference, answer) {
  const expected = words(reference), actual = words(answer);
  if (expected.length > 300 || actual.length > 300) throw Error('Mỗi lần đối chiếu tối đa 300 từ.');
  const table = Array.from({ length: expected.length + 1 }, () => new Uint16Array(actual.length + 1));
  for (let i = expected.length - 1; i >= 0; i--) for (let j = actual.length - 1; j >= 0; j--) {
    table[i][j] = expected[i] === actual[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  }
  const tokens = []; let i = 0, j = 0;
  while (i < expected.length || j < actual.length) {
    if (i < expected.length && j < actual.length && expected[i] === actual[j]) { tokens.push({ type: 'correct', text: expected[i] }); i++; j++; }
    else if (i < expected.length && (j === actual.length || table[i + 1][j] >= table[i][j + 1])) tokens.push({ type: 'missing', text: expected[i++] });
    else tokens.push({ type: 'extra', text: actual[j++] });
  }
  return { correct: expected.length > 0 && expected.length === actual.length && table[0][0] === expected.length, matched: table[0][0], total: expected.length, tokens };
}

export function cueTime(value) {
  const seconds = Math.max(0, Math.floor(value));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
