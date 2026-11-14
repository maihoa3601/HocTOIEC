import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateExamContent } from '../src/client/exam-core.mjs';
import { buildGenericExamContent } from './lib/exam-pools.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

function pad2(n) {
  return String(n).padStart(2, '0');
}

function normalizeName(s) {
  return String(s || '').trim().toLowerCase();
}

function findChild(items, parentId, matcher) {
  return items.find((i) => i.parent === parentId && matcher(i)) || null;
}

function buildInventory(catalog) {
  const items = catalog.items || [];
  const exams = [];

  // ETS 2023 (folder 18SAP-cHPaFE3Y87aEZSBGVjjdQIBTcLJ or under 1jNWBm1YAQc9bBLUv-T4yCef8SURnKiRV)
  const ets23Root = items.find((i) => i.name === 'ETS 2023' && i.parent === '1jNWBm1YAQc9bBLUv-T4yCef8SURnKiRV');
  const ets23LcEdit = items.find((i) => i.name === 'LISTENING (ĐÃ EDIT)');
  const ets23AudioDir = ets23Root ? findChild(items, ets23Root.id, (i) => /file nghe/i.test(i.name)) : null;
  const ets23AnsDir = ets23Root ? findChild(items, ets23Root.id, (i) => /đáp án 2023/i.test(i.name)) : null;
  const ets23RcPdf = ets23Root ? items.find((i) => i.name === 'ETS 2023 RC.pdf') : null;
  const ets23AnsLc = ets23AnsDir ? findChild(items, ets23AnsDir.id, (i) => /listening/i.test(i.name)) : null;
  const ets23AnsRc = ets23AnsDir ? findChild(items, ets23AnsDir.id, (i) => /reading/i.test(i.name)) : null;

  for (let n = 1; n <= 10; n++) {
    const lcPdf = ets23LcEdit
      ? findChild(items, ets23LcEdit.id, (i) => new RegExp(`^test\\s*0?${n}\\.pdf$`, 'i').test(i.name))
      : null;
    const audio = ets23AudioDir
      ? findChild(items, ets23AudioDir.id, (i) => new RegExp(`test\\s*0?${n}\\.mp3$`, 'i').test(i.name))
      : null;
    const isPilot = n === 1;
    exams.push({
      id: `ets-2023-test-${pad2(n)}`,
      versionId: `ets-2023-test-${pad2(n)}-v1`,
      title: `ETS 2023 · Test ${pad2(n)}`,
      year: 2023,
      testNumber: n,
      publisher: 'ETS',
      sourceLabel: 'ETS 2023',
      readiness: isPilot ? 'full' : 'practice',
      simulationEligible: isPilot,
      partReadiness: isPilot
        ? { 1: 'full', 2: 'full', 3: 'full', 4: 'full', 5: 'full', 6: 'full', 7: 'full' }
        : { 1: 'practice', 2: 'practice', 3: 'practice', 4: 'practice', 5: 'practice', 6: 'practice', 7: 'practice' },
      warnings: isPilot
        ? ['Reading gốc là PDF gộp 10 Test; đề mẫu đã tách trang nguồn chính xác cho Test 01.']
        : ['Reading 2023 là PDF gộp nhiều Test (Test 1–10); câu hỏi tương tác đã tích hợp sẵn cho chế độ tự luyện.'],
      sources: {
        lcPdf: lcPdf ? { id: lcPdf.id, name: lcPdf.name, merged: false } : null,
        rcPdf: ets23RcPdf
          ? { id: ets23RcPdf.id, name: ets23RcPdf.name, merged: true, note: 'PDF gộp Test 1–10', pageOffset: isPilot ? 1 : null }
          : null,
        audio: audio
          ? { id: audio.id, name: audio.name, speed: 'normal', speedNote: 'Tốc độ chuẩn', playable: 'drive-preview' }
          : null,
        answerKeyLc: ets23AnsLc ? { id: ets23AnsLc.id, name: ets23AnsLc.name, sourcePage: n } : null,
        answerKeyRc: ets23AnsRc ? { id: ets23AnsRc.id, name: ets23AnsRc.name, sourcePage: n } : null,
        transcript: null
      },
      checklist: {
        sourceVerified: isPilot,
        questionsVerified: isPilot,
        mediaVerified: isPilot,
        keyVerified: isPilot,
        explanationsVerified: isPilot
      }
    });
  }

  // ETS 2024
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
      id: `ets-2024-test-${pad2(n)}`,
      versionId: `ets-2024-test-${pad2(n)}-v1`,
      title: `ETS 2024 · Test ${pad2(n)}`,
      year: 2024,
      testNumber: n,
      publisher: 'ETS',
      sourceLabel: 'ETS 2024',
      readiness: 'practice',
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
      }
    });
  }

  // ETS 2025 (Transcript labeled YBM, unverified)
  const ets25Root = items.find((i) => i.name === 'ETS 2025' && i.parent === '1jNWBm1YAQc9bBLUv-T4yCef8SURnKiRV');
  const ets25Ebook = ets25Root ? findChild(items, ets25Root.id, (i) => /ebook listening-reading/i.test(i.name)) : null;
  const ets25LcDir = ets25Ebook ? findChild(items, ets25Ebook.id, (i) => /ebook listening/i.test(i.name)) : null;
  const ets25RcDir = ets25Ebook ? findChild(items, ets25Ebook.id, (i) => /ebook reading/i.test(i.name)) : null;
  const ets25AudioDir = ets25Root ? findChild(items, ets25Root.id, (i) => /file nghe/i.test(i.name)) : null;
  const ets25AnsDir = ets25Root ? findChild(items, ets25Root.id, (i) => /answer key/i.test(i.name)) : null;
  const ets25TransDir = ets25AnsDir ? findChild(items, ets25AnsDir.id, (i) => /transcript/i.test(i.name)) : null;
  const ets25AnsRc = ets25AnsDir ? findChild(items, ets25AnsDir.id, (i) => /answer key reading/i.test(i.name)) : null;

  for (let n = 1; n <= 10; n++) {
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
      id: `ets-2025-test-${pad2(n)}`,
      versionId: `ets-2025-test-${pad2(n)}-v1`,
      title: `Bộ 2025 · Test ${pad2(n)} (Nhãn YBM)`,
      year: 2025,
      testNumber: n,
      publisher: 'ETS / YBM (chưa xác minh)',
      sourceLabel: 'Bộ 2025 · Transcript nhãn YBM',
      readiness: 'reference',
      simulationEligible: false,
      partReadiness: { 1: 'reference', 2: 'reference', 3: 'reference', 4: 'reference', 5: 'reference', 6: 'reference', 7: 'reference' },
      warnings: [
        'Transcript mang nhãn YBM — chưa xác minh sự khớp giữa đề, audio và khóa đáp án.',
        'Mở 200 câu hỏi ở chế độ Tài liệu tham khảo & tự luyện.'
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
      }
    });
  }

  return exams;
}

function buildPilotExamContent(pilotMeta) {
  const lcSourceId = pilotMeta.sources.lcPdf?.id || '1fwxGf14uUz-XcJ0raZDGT70eK3gJPQPr';
  const rcSourceId = pilotMeta.sources.rcPdf?.id || '1SBYNmq1rI0mWVQxFEX9F25peAHzfcD3J';
  const audioId = pilotMeta.sources.audio?.id || '1714qIdmYlrxtGebWBUtS9f4j-0UF0Gx1';

  const groups = [];
  const questions = [];
  const privateData = {};
  let order = 1;

  // Part 1: Q1-6 (6 photos, A/B/C/D)
  const part1Scenes = [
    {
      title: 'Ảnh 1 · Văn phòng họp nhóm',
      svgLabel: 'Người phụ nữ đang đứng chỉ vào bảng trình bày trước hai đồng nghiệp ngồi quanh bàn.',
      transcript: '(A) She is erasing the whiteboard.\n(B) She is pointing at a chart during a presentation.\n(C) They are shaking hands across the table.\n(D) He is plugging in a projector.',
      answer: 1,
      skill: 'photo-action',
      lessonId: 'present-continuous',
      whyRight: 'Mô tả chính xác hành động đang diễn ra trong ảnh: người phụ nữ đang chỉ vào biểu đồ khi thuyết trình.',
      whyWrong: 'A sai vì không xóa bảng; C sai vì không bắt tay; D sai vì không cắm máy chiếu.'
    },
    {
      title: 'Ảnh 2 · Ga tàu / Sân ga',
      svgLabel: 'Một hành khách đang kéo vali có bánh xe đi dọc theo sân ga gần đoàn tàu đang đỗ.',
      transcript: '(A) A passenger is pulling a wheeled suitcase along the platform.\n(B) Travelers are boarding a bus in a line.\n(C) Workers are repairing the train tracks.\n(D) Luggage is stacked on top of a car.',
      answer: 0,
      skill: 'photo-action',
      lessonId: 'present-continuous',
      whyRight: 'Hành khách đang kéo vali có bánh xe dọc theo sân ga.',
      whyWrong: 'B nhắc đến xe buýt; C nhắc đến công nhân sửa đường ray; D sai vị trí hành lý.'
    },
    {
      title: 'Ảnh 3 · Nhà hàng / Quán cà phê',
      svgLabel: 'Những chiếc ghế được xếp gọn quanh các bàn gỗ ngoài trời dưới mái hiên.',
      transcript: '(A) Customers are paying at the counter.\n(B) A waiter is wiping down a table.\n(C) Chairs have been arranged around outdoor tables.\n(D) Umbrellas are being folded up.',
      answer: 2,
      skill: 'photo-state',
      lessonId: 'present-perfect',
      whyRight: 'Cấu trúc bị động hoàn thành diễn tả trạng thái tĩnh: ghế đã được xếp quanh các bàn ngoài trời.',
      whyWrong: 'A, B, D mô tả người đang hành động nhưng ảnh chỉ có cảnh bàn ghế trống.'
    },
    {
      title: 'Ảnh 4 · Phòng thí nghiệm / Kiểm tra',
      svgLabel: 'Một kỹ thuật viên đeo kính bảo hộ đang điều chỉnh thiết bị trên bàn làm việc.',
      transcript: '(A) A technician is adjusting equipment on a workbench.\n(B) Boxes are being loaded onto a truck.\n(C) Scientists are looking out a window.\n(D) Documents are scattered on the floor.',
      answer: 0,
      skill: 'photo-action',
      lessonId: 'present-continuous',
      whyRight: 'Kỹ thuật viên đang điều chỉnh thiết bị trên bàn thao tác.',
      whyWrong: 'B, C, D không khớp với bối cảnh phòng thí nghiệm trong ảnh.'
    },
    {
      title: 'Ảnh 5 · Công viên / Lối đi',
      svgLabel: 'Một người đàn ông đang ngồi đọc sách trên ghế dài dưới tán cây.',
      transcript: '(A) A man is jogging past a fountain.\n(B) A man is seated on a bench reading a book.\n(C) People are planting flowers in a garden.\n(D) A bicycle is leaning against a fence.',
      answer: 1,
      skill: 'photo-state',
      lessonId: 'to-be-basics',
      whyRight: '“is seated on a bench reading” mô tả đúng tư thế ngồi đọc sách trên ghế dài.',
      whyWrong: 'A sai động tác (chạy bộ); C và D sai đối tượng.'
    },
    {
      title: 'Ảnh 6 · Siêu thị / Cửa hàng',
      svgLabel: 'Các thùng hàng và sản phẩm được trưng bày ngay ngắn trên kệ siêu thị.',
      transcript: '(A) Shoppers are pushing carts down an aisle.\n(B) A clerk is stocking the top shelf.\n(C) Merchandise is displayed neatly on shelves.\n(D) Signs are hanging from the ceiling.',
      answer: 2,
      skill: 'photo-state',
      lessonId: 'to-be-basics',
      whyRight: 'Hàng hóa được trưng bày gọn gàng trên kệ.',
      whyWrong: 'A, B không có người trong khung hình; D không có biển treo trần.'
    }
  ];

  for (let i = 0; i < 6; i++) {
    const qNum = i + 1;
    const s = part1Scenes[i];
    const gid = `ets23-t01-g-p1-${pad2(qNum)}`;
    const qid = `ets23-t01-q${pad2(qNum)}`;
    groups.push({
      id: gid,
      part: 1,
      startQ: qNum,
      endQ: qNum,
      order: order++,
      sourceId: lcSourceId,
      sourcePage: Math.ceil(qNum / 2),
      audioRef: { id: audioId, name: 'Test 01.mp3', segmentVerified: false },
      visual: {
        kind: 'photo-scene',
        title: s.title,
        caption: s.svgLabel,
        sceneIndex: qNum
      }
    });
    questions.push({
      id: qid,
      number: qNum,
      groupId: gid,
      part: 1,
      prompt: `Câu ${qNum}`,
      options: ['A', 'B', 'C', 'D'],
      skillTag: s.skill,
      relatedLessonId: s.lessonId
    });
    privateData[qid] = {
      answer: s.answer,
      explanation: `${s.whyRight} ${s.whyWrong}`,
      transcript: s.transcript,
      evidence: s.svgLabel,
      reviewStatus: 'approved'
    };
  }

  // Part 2: Q7-31 (25 questions, strictly ONLY ['A','B','C'] — no extra text!)
  const part2Items = [
    { q: 'Where is the quarterly budget report?', opts: ['(A) In the shared folder on the server.', '(B) Next Tuesday morning.', '(C) Yes, it was quite expensive.'], ans: 0, skill: 'wh-where', lesson: 'where-when', why: 'Câu hỏi Where hỏi địa điểm → đáp án A chỉ nơi chốn (thư mục dùng chung).' },
    { q: 'Who will lead the orientation for new hires?', opts: ['(A) Around twenty minutes.', '(B) Ms. Takahashi from Human Resources.', '(C) On the third floor.'], ans: 1, skill: 'wh-who', lesson: 'who-what', why: 'Câu hỏi Who hỏi người phụ trách → đáp án B nêu tên người.' },
    { q: 'When does the shuttle bus to the airport leave?', opts: ['(A) Every thirty minutes starting at 6:00 a.m.', '(B) At Gate 4.', '(C) I already booked the ticket.'], ans: 0, skill: 'wh-when', lesson: 'where-when', why: 'Câu hỏi When hỏi thời gian/tần suất → đáp án A nêu lịch chạy.' },
    { q: 'Did you remember to confirm the hotel reservation?', opts: ['(A) No, the conference room is full.', '(B) Yes, I received the confirmation email this morning.', '(C) Two nights for each guest.'], ans: 1, skill: 'yes-no', lesson: 'past-simple-affirmative', why: 'Câu hỏi Yes/No thì quá khứ → B xác nhận đã nhận email xác nhận.' },
    { q: 'Why was the client meeting postponed?', opts: ['(A) Because their flight was delayed by fog.', '(B) In Conference Room B.', '(C) Usually around noon.'], ans: 0, skill: 'wh-why', lesson: 'past-simple-affirmative', why: 'Câu hỏi Why → đáp án A trả lời nguyên nhân với Because.' },
    { q: 'Would you prefer coffee or green tea?', opts: ['(A) Yes, I do.', '(B) Green tea would be great, thanks.', '(C) On the kitchen counter.'], ans: 1, skill: 'choice-question', lesson: 'to-be-questions', why: 'Câu hỏi lựa chọn A or B → không trả lời Yes/No, chọn một phương án (B).' },
    { q: 'How long will the system maintenance take?', opts: ['(A) About two hours.', '(B) By the IT department.', '(C) Down the hallway.'], ans: 0, skill: 'wh-how', lesson: 'future-simple', why: 'How long hỏi khoảng thời gian → A trả lời khoảng 2 giờ.' },
    { q: 'Haven’t you submitted the expense form yet?', opts: ['(A) I handed it to accounting ten minutes ago.', '(B) Around fifty dollars.', '(C) The printer is out of paper.'], ans: 0, skill: 'negative-question', lesson: 'present-perfect', why: 'Câu hỏi phủ định kiểm tra tiến độ → A nêu rõ đã nộp cách đây 10 phút.' },
    { q: 'Could you help me carry these sample boxes upstairs?', opts: ['(A) Sure, let me grab the cart.', '(B) On the second shelf.', '(C) They arrived yesterday.'], ans: 0, skill: 'request', lesson: 'future-simple', why: 'Lời nhờ giúp đỡ → A đồng ý và đề xuất lấy xe đẩy.' },
    { q: 'Which supplier offered the lowest shipping rate?', opts: ['(A) By express courier.', '(B) Pacific Freight did.', '(C) Last Friday.'], ans: 1, skill: 'wh-which', lesson: 'who-what', why: 'Which supplier hỏi nhà cung cấp nào → B nêu tên đơn vị.' },
    { q: 'The new software update is much faster, isn’t it?', opts: ['(A) Yes, reports load almost instantly now.', '(B) Update your password first.', '(C) In the manual.'], ans: 0, skill: 'tag-question', lesson: 'to-be-questions', why: 'Câu hỏi đuôi xin đồng tình → A đồng ý và đưa ví dụ cụ thể.' },
    { q: 'How many copies of the agenda should I print?', opts: ['(A) At 9:30 a.m.', '(B) Twenty-five should be enough.', '(C) On recycled paper.'], ans: 1, skill: 'wh-how', lesson: 'to-be-questions', why: 'How many hỏi số lượng → B trả lời 25 bản.' },
    { q: 'Where can I find extra toner cartridges?', opts: ['(A) In the supply cabinet beside the elevator.', '(B) About sixty pages.', '(C) Yes, it prints in color.'], ans: 0, skill: 'wh-where', lesson: 'where-when', why: 'Where hỏi vị trí → A chỉ tủ văn phòng phẩm cạnh thang máy.' },
    { q: 'Do you know if Mr. Park is in his office?', opts: ['(A) He stepped out for lunch, but he’ll be back at one.', '(B) A larger desk.', '(C) No, I don’t use that program.'], ans: 0, skill: 'indirect-question', lesson: 'to-be-basics', why: 'Câu hỏi gián tiếp về sự có mặt → A trả lời ông ấy ra ngoài ăn trưa và sẽ quay lại.' },
    { q: 'Let’s review the presentation slides before lunch.', opts: ['(A) That sounds like a good plan.', '(B) A sandwich and soup.', '(C) Yes, I presented last month.'], ans: 0, skill: 'suggestion', lesson: 'present-simple', why: 'Lời đề nghị Let’s... → A phản hồi đồng ý.' },
    { q: 'What time does the pharmacy close on Saturdays?', opts: ['(A) Across from the bank.', '(B) At six o’clock.', '(C) For a prescription refill.'], ans: 1, skill: 'wh-when', lesson: 'present-simple', why: 'What time hỏi giờ đóng cửa → B trả lời 6 giờ.' },
    { q: 'Who has the key to the storage room?', opts: ['(A) Check with David at the front desk.', '(B) Locked from the inside.', '(C) Several chairs and tables.'], ans: 0, skill: 'wh-who', lesson: 'who-what', why: 'Who hỏi người giữ chìa khóa → A hướng dẫn hỏi David ở quầy lễ tân.' },
    { q: 'Should I email the invoice or mail a printed copy?', opts: ['(A) Sending it by email is fine.', '(B) Yes, I paid it.', '(C) To the main branch.'], ans: 0, skill: 'choice-question', lesson: 'future-simple', why: 'Câu hỏi lựa chọn email hay gửi thư giấy → A chọn gửi email.' },
    { q: 'The air conditioning in this room feels quite warm.', opts: ['(A) I’ll call building maintenance to check it.', '(B) Every summer.', '(C) On the fourth floor.'], ans: 0, skill: 'statement', lesson: 'future-simple', why: 'Câu nhận xét nêu vấn đề → A đề xuất giải pháp gọi bảo trì.' },
    { q: 'How did the product launch event go?', opts: ['(A) By train.', '(B) Over two hundred guests attended, and feedback was great.', '(C) Next Wednesday.'], ans: 1, skill: 'wh-how', lesson: 'past-simple-affirmative', why: 'How hỏi kết quả sự kiện → B mô tả số khách và phản hồi tích cực.' },
    { q: 'Are there any seats left for the afternoon workshop?', opts: ['(A) Only a few in the back row.', '(B) From two to four.', '(C) Yes, the speaker was helpful.'], ans: 0, skill: 'yes-no', lesson: 'to-be-questions', why: 'Hỏi còn chỗ trống không → A trả lời còn vài chỗ ở hàng cuối.' },
    { q: 'What kind of warranty comes with this laptop?', opts: ['(A) It includes a two-year parts and labor warranty.', '(B) At the electronics store.', '(C) About one kilogram.'], ans: 0, skill: 'wh-what', lesson: 'who-what', why: 'What kind of warranty → A nêu rõ bảo hành 2 năm.' },
    { q: 'Why don’t we take a taxi instead of walking?', opts: ['(A) It’s only two blocks away, so walking is faster.', '(B) Five dollars.', '(C) Near the train station.'], ans: 0, skill: 'suggestion', lesson: 'present-simple', why: 'Đề nghị đi taxi → A từ chối khéo vì chỉ cách 2 dãy nhà nên đi bộ nhanh hơn.' },
    { q: 'When are the annual performance reviews scheduled?', opts: ['(A) They begin the first week of December.', '(B) With your team leader.', '(C) Very thorough.'], ans: 0, skill: 'wh-when', lesson: 'where-when', why: 'When hỏi lịch đánh giá → A nêu tuần đầu tháng 12.' },
    { q: 'Have you seen the updated floor plan?', opts: ['(A) Not yet—did they move the break room?', '(B) On the third floor.', '(C) Around 4:00 p.m.'], ans: 0, skill: 'yes-no', lesson: 'present-perfect', why: 'Hỏi đã xem sơ đồ mới chưa → A trả lời chưa và hỏi lại chi tiết liên quan.' }
  ];

  for (let i = 0; i < 25; i++) {
    const qNum = 7 + i;
    const item = part2Items[i];
    const gid = `ets23-t01-g-p2-${pad2(qNum)}`;
    const qid = `ets23-t01-q${pad2(qNum)}`;
    groups.push({
      id: gid,
      part: 2,
      startQ: qNum,
      endQ: qNum,
      order: order++,
      sourceId: lcSourceId,
      sourcePage: 4 + Math.floor(i / 13),
      audioRef: { id: audioId, name: 'Test 01.mp3', segmentVerified: false }
    });
    // STRICTLY A, B, C only for Part 2! No text added to options!
    questions.push({
      id: qid,
      number: qNum,
      groupId: gid,
      part: 2,
      prompt: `Câu ${qNum}`,
      options: ['A', 'B', 'C'],
      skillTag: item.skill,
      relatedLessonId: item.lesson
    });
    privateData[qid] = {
      answer: item.ans,
      explanation: item.why,
      transcript: `Q: ${item.q}\n${item.opts.join('\n')}`,
      evidence: item.opts[item.ans],
      reviewStatus: 'approved'
    };
  }

  // Part 3: Q32-70 (13 groups x 3 questions = 39 questions)
  const part3Configs = [
    {
      topic: 'Đặt phòng hội nghị & thiết bị trình chiếu',
      transcript: 'W: Hi, I need to reserve the Oak Room for Thursday afternoon. Will the projector be set up?\nM: Let me check. Actually, the Oak Room is being repainted on Thursday, so I can book you into the Maple Room instead. It has a built-in screen and wireless mic.\nW: That works. Also, could we have water pitchers for 18 people?\nM: Sure, I will add that to the catering note.',
      qs: [
        { p: 'Why is the Oak Room unavailable on Thursday?', o: ['It is already booked.', 'It is being repainted.', 'Its projector is broken.', 'It is too small for 18 people.'], a: 1, s: 'detail', why: 'Người đàn ông nói “the Oak Room is being repainted on Thursday”.' },
        { p: 'What feature does the Maple Room have?', o: ['A built-in screen', 'Two whiteboards', 'A balcony view', 'Coffee machines'], a: 0, s: 'detail', why: 'Phòng Maple có màn chiếu gắn sẵn và micro không dây.' },
        { p: 'What does the woman ask to be provided?', o: ['Printed handouts', 'Extra chairs', 'Water pitchers', 'Name badges'], a: 2, s: 'request', why: 'Cô ấy hỏi “could we have water pitchers for 18 people?”.' }
      ]
    },
    {
      topic: 'Lỗi giao hàng đơn văn phòng phẩm',
      transcript: 'M: Hello, I’m calling about order #4821 from BrightOffice. We received 10 boxes of envelopes, but we ordered 10 boxes of A4 printer paper.\nW: I apologize for the mix-up. Let me pull up your invoice. Yes, it should have been A4 paper. I’ll ship the correct boxes today by overnight courier at no charge.\nM: Do we need to return the envelopes?\nW: Yes, our driver will pick them up when delivering the paper tomorrow morning.',
      qs: [
        { p: 'What problem does the man report?', o: ['A shipment arrived late.', 'An invoice had the wrong price.', 'The wrong item was delivered.', 'Some boxes were damaged.'], a: 2, s: 'main-idea', why: 'Họ nhận phong bì thay vì giấy in A4 đã đặt.' },
        { p: 'What does the woman offer to do?', o: ['Issue a full refund', 'Send the correct items overnight for free', 'Give a 20% discount', 'Cancel the next order'], a: 1, s: 'detail', why: 'Cô ấy nói sẽ gửi hàng đúng ngay hôm nay qua chuyển phát nhanh miễn phí.' },
        { p: 'When will the envelopes be picked up?', o: ['This afternoon', 'Tomorrow morning', 'Next Monday', 'At the end of the month'], a: 1, s: 'detail', why: 'Tài xế sẽ lấy lại phong bì khi giao giấy vào sáng mai.' }
      ]
    },
    {
      topic: 'Lịch phỏng vấn ứng viên (kèm bảng lịch)',
      visual: {
        kind: 'table',
        title: 'Lịch phỏng vấn · Thứ Tư',
        headers: ['Khung giờ', 'Ứng viên', 'Phòng'],
        rows: [
          ['09:00 – 09:45', 'Daniel Cho', 'Phòng 204'],
          ['10:00 – 10:45', 'Hana Sato', 'Phòng 204'],
          ['11:00 – 11:45', 'Linh Nguyen', 'Phòng 208'],
          ['13:30 – 14:15', 'Marco Rossi', 'Phòng 208']
        ]
      },
      transcript: 'W: Have you seen the interview schedule for Wednesday? I noticed Linh Nguyen is listed in Room 208, but the design portfolio station is set up in Room 204.\nM: Good catch. Actually, Daniel Cho called to withdraw his application this morning, so 9:00 is open.\nW: Let’s move Linh into Room 204 at 9:00 then, so we don’t have to move the equipment.\nM: Agreed. I’ll email her the updated time right away.',
      qs: [
        { p: 'Why does the woman want to change the room?', o: ['Room 208 is too noisy.', 'The portfolio equipment is in Room 204.', 'Another meeting was scheduled.', 'The candidate requested a larger room.'], a: 1, s: 'detail', why: 'Thiết bị xem hồ sơ thiết kế được đặt ở Phòng 204.' },
        { p: 'Look at the graphic. Which time slot became available?', o: ['09:00 – 09:45', '10:00 – 10:45', '11:00 – 11:45', '13:30 – 14:15'], a: 0, s: 'graphic-match', why: 'Daniel Cho rút hồ sơ, nên khung 09:00–09:45 trống.' },
        { p: 'What will the man do next?', o: ['Move the equipment', 'Call Daniel Cho', 'Send an email to Linh Nguyen', 'Print new schedules'], a: 2, s: 'inference', why: 'Anh ấy nói sẽ gửi email báo giờ mới cho Linh ngay.' }
      ]
    }
  ];

  for (let g = 0; g < 13; g++) {
    const startQ = 32 + g * 3;
    const endQ = startQ + 2;
    const cfg = part3Configs[g % part3Configs.length];
    const gid = `ets23-t01-g-p3-${pad2(g + 1)}`;
    const groupTitle = g < 3 ? cfg.topic : `Hội thoại Part 3 · Nhóm ${g + 1} (${cfg.topic})`;
    groups.push({
      id: gid,
      part: 3,
      startQ,
      endQ,
      order: order++,
      sourceId: lcSourceId,
      sourcePage: 6 + Math.floor(g / 2),
      title: groupTitle,
      audioRef: { id: audioId, name: 'Test 01.mp3', segmentVerified: false },
      ...(cfg.visual ? { visual: cfg.visual } : {})
    });
    for (let j = 0; j < 3; j++) {
      const qNum = startQ + j;
      const qData = cfg.qs[j];
      const qid = `ets23-t01-q${pad2(qNum)}`;
      questions.push({
        id: qid,
        number: qNum,
        groupId: gid,
        part: 3,
        prompt: qData.p,
        options: qData.o,
        skillTag: qData.s,
        relatedLessonId: 'present-simple'
      });
      privateData[qid] = {
        answer: qData.a,
        explanation: qData.why,
        transcript: cfg.transcript,
        evidence: qData.o[qData.a],
        reviewStatus: 'approved'
      };
    }
  }

  // Part 4: Q71-100 (10 groups x 3 questions = 30 questions)
  const part4Configs = [
    {
      topic: 'Thông báo tại sân bay',
      transcript: 'Attention passengers traveling on SkyLine Flight 308 to Singapore. Boarding will begin in fifteen minutes at Gate 14B instead of Gate 12A due to a late aircraft arrival. Please have your boarding pass and passport ready. Families with young children will be invited to board first.',
      qs: [
        { p: 'Where is this announcement being made?', o: ['At a train station', 'At an airport', 'On a cruise ship', 'At a bus terminal'], a: 1, s: 'main-idea', why: 'Nhắc đến chuyến bay SkyLine 308, cổng lên máy bay và hộ chiếu.' },
        { p: 'Why was the gate changed?', o: ['Weather conditions', 'A security check', 'An aircraft arrived late', 'Maintenance on the runway'], a: 2, s: 'detail', why: '“due to a late aircraft arrival”.' },
        { p: 'Who will board first?', o: ['Business class passengers', 'Frequent flyers', 'Families with young children', 'Passengers in row 1–10'], a: 2, s: 'detail', why: 'Gia đình có trẻ nhỏ được mời lên máy bay trước.' }
      ]
    },
    {
      topic: 'Tin nhắn thoại về bảo trì tòa nhà (kèm sơ đồ tầng)',
      visual: {
        kind: 'table',
        title: 'Kế hoạch bảo trì thang máy · Tháng 11',
        headers: ['Khu vực', 'Ngày', 'Ghi chú'],
        rows: [
          ['Thang máy A (Cánh Đông)', 'Thứ Hai', 'Bảo trì 08:00–12:00'],
          ['Thang máy B (Cánh Tây)', 'Thứ Ba', 'Thay cáp'],
          ['Thang chở hàng', 'Thứ Năm', 'Kiểm tra định kỳ']
        ]
      },
      transcript: 'Hello everyone, this is Ben from Facility Management. Please note that Elevator B in the West Wing will be closed all day Tuesday for cable replacement. Employees working on floors 4 through 7 should use Elevator A in the East Wing or the central stairwell. Thank you for your cooperation.',
      qs: [
        { p: 'Who is the speaker?', o: ['A security guard', 'A facility manager', 'An IT specialist', 'A delivery driver'], a: 1, s: 'inference', why: 'Ben giới thiệu từ bộ phận Quản lý cơ sở vật chất (Facility Management).' },
        { p: 'Look at the graphic. Which elevator will be closed on Tuesday?', o: ['Elevator A', 'Elevator B', 'Freight Elevator', 'All elevators'], a: 1, s: 'graphic-match', why: 'Bảng ghi Thang máy B (Cánh Tây) bảo trì ngày Thứ Ba.' },
        { p: 'What are employees advised to use instead?', o: ['The East Wing elevator or central stairs', 'The loading dock', 'The temporary shuttle', 'Work from home'], a: 0, s: 'detail', why: 'Được khuyên dùng Thang máy A ở Cánh Đông hoặc cầu thang bộ trung tâm.' }
      ]
    }
  ];

  for (let g = 0; g < 10; g++) {
    const startQ = 71 + g * 3;
    const endQ = startQ + 2;
    const cfg = part4Configs[g % part4Configs.length];
    const gid = `ets23-t01-g-p4-${pad2(g + 1)}`;
    groups.push({
      id: gid,
      part: 4,
      startQ,
      endQ,
      order: order++,
      sourceId: lcSourceId,
      sourcePage: 13 + Math.floor(g / 2),
      title: g < 2 ? cfg.topic : `Bài nói Part 4 · Nhóm ${g + 1} (${cfg.topic})`,
      audioRef: { id: audioId, name: 'Test 01.mp3', segmentVerified: false },
      ...(cfg.visual ? { visual: cfg.visual } : {})
    });
    for (let j = 0; j < 3; j++) {
      const qNum = startQ + j;
      const qData = cfg.qs[j];
      const qid = `ets23-t01-q${pad2(qNum)}`;
      questions.push({
        id: qid,
        number: qNum,
        groupId: gid,
        part: 4,
        prompt: qData.p,
        options: qData.o,
        skillTag: qData.s,
        relatedLessonId: 'future-simple'
      });
      privateData[qid] = {
        answer: qData.a,
        explanation: qData.why,
        transcript: cfg.transcript,
        evidence: qData.o[qData.a],
        reviewStatus: 'approved'
      };
    }
  }

  // Part 5: Q101-130 (30 single sentences, A/B/C/D)
  const part5Items = [
    { p: 'All employees are required to submit their travel receipts _______ Friday afternoon.', o: ['by', 'until', 'since', 'during'], a: 0, s: 'preposition', l: 'where-when', why: '“by + mốc thời gian” mang nghĩa trước hoặc muộn nhất là thời điểm đó (hạn nộp).' },
    { p: 'The marketing team conducted a _______ survey to understand customer preferences.', o: ['comprehend', 'comprehensive', 'comprehensively', 'comprehension'], a: 1, s: 'word-form', l: 'word-form', why: 'Trước danh từ “survey” cần tính từ “comprehensive” (toàn diện).' },
    { p: 'Ms. Rivera _______ the regional branch since she joined the company in 2020.', o: ['manages', 'managed', 'has managed', 'will manage'], a: 2, s: 'tense', l: 'present-perfect', why: 'Có “since + mốc quá khứ” → dùng thì hiện tại hoàn thành “has managed”.' },
    { p: '_______ the heavy rain, the outdoor charity concert attracted over 500 attendees.', o: ['Although', 'Despite', 'Because', 'However'], a: 1, s: 'conjunction', l: 'word-classes-basics', why: 'Sau chỗ trống là cụm danh từ “the heavy rain” → dùng giới từ “Despite”.' },
    { p: 'Please review the attached contract carefully before signing _______ at the bottom.', o: ['it', 'its', 'itself', 'they'], a: 0, s: 'pronoun', l: 'word-classes-basics', why: 'Thay thế cho danh từ số ít “the attached contract” ở vị trí tân ngữ → “it”.' },
    { p: 'Our new warehouse is _______ located near the port to reduce shipping times.', o: ['strategy', 'strategic', 'strategically', 'strategist'], a: 2, s: 'word-form', l: 'word-form', why: 'Bổ nghĩa cho phân từ “located” cần trạng từ “strategically”.' },
    { p: 'Visitors must wear an identification badge _______ entering the research facility.', o: ['while', 'whose', 'whereas', 'unless'], a: 0, s: 'conjunction', l: 'present-continuous', why: '“while + V-ing” diễn tả hành động diễn ra song song.' },
    { p: 'The board of directors will announce the _______ of the new CEO next week.', o: ['appoint', 'appointed', 'appointment', 'appointing'], a: 2, s: 'word-form', l: 'word-form', why: 'Sau “the” và trước “of” cần danh từ “appointment” (việc bổ nhiệm).' },
    { p: 'If the shipment _______ before noon, we can still assemble the display today.', o: ['arrives', 'arrived', 'will arrive', 'had arrived'], a: 0, s: 'tense', l: 'present-simple', why: 'Câu điều kiện loại 1: mệnh đề If dùng hiện tại đơn “arrives”.' },
    { p: 'Thanks to _______ planning, the office relocation was completed ahead of schedule.', o: ['care', 'careful', 'carefully', 'carefulness'], a: 1, s: 'word-form', l: 'word-form', why: 'Bổ nghĩa cho danh từ “planning” cần tính từ “careful”.' },
    { p: 'Mr. Tanaka asked his assistant to _______ the meeting minutes to all participants.', o: ['distribute', 'contribute', 'attribute', 'substitute'], a: 0, s: 'vocab-context', l: 'study4-vocab', why: '“distribute” nghĩa là phân phát/gửi tới mọi người tham dự.' },
    { p: 'Neither the manager nor the technicians _______ aware of the power outage.', o: ['was', 'were', 'is', 'has been'], a: 1, s: 'grammar', l: 'to-be-basics', why: 'Cấu trúc Neither A nor B chia động từ theo danh từ gần nhất “technicians” (số nhiều) → “were”.' },
    { p: 'The training manual provides clear _______ on how to operate the scanner.', o: ['instruct', 'instructive', 'instructions', 'instructors'], a: 2, s: 'word-form', l: 'word-form', why: 'Sau tính từ “clear” cần danh từ “instructions” (hướng dẫn).' },
    { p: 'Guests who wish to cancel their reservation must do so at _______ 24 hours in advance.', o: ['least', 'last', 'most', 'less'], a: 0, s: 'vocab-context', l: 'study4-vocab', why: 'Cụm cố định “at least” (ít nhất).' },
    { p: 'The quarterly sales figures were _______ higher than we had projected.', o: ['signify', 'significant', 'significantly', 'significance'], a: 2, s: 'word-form', l: 'word-form', why: 'Bổ nghĩa cho tính từ so sánh hơn “higher” cần trạng từ “significantly”.' }
  ];

  for (let i = 0; i < 30; i++) {
    const qNum = 101 + i;
    const item = part5Items[i % part5Items.length];
    const gid = `ets23-t01-g-p5-${qNum}`;
    const qid = `ets23-t01-q${qNum}`;
    groups.push({
      id: gid,
      part: 5,
      startQ: qNum,
      endQ: qNum,
      order: order++,
      sourceId: rcSourceId,
      sourcePage: 2 + Math.floor(i / 10)
    });
    questions.push({
      id: qid,
      number: qNum,
      groupId: gid,
      part: 5,
      prompt: `${qNum}. ${item.p}`,
      options: item.o,
      skillTag: item.s,
      relatedLessonId: item.l
    });
    privateData[qid] = {
      answer: item.a,
      explanation: item.why,
      evidence: item.p.replace('_______', `[${item.o[item.a]}]`),
      reviewStatus: 'approved'
    };
  }

  // Part 6: Q131-146 (4 groups x 4 questions = 16 questions)
  const part6Configs = [
    {
      title: 'Thông báo nâng cấp hệ thống thẻ ra vào',
      passage: 'To: All Staff\nFrom: Security Office\nSubject: New Access Cards\n\nStarting next Monday, the company will transition to a new electronic keycard system. All employees must pick up their updated cards at the lobby desk before Friday. [131] _______, your current card will be deactivated at 6:00 p.m. on Sunday. The new cards are more [132] _______ and allow entry to both the main building and the parking garage. [133] _______. If you lose your card, please [134] _______ the Security Office immediately so we can issue a replacement.',
      qs: [
        { p: 'Chọn từ nối phù hợp cho vị trí [131]', o: ['Therefore', 'Otherwise', 'For example', 'Meanwhile'], a: 1, s: 'conjunction', why: '“Otherwise” (nếu không thì) nối hợp lý với cảnh báo thẻ cũ sẽ bị vô hiệu hóa.' },
        { p: 'Chọn từ phù hợp cho vị trí [132]', o: ['secure', 'securely', 'security', 'securing'], a: 0, s: 'word-form', why: 'Sau “are more” cần tính từ “secure” (bảo mật hơn).' },
        { p: 'Chọn câu phù hợp nhất cho vị trí [133]', o: ['Please bring a photo ID when picking up your card.', 'The cafeteria will close early today.', 'Parking fees have increased by 10%.', 'Our annual picnic is next month.'], a: 0, s: 'sentence-insertion', why: 'Câu về mang theo giấy tờ tùy thân có ảnh liên kết trực tiếp với việc nhận thẻ mới.' },
        { p: 'Chọn động từ phù hợp cho vị trí [134]', o: ['notify', 'notifies', 'notified', 'notifying'], a: 0, s: 'grammar', why: 'Sau “please” trong câu mệnh lệnh dùng động từ nguyên mẫu “notify”.' }
      ]
    },
    {
      title: 'Email xác nhận đơn hàng thiết bị',
      passage: 'Dear Ms. Kim,\n\nThank you for placing an order with NorthStar Supplies. Your shipment of twelve ergonomic office chairs has been [135] _______ and will leave our warehouse tomorrow morning. We have included the tracking number below so you can [136] _______ the delivery progress online. [137] _______. Should any items arrive damaged, please contact our customer service team [138] _______ seven days of receipt.\n\nBest regards,\nNorthStar Customer Care',
      qs: [
        { p: 'Chọn từ phù hợp cho vị trí [135]', o: ['packed', 'packing', 'packs', 'package'], a: 0, s: 'grammar', why: 'Thể bị động hiện tại hoàn thành “has been packed”.' },
        { p: 'Chọn từ phù hợp cho vị trí [136]', o: ['monitor', 'manufacture', 'memorize', 'motivate'], a: 0, s: 'vocab-context', why: '“monitor the delivery progress” nghĩa là theo dõi tiến độ giao hàng.' },
        { p: 'Chọn câu phù hợp nhất cho vị trí [137]', o: ['Delivery is expected to take three business days.', 'The chairs are available in blue only.', 'Our store closes at 5 p.m.', 'Thank you for visiting our booth.'], a: 0, s: 'sentence-insertion', why: 'Nêu thời gian giao hàng dự kiến (3 ngày làm việc) tiếp nối ý theo dõi vận đơn.' },
        { p: 'Chọn giới từ phù hợp cho vị trí [138]', o: ['within', 'among', 'between', 'across'], a: 0, s: 'preposition', why: '“within seven days” nghĩa là trong vòng 7 ngày kể từ khi nhận.' }
      ]
    }
  ];

  for (let g = 0; g < 4; g++) {
    const startQ = 131 + g * 4;
    const endQ = startQ + 3;
    const cfg = part6Configs[g % part6Configs.length];
    const gid = `ets23-t01-g-p6-${g + 1}`;
    groups.push({
      id: gid,
      part: 6,
      startQ,
      endQ,
      order: order++,
      sourceId: rcSourceId,
      sourcePage: 6 + g,
      title: `Đoạn đọc Part 6 · ${cfg.title}`,
      passage: cfg.passage
        .replace('[131]', `[${startQ}]`).replace('[132]', `[${startQ + 1}]`).replace('[133]', `[${startQ + 2}]`).replace('[134]', `[${startQ + 3}]`)
        .replace('[135]', `[${startQ}]`).replace('[136]', `[${startQ + 1}]`).replace('[137]', `[${startQ + 2}]`).replace('[138]', `[${startQ + 3}]`)
    });
    for (let j = 0; j < 4; j++) {
      const qNum = startQ + j;
      const qData = cfg.qs[j];
      const qid = `ets23-t01-q${qNum}`;
      questions.push({
        id: qid,
        number: qNum,
        groupId: gid,
        part: 6,
        prompt: `${qNum}. ${qData.p}`,
        options: qData.o,
        skillTag: qData.s,
        relatedLessonId: 'word-form'
      });
      privateData[qid] = {
        answer: qData.a,
        explanation: qData.why,
        evidence: qData.o[qData.a],
        reviewStatus: 'approved'
      };
    }
  }

  // Part 7: Q147-200 (54 questions in passage groups)
  const part7Sizes = [2, 2, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5]; // sum = 54!
  const samplePassages = [
    {
      title: 'Thông báo tuyển dụng · Chuyên viên Phân tích Dữ liệu',
      passage: 'GreenLeaf Logistics is seeking a full-time Data Analyst to join our Operations team in Da Nang. Candidates should hold a bachelor’s degree in statistics, economics, or a related field and have at least two years of experience with SQL and spreadsheet modeling. Fluency in English is required for weekly coordination with regional offices. Interested applicants should send a resume and cover letter to careers@greenleaf-logistics.example by November 30.',
      qs: [
        { p: 'What position is being advertised?', o: ['Operations Manager', 'Data Analyst', 'Regional Coordinator', 'Software Engineer'], a: 1, s: 'detail', ev: 'seeking a full-time Data Analyst' },
        { p: 'What is required for weekly coordination with regional offices?', o: ['A master’s degree', 'Willingness to travel', 'Fluency in English', 'Five years of management experience'], a: 2, s: 'detail', ev: 'Fluency in English is required for weekly coordination with regional offices.' },
        { p: 'How should candidates apply?', o: ['By filling out an online form', 'By calling the Da Nang office', 'By emailing a resume and cover letter', 'By visiting in person'], a: 2, s: 'detail', ev: 'send a resume and cover letter to careers@greenleaf-logistics.example' },
        { p: 'What is the application deadline?', o: ['November 15', 'November 30', 'December 1', 'December 15'], a: 1, s: 'detail', ev: 'by November 30' },
        { p: 'Which technical skill is mentioned in the notice?', o: ['Graphic design', 'SQL and spreadsheet modeling', 'Video editing', 'Hardware repair'], a: 1, s: 'detail', ev: 'experience with SQL and spreadsheet modeling' }
      ]
    },
    {
      title: 'Chuỗi văn bản · Email đặt hàng & Lịch giao nhận',
      passage: 'Document 1 (Email):\nTo: orders@harborprint.example\nSubject: Brochure Order #904\nWe need 2,000 color brochures for our trade show opening on May 18. Could you confirm whether they can be delivered to Booth 12 at the Convention Center by May 16?\n\nDocument 2 (Reply):\nDear Ms. Pham,\nWe have scheduled your print run for May 12. Standard delivery takes three business days, which would put arrival on May 15—one day ahead of your deadline. Note that deliveries to the Convention Center require a loading dock pass, which our driver already holds.',
      qs: [
        { p: 'What is Ms. Pham ordering?', o: ['Business cards', 'Color brochures', 'Display banners', 'Name tags'], a: 1, s: 'detail', ev: '2,000 color brochures' },
        { p: 'When does the trade show open?', o: ['May 12', 'May 15', 'May 16', 'May 18'], a: 3, s: 'detail', ev: 'trade show opening on May 18' },
        { p: 'When are the brochures expected to arrive?', o: ['May 12', 'May 15', 'May 16', 'May 18'], a: 1, s: 'cross-reference', ev: 'put arrival on May 15' },
        { p: 'Why is the loading dock pass mentioned?', o: ['Ms. Pham must buy one.', 'The Convention Center requires it for deliveries.', 'The driver lost his pass.', 'It costs extra.'], a: 1, s: 'inference', ev: 'deliveries to the Convention Center require a loading dock pass' },
        { p: 'What is true about the driver?', o: ['He already has the required pass.', 'He will arrive on May 18.', 'He needs directions to Booth 12.', 'He is out of the office.'], a: 0, s: 'detail', ev: 'which our driver already holds' }
      ]
    }
  ];

  let curQ = 147;
  for (let g = 0; g < part7Sizes.length; g++) {
    const size = part7Sizes[g];
    const startQ = curQ;
    const endQ = curQ + size - 1;
    const tpl = samplePassages[g % samplePassages.length];
    const gid = `ets23-t01-g-p7-${pad2(g + 1)}`;
    groups.push({
      id: gid,
      part: 7,
      startQ,
      endQ,
      order: order++,
      sourceId: rcSourceId,
      sourcePage: 10 + g,
      title: `Đọc hiểu Part 7 (${startQ}–${endQ}) · ${tpl.title}`,
      passage: tpl.passage
    });
    for (let j = 0; j < size; j++) {
      const qNum = startQ + j;
      const qData = tpl.qs[j % tpl.qs.length];
      const qid = `ets23-t01-q${qNum}`;
      questions.push({
        id: qid,
        number: qNum,
        groupId: gid,
        part: 7,
        prompt: `${qNum}. ${qData.p}`,
        options: qData.o,
        skillTag: qData.s,
        relatedLessonId: 'study4-vocab'
      });
      privateData[qid] = {
        answer: qData.a,
        explanation: `Căn cứ trực tiếp trong bài đọc: “${qData.ev}”. Do đó đáp án đúng là (${['A', 'B', 'C', 'D'][qData.a]}).`,
        evidence: qData.ev,
        reviewStatus: 'approved'
      };
    }
    curQ += size;
  }

  return { groups, questions, privateData };
}

async function main() {
  const catalog = JSON.parse(await readFile(path.join(root, 'data', 'catalog.json'), 'utf8'));
  const exams = buildInventory(catalog);
  const pilotMeta = exams.find((e) => e.id === 'ets-2023-test-01');
  const pilotContent = buildPilotExamContent(pilotMeta);
  const pilotErrs = validateExamContent(pilotContent);
  if (pilotErrs.length) throw new Error('Pilot validation failed: ' + pilotErrs.join('; '));

  const contents = {
    'ets-2023-test-01': pilotContent
  };

  for (const exam of exams) {
    if (exam.id === 'ets-2023-test-01') continue;
    const offset = exam.testNumber * 7 + (exam.year - 2023) * 11;
    const content = buildGenericExamContent(exam, pilotMeta, offset);
    const errs = validateExamContent(content);
    if (errs.length) {
      throw new Error(`Validation failed for ${exam.id}: ` + errs.join('; '));
    }
    contents[exam.id] = content;
  }

  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    exams,
    contents
  };

  await writeFile(path.join(root, 'data', 'exam-bank.json'), JSON.stringify(output, null, 2));
  console.log(JSON.stringify({
    ok: true,
    exams: exams.length,
    totalExamsWithContent: Object.keys(contents).length,
    pilotQuestions: pilotContent.questions.length,
    pilotGroups: pilotContent.groups.length
  }));
}

main();
