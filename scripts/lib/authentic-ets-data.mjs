const LETTER_TO_INDEX = { A: 0, B: 1, C: 2, D: 3 };

function pad2(n) {
  return String(n).padStart(2, '0');
}

function parseAnswerKey(raw, expectedPart2Range = [7, 31]) {
  const cleaned = String(raw || '').replace(/[^A-D]/gi, '').toUpperCase();
  if (cleaned.length !== 200) {
    throw new Error(`Expected 200 answers, got ${cleaned.length}`);
  }
  for (let q = expectedPart2Range[0]; q <= expectedPart2Range[1]; q++) {
    if (cleaned[q - 1] === 'D') {
      throw new Error(`Part 2 Q${q} cannot have option D`);
    }
  }
  return [...cleaned];
}

// Transcribed verbatim from ETS 2023 Test 01 Key.png (public Google Drive folder)
const ETS_2023_TEST_01_KEY = parseAnswerKey(
  // 1-100
  'DCBCD ABABC ABACA CBBCA CCBAB ACACB BADCC ABABD CBDCD BBADC ' +
  'DACCA ABACB AADBD CABDD CDBCD BCABD CADAA BDCBB DDCBA DCCBB ' +
  // 101-200
  'CBABD DABCD CBDDA BBACD BCDBD ABBCB BCCAD ACDAA DDBDA CABBC ' +
  'CBDDC CDCBC AABBD CADAC CBCDA CABDC ABBDD CACBA BBDAD CADBC'
);

// Transcribed verbatim from ETS 2023 Test 04 Key.jpg (public Google Drive folder)
const ETS_2023_TEST_04_KEY = parseAnswerKey(
  // 1-100
  'CBDCC ABCAB ABACA BCCCA CBCAB BAABA ABBAC BAABD DABBA CBDAB ' +
  'CDBAC DABAD DBCAB CAACD CBDBA DDCAD BCCBD ADABA CCDAB DCDCA ' +
  // 101-200
  'BABDA DCADD ACDAA BDCBC BCADB ADCBC AADDD BADAA CDBCA DBBDC ' +
  'DCBCA DBBCA CDABA CBABB ACBDB CABDC BDCAB BABCD DDCCB ADBCD'
);

export const AUTHENTIC_ETS_SPECS = {
  'ets-2023-test-01': {
    examId: 'ets-2023-test-01',
    prefix: 'ets23-t01',
    pdfId: '1GR2K3kNYqnXg0W7_6iMdH6VgqIuGMc6a',
    pdfName: 'ETS 2023 Test 01.pdf',
    audioId: null,
    audioName: null,
    hasPreCutAudio: false,
    keySourceId: '1yFfzwoUg6Eyt0b6YFnh_cK8GuHa_IwEs',
    keySourceName: 'ETS 2023 Test 01 Key.png',
    keyLetters: ETS_2023_TEST_01_KEY,
    part1Pages: [
      { page: 3, crop: 'top' },
      { page: 3, crop: 'bottom' },
      { page: 4, crop: 'top' },
      { page: 4, crop: 'bottom' },
      { page: 5, crop: 'top' },
      { page: 5, crop: 'bottom' }
    ],
    part2Page: 6,
    part3Pages: [7, 7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 10, 10],
    part4Pages: [11, 11, 11, 11, 12, 12, 12, 12, 13, 13],
    part5Ranges: [
      { startQ: 101, endQ: 108, pages: [14] },
      { startQ: 109, endQ: 120, pages: [15] },
      { startQ: 121, endQ: 130, pages: [16] }
    ],
    part6Pages: [17, 18, 19, 20],
    part7Ranges: [
      { startQ: 147, endQ: 148, pages: [21] },
      { startQ: 149, endQ: 150, pages: [22] },
      { startQ: 151, endQ: 153, pages: [23] },
      { startQ: 154, endQ: 155, pages: [24] },
      { startQ: 156, endQ: 157, pages: [25] },
      { startQ: 158, endQ: 161, pages: [26, 27] },
      { startQ: 162, endQ: 165, pages: [28, 29] },
      { startQ: 166, endQ: 168, pages: [30] },
      { startQ: 169, endQ: 171, pages: [31] },
      { startQ: 172, endQ: 175, pages: [32, 33] },
      { startQ: 176, endQ: 180, pages: [34, 35] },
      { startQ: 181, endQ: 185, pages: [36, 37] },
      { startQ: 186, endQ: 190, pages: [38, 39] },
      { startQ: 191, endQ: 195, pages: [40, 41] },
      { startQ: 196, endQ: 200, pages: [42, 43] }
    ]
  },
  'ets-2023-test-04': {
    examId: 'ets-2023-test-04',
    prefix: 'ets23-t04',
    pdfId: '1ponAGH1DRk28QmcvZYHHgmJsA8RD9AuK',
    pdfName: 'ETS 2023 Test 04.pdf',
    audioId: '1_xVRzsMc9wV5z7tWzpZkNErlz9o6c-hC',
    audioName: 'ETS 2023 Test 04.mp3',
    hasPreCutAudio: true,
    keySourceId: '1F43AciE626KLSr8mFy9M1JMUWnacc6QO',
    keySourceName: 'ETS 2023 Test 04 Key.jpg',
    keyLetters: ETS_2023_TEST_04_KEY,
    part1Pages: [
      { page: 3, crop: 'top' },
      { page: 3, crop: 'bottom' },
      { page: 4, crop: 'top' },
      { page: 4, crop: 'bottom' },
      { page: 5, crop: 'top' },
      { page: 5, crop: 'bottom' }
    ],
    part2Page: 6,
    part3Pages: [7, 7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 10, 10],
    part4Pages: [11, 11, 11, 11, 12, 12, 12, 12, 13, 13],
    part5Ranges: [
      { startQ: 101, endQ: 108, pages: [14] },
      { startQ: 109, endQ: 120, pages: [15] },
      { startQ: 121, endQ: 130, pages: [16] }
    ],
    part6Pages: [17, 18, 19, 20],
    part7Ranges: [
      { startQ: 147, endQ: 148, pages: [21] },
      { startQ: 149, endQ: 150, pages: [22] },
      { startQ: 151, endQ: 152, pages: [23] },
      { startQ: 153, endQ: 154, pages: [24] },
      { startQ: 155, endQ: 157, pages: [25] },
      { startQ: 158, endQ: 161, pages: [26] },
      { startQ: 162, endQ: 165, pages: [27] },
      { startQ: 166, endQ: 168, pages: [28] },
      { startQ: 169, endQ: 172, pages: [29] },
      { startQ: 173, endQ: 175, pages: [30, 31] },
      { startQ: 176, endQ: 180, pages: [32, 33] },
      { startQ: 181, endQ: 185, pages: [34, 35] },
      { startQ: 186, endQ: 190, pages: [36, 37] },
      { startQ: 191, endQ: 195, pages: [38, 39] },
      { startQ: 196, endQ: 200, pages: [40, 41] }
    ]
  }
};

function makePrivateEntry(qNum, ch, spec, pageLabel) {
  return {
    answer: LETTER_TO_INDEX[ch],
    explanation: `Đáp án chính thức (${ch}) cho câu ${qNum} theo bảng chấm ${spec.keySourceName} (trang PDF ${pageLabel}).`,
    evidence: `${spec.keySourceName} · Câu ${qNum} = (${ch}) · Trang PDF ${pageLabel}`,
    reviewStatus: 'approved'
  };
}

/**
 * Build an authentic 200-question TOEIC dataset grounded in real ETS PDF page layout and official key images.
 */
export function buildAuthenticExamContent(examMeta, spec) {
  const groups = [];
  const questions = [];
  const privateData = {};
  const prefix = spec.prefix;
  const pdfId = examMeta?.sources?.lcPdf?.id || spec.pdfId;
  const audioId = examMeta?.sources?.audio?.id || spec.audioId || null;
  const audioName = examMeta?.sources?.audio?.name || spec.audioName || 'Audio Listening';
  let order = 1;

  // Part 1: Q1-6
  for (let i = 0; i < 6; i++) {
    const qNum = i + 1;
    const gid = `${prefix}-g-p1-${pad2(qNum)}`;
    const qid = `${prefix}-q${pad2(qNum)}`;
    const pSpec = spec.part1Pages[i];
    const ch = spec.keyLetters[qNum - 1];

    groups.push({
      id: gid,
      part: 1,
      startQ: qNum,
      endQ: qNum,
      order: order++,
      sourceId: pdfId,
      sourcePage: pSpec.page,
      pages: [pSpec.page],
      pdfCrop: pSpec.crop,
      audioRef: audioId ? { id: audioId, name: audioName, segmentVerified: Boolean(spec.hasPreCutAudio) } : undefined,
      visual: {
        kind: 'pdf-figure',
        title: `Part 1 · Câu ${qNum} (Trang ${pSpec.page} PDF gốc)`,
        caption: `Hình ảnh trích từ trang ${pSpec.page} của ${spec.pdfName}.`,
        page: pSpec.page
      }
    });
    questions.push({
      id: qid,
      number: qNum,
      groupId: gid,
      part: 1,
      prompt: `Câu ${qNum}`,
      options: ['A', 'B', 'C', 'D'],
      skillTag: 'photo-listening',
      relatedLessonId: 'present-continuous'
    });
    privateData[qid] = makePrivateEntry(qNum, ch, spec, String(pSpec.page));
  }

  // Part 2: Q7-31 (strictly 3 options A/B/C)
  for (let qNum = 7; qNum <= 31; qNum++) {
    const gid = `${prefix}-g-p2-${pad2(qNum)}`;
    const qid = `${prefix}-q${pad2(qNum)}`;
    const ch = spec.keyLetters[qNum - 1];

    groups.push({
      id: gid,
      part: 2,
      startQ: qNum,
      endQ: qNum,
      order: order++,
      sourceId: pdfId,
      sourcePage: spec.part2Page,
      pages: [spec.part2Page],
      audioRef: audioId ? { id: audioId, name: audioName, segmentVerified: Boolean(spec.hasPreCutAudio) } : undefined
    });
    questions.push({
      id: qid,
      number: qNum,
      groupId: gid,
      part: 2,
      prompt: `Câu ${qNum}`,
      options: ['A', 'B', 'C'],
      skillTag: 'question-response',
      relatedLessonId: 'where-when'
    });
    privateData[qid] = makePrivateEntry(qNum, ch, spec, String(spec.part2Page));
  }

  // Part 3: Q32-70 (13 groups x 3)
  for (let g = 0; g < 13; g++) {
    const startQ = 32 + g * 3;
    const endQ = startQ + 2;
    const gid = `${prefix}-g-p3-${pad2(g + 1)}`;
    const page = spec.part3Pages[g];
    groups.push({
      id: gid,
      part: 3,
      startQ,
      endQ,
      order: order++,
      sourceId: pdfId,
      sourcePage: page,
      pages: [page],
      audioRef: audioId ? { id: audioId, name: audioName, segmentVerified: Boolean(spec.hasPreCutAudio) } : undefined,
      title: `Part 3 · Câu ${startQ}–${endQ} (Trang ${page} PDF)`
    });
    for (let j = 0; j < 3; j++) {
      const qNum = startQ + j;
      const qid = `${prefix}-q${pad2(qNum)}`;
      const ch = spec.keyLetters[qNum - 1];
      questions.push({
        id: qid,
        number: qNum,
        groupId: gid,
        part: 3,
        prompt: `Câu ${qNum}`,
        options: ['A', 'B', 'C', 'D'],
        skillTag: 'listening-conversation',
        relatedLessonId: 'future-simple'
      });
      privateData[qid] = makePrivateEntry(qNum, ch, spec, String(page));
    }
  }

  // Part 4: Q71-100 (10 groups x 3)
  for (let g = 0; g < 10; g++) {
    const startQ = 71 + g * 3;
    const endQ = startQ + 2;
    const gid = `${prefix}-g-p4-${pad2(g + 1)}`;
    const page = spec.part4Pages[g];
    groups.push({
      id: gid,
      part: 4,
      startQ,
      endQ,
      order: order++,
      sourceId: pdfId,
      sourcePage: page,
      pages: [page],
      audioRef: audioId ? { id: audioId, name: audioName, segmentVerified: Boolean(spec.hasPreCutAudio) } : undefined,
      title: `Part 4 · Câu ${startQ}–${endQ} (Trang ${page} PDF)`
    });
    for (let j = 0; j < 3; j++) {
      const qNum = startQ + j;
      const qid = `${prefix}-q${pad2(qNum)}`;
      const ch = spec.keyLetters[qNum - 1];
      questions.push({
        id: qid,
        number: qNum,
        groupId: gid,
        part: 4,
        prompt: `Câu ${qNum}`,
        options: ['A', 'B', 'C', 'D'],
        skillTag: 'listening-talk',
        relatedLessonId: 'present-perfect'
      });
      privateData[qid] = makePrivateEntry(qNum, ch, spec, String(page));
    }
  }

  // Part 5: Q101-130 (one group per individual question, mapped to actual PDF pages 14, 15, 16)
  for (const rng of spec.part5Ranges) {
    const pageLabel = rng.pages.join('–');
    for (let qNum = rng.startQ; qNum <= rng.endQ; qNum++) {
      const gid = `${prefix}-g-p5-${qNum}`;
      const qid = `${prefix}-q${pad2(qNum)}`;
      const ch = spec.keyLetters[qNum - 1];
      groups.push({
        id: gid,
        part: 5,
        startQ: qNum,
        endQ: qNum,
        order: order++,
        sourceId: pdfId,
        sourcePage: rng.pages[0],
        pages: rng.pages,
        title: `Part 5 · Câu ${qNum} (Trang ${pageLabel} PDF)`
      });
      questions.push({
        id: qid,
        number: qNum,
        groupId: gid,
        part: 5,
        prompt: `Câu ${qNum}`,
        options: ['A', 'B', 'C', 'D'],
        skillTag: 'grammar-vocab',
        relatedLessonId: 'word-form'
      });
      privateData[qid] = makePrivateEntry(qNum, ch, spec, pageLabel);
    }
  }

  // Part 6: Q131-146 (4 groups x 4 on pages 17-20)
  for (let g = 0; g < 4; g++) {
    const startQ = 131 + g * 4;
    const endQ = startQ + 3;
    const gid = `${prefix}-g-p6-${pad2(g + 1)}`;
    const page = spec.part6Pages[g];
    groups.push({
      id: gid,
      part: 6,
      startQ,
      endQ,
      order: order++,
      sourceId: pdfId,
      sourcePage: page,
      pages: [page],
      title: `Part 6 · Câu ${startQ}–${endQ} (Trang ${page} PDF)`
    });
    for (let j = 0; j < 4; j++) {
      const qNum = startQ + j;
      const qid = `${prefix}-q${pad2(qNum)}`;
      const ch = spec.keyLetters[qNum - 1];
      questions.push({
        id: qid,
        number: qNum,
        groupId: gid,
        part: 6,
        prompt: `Câu ${qNum}`,
        options: ['A', 'B', 'C', 'D'],
        skillTag: 'text-completion',
        relatedLessonId: 'word-form'
      });
      privateData[qid] = makePrivateEntry(qNum, ch, spec, String(page));
    }
  }

  // Part 7: Q147-200 (15 authentic single/multi passage groups)
  for (let g = 0; g < spec.part7Ranges.length; g++) {
    const rng = spec.part7Ranges[g];
    const gid = `${prefix}-g-p7-${pad2(g + 1)}`;
    const pageLabel = rng.pages.join('–');
    groups.push({
      id: gid,
      part: 7,
      startQ: rng.startQ,
      endQ: rng.endQ,
      order: order++,
      sourceId: pdfId,
      sourcePage: rng.pages[0],
      pages: rng.pages,
      title: `Part 7 · Câu ${rng.startQ}–${rng.endQ} (Trang ${pageLabel} PDF)`
    });
    for (let qNum = rng.startQ; qNum <= rng.endQ; qNum++) {
      const qid = `${prefix}-q${pad2(qNum)}`;
      const ch = spec.keyLetters[qNum - 1];
      questions.push({
        id: qid,
        number: qNum,
        groupId: gid,
        part: 7,
        prompt: `Câu ${qNum}`,
        options: ['A', 'B', 'C', 'D'],
        skillTag: 'reading-comprehension',
        relatedLessonId: 'study4-vocab'
      });
      privateData[qid] = makePrivateEntry(qNum, ch, spec, pageLabel);
    }
  }

  return { groups, questions, privateData };
}
