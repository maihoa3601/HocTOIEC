/**
 * Pure TOEIC audio silence-detection, segmentation mapping, and WAV encoding helpers.
 * Zero DOM/browser-only APIs so this module is 100% unit-testable in Node.
 */

export function formatTimeMMSS(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

/**
 * Computes fixed-width RMS amplitude windows (0..1) from one or more Float32Array PCM channels.
 */
export function computeAudioEnvelope(channels, sampleRate, windowSec = 0.05) {
  const list = Array.isArray(channels) ? channels : [channels];
  if (!list.length || !list[0] || !sampleRate || sampleRate <= 0) {
    return { envelope: new Float32Array(0), windowSec, totalDurationSec: 0 };
  }
  const length = list[0].length;
  const totalDurationSec = length / sampleRate;
  const step = Math.max(1, Math.round(sampleRate * windowSec));
  const winCount = Math.ceil(length / step);
  const envelope = new Float32Array(winCount);
  const chCount = list.length;

  for (let w = 0; w < winCount; w++) {
    const start = w * step;
    const end = Math.min(length, start + step);
    const n = end - start;
    if (n <= 0) continue;
    let sumSq = 0;
    for (let i = start; i < end; i++) {
      let sample = 0;
      for (let c = 0; c < chCount; c++) {
        sample += list[c][i] || 0;
      }
      sample /= chCount;
      sumSq += sample * sample;
    }
    envelope[w] = Math.sqrt(sumSq / n);
  }

  return { envelope, windowSec, totalDurationSec };
}

/**
 * Estimates a robust RMS noise threshold from an audio envelope.
 */
export function estimateSilenceThreshold(envelope) {
  if (!envelope || !envelope.length) return 0.015;
  const sorted = Array.from(envelope).sort((a, b) => a - b);
  const p15 = sorted[Math.floor(sorted.length * 0.15)] || 0;
  const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
  const p85 = sorted[Math.floor(sorted.length * 0.85)] || 0;
  // Adaptive floor between background noise and speech RMS
  const noiseFloor = Math.max(0.003, p15 * 2.2);
  const speechAnchor = Math.max(0.012, p85 * 0.16);
  const medianAnchor = p50 > 0 ? p50 * 0.35 : speechAnchor;
  return Math.min(0.045, Math.max(0.005, Math.min(speechAnchor, Math.max(noiseFloor, medianAnchor))));
}

/**
 * Detects contiguous silent spans [startSec, endSec] lasting at least minSilenceSec.
 */
export function detectSilenceGaps(envelope, windowSec, options = {}) {
  const {
    silenceThreshold = estimateSilenceThreshold(envelope),
    minSilenceSec = 2.4
  } = options;
  const gaps = [];
  let gapStartIdx = null;

  for (let i = 0; i < envelope.length; i++) {
    if (envelope[i] <= silenceThreshold) {
      if (gapStartIdx === null) gapStartIdx = i;
    } else if (gapStartIdx !== null) {
      const startSec = gapStartIdx * windowSec;
      const endSec = i * windowSec;
      if (endSec - startSec >= minSilenceSec) {
        gaps.push({ startSec, endSec, durationSec: endSec - startSec });
      }
      gapStartIdx = null;
    }
  }
  if (gapStartIdx !== null) {
    const startSec = gapStartIdx * windowSec;
    const endSec = envelope.length * windowSec;
    if (endSec - startSec >= minSilenceSec) {
      gaps.push({ startSec, endSec, durationSec: endSec - startSec });
    }
  }
  return gaps;
}

/**
 * Converts detected silence gaps into bounded speech regions [startSec, endSec].
 */
export function buildSpeechRegions(silenceGaps, totalDurationSec, options = {}) {
  const {
    minSpeechSec = 4.5,
    padStartSec = 0.25,
    padEndSec = 0.35
  } = options;

  const sortedGaps = [...(silenceGaps || [])].sort((a, b) => a.startSec - b.startSec);
  const rawRegions = [];
  let cursor = 0;

  for (const gap of sortedGaps) {
    const segStart = cursor;
    const segEnd = Math.min(totalDurationSec, gap.startSec);
    if (segEnd - segStart >= minSpeechSec) {
      rawRegions.push({
        startSec: Math.max(0, segStart - padStartSec),
        endSec: Math.min(totalDurationSec, segEnd + padEndSec)
      });
    }
    cursor = Math.max(cursor, gap.endSec);
  }

  if (totalDurationSec - cursor >= minSpeechSec) {
    rawRegions.push({
      startSec: Math.max(0, cursor - padStartSec),
      endSec: totalDurationSec
    });
  }

  return rawRegions.map((r, idx) => ({
    index: idx,
    startSec: Number(r.startSec.toFixed(2)),
    endSec: Number(r.endSec.toFixed(2)),
    durationSec: Number((r.endSec - r.startSec).toFixed(2))
  }));
}

/**
 * Finds candidate speech regions tuned for TOEIC group count, then maps them to Listening groups.
 */
export function segmentToeicAudio(envelope, totalDurationSec, groups = [], windowSec = 0.05) {
  const listeningGroups = (groups || []).filter((g) => g.part <= 4).sort((a, b) => a.order - b.order);
  const targetCount = listeningGroups.length || 54;
  const threshold = estimateSilenceThreshold(envelope);

  const candidateSilenceDurations = [3.0, 2.6, 3.4, 2.2, 3.8, 1.9, 4.2, 1.6];
  let bestRegions = [];
  let bestScore = Infinity;
  let chosenMinSilence = 2.6;

  for (const minSilenceSec of candidateSilenceDurations) {
    const gaps = detectSilenceGaps(envelope, windowSec, { silenceThreshold: threshold, minSilenceSec });
    const regions = buildSpeechRegions(gaps, totalDurationSec, { minSpeechSec: 4.0 });
    // Prefer counts matching targetCount or targetCount + up to 4 part-direction tracks
    const diff = regions.length >= targetCount
      ? (regions.length - targetCount <= 6 ? regions.length - targetCount : (regions.length - targetCount) * 1.4)
      : (targetCount - regions.length) * 2.5;
    if (regions.length > 0 && diff < bestScore) {
      bestScore = diff;
      bestRegions = regions;
      chosenMinSilence = minSilenceSec;
      if (regions.length === targetCount) break;
    }
  }

  if (!bestRegions.length && totalDurationSec > 0) {
    bestRegions = mapUniformFallback(totalDurationSec, targetCount);
  }

  const aligned = mapRegionsToListeningGroups(bestRegions, listeningGroups, totalDurationSec);
  return {
    segments: aligned.segments,
    candidateRegions: bestRegions,
    clipOffset: aligned.clipOffset,
    strategy: aligned.strategy,
    minSilenceSec: chosenMinSilence,
    threshold: Number(threshold.toFixed(5)),
    totalDurationSec: Number(totalDurationSec.toFixed(2))
  };
}

function mapUniformFallback(totalDurationSec, count) {
  const regions = [];
  const step = totalDurationSec / Math.max(1, count);
  for (let i = 0; i < count; i++) {
    const startSec = Number((i * step).toFixed(2));
    const endSec = Number(Math.min(totalDurationSec, (i + 1) * step).toFixed(2));
    regions.push({ index: i, startSec, endSec, durationSec: Number((endSec - startSec).toFixed(2)) });
  }
  return regions;
}

/**
 * Maps detected speech regions onto Listening groups. Handles common TOEIC Part Directions tracks
 * or splits oversized regions proportionally when silence detection returns fewer gaps.
 */
export function mapRegionsToListeningGroups(regions, listeningGroups, totalDurationSec, explicitOffset = null) {
  const target = listeningGroups.length;
  if (!target) return { segments: [], clipOffset: 0, strategy: 'empty' };

  let normalized = [...(regions || [])];
  let strategy = 'silence-exact';
  let clipOffset = Number.isInteger(explicitOffset) ? Math.max(0, explicitOffset) : 0;

  if (explicitOffset === null) {
    // If there are slightly more regions than Listening groups (often Part 1..4 directions intros),
    // skip a long opening directions block if present before Question 1.
    if (normalized.length > target && normalized[0]?.durationSec >= 35 && normalized.length - target >= 1) {
      clipOffset = 1;
      strategy = 'silence-skip-intro';
    }
  } else {
    strategy = 'manual-offset';
  }

  let slice = normalized.slice(clipOffset);

  // If fewer regions than groups, evenly subdivide the longest regions so every group gets its own clip
  if (slice.length > 0 && slice.length < target) {
    strategy = 'silence-subdivided';
    const working = slice.map((r) => ({ ...r }));
    while (working.length < target) {
      let maxIdx = 0;
      for (let i = 1; i < working.length; i++) {
        if (working[i].durationSec > working[maxIdx].durationSec) maxIdx = i;
      }
      const longest = working[maxIdx];
      if (!longest || longest.durationSec < 2) break;
      const mid = Number(((longest.startSec + longest.endSec) / 2).toFixed(2));
      working.splice(
        maxIdx,
        1,
        {
          startSec: longest.startSec,
          endSec: mid,
          durationSec: Number((mid - longest.startSec).toFixed(2))
        },
        {
          startSec: mid,
          endSec: longest.endSec,
          durationSec: Number((longest.endSec - mid).toFixed(2))
        }
      );
    }
    slice = working;
  }

  if (!slice.length) {
    slice = mapUniformFallback(totalDurationSec, target);
    strategy = 'uniform-fallback';
  }

  const segments = listeningGroups.map((grp, idx) => {
    const seg = slice[Math.min(idx, slice.length - 1)];
    return {
      groupId: grp.id,
      part: grp.part,
      startQ: grp.startQ,
      endQ: grp.endQ,
      startSec: seg.startSec,
      endSec: seg.endSec,
      durationSec: Number(Math.max(0.5, seg.endSec - seg.startSec).toFixed(2)),
      regionIndex: clipOffset + idx
    };
  });

  return { segments, clipOffset, strategy };
}

/**
 * Maps authentic ETS studio speech regions (including Part 2 Directions + Q7 split and
 * 4-region Part 3/4 quadruples) onto the 54 TOEIC Listening groups when detected.
 */
export function mapStudioEtsRegionsToGroups(regions, listeningGroups, totalDurationSec) {
  const sig = (regions || []).filter((r) => r.durationSec >= 2.8);
  const p2DirIdx = sig.findIndex(
    (r, idx) => idx >= 6 && r.startSec >= 200 && r.durationSec >= 38 && r.durationSec <= 49
  );
  if (p2DirIdx < 6 || sig.length - (p2DirIdx + 25) < 92) return null;

  const p1 = sig.slice(p2DirIdx - 6, p2DirIdx);
  const p2Dir = sig[p2DirIdx];
  const p2Q7 = {
    startSec: Number(Math.min(p2Dir.endSec - 5, p2Dir.startSec + 27.1).toFixed(2)),
    endSec: p2Dir.endSec
  };
  const p2Rest = sig.slice(p2DirIdx + 1, p2DirIdx + 25);
  const tail = sig.slice(p2DirIdx + 25);
  const p34 = [];
  for (let k = 0; k < 23; k++) {
    const first = tail[k * 4];
    const q1Reg = tail[k * 4 + 1];
    const q2Reg = tail[k * 4 + 2];
    const last = tail[k * 4 + 3];
    if (!first || !q1Reg || !q2Reg || !last) return null;
    const grp = listeningGroups[31 + k];
    const rawStartSec = Number(first.startSec.toFixed(2));
    let clipStart = rawStartSec;
    if ((k === 0 || k === 13) && first.durationSec >= 50) {
      clipStart = Number(Math.min(first.endSec - 15, rawStartSec + (k === 0 ? 35.6 : 34.8)).toFixed(2));
    }
    const clipEnd = Number(Math.min(totalDurationSec, last.endSec + 2.0).toFixed(2));
    const baseQ = grp?.startQ || (k < 13 ? 32 + k * 3 : 71 + (k - 13) * 3);
    const questionCues = [q1Reg, q2Reg, last].map((qReg, qi) => ({
      q: baseQ + qi,
      absStartSec: Number(qReg.startSec.toFixed(2)),
      offsetSec: Number(Math.max(0, qReg.startSec - clipStart - 0.15).toFixed(2))
    }));
    p34.push({
      startSec: clipStart,
      endSec: clipEnd,
      rawStartSec: clipStart !== rawStartSec ? rawStartSec : undefined,
      questionCues
    });
  }

  const combined = [...p1, p2Q7, ...p2Rest, ...p34];
  if (combined.length !== 54 || listeningGroups.length !== 54) return null;

  const segments = listeningGroups.map((grp, idx) => {
    const seg = combined[idx];
    const item = {
      groupId: grp.id,
      part: grp.part,
      startQ: grp.startQ,
      endQ: grp.endQ,
      startSec: Number(seg.startSec.toFixed(2)),
      endSec: Number(seg.endSec.toFixed(2)),
      durationSec: Number(Math.max(0.5, seg.endSec - seg.startSec).toFixed(2)),
      regionIndex: idx
    };
    if (seg.rawStartSec !== undefined) item.rawStartSec = seg.rawStartSec;
    if (seg.questionCues) item.questionCues = seg.questionCues;
    return item;
  });

  return { segments, clipOffset: p2DirIdx - 6, strategy: 'ets-studio-54' };
}

/**
 * Finds the end offset (seconds relative to the Part 3/4 opening block start)
 * of the generic spoken Directions before "Questions 32-34 / 71-73 refer to...".
 */
export function detectPartDirectionsEndOffset(subSilenceLog, part) {
  const minEnd = part === 4 ? 32.0 : 32.5;
  const maxEnd = 38.5;
  let pendingStart = null;
  const candidates = [];
  for (const line of String(subSilenceLog || '').split(/\r?\n/)) {
    const sm = line.match(/silence_start:\s*([0-9.]+)/);
    if (sm) {
      pendingStart = Number(sm[1]);
      continue;
    }
    const em = line.match(/silence_end:\s*([0-9.]+)/);
    if (em) {
      const endSec = Number(em[1]);
      const startSec = pendingStart !== null ? pendingStart : endSec - 1.0;
      const dur = endSec - startSec;
      if (endSec >= minEnd && endSec <= maxEnd && dur >= 0.8) {
        candidates.push({ startSec, endSec, dur });
      }
      pendingStart = null;
    }
  }
  if (!candidates.length) return null;
  const last = candidates[candidates.length - 1];
  return Number(Math.max(0, last.endSec - 0.25).toFixed(2));
}

/**
 * Parses `ffmpeg -af silencedetect` stderr log lines into silence gaps & mapped TOEIC segments.
 */
export function parseFfmpegSilenceLog(stderrText, totalDurationSec, groups = []) {
  const gaps = [];
  let pendingStart = null;
  const lines = String(stderrText || '').split(/\r?\n/);
  for (const line of lines) {
    const startMatch = line.match(/silence_start:\s*([0-9.]+)/);
    if (startMatch) {
      pendingStart = Number(startMatch[1]);
      continue;
    }
    const endMatch = line.match(/silence_end:\s*([0-9.]+)/);
    if (endMatch) {
      const endSec = Number(endMatch[1]);
      const startSec = pendingStart !== null ? pendingStart : Math.max(0, endSec - 2.5);
      gaps.push({ startSec, endSec, durationSec: Math.max(0, endSec - startSec) });
      pendingStart = null;
    }
  }
  if (pendingStart !== null && totalDurationSec > pendingStart) {
    gaps.push({ startSec: pendingStart, endSec: totalDurationSec, durationSec: totalDurationSec - pendingStart });
  }
  const listeningGroups = (groups || []).filter((g) => g.part <= 4).sort((a, b) => a.order - b.order);
  const regions = buildSpeechRegions(gaps, totalDurationSec, { minSpeechSec: 2.8 });
  const studioMapped = mapStudioEtsRegionsToGroups(regions, listeningGroups, totalDurationSec);
  const mapped = studioMapped || mapRegionsToListeningGroups(regions, listeningGroups, totalDurationSec);
  return {
    gaps,
    candidateRegions: regions,
    segments: mapped.segments,
    clipOffset: mapped.clipOffset,
    strategy: mapped.strategy
  };
}

/**
 * Encodes a time slice [startSec, endSec] of multi-channel float PCM into a compact mono 16-bit WAV Uint8Array.
 */
export function encodeWavBuffer(channels, srcSampleRate, startSec, endSec, targetSampleRate = 22050) {
  const list = Array.isArray(channels) ? channels : [channels];
  if (!list.length || !list[0] || !srcSampleRate) throw new Error('Invalid PCM audio buffer');
  const chCount = list.length;
  const totalSamples = list[0].length;
  const startIdx = Math.max(0, Math.floor(startSec * srcSampleRate));
  const endIdx = Math.min(totalSamples, Math.ceil(endSec * srcSampleRate));
  const srcLen = Math.max(1, endIdx - startIdx);

  const outRate = Math.min(srcSampleRate, targetSampleRate || srcSampleRate);
  const ratio = srcSampleRate / outRate;
  const outLen = Math.max(1, Math.floor(srcLen / ratio));
  const dataSize = outLen * 2; // 16-bit mono
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, outRate, true);
  view.setUint32(28, outRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < outLen; i++) {
    const srcPos = startIdx + Math.min(srcLen - 1, Math.floor(i * ratio));
    let sum = 0;
    for (let c = 0; c < chCount; c++) {
      sum += list[c][srcPos] || 0;
    }
    const clamped = Math.max(-1, Math.min(1, sum / chCount));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  return new Uint8Array(buffer);
}
