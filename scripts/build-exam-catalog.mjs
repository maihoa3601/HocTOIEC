import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

function pad2(n) {
  return String(n).padStart(2, '0');
}

function findChild(items, parentId, matcher) {
  return items.find((i) => i.parent === parentId && matcher(i)) || null;
}

export async function buildExamCatalog() {
  const catalog = JSON.parse(await readFile(path.join(root, 'data', 'catalog.json'), 'utf8'));
  const keyReview = JSON.parse(await readFile(path.join(root, 'docs', 'exam-key-review.json'), 'utf8'));
  const examKeys = JSON.parse(await readFile(path.join(root, 'data', 'exam-keys.json'), 'utf8'));
  const items = catalog.items || [];
  const reviewMap = new Map((keyReview.sourceAuditMatrix || []).map((m) => [m.examId, m]));

  const exams = [];

  // ETS 2023 (10 Tests)
  const ets23Root = items.find((i) => i.name === 'ETS 2023' && i.parent === '1jNWBm1YAQc9bBLUv-T4yCef8SURnKiRV');
  const ets23LcEdit = items.find((i) => i.name === 'LISTENING (ĐÃ EDIT)');
  const ets23AudioDir = ets23Root ? findChild(items, ets23Root.id, (i) => /file nghe/i.test(i.name)) : null;
  const ets23AnsDir = ets23Root ? findChild(items, ets23Root.id, (i) => /đáp án 2023/i.test(i.name)) : null;
  const ets23RcPdf = ets23Root ? items.find((i) => i.name === 'ETS 2023 RC.pdf') : null;
  const ets23AnsLc = ets23AnsDir ? findChild(items, ets23AnsDir.id, (i) => /listening/i.test(i.name)) : null;
  const ets23AnsRc = ets23AnsDir ? findChild(items, ets23AnsDir.id, (i) => /reading/i.test(i.name)) : null;

  const publicEts23Overrides = {
    1: {
      unifiedPdf: { id: '1GR2K3kNYqnXg0W7_6iMdH6VgqIuGMc6a', name: 'ETS 2023 Test 01.pdf' },
      key: { id: '1yFfzwoUg6Eyt0b6YFnh_cK8GuHa_IwEs', name: 'Test 01 Key.png' },
      fullReady: true,
      note: 'Đã tích hợp 43 trang ảnh PDF gốc & khóa 200 câu đối chiếu công khai.'
    },
    2: {
      key: { id: '1Q_0ViDaSl1CmQtLC-X4fOFBxI2ptIX09', name: 'Test 02 Key.jpg' }
    },
    3: {
      key: { id: '14GQO_BLA4UfpxQM87Pk4nUxVlSbHKEXw', name: 'Test 03 Key.jpg' }
    },
    4: {
      unifiedPdf: { id: '1ponAGH1DRk28QmcvZYHHgmJsA8RD9AuK', name: 'ETS 2023 Test 04.pdf' },
      audio: { id: '1_xVRzsMc9wV5z7tWzpZkNErlz9o6c-hC', name: 'ETS 2023 Test 04.mp3', playable: 'server-sliced' },
      key: { id: '1F43AciE626KLSr8mFy9M1JMUWnacc6QO', name: 'Test 04 Key.jpg' },
      fullReady: true,
      hasPreCutAudio: true,
      note: 'Đề chuẩn đầy đủ: 41 trang ảnh PDF gốc, 54 đoạn audio cắt sẵn từng câu/nhóm & khóa 200 câu.'
    },
    5: {
      audio: { id: '1Q55_JxWmOQpiQo7oUTsEjVqao135DICC', name: 'ETS 2023 Test 05.mp3', playable: 'server-sliced' },
      key: { id: '1fyJ8NZBGtmWnz74qUq2ulp9F4QMHi21S', name: 'Test 05 Key.jpg' },
      hasPreCutAudio: true
    },
    6: {
      audio: { id: '1qY6yIuwoH-WdgatyvyDysRcekSxz9e-s', name: 'ETS 2023 Test 06.mp3', playable: 'server-sliced' },
      key: { id: '1gNXYDUxvsRXz8iE4sviJPJBu7LUqvVk-', name: 'Test 06 Key.jpg' },
      hasPreCutAudio: true
    }
  };

  for (let n = 1; n <= 10; n++) {
    const examId = `ets-2023-test-${pad2(n)}`;
    const reviewInfo = reviewMap.get(examId) || {};
    const keyVersion = examKeys.activeVersions[examId] || 'v1';
    const ov = publicEts23Overrides[n] || {};
    const isFull = Boolean(ov.fullReady);
    const rcStartPage = 2 + (n - 1) * 34;
    const rcEndPage = 1 + n * 34;

    const lcPdf = ov.unifiedPdf
      ? { id: ov.unifiedPdf.id, name: ov.unifiedPdf.name, merged: false }
      : (ets23LcEdit
          ? findChild(items, ets23LcEdit.id, (i) => new RegExp(`^test\\s*0?${n}\\.pdf$`, 'i').test(i.name))
          : null);
    const rcPdf = ets23RcPdf
      ? {
          id: ets23RcPdf.id,
          name: ets23RcPdf.name,
          merged: true,
          startPage: rcStartPage,
          endPage: rcEndPage,
          note: `PDF gộp Test 1–10 (Test ${pad2(n)}: Trang ${rcStartPage}–${rcEndPage})`
        }
      : null;
    const catalogAudio = ets23AudioDir
      ? findChild(items, ets23AudioDir.id, (i) => new RegExp(`test\\s*0?${n}\\.mp3$`, 'i').test(i.name))
      : null;
    const audioMeta = ov.audio || catalogAudio;

    const warnings = [];
    if (ov.note) {
      warnings.push(ov.note);
    } else {
      warnings.push(`Reading 2023 là PDF gộp 10 Test (Test ${pad2(n)}: Trang ${rcStartPage}–${rcEndPage}). Có khóa nguồn, đang rà soát.`);
    }
    if (examId === 'ets-2023-test-03') {
      warnings.push('Khóa đáp án đã được đối chiếu và hiệu chỉnh câu 3 (B) và câu 4 (C) theo bảng nguồn 2023-lc-page-1.png (phiên bản khóa v2).');
    }

    exams.push({
      id: examId,
      versionId: `${examId}-${keyVersion}`,
      keyVersion,
      title: `ETS 2023 · Test ${pad2(n)}`,
      year: 2023,
      testNumber: n,
      publisher: 'ETS',
      sourceLabel: 'ETS 2023',
      readiness: isFull ? 'full' : 'practice',
      readinessNote: ov.note || 'Có khóa nguồn, đang rà soát',
      simulationEligible: isFull,
      partReadiness: isFull
        ? { 1: 'full', 2: 'full', 3: 'full', 4: 'full', 5: 'full', 6: 'full', 7: 'full' }
        : { 1: 'practice', 2: 'practice', 3: 'practice', 4: 'practice', 5: 'practice', 6: 'practice', 7: 'practice' },
      warnings,
      sources: {
        lcPdf: lcPdf ? { id: lcPdf.id, name: lcPdf.name, merged: false } : null,
        rcPdf,
        audio: audioMeta
          ? {
              id: audioMeta.id,
              name: audioMeta.name,
              speed: 'normal',
              speedNote: ov.hasPreCutAudio ? 'Đã cắt sẵn 54 đoạn Listening chuẩn ETS' : 'Tốc độ chuẩn',
              playable: ov.audio?.playable || 'drive-preview'
            }
          : null,
        answerKeyLc: ov.key ? { id: ov.key.id, name: ov.key.name, sourcePage: 1 } : (ets23AnsLc ? { id: ets23AnsLc.id, name: ets23AnsLc.name, sourcePage: n } : null),
        answerKeyRc: ov.key ? { id: ov.key.id, name: ov.key.name, sourcePage: 1 } : (ets23AnsRc ? { id: ets23AnsRc.id, name: ets23AnsRc.name, sourcePage: n } : null),
        transcript: null
      },
      checklist: {
        sourceVerified: isFull || Boolean(ov.audio),
        questionsVerified: isFull,
        mediaVerified: isFull,
        keyVerified: isFull || examId === 'ets-2023-test-03',
        explanationsVerified: isFull
      },
      auditReview: reviewInfo
    });
  }

  // ETS 2024 (10 Tests)
  const ets24Root = items.find((i) => i.name === 'ETS 2024' && i.parent === '1jNWBm1YAQc9bBLUv-T4yCef8SURnKiRV');
  const ets24AudioDir = ets24Root ? findChild(items, ets24Root.id, (i) => /file nghe 2024/i.test(i.name)) : null;
  const ets24AnsDir = ets24Root ? findChild(items, ets24Root.id, (i) => /đáp án 2024/i.test(i.name)) : null;
  const ets24TransDir = ets24Root ? findChild(items, ets24Root.id, (i) => /transcript 2024/i.test(i.name)) : null;
  const ets24Ebook = ets24Root ? findChild(items, ets24Root.id, (i) => /ebook 2024/i.test(i.name)) : null;
  const ets24LcDir = ets24Ebook ? findChild(items, ets24Ebook.id, (i) => /listening/i.test(i.name)) : null;
  const ets24RcDir = ets24Ebook ? findChild(items, ets24Ebook.id, (i) => /reading/i.test(i.name)) : null;
  const ets24AnsLc = ets24AnsDir ? findChild(items, ets24AnsDir.id, (i) => /lc/i.test(i.name)) : null;
  const ets24AnsRc = ets24AnsDir ? findChild(items, ets24AnsDir.id, (i) => /rc/i.test(i.name)) : null;

  for (let n = 1; n <= 10; n++) {
    const examId = `ets-2024-test-${pad2(n)}`;
    const reviewInfo = reviewMap.get(examId) || {};
    const keyVersion = examKeys.activeVersions[examId] || 'v1';
    const lcPdf = ets24LcDir
      ? findChild(items, ets24LcDir.id, (i) => new RegExp(`listening\\s*test\\s*0?${n}\\.pdf$`, 'i').test(i.name))
      : null;
    const rcPdf = ets24RcDir
      ? findChild(items, ets24RcDir.id, (i) => new RegExp(`reading\\s*test\\s*0?${n}\\.pdf$`, 'i').test(i.name))
      : null;
    const audio = ets24AudioDir
      ? findChild(items, ets24AudioDir.id, (i) => new RegExp(`test_0?${n}[^0-9]`, 'i').test(i.name))
      : null;
    const transcript = ets24TransDir
      ? findChild(items, ets24TransDir.id, (i) => (n <= 5 ? /1-5/ : /6-10/).test(i.name))
      : null;

    exams.push({
      id: examId,
      versionId: `${examId}-${keyVersion}`,
      keyVersion,
      title: `ETS 2024 · Test ${pad2(n)}`,
      year: 2024,
      testNumber: n,
      publisher: 'ETS',
      sourceLabel: 'ETS 2024',
      readiness: 'practice',
      readinessNote: 'Audio tốc độ nhanh (고속) — tự luyện nâng cao',
      simulationEligible: false,
      partReadiness: { 1: 'practice', 2: 'practice', 3: 'practice', 4: 'practice', 5: 'practice', 6: 'practice', 7: 'practice' },
      warnings: [
        'Audio 2024 có nhãn tốc độ nhanh (고속) — phù hợp tự luyện nâng cao, không dùng cho thi mô phỏng chuẩn.',
        'Đã có 200 câu hỏi tương tác cho chế độ tự luyện.'
      ],
      sources: {
        lcPdf: lcPdf ? { id: lcPdf.id, name: lcPdf.name, merged: false } : null,
        rcPdf: rcPdf ? { id: rcPdf.id, name: rcPdf.name, merged: false } : null,
        audio: audio
          ? { id: audio.id, name: audio.name, speed: 'fast', speedNote: 'Tốc độ nhanh (고속)', playable: 'drive-preview' }
          : null,
        answerKeyLc: ets24AnsLc ? { id: ets24AnsLc.id, name: ets24AnsLc.name, sourcePage: n } : null,
        answerKeyRc: ets24AnsRc ? { id: ets24AnsRc.id, name: ets24AnsRc.name, sourcePage: n } : null,
        transcript: transcript ? { id: transcript.id, name: transcript.name, label: 'ETS 2024' } : null
      },
      checklist: {
        sourceVerified: true,
        questionsVerified: false,
        mediaVerified: false,
        keyVerified: false,
        explanationsVerified: false
      },
      auditReview: reviewInfo
    });
  }

  // ETS 2025 (10 Tests, YBM label, unverified)
  const ets25Root = items.find((i) => i.name === 'ETS 2025' && i.parent === '1jNWBm1YAQc9bBLUv-T4yCef8SURnKiRV');
  const ets25Ebook = ets25Root ? findChild(items, ets25Root.id, (i) => /ebook listening-reading/i.test(i.name)) : null;
  const ets25LcDir = ets25Ebook ? findChild(items, ets25Ebook.id, (i) => /ebook listening/i.test(i.name)) : null;
  const ets25RcDir = ets25Ebook ? findChild(items, ets25Ebook.id, (i) => /ebook reading/i.test(i.name)) : null;
  const ets25AudioDir = ets25Root ? findChild(items, ets25Root.id, (i) => /file nghe/i.test(i.name)) : null;
  const ets25AnsDir = ets25Root ? findChild(items, ets25Root.id, (i) => /answer key/i.test(i.name)) : null;
  const ets25TransDir = ets25AnsDir ? findChild(items, ets25AnsDir.id, (i) => /transcript/i.test(i.name)) : null;
  const ets25AnsRc = ets25AnsDir ? findChild(items, ets25AnsDir.id, (i) => /answer key reading/i.test(i.name)) : null;

  for (let n = 1; n <= 10; n++) {
    const examId = `ets-2025-test-${pad2(n)}`;
    const reviewInfo = reviewMap.get(examId) || {};
    const lcPdf = ets25LcDir
      ? findChild(items, ets25LcDir.id, (i) => new RegExp(`^test\\s*0?${n}\\.pdf$`, 'i').test(i.name))
      : null;
    const rcPdf = ets25RcDir
      ? findChild(items, ets25RcDir.id, (i) => new RegExp(`^test\\s*0?${n}\\.pdf$`, 'i').test(i.name))
      : null;
    const audio = ets25AudioDir
      ? findChild(items, ets25AudioDir.id, (i) => new RegExp(`test\\s*0?${n}\\.mp3$`, 'i').test(i.name))
      : null;
    const transcript = ets25TransDir
      ? findChild(items, ets25TransDir.id, (i) => new RegExp(`^test\\s*0?${n}\\.pdf$`, 'i').test(i.name))
      : null;

    exams.push({
      id: examId,
      versionId: `${examId}-unverified`,
      keyVersion: 'unverified',
      title: `Bộ 2025 · Test ${pad2(n)} (Nhãn YBM)`,
      year: 2025,
      testNumber: n,
      publisher: 'YBM (chưa xác minh)',
      sourceLabel: 'Bộ 2025 · Transcript nhãn YBM',
      readiness: 'reference',
      readinessNote: 'Tài liệu tham khảo · Chưa bật khóa chấm tự động',
      simulationEligible: false,
      partReadiness: { 1: 'reference', 2: 'reference', 3: 'reference', 4: 'reference', 5: 'reference', 6: 'reference', 7: 'reference' },
      warnings: [
        'Bìa transcript Test 1 mang nhãn YBM LC1000 — chưa xác minh sự khớp giữa đề, audio và khóa đáp án.',
        'Giữ tài liệu tham khảo, chưa bật khóa chấm tự động / thi mô phỏng.'
      ],
      sources: {
        lcPdf: lcPdf ? { id: lcPdf.id, name: lcPdf.name, merged: false } : null,
        rcPdf: rcPdf ? { id: rcPdf.id, name: rcPdf.name, merged: false } : null,
        audio: audio
          ? { id: audio.id, name: audio.name, speed: 'normal', speedNote: 'Chưa xác minh khớp đề', playable: 'drive-preview' }
          : null,
        answerKeyLc: transcript ? { id: transcript.id, name: transcript.name, sourcePage: 1 } : null,
        answerKeyRc: ets25AnsRc ? { id: ets25AnsRc.id, name: ets25AnsRc.name, sourcePage: n } : null,
        transcript: transcript ? { id: transcript.id, name: transcript.name, label: 'YBM (chưa xác minh)' } : null
      },
      checklist: {
        sourceVerified: false,
        questionsVerified: false,
        mediaVerified: false,
        keyVerified: false,
        explanationsVerified: false
      },
      auditReview: reviewInfo
    });
  }

  const catalogOutput = {
    schemaVersion: '2.0',
    generatedAt: new Date().toISOString(),
    totalExams: exams.length,
    exams
  };

  await writeFile(path.join(root, 'data', 'exam-catalog.json'), JSON.stringify(catalogOutput, null, 2));
  return exams;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const exams = await buildExamCatalog();
  console.log(JSON.stringify({ ok: true, exams: exams.length, saved: 'data/exam-catalog.json' }));
}
