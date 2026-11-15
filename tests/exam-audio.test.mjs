import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  computeAudioEnvelope,
  detectSilenceGaps,
  encodeWavBuffer,
  formatTimeMMSS,
  parseFfmpegSilenceLog,
  segmentToeicAudio
} from '../src/client/exam-audio-core.mjs';
import { resolveGroupPdfInfo } from '../src/client/exam-core.mjs';
import { createWorker } from '../src/server/index.mjs';
import { contentMetadata } from '../scripts/lib/content.mjs';
import { DatabaseSync, d1Adapter } from '../scripts/lib/d1-local.mjs';

const bank = JSON.parse(await readFile(new URL('../data/learning-bank.json', import.meta.url), 'utf8'));
const examBank = JSON.parse(await readFile(new URL('../data/exam-bank.json', import.meta.url), 'utf8'));
const metadata = contentMetadata(bank);

// 1. Format helper
assert.equal(formatTimeMMSS(0), '00:00');
assert.equal(formatTimeMMSS(65), '01:05');

// 2. Synthetic PCM waveform with 54 Listening speech segments separated by 3.0s silence
const sampleRate = 8000;
const pilot = examBank.contents['ets-2023-test-01'];
const listeningGroups = pilot.groups.filter((g) => g.part <= 4);
assert.equal(listeningGroups.length, 54, 'ETS Listening has 54 playable groups (6+25+13+10)');

const speechSec = 5.0;
const silenceSec = 3.0;
const introSec = 10.0; // Simulate Part 1 directions intro before Q1
const totalSegmentsWithIntro = listeningGroups.length + 1;
const totalDurationSec = introSec + silenceSec + listeningGroups.length * (speechSec + silenceSec);
const totalSamples = Math.ceil(totalDurationSec * sampleRate);
const pcm = new Float32Array(totalSamples);

function fillTone(startSec, endSec, amp = 0.25) {
  const s = Math.floor(startSec * sampleRate);
  const e = Math.min(totalSamples, Math.floor(endSec * sampleRate));
  for (let i = s; i < e; i++) {
    pcm[i] = amp * Math.sin((2 * Math.PI * 440 * i) / sampleRate);
  }
}

// Fill Directions intro (first 10s, which is >= 5s speech; let's also test explicit >=35s intro below)
fillTone(0, 6.0);
let cursor = 6.0 + silenceSec;
for (let i = 0; i < listeningGroups.length; i++) {
  fillTone(cursor, cursor + speechSec);
  cursor += speechSec + silenceSec;
}

const { envelope, windowSec } = computeAudioEnvelope([pcm], sampleRate, 0.05);
const gaps = detectSilenceGaps(envelope, windowSec, { minSilenceSec: 2.5 });
assert.ok(gaps.length >= 50, `Expected >= 50 silence gaps, got ${gaps.length}`);

// Now test pure 54-segment exact alignment (no extra intro)
const exactDur = listeningGroups.length * (speechSec + silenceSec);
const exactPcm = new Float32Array(Math.ceil(exactDur * sampleRate));
for (let i = 0; i < listeningGroups.length; i++) {
  const s = Math.floor((i * (speechSec + silenceSec)) * sampleRate);
  const e = Math.floor(((i * (speechSec + silenceSec)) + speechSec) * sampleRate);
  for (let j = s; j < e; j++) exactPcm[j] = 0.3 * Math.sin((2 * Math.PI * 330 * j) / sampleRate);
}
const exactEnv = computeAudioEnvelope([exactPcm], sampleRate, 0.05);
const segmented = segmentToeicAudio(exactEnv.envelope, exactEnv.totalDurationSec, listeningGroups, exactEnv.windowSec);
assert.equal(segmented.segments.length, 54, 'Must map exactly 54 audio clips for Q1..Q100');
assert.equal(segmented.segments[0].startQ, 1);
assert.equal(segmented.segments[5].startQ, 6);
assert.equal(segmented.segments[6].startQ, 7);
assert.equal(segmented.segments[53].endQ, 100);
assert.ok(segmented.segments[0].endSec < segmented.segments[1].startSec + 1, 'Segments must be strictly ordered in time');

// 3. Test intro-directions automatic skip (intro >= 35s + 54 question segments = 55 regions)
let simCursor = 0;
const introDur = 38.0;
const withIntroDur = introDur + silenceSec + listeningGroups.length * (speechSec + silenceSec);
const withIntroPcm = new Float32Array(Math.ceil(withIntroDur * sampleRate));
const paint = (a, b) => {
  for (let i = Math.floor(a * sampleRate); i < Math.floor(b * sampleRate); i++) {
    withIntroPcm[i] = 0.25 * Math.sin((2 * Math.PI * 300 * i) / sampleRate);
  }
};
paint(0, introDur);
simCursor = introDur + silenceSec;
for (let i = 0; i < listeningGroups.length; i++) {
  paint(simCursor, simCursor + speechSec);
  simCursor += speechSec + silenceSec;
}
const introEnv = computeAudioEnvelope([withIntroPcm], sampleRate, 0.05);
const introSeg = segmentToeicAudio(introEnv.envelope, introEnv.totalDurationSec, listeningGroups, introEnv.windowSec);
assert.equal(introSeg.segments.length, 54);
assert.equal(introSeg.clipOffset, 1, 'Long Part 1 Directions track should be skipped automatically');
assert.ok(introSeg.segments[0].startSec >= 35, 'Question 1 clip must start AFTER the 38s Part 1 Directions');

// 4. WAV encoding check
const wav = encodeWavBuffer([exactPcm], sampleRate, 0, 2.0, 8000);
assert.equal(Buffer.from(wav.slice(0, 4)).toString('ascii'), 'RIFF');
assert.equal(Buffer.from(wav.slice(8, 12)).toString('ascii'), 'WAVE');
assert.equal(wav.byteLength, 44 + 8000 * 2 * 2, '2s at 8kHz mono 16-bit WAV = 32044 bytes');

// 5. ffmpeg silencedetect stderr parser
let fakeLog = '';
let t = 0;
for (let i = 0; i < 54; i++) {
  t += 6;
  fakeLog += `[silencedetect @ 0x1] silence_start: ${t.toFixed(2)}\n`;
  t += 3;
  fakeLog += `[silencedetect @ 0x1] silence_end: ${t.toFixed(2)} | silence_duration: 3.00\n`;
}
const ffParsed = parseFfmpegSilenceLog(fakeLog, t + 5, pilot.groups);
assert.equal(ffParsed.segments.length, 54);

// 6. Visual PDF page resolution (merged RC vs standalone LC)
const ets23t03 = examBank.exams.find((e) => e.id === 'ets-2023-test-03');
const lcGrp = examBank.contents['ets-2023-test-03'].groups.find((g) => g.part === 1);
const rcGrp = examBank.contents['ets-2023-test-03'].groups.find((g) => g.part === 5);
const lcInfo = resolveGroupPdfInfo(ets23t03, lcGrp);
const rcInfo = resolveGroupPdfInfo(ets23t03, rcGrp);
assert.equal(lcInfo.page, 1);
assert.equal(lcInfo.merged, false);
assert.ok(rcInfo.page >= ets23t03.sources.rcPdf.startPage, 'Merged 2023 Test 03 RC page must resolve to its offset section (page >= 70)');
assert.equal(rcInfo.merged, true);

// 7. No fake 'photo-scene' cartoon SVGs generated on PDF exams
const photoGroups = pilot.groups.filter((g) => g.part === 1);
for (const pg of photoGroups) {
  assert.notEqual(pg.visual?.kind, 'photo-scene', 'PDF exams must use pdf-figure/real images instead of hardcoded cartoon SVG scenes');
}

// 8. Server /audio-cue endpoint works without leaking answers/explanations on public exam GET
const db = new DatabaseSync(':memory:');
db.exec(await readFile(new URL('../drizzle/0000_learning_accounts.sql', import.meta.url), 'utf8'));
db.exec(await readFile(new URL('../drizzle/0003_exam_room.sql', import.meta.url), 'utf8'));
const env = { DB: d1Adapter(db) };
const worker = createWorker({ assets: { '/index.html': { body: 'ok', type: 'text/html' } }, bank, ...metadata, examBank });

const cueRes = await worker.fetch(
  new Request('https://toeic.test/api/exams/ets-2023-test-01/audio-cue', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ groupId: 'ets23-t01-g-p1-01' })
  }),
  env
);
assert.equal(cueRes.status, 200);
const cueData = await cueRes.json();
assert.equal(cueData.startQ, 1);
assert.ok(cueData.spoken.includes('Number 1'), 'Audio cue should speak Number 1');
assert.equal(cueData.answer, undefined, 'Audio cue must never leak answer index');

// 9. Studio ETS 54-group segmentation structure check
let studioLog = '';
let st = 40;
// P1 directions (0..40) + P1 Q1-Q6 (6 clips)
for (let i = 0; i < 6; i++) {
  studioLog += `[silencedetect @ 0x1] silence_end: ${st.toFixed(2)} | silence_duration: 4.00\n`;
  st += 20;
  studioLog += `[silencedetect @ 0x1] silence_start: ${st.toFixed(2)}\n`;
  st += 4;
}
// P2 directions + Q7 combined block (~44s, at st >= 200)
st = Math.max(st, 220);
studioLog += `[silencedetect @ 0x1] silence_end: ${st.toFixed(2)} | silence_duration: 4.00\n`;
st += 44;
studioLog += `[silencedetect @ 0x1] silence_start: ${st.toFixed(2)}\n`;
st += 4;
// Remaining 24 Part 2 items
for (let i = 0; i < 24; i++) {
  studioLog += `[silencedetect @ 0x1] silence_end: ${st.toFixed(2)} | silence_duration: 4.00\n`;
  st += 15;
  studioLog += `[silencedetect @ 0x1] silence_start: ${st.toFixed(2)}\n`;
  st += 4;
}
// 23 Part 3/4 groups x 4 regions [Talk/Conv, Q1, Q2, Q3]
for (let g = 0; g < 23; g++) {
  for (let sub = 0; sub < 4; sub++) {
    studioLog += `[silencedetect @ 0x1] silence_end: ${st.toFixed(2)} | silence_duration: 4.00\n`;
    st += sub === 0 ? 35 : 8;
    studioLog += `[silencedetect @ 0x1] silence_start: ${st.toFixed(2)}\n`;
    st += 5;
  }
}
const studioParsed = parseFfmpegSilenceLog(studioLog, st + 5, pilot.groups, { minSpeechSec: 2.8 });
assert.equal(studioParsed.strategy, 'ets-studio-54');
assert.equal(studioParsed.segments.length, 54);
assert.ok(studioParsed.segments[6].startSec > 240, 'Q7 split must start after Part 2 Directions (~+27.1s)');

// 10. No learner-facing file upload UI in exam-room.mjs & Test 04 full readiness
const examRoomSrc = await readFile(new URL('../src/client/exam-room.mjs', import.meta.url), 'utf8');
assert.ok(!examRoomSrc.includes('type="file"'), 'Learner exam room must not render <input type="file"> upload controls');
assert.ok(examRoomSrc.includes('ui-select--compact'), 'Audio rate selector must use Design System compact class');
assert.ok(examRoomSrc.includes('data-exam-audio-jump'), 'Exam room must support questionCues audio jump controls');
assert.ok(examRoomSrc.includes('data-exam-toggle-visual'), 'Exam room must support cropped-vs-original visual toggle');
assert.ok(examRoomSrc.includes('data-exam-lightbox'), 'Exam room must support visual lightbox zoom');
assert.ok(examRoomSrc.includes('data-palette-status') && examRoomSrc.includes('data-result-status'), 'Exam room must support palette & result filtering');
const t04Meta = examBank.exams.find((e) => e.id === 'ets-2023-test-04');
const t04Content = examBank.contents['ets-2023-test-04'];
assert.equal(t04Meta?.readiness, 'full');
assert.equal(t04Meta?.simulationEligible, true);
assert.equal(t04Content?.questions?.length, 200);
assert.equal(t04Content?.privateData?.['ets23-t04-q01']?.answer, 2, 'Test 04 Q1 official key is C (2)');

// 11. Part 3/4 Directions trimming + questionCues + detectPartDirectionsEndOffset
const { detectPartDirectionsEndOffset, mapStudioEtsRegionsToGroups } = await import('../src/client/exam-audio-core.mjs');
const p3SilenceLog = [
  '[silencedetect @ 0x1] silence_start: 33.40',
  '[silencedetect @ 0x1] silence_end: 35.10 | silence_duration: 1.70'
].join('\n');
assert.equal(detectPartDirectionsEndOffset(p3SilenceLog, 3), 34.85);
const p4SilenceLog = [
  '[silencedetect @ 0x1] silence_start: 32.10',
  '[silencedetect @ 0x1] silence_end: 33.90 | silence_duration: 1.80'
].join('\n');
assert.equal(detectPartDirectionsEndOffset(p4SilenceLog, 4), 33.65);

// Build synthetic regions matching studio-54 layout where p3-01 & p4-01 intro >= 50s (Directions + audio)
const synRegions = [];
let tCur = 10;
for (let i = 0; i < 6; i++) {
  synRegions.push({ startSec: tCur, endSec: tCur + 22, durationSec: 22 });
  tCur += 27;
}
tCur = Math.max(tCur, 210);
synRegions.push({ startSec: tCur, endSec: tCur + 42, durationSec: 42 }); // Part 2 directions
tCur += 46;
for (let i = 0; i < 24; i++) {
  synRegions.push({ startSec: tCur, endSec: tCur + 14, durationSec: 14 });
  tCur += 19;
}
for (let g = 0; g < 13; g++) {
  for (let sub = 0; sub < 4; sub++) {
    const dur = g === 0 && sub === 0 ? 55 : (sub === 0 ? 32 : 8);
    synRegions.push({ startSec: tCur, endSec: tCur + dur, durationSec: dur });
    tCur += dur + 4;
  }
}
for (let g = 0; g < 10; g++) {
  for (let sub = 0; sub < 4; sub++) {
    const dur = g === 0 && sub === 0 ? 56 : (sub === 0 ? 33 : 8);
    synRegions.push({ startSec: tCur, endSec: tCur + dur, durationSec: dur });
    tCur += dur + 4;
  }
}
const synMapped = mapStudioEtsRegionsToGroups(synRegions, pilot.groups.filter((g) => g.part <= 4), tCur + 5);
assert.ok(synMapped, 'Synthetic studio-54 regions must map cleanly');
assert.equal(synMapped.segments.length, 54);
const synP3First = synMapped.segments.find((s) => s.part === 3);
const synP4First = synMapped.segments.find((s) => s.part === 4);
assert.equal(synP3First.questionCues?.length, 3, 'Part 3 clip must emit 3 questionCues');
assert.ok(synP3First.questionCues[0].offsetSec > 0 && synP3First.questionCues[1].offsetSec > synP3First.questionCues[0].offsetSec);
assert.equal(synP4First.questionCues?.length, 3, 'Part 4 clip must emit 3 questionCues');
assert.ok(synP3First.startSec > synRegions[31].startSec + 30, 'Part 3 p3-01 must auto-trim opening ~35.6s Directions when >= 50s');
assert.ok(synP4First.startSec > synRegions[83].startSec + 30, 'Part 4 p4-01 must auto-trim opening ~34.8s Directions when >= 50s');

// 12. ETS 2023 Test 01 & Test 04 Part 5 per-question grouping (Q101..Q130 = 30 individual groups)
for (const eid of ['ets-2023-test-01', 'ets-2023-test-04']) {
  const p5Groups = (examBank.contents[eid]?.groups || []).filter((g) => g.part === 5);
  assert.equal(p5Groups.length, 30, `${eid} Part 5 must have 30 single-question groups`);
  p5Groups.forEach((g, idx) => {
    assert.equal(g.startQ, 101 + idx);
    assert.equal(g.endQ, 101 + idx);
  });
}

// 13. Hardened exam-room guards & real sliced manifest verification
assert.ok(examRoomSrc.includes('e.ctrlKey || e.metaKey || e.altKey'), 'Keyboard shortcuts must ignore Ctrl/Meta/Alt combos');
assert.ok(examRoomSrc.includes("'AUDIO'") && examRoomSrc.includes("closest('button, a, summary"), 'Keyboard shortcuts must not hijack audio controls or Enter on interactive controls');
assert.ok(examRoomSrc.includes('pendingAutoAdvanceGroupId') && examRoomSrc.includes('audioEl.onended'), 'Auto-advance must wait for active audio to finish instead of cutting off');
assert.ok(examRoomSrc.includes('groupIndex: activeRun.groupIndex') && examRoomSrc.includes('restoredGroupIndex'), 'Draft save/restore must persist current groupIndex position');
assert.ok(examRoomSrc.includes('exam-prep-parts') && examRoomSrc.includes('exam-img-error-fallback'), 'Prep breakdown and image fallback UI must exist');
assert.ok(examRoomSrc.includes('renderHighlightedPassage') && examRoomSrc.includes('exam-evidence-highlight'), 'Exam review must highlight evidence in passage');
assert.ok(examRoomSrc.includes('exam-choice-notes'), 'Exam review must render distractor choice notes when available');
const examRoomCss = await readFile(new URL('../src/client/exam-room.css', import.meta.url), 'utf8');
assert.ok(examRoomCss.includes('.exam-evidence-highlight') && examRoomCss.includes('.exam-choice-notes'), 'CSS must define styles for evidence highlight and choice notes');
const refreshCss = await readFile(new URL('../src/client/studio-refresh.css', import.meta.url), 'utf8');
assert.ok(refreshCss.includes('--surface-alt:') && /html\.dark\s*\{[^}]*--surface-alt:/.test(refreshCss), 'Design System must define --surface-alt in both light and dark modes');

const { existsSync } = await import('node:fs');
const t04ManifestPath = new URL('../data/exam-media/ets-2023-test-04/manifest.json', import.meta.url);
const t04Manifest = JSON.parse(await readFile(t04ManifestPath, 'utf8'));
assert.equal(Object.keys(t04Manifest.audio || {}).length, 54, 'Test 04 manifest must have 54 audio clips');
const t04CuesCount = Object.values(t04Manifest.audio || {}).filter((a) => Array.isArray(a.questionCues) && a.questionCues.length === 3).length;
assert.equal(t04CuesCount, 23, 'Test 04 manifest must have 23 Part 3-4 clips with 3 questionCues each');
assert.equal(Object.keys(t04Manifest.images || {}).length, 78, 'Test 04 manifest must have 78 group images');
for (const entry of [...Object.values(t04Manifest.audio || {}), ...Object.values(t04Manifest.images || {})]) {
  const rel = entry.file || entry.path || (typeof entry.url === 'string' ? entry.url.replace(/^\/exam-media\/ets-2023-test-04\//, '') : '');
  assert.ok(rel && existsSync(new URL(`../data/exam-media/ets-2023-test-04/${rel}`, import.meta.url)), `Sliced asset must exist on disk: ${rel || entry.url}`);
}

console.log('OK exam-audio test suite passed');
