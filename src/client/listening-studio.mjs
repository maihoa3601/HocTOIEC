import { parseTranscript, compareDictation, cueTime } from './listening-core.mjs';
import { speakEnglish, canSpeak } from './speech.mjs';

const SAMPLE_PRACTICE = {
  sourceName: 'ETS 2023 · Test 04 (Bài mẫu Part 1)',
  audioUrl: '/exam-media/ets-2023-test-04/audio/ets23-t04-g-p1-01.mp3',
  cues: [
    { start: 0, end: 3.5, text: 'Number 1. Look at the picture marked number 1 in your test book.' },
    { start: 4.2, end: 8.5, text: 'A. She is holding a pen in her hand.' },
    { start: 9.2, end: 12.0, text: 'B. She is sitting in front of a computer.' },
    { start: 12.7, end: 15.8, text: 'C. She is writing in a notebook on the desk.' },
    { start: 16.5, end: 19.5, text: 'D. She is looking out of the window.' }
  ]
};

export function createListeningStudio({ esc, heading, toast }) {
  let cues = [], current = 0, objectUrl = null, sourceName = '', audio = null, root = null;
  let looping = false, revealed = false, segmented = false, generation = 0;
  let keyHandler = null;
  const drafts = new Map();
  const $ = selector => root?.querySelector(selector);

  function cleanup() {
    generation++;
    if (keyHandler) {
      window.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }
    if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); audio = null; }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null; root = null;
  }

  function render() {
    return `${heading('Luyện nghe từng câu', 'Chọn audio và transcript trên máy để nghe, tự gõ rồi đối chiếu.')}
      <section id="listening-studio" class="listening-studio">
        <form class="ui-filter-panel listening-import" id="listening-import">
          <div class="ui-filter-bar">
            <label class="ui-field">Audio trên máy<input class="ui-input" name="audio" type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg" required></label>
            <label class="ui-field">Transcript SRT, VTT hoặc JSON<input class="ui-input" name="transcript" type="file" accept=".srt,.vtt,.json" required></label>
            <button class="btn btn-primary" type="submit">Mở buổi luyện</button>
          </div>
          <div class="listening-sample-row">
            <span class="fine-print">Chưa có sẵn file trên máy?</span>
            <button type="button" class="btn btn-sm btn-soft" data-listening="load-sample">Thử ngay bài mẫu có sẵn (ETS 2023 · Part 1)</button>
          </div>
          <p class="fine-print">Audio tối đa 150 MB; transcript tối đa 2 MB. Hỗ trợ JSON xuất từ WhisperX và phụ đề từ Subtitle Edit. File được đọc trên thiết bị, không tải lên máy chủ.</p>
          <p class="fine-print">Buổi luyện chưa được lưu sau khi tải lại trang. Xuất transcript để giữ nội dung; giữ file audio gốc để mở lại.</p>
          <p data-listening-status role="status">Chọn hai file có cùng nội dung hoặc bấm "Thử ngay bài mẫu" để bắt đầu.</p>
        </form>
        <div class="listening-workspace" hidden>
          <section class="panel listening-practice" aria-label="Nghe và chép chính tả">
            <h2 data-listening-title></h2>
            <audio controls preload="metadata" aria-label="Audio luyện nghe"></audio>
            <div class="listening-controls">
              <button type="button" class="btn btn-secondary" data-listening="previous">Câu trước</button>
              <button type="button" class="btn btn-primary" data-listening="play">Nghe câu này</button>
              <button type="button" class="btn btn-secondary" data-listening="next">Câu sau</button>
              <button type="button" class="btn btn-soft" data-listening="loop" aria-pressed="false">Lặp câu</button>
              <label class="ui-field">Tốc độ<select class="ui-input" data-listening-rate><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select></label>
            </div>
            <div class="listening-kbd-hints" aria-label="Phím tắt luyện nghe">
              <span><kbd>Space</kbd> Phát/Dừng</span>
              <span><kbd>←</kbd><kbd>→</kbd> Câu trước/sau</span>
              <span><kbd>R</kbd> Nghe lại</span>
              <span><kbd>L</kbd> Bật/tắt lặp</span>
            </div>
            <p data-listening-position></p>
            <button type="button" class="btn btn-soft" data-listening="reveal" aria-expanded="false" aria-controls="listening-transcript">Hiện transcript</button>
            <p id="listening-transcript" class="listening-transcript" hidden></p>
            <form id="listening-answer"><label class="ui-field">Gõ lại câu bạn nghe<textarea class="ui-input" name="answer" rows="3" maxlength="3000" autocomplete="off" spellcheck="false" placeholder="Gõ những gì bạn nghe được rồi nhấn Đối chiếu từ..."></textarea></label><button class="btn btn-primary" type="submit">Đối chiếu từ</button></form>
            <div data-listening-feedback role="status" aria-live="polite"></div>
            <p class="fine-print">Đối chiếu theo transcript bạn nhập, bỏ qua hoa/thường và dấu câu. Đây là luyện chính tả, chưa đánh giá phát âm hay điểm TOEIC.</p>
          </section>
          <aside class="panel listening-cues"><h2>Danh sách câu</h2><button type="button" class="btn btn-soft" data-listening="export">Xuất transcript JSON</button><p class="fine-print">Chọn câu rồi nhấn Nghe. Transcript vẫn ẩn cho tới khi bạn mở.</p><div data-listening-cues></div></aside>
        </div>
      </section>`;
  }

  function draw() {
    const cue = cues[current]; if (!cue || !root) return;
    $('[data-listening-position]').textContent = `Câu ${current + 1}/${cues.length} · ${cueTime(cue.start)} – ${cueTime(cue.end)}`;
    const transcript = $('#listening-transcript'); transcript.textContent = cue.text; transcript.hidden = !revealed;
    const reveal = $('[data-listening="reveal"]'); reveal.setAttribute('aria-expanded', String(revealed)); reveal.textContent = revealed ? 'Ẩn transcript' : 'Hiện transcript';
    $('[name="answer"]').value = drafts.get(current) || '';
    $('[data-listening-feedback]').replaceChildren();
    $('[data-listening="previous"]').disabled = current === 0;
    $('[data-listening="next"]').disabled = current === cues.length - 1;
    root.querySelectorAll('[data-cue]').forEach(button => button.setAttribute('aria-current', String(Number(button.dataset.cue) === current)));
  }

  function select(index) {
    if (index < 0 || index >= cues.length) return;
    audio?.pause(); segmented = false; current = index; revealed = false; draw();
  }

  async function play() {
    if (!cues[current]) return;
    const cue = cues[current];
    if (!audio || !Number.isFinite(audio.duration) || audio.error) {
      if (canSpeak()) {
        segmented = true;
        speakEnglish(cue.text, { rate: audio?.playbackRate || 1 });
        return;
      }
      return toast('Đợi audio tải thông tin hoặc kiểm tra định dạng file.');
    }
    if (cue.start >= audio.duration) return toast('Câu này nằm ngoài thời lượng audio. Kiểm tra lại transcript.');
    audio.currentTime = cue.start; segmented = true;
    try { await audio.play(); } catch { toast('Chưa phát được audio. Thử nút Play của trình phát.'); }
  }

  function loadSampleSession() {
    ++generation;
    audio?.pause();
    segmented = false;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    if (audio) {
      audio.src = SAMPLE_PRACTICE.audioUrl;
      audio.load();
      audio.playbackRate = Number($('[data-listening-rate]')?.value || 1);
    }
    cues = SAMPLE_PRACTICE.cues;
    current = 0;
    revealed = false;
    drafts.clear();
    sourceName = SAMPLE_PRACTICE.sourceName;
    const ws = $('.listening-workspace');
    if (ws) ws.hidden = false;
    const titleEl = $('[data-listening-title]');
    if (titleEl) titleEl.textContent = sourceName;
    const cuesEl = $('[data-listening-cues]');
    if (cuesEl) cuesEl.innerHTML = cues.map((cue, index) => `<button type="button" class="btn btn-secondary" data-cue="${index}">Câu ${index + 1} · ${cueTime(cue.start)}</button>`).join('');
    const status = $('[data-listening-status]');
    if (status) status.textContent = 'Đã mở bài mẫu (5 câu). Bấm "Nghe câu này" để bắt đầu luyện gõ chính tả.';
    draw();
  }

  function afterRender() {
    root = document.getElementById('listening-studio'); if (!root) return;
    audio = $('audio');
    audio?.addEventListener('timeupdate', () => {
      if (!segmented || !cues[current] || audio.currentTime < Math.min(cues[current].end, audio.duration)) return;
      if (looping) { audio.currentTime = cues[current].start; }
      else { audio.pause(); segmented = false; }
    });
    audio?.addEventListener('ended', () => { if (segmented && looping) void play(); });
    audio?.addEventListener('error', () => {
      if (objectUrl) $('[data-listening-status]').textContent = 'Trình duyệt không đọc được audio này. Thử MP3 hoặc WAV.';
    });
    root.addEventListener('input', event => { if (event.target.name === 'answer') { drafts.set(current, event.target.value); $('[data-listening-feedback]').replaceChildren(); } });
    root.addEventListener('change', event => { if (event.target.hasAttribute('data-listening-rate') && audio) audio.playbackRate = Number(event.target.value); });
    root.addEventListener('submit', async event => {
      event.preventDefault();
      if (event.target.id === 'listening-import') {
        const audioFile = $('[name="audio"]').files[0], transcriptFile = $('[name="transcript"]').files[0];
        if (!audioFile || !transcriptFile) return;
        const attempt = ++generation, status = $('[data-listening-status]');
        try {
          if (!audioFile.size || audioFile.size > 150 * 1024 * 1024) throw Error('Audio cần có nội dung và không quá 150 MB.');
          if (transcriptFile.size > 2 * 1024 * 1024) throw Error('Transcript tối đa 2 MB.');
          const parsed = parseTranscript(await transcriptFile.text());
          if (attempt !== generation || !root?.isConnected) return;
          audio?.pause(); segmented = false;
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          objectUrl = URL.createObjectURL(audioFile);
          if (audio) { audio.src = objectUrl; audio.load(); audio.playbackRate = Number($('[data-listening-rate]').value); }
          cues = parsed; current = 0; revealed = false; drafts.clear(); sourceName = audioFile.name;
          $('.listening-workspace').hidden = false;
          $('[data-listening-title]').textContent = sourceName;
          $('[data-listening-cues]').innerHTML = cues.map((cue, index) => `<button type="button" class="btn btn-secondary" data-cue="${index}">Câu ${index + 1} · ${cueTime(cue.start)}</button>`).join('');
          status.textContent = `Đã mở ${cues.length} câu. Kiểm tra audio khớp transcript trước khi luyện.`; draw();
        } catch (error) { if (attempt === generation) status.textContent = error.message; }
      } else if (event.target.id === 'listening-answer') {
        try {
          const answer = $('[name="answer"]').value;
          if (!answer.trim()) return toast('Gõ câu bạn nghe được trước khi đối chiếu.');
          const result = compareDictation(cues[current].text, answer);
          revealed = true; draw();
          $('[data-listening-feedback]').innerHTML = `<p><strong>${result.correct ? 'Khớp transcript.' : `${result.matched}/${result.total} từ khớp theo thứ tự.`}</strong></p><p class="listening-diff">${result.tokens.map(token => `<span class="is-${token.type}">${token.type === 'missing' ? 'Thiếu: ' : token.type === 'extra' ? 'Thừa: ' : ''}${esc(token.text)}</span>`).join(' ')}</p>`;
        } catch (error) { toast(error.message); }
      }
    });
    root.addEventListener('click', event => {
      const button = event.target.closest('button'); if (!button) return;
      if (button.hasAttribute('data-cue')) return select(Number(button.dataset.cue));
      switch (button.dataset.listening) {
        case 'load-sample': loadSampleSession(); break;
        case 'previous': select(current - 1); break;
        case 'next': select(current + 1); break;
        case 'play': void play(); break;
        case 'reveal': revealed = !revealed; draw(); break;
        case 'loop': looping = !looping; button.setAttribute('aria-pressed', String(looping)); break;
        case 'export': {
          const url = URL.createObjectURL(new Blob([JSON.stringify({ schema: 1, sourceName, cues }, null, 2)], { type: 'application/json' }));
          const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'toeic-transcript.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); break;
        }
      }
    });

    if (keyHandler) window.removeEventListener('keydown', keyHandler);
    keyHandler = (event) => {
      if (!root?.isConnected) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        void play();
      } else if (event.key === 'ArrowRight' && current < cues.length - 1) {
        event.preventDefault();
        select(current + 1);
      } else if (event.key === 'ArrowLeft' && current > 0) {
        event.preventDefault();
        select(current - 1);
      } else if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        void play();
      } else if (event.key === 'l' || event.key === 'L') {
        event.preventDefault();
        looping = !looping;
        const loopBtn = $('[data-listening="loop"]');
        if (loopBtn) loopBtn.setAttribute('aria-pressed', String(looping));
      }
    };
    window.addEventListener('keydown', keyHandler);

    // A new page needs the source files again; a detached player's blob is never retained.
    cues = []; current = 0; drafts.clear(); looping = false; revealed = false;
  }
  return { render, afterRender, cleanup };
}
