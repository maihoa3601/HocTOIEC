// Buffer only the selected short clip, so seeking also works on hosts without HTTP ranges.
export function createExamAudioPlayer({
  fetchClip = (url) => fetch(url, { cache: 'force-cache' }),
  createUrl = (blob) => URL.createObjectURL(blob),
  revokeUrl = (url) => URL.revokeObjectURL(url)
} = {}) {
  const pending = new WeakMap();
  const commands = new WeakMap();
  const ownedUrls = new Map();

  function metadata(audio, load) {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        audio.removeEventListener('loadedmetadata', ready);
        audio.removeEventListener('error', failed);
      };
      const ready = () => { cleanup(); resolve(); };
      const failed = () => { cleanup(); reject(new Error('Không tải được đoạn audio.')); };
      const timer = setTimeout(failed, 15000);
      audio.addEventListener('loadedmetadata', ready);
      audio.addEventListener('error', failed);
      if (load) load();
      if (audio.readyState >= 1) ready();
    });
  }

  function prepare(audio) {
    if (!audio?.isConnected) return Promise.resolve(false);
    if (pending.has(audio)) return pending.get(audio).promise;
    const source = audio.getAttribute('src');
    if (!source) return Promise.resolve(false);
    const record = {};
    pending.set(audio, record);
    record.promise = (async () => {
      if (source.startsWith('blob:') || source.startsWith('data:')) {
        await metadata(audio);
        return audio.isConnected && pending.get(audio) === record;
      }
      const response = await fetchClip(source);
      if (!response.ok) throw new Error('Không tải được đoạn audio.');
      const blob = await response.blob();
      if (!audio.isConnected || pending.get(audio) !== record || audio.getAttribute('src') !== source) return false;
      const position = audio.currentTime || 0, playing = !audio.paused, rate = audio.playbackRate;
      const url = createUrl(blob);
      ownedUrls.set(audio, url);
      try {
        await metadata(audio, () => { audio.src = url; audio.load(); });
        if (!audio.isConnected || pending.get(audio) !== record) return false;
        audio.playbackRate = rate;
        audio.currentTime = Math.min(position, audio.duration || position);
        if (playing) await audio.play().catch(() => {});
        return true;
      } catch (error) {
        if (pending.get(audio) === record) {
          audio.src = source;
          audio.load();
        }
        if (ownedUrls.get(audio) === url) { revokeUrl(url); ownedUrls.delete(audio); }
        throw error;
      }
    })().catch((error) => {
      if (pending.get(audio) === record) pending.delete(audio);
      throw error;
    });
    return record.promise;
  }

  async function seek(audio, offset, { play = false, rate = audio?.playbackRate || 1 } = {}) {
    if (!audio) return;
    const command = {};
    commands.set(audio, command);
    if (!await prepare(audio) || commands.get(audio) !== command || !audio.isConnected) return;
    const end = Number.isFinite(audio.duration) ? audio.duration : Number.MAX_SAFE_INTEGER;
    audio.currentTime = Math.max(0, Math.min(end, Number(offset) || 0));
    audio.playbackRate = rate;
    if (play) await audio.play();
  }

  function release(audio) {
    pending.delete(audio);
    commands.delete(audio);
    if (ownedUrls.has(audio)) { revokeUrl(ownedUrls.get(audio)); ownedUrls.delete(audio); }
  }

  function clear() { for (const audio of ownedUrls.keys()) release(audio); }
  return { prepare, seek, release, clear };
}
