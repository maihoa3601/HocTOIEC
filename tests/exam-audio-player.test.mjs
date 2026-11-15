import assert from 'node:assert/strict';
import { createExamAudioPlayer } from '../src/client/exam-audio-player.mjs';

class AudioStub extends EventTarget {
  constructor(source = '/clip.mp3') {
    super(); this.src = source; this.isConnected = true; this.readyState = 1;
    this.duration = 63; this.paused = true; this.playbackRate = 1; this.position = 0;
  }
  getAttribute(name) { return name === 'src' ? this.src : null; }
  get currentTime() { return this.position; }
  set currentTime(value) { this.position = this.src.startsWith('blob:') && this.readyState >= 1 ? value : 0; }
  load() {
    this.readyState = 0; this.position = 0; this.paused = true;
    queueMicrotask(() => { this.readyState = 1; this.dispatchEvent(new Event('loadedmetadata')); });
  }
  async play() { this.paused = false; }
}

let requests = 0, urls = 0;
const revoked = [];
const response = () => new Response(new Blob(['MP3'], { type: 'audio/mpeg' }));
const player = createExamAudioPlayer({
  fetchClip: async () => { requests++; return response(); },
  createUrl: () => 'blob:clip-' + (++urls),
  revokeUrl: (url) => revoked.push(url)
});
const audio = new AudioStub();
audio.currentTime = 41;
assert.equal(audio.currentTime, 0, 'Reproduce a host that cannot seek the original MP3 URL');
await player.seek(audio, 41, { play: true, rate: 1.25 });
assert.equal(audio.currentTime, 41, 'The first cue click must seek after metadata loads');
assert.equal(audio.paused, false);
assert.equal(audio.playbackRate, 1.25);
await player.seek(audio, 55);
assert.equal(audio.currentTime, 55);
assert.equal(requests, 1, 'Repeated seeks must reuse the buffered clip');
player.release(audio);
assert.deepEqual(revoked, ['blob:clip-1']);
const playing = new AudioStub();
playing.position = 7;
playing.paused = false;
playing.playbackRate = 0.85;
await player.prepare(playing);
assert.equal(playing.currentTime, 7, 'Buffering must preserve a clip already playing');
assert.equal(playing.paused, false);
assert.equal(playing.playbackRate, 0.85);
player.clear();

let finishDownload;
const delayed = createExamAudioPlayer({
  fetchClip: () => new Promise(resolve => { finishDownload = resolve; }),
  createUrl: () => 'blob:delayed', revokeUrl: () => {}
});
const next = new AudioStub();
const first = delayed.seek(next, 29, { play: true });
const last = delayed.seek(next, 55, { play: true });
finishDownload(response());
await Promise.all([first, last]);
assert.equal(next.currentTime, 55, 'The latest cue wins while a clip is downloading');
delayed.clear();

const detached = new AudioStub();
const waiting = delayed.seek(detached, 41, { play: true });
delayed.release(detached);
detached.isConnected = false;
finishDownload(response());
await waiting;
assert.equal(detached.src, '/clip.mp3', 'Changing groups must cancel source replacement');
assert.equal(detached.paused, true);

let tries = 0;
const retry = createExamAudioPlayer({
  fetchClip: async () => { if (++tries === 1) throw Error('Offline'); return response(); },
  createUrl: () => 'blob:retry', revokeUrl: () => {}
});
const failed = new AudioStub();
await assert.rejects(retry.seek(failed, 41), /Offline/);
await retry.seek(failed, 41);
assert.equal(failed.currentTime, 41, 'A failed download can be retried');
retry.clear();

const local = new AudioStub('blob:local-upload');
await player.seek(local, 10);
assert.equal(requests, 2, 'Locally sliced audio must not be downloaded again');
assert.equal(local.currentTime, 10);
console.log(JSON.stringify({ok:true,firstCue:true,latestCue:true,release:true,retry:true,localAudio:true}));
