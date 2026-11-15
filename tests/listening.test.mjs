import assert from 'node:assert/strict';
import { parseTimestamp, parseTranscript, compareDictation } from '../src/client/listening-core.mjs';

assert.equal(parseTimestamp('01:02:03,456'), 3723.456);
assert.equal(parseTimestamp('02:03.456'), 123.456);
assert.throws(() => parseTimestamp('00:61:00,000'));
assert.throws(() => parseTimestamp('-00:01.000'));

const expected = [{ start: 1, end: 2.5, text: 'Good morning.' }, { start: 3, end: 5, text: 'The meeting starts now.' }];
assert.deepEqual(parseTranscript('\uFEFF1\r\n00:00:01,000 --> 00:00:02,500\r\nGood morning.\r\n\r\n2\r\n00:00:03,000 --> 00:00:05,000\r\nThe meeting starts now.'), expected);
assert.deepEqual(parseTranscript('WEBVTT\n\nNOTE example\nnot a cue\n\ncue-id\n00:01.000 --> 00:02.500 align:start\n<v Speaker>Good morning.</v>\n\n00:03.000 --> 00:05.000\nThe meeting starts now.'), expected);
assert.deepEqual(parseTranscript(JSON.stringify({ segments: [{ ...expected[1], words: [] }, expected[0]], language: 'en' })), expected);
assert.deepEqual(parseTranscript(JSON.stringify({ schema: 1, sourceName: 'audio.mp3', cues: expected })), expected);
for (const input of ['', '{}', '{bad}', 'not subtitles', '1\n00:00:03,000 --> 00:00:01,000\nreversed', JSON.stringify([{ start: null, end: 2, text: 'bad' }]), JSON.stringify([{ start: 0, end: '2', text: 'bad' }]), JSON.stringify(Array(5001).fill(expected[0]))]) assert.throws(() => parseTranscript(input));
assert.throws(() => parseTranscript('a'.repeat(2 * 1024 * 1024 + 1)));
assert.deepEqual(parseTranscript('1\n00:00:01,000 --> 00:00:02,000\n<img src=x onerror=alert(1)>Hello &amp; goodbye.'), [{ start: 1, end: 2, text: 'Hello & goodbye.' }]);

assert.equal(compareDictation('We’re ready, now!', "WE'RE ready now").correct, true);
const diff = compareDictation('The meeting starts now', 'meeting starts right now');
assert.equal(diff.matched, 3);
assert.deepEqual(diff.tokens.filter(token => token.type !== 'correct'), [{ type: 'missing', text: 'the' }, { type: 'extra', text: 'right' }]);
assert.equal(compareDictation('go go now', 'go now').matched, 2);
assert.equal(compareDictation('Hello', '').correct, false);
assert.throws(() => compareDictation('word '.repeat(301), 'word'));

// UI & Sample Practice verification
const { readFile } = await import('node:fs/promises');
const studioSrc = await readFile(new URL('../src/client/listening-studio.mjs', import.meta.url), 'utf8');
assert.ok(studioSrc.includes('load-sample') && studioSrc.includes('SAMPLE_PRACTICE'), 'Listening studio must offer built-in sample practice');
assert.ok(studioSrc.includes('listening-kbd-hints') && studioSrc.includes('Spacebar'), 'Listening studio must support keyboard hints and Space/Arrow shortcuts');
assert.ok(studioSrc.includes('speakEnglish'), 'Listening studio must offer speech synthesis fallback');

console.log('Listening: timestamp, SRT/VTT/WhisperX import, validation, JSON round trip and dictation alignment passed.');
