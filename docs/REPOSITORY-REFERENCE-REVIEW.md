# Tham khảo repo cho TOEIC Studio

Ngày đối chiếu: 15/11/2026. Đã đọc mã nguồn trong các checkout ở
`.sites-runtime/reference-repos/`. Đây là kết quả nghiên cứu và đề xuất triển khai,
chưa phải các tính năng đã tích hợp hoặc kết quả benchmark.

## 1. Quyết định đề xuất

| Ưu tiên | Thay đổi đề xuất | Nguồn tham khảo | Điểm tích hợp |
| --- | --- | --- | --- |
| P0 | Chữa bài có dẫn chứng và phân tích từng lựa chọn | Question Ocean, TOEIC-EXAM | `src/client/exam-room.mjs`, `src/server/exam-service.mjs`, dữ liệu private của đề |
| P0 | Kiểm tra chất lượng câu hỏi trước xuất bản | Question Ocean | `validateExamContent` trong `src/client/exam-core.mjs`, công cụ build ngân hàng và kiểm tra publication |
| P1 | PDF theo trang, trích text và OCR ngay trong màn biên soạn | PDF.js, Tesseract.js | `src/client/import-ui.mjs`, `src/client/import-authoring.mjs`, `src/server/document-imports.mjs` |
| P1 | Chọn đoạn nghe A–B, phát lặp và gắn transcript | WaveSurfer | `src/client/exam-audio-player.mjs`, `src/client/exam-media.mjs`, một module luyện nghe riêng |
| P2 | Lịch ôn thẻ dựa trên FSRS, có lưu nhật ký | ts-fsrs, Anki | `src/client/studio-v2.mjs`, `src/client/review-hub.mjs`, `src/client/learning-core.mjs`, sao lưu tài khoản |
| P2 | Luyện tốc độ và kế hoạch từ vựng trước ngày thi | TOEIC-EXAM, 90 Days Challenge | `src/client/planner-core.mjs`, `src/client/study-planner.mjs`, phòng luyện đề |

Giữ kiến trúc browser ES modules + Worker/D1. Chọn từng module thay vì chuyển toàn
bộ app sang React/Firebase. Giao diện triển khai sau phải theo `DESIGN-SYSTEM.md`,
tái sử dụng `ui-controls.css` và kiểm tra desktop, mobile, dark mode, bàn phím.

## 2. Ba app TOEIC: điều đã kiểm tra trong mã

### Question Ocean

- `app.js:365`: `renderPassageText` chỉ highlight khi được phép xem evidence và
  tìm thấy đoạn dẫn chứng trong passage; escape từng phần trước khi ghép HTML.
- `app.js:373`: `renderLiteracyFeedback` dùng `evidenceLocation`, `choiceNotes`
  để giải thích lựa chọn người học vừa chọn, rồi mở rộng toàn bộ phương án.
- `modules/question-quality-audit.js`: kiểm tra lựa chọn trùng, đáp án mâu thuẫn,
  nhóm Part 6, sai dạng Part 7, evidence thực sự nằm trong passage và ghi chú
  cho đủ các lựa chọn. Một số rule chỉ là heuristic, không thay người duyệt.
- `app.js:1985`: snapshot phiên ghi vị trí, câu trả lời, cờ xem lại và deadline.
  Tuy nhiên `encodeSession` lưu cả answer; khi khôi phục lại tra câu theo ID từ
  bank hiện hành. Chỉ học UX tiếp tục phiên, không sao chép mô hình dữ liệu này.
- Đã chạy `node scripts/validate-bank.js` trong checkout: thành công với
  **1.443 câu**. Con số ở README cũ hơn mã hiện tại; validator không chứng minh
  đáp án đúng về học thuật hoặc toàn bộ luồng UI hoạt động.
- Giấy phép mã nguồn tại checkout: MIT; asset và học liệu cần xem nguồn riêng.

### TOEIC 90 Days Challenge

- `src/lib/vocabPlan.js:15`: chia kho từ thành các lát theo ngày bắt đầu/ngày thi,
  cung cấp tổng số từ, số ngày và bình quân. Dùng ý tưởng phân bổ, bổ sung ngày
  nghỉ, lượng thẻ đến hạn và snapshot ổn định của planner hiện có.
- `src/lib/audioManager.js`: quản lý một audio, dừng nguồn cũ, thu hồi blob URL,
  cleanup khi rời trang. Studio đã có player xử lý lệnh seek bất đồng bộ và blob;
  nên thống nhất lifecycle thay vì tạo player thứ hai cạnh tranh.
- `public/sw.js`: network-first và cache các GET cùng origin khá rộng. Không
  chép nguyên sang Studio: cần allowlist static assets, tách cache theo phiên bản,
  loại API tài khoản, dữ liệu admin và giải pháp chấm bài khỏi cache dùng chung.
- Repo dùng React/Firebase/Gemini; không cần đưa cả stack này vào Studio.
- Giấy phép mã nguồn: MIT.

### TOEIC-EXAM

- `src/components/FeedbackPanel.jsx`: ba trường `correct`, `distractors`,
  `timeHack` tạo một cấu trúc chữa bài rõ ràng. Nên áp dụng dưới dạng dữ liệu
  đã duyệt, cho phép thiếu chiến thuật thay vì tự tạo lời giải.
- `src/components/QuizSession.jsx`: `buildSets` giữ hội thoại, bài nói và passage
  thành nhóm; các câu đơn được gom khoảng năm câu. Có thể áp dụng cho luyện nhanh.
- Đồng hồ trong `QuizSession.jsx` giảm state theo `setInterval`; không thay
  deadline server hiện có bằng cơ chế này vì tab nền có thể làm chậm timer.
- `src/data/progress.js:50`: ước lượng điểm bằng tỷ lệ đúng nhân 495 từng section.
  Không áp dụng công thức này cho điểm TOEIC chính thức của Studio.
- Chưa thấy tệp LICENSE ở gốc checkout. Đợt này chỉ tham khảo cấu trúc tính năng,
  không chép mã hoặc ngân hàng câu hỏi.

## 3. Bốn thư viện: cách tích hợp và giới hạn

### PDF.js — Apache-2.0

Đã đọc `examples/learning/helloworld.html` và `src/display/api.js`. API có
`getDocument`, `getPage`, `render`, `getTextContent`; worker phải được cấu hình.

Đề xuất dùng bản phát hành `pdfjs-dist` cố định phiên bản, tự host module và worker
cùng phiên bản. Nạp lười khi mở tài liệu; render theo trang và hủy công việc khi
đổi tài liệu. Text items cần dựng lại thứ tự đọc; không mặc định text trích được
đã giữ đúng cột/bảng. PDF scan chuyển thành ảnh cho OCR.

Điều kiện: phải có byte PDF từ tệp người dùng chọn hoặc URL được phép đọc qua CORS.
Iframe Drive hiện tại không tự cung cấp byte hoặc quyền truy cập. Giữ viewer Drive
làm fallback. Công cụ/build hiện tại chỉ copy module, chưa tự giải quyết bare npm
imports; cần bước đóng gói vendor có chủ đích trong `scripts/build.mjs`.

### Tesseract.js 7.0.0 — Apache-2.0

Đã đọc README, `docs/local-installation.md`, `docs/workers_vs_schedulers.md`.
Không nhận PDF trực tiếp. Dùng ảnh từng trang từ PDF.js, tái sử dụng worker trong
một job và `terminate` khi xong/hủy. Các ví dụ tài liệu còn tham chiếu v5; không
trộn asset core/worker v5 với API v7.

Đề xuất thử nhận dạng Anh/Việt trên bộ trang thật, giới hạn số worker theo bộ nhớ,
có tiến độ/hủy và tự host model ngôn ngữ cùng core/worker đã kiểm chứng. Giữ
`source.sha256`, số trang, `method`, `pipelineVersion`, `reviewed: false` của bundle
hiện tại. Kết quả OCR vẫn đi qua duyệt nguồn; không tự xuất bản hoặc coi OCR là
đáp án. Bản Node không mặc nhiên chạy được trong Cloudflare Worker.

### WaveSurfer 8.1.0 — BSD-3-Clause

Đã đọc `src/wavesurfer.ts`, `examples/regions.js` và phần CORS/bộ nhớ trong README.
Có Regions để chọn/resize đoạn, phát lặp; tùy chọn `media` nhận HTMLMediaElement
sẵn có. Có thể gắn waveform lên player hiện tại thay vì thay toàn bộ audio.

Đề xuất dùng trước trong chế độ học: A–B, tốc độ, transcript theo đoạn. Thi mô
phỏng tiếp tục áp dụng luật playback riêng. Với audio dài, dùng peaks dựng trước
và duration thay vì giải mã toàn bộ trên điện thoại. Giữ audio controls native và
thao tác bàn phím, cleanup plugin/player khi đổi route. Kiểm chứng phối hợp blob
URL/seek hiện tại, CORS, autoplay bị chặn và host trả HTTP 200 thay vì range.

### ts-fsrs 6.0.0 — MIT

Đã đọc `packages/fsrs/README.md`, package metadata và
`packages/fsrs/src/scheduler/default-scheduler.ts`. API mới dùng
`await DefaultScheduler()`, `newCard`, `preview`, `review`, mặc định FSRS-7.
Không áp dụng nguyên ví dụ API của bản v4/v5. Node >=24 phù hợp yêu cầu local của
Studio, nhưng browser bundle và Worker vẫn cần kiểm chứng riêng.

Scheduler và optimizer là hai package khác nhau. Scheduler phụ thuộc `srs-kit`;
`@open-spaced-repetition/binding` là phần tối ưu tham số dùng Rust/WASI, chưa cần
đưa vào bản đầu. Tránh kết luận scheduler bắt buộc phải có native binding.

Studio đã có bốn rating trong `rateVocabulary` nhưng lịch vẫn theo các mốc cố định.
`sanitizeLearning` chỉ giữ các trường lịch cũ; nếu chỉ thêm FSRS vào UI, trạng thái
nhớ mới có thể bị bỏ khi reload/restore. Cần schema có phiên bản, lưu card và
revlog, chuyển đổi khi ôn lần đầu, giữ due cũ tới lúc đó và không bịa lịch sử.
Đối chiếu cả bản sao thuật toán ở `review-hub.mjs` để tránh hai nơi tính khác nhau.

## 4. Sáu repo nhiều sao đã tải trước đó

| Repo | Hướng sử dụng sau khi đối chiếu | Giới hạn của lần nghiên cứu |
| --- | --- | --- |
| Docling | Công cụ xử lý ngoài Worker, ưu tiên PDF scan/bảng và JSON có nguồn trang; ánh xạ sang bundle nhập hiện tại | Đọc API `docling/document_converter.py` và tài liệu; chưa chạy OCR/model trên bộ PDF thực |
| MarkItDown | Chuyển tài liệu nhiều định dạng thành Markdown nháp | Đọc converter PDF; không mặc định Markdown giữ đủ cấu trúc và trang nguồn để xuất bản |
| Whisper | Tạo transcript nháp có timestamp rồi đối chiếu audio | Đọc `whisper/transcribe.py`, chưa tải model hoặc đo chất lượng |
| whisper.cpp | Lựa chọn tiền xử lý transcript cục bộ trên Windows | Đọc README; chưa build binary, so tốc độ hoặc so độ chính xác |
| Anki | Tham khảo lifecycle thẻ và lịch ôn; dùng ts-fsrs cho thử nghiệm JS trước | Mã có AGPL-3.0-or-later và ngoại lệ; không chép mã vào app trong lần này |
| Qwerty Learner | Phản hồi khi gõ từ, luyện lại từ sai và thống kê lượt học | Đọc README/package metadata và cấu trúc record; React và GPL-3.0, chưa chuyển component |

## 5. Thứ tự thực hiện và điều kiện nghiệm thu

1. **Chất lượng và chữa bài:** bổ sung metadata dẫn chứng/vị trí/phân tích lựa chọn
   có duyệt; API chỉ trả khi được xem lời giải. Kiểm tra thiếu evidence, evidence
   không tồn tại trong passage, thứ tự lựa chọn sau shuffle và lịch sử bất biến.
2. **Nhập PDF:** thử PDF text, scan Anh, scan Việt và bảng nhiều cột. Kiểm tra
   quyền đọc, mapping trang, tiến độ/hủy, giới hạn bộ nhớ, lỗi worker/model và
   fallback. Nội dung chưa duyệt vẫn phải ở trạng thái nháp riêng tư.
3. **Listening:** thử clip ngắn và audio dài, A–B, chuyển route, đổi nguồn liên tục,
   seek khi host không có range, mobile và bàn phím. Không thay luật thi mô phỏng
   bằng chế độ luyện nghe tự do.
4. **FSRS:** thử dữ liệu cũ, save/reload, export/import, backup/restore, bốn rating,
   phiên bản model, múi giờ và lặp thao tác. Chỉ dùng một adapter lịch ôn chung.
5. **Planner/PWA:** cải thiện sau các bước trên. Giữ snapshot ngày đã ghi nhận;
   thiết kế cache theo quyền riêng tư và hành vi thật, không bê service worker mẫu.

Không cần chạy lại toàn bộ test ứng dụng cho tài liệu nghiên cứu này. Chưa chạy
các app trong browser, chưa đo hiệu năng thư viện, chưa cài dependency/model và
chưa thay runtime của Studio. `MASTER-PLAN-AUDIT.md` có mục mock test còn ghi
`not_started` dù source đã có luồng thi; cần audit riêng trước khi thay trạng thái.


## 6. Snapshot nguồn đã đọc

Các liên kết cố định theo commit; không dựa vào số sao để kết luận chất lượng.

| Repo | Commit |
| --- | --- |
| [kdeppaei/toeic-question-ocean](https://github.com/kdeppaei/toeic-question-ocean/tree/a940bb8b479ef4d06af468015d757041c3d2e457) | `a940bb8b479ef4d06af468015d757041c3d2e457` |
| [SYZBZ/toeic-90days-challenge](https://github.com/SYZBZ/toeic-90days-challenge/tree/36897e584d668c49126b002479db0502214fe5f4) | `36897e584d668c49126b002479db0502214fe5f4` |
| [2troll/TOEIC-EXAM](https://github.com/2troll/TOEIC-EXAM/tree/fc8bc9a412060160ae6d0dbda78a87f0795ff951) | `fc8bc9a412060160ae6d0dbda78a87f0795ff951` |
| [mozilla/pdf.js](https://github.com/mozilla/pdf.js/tree/d82ed35f1fb04f546c01fb00bed8458ef1077073) | `d82ed35f1fb04f546c01fb00bed8458ef1077073` |
| [naptha/tesseract.js](https://github.com/naptha/tesseract.js/tree/a1ca80d9e31c34512d0ded75ff8821ddcf3f2f91) | `a1ca80d9e31c34512d0ded75ff8821ddcf3f2f91` |
| [open-spaced-repetition/ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs/tree/e74ffc7c944e8772fc3705d44723453ccb6d7fd0) | `e74ffc7c944e8772fc3705d44723453ccb6d7fd0` |
| [katspaugh/wavesurfer.js](https://github.com/katspaugh/wavesurfer.js/tree/eef9057e391698370e1a58788646432a562d63a5) | `eef9057e391698370e1a58788646432a562d63a5` |
| [docling-project/docling](https://github.com/docling-project/docling/tree/440492ac0d0e14952b32dda28fede7495611c899) | `440492ac0d0e14952b32dda28fede7495611c899` |
| [microsoft/markitdown](https://github.com/microsoft/markitdown/tree/ed178952a6672abdfd35b5f9e76a80b6cefc086e) | `ed178952a6672abdfd35b5f9e76a80b6cefc086e` |
| [openai/whisper](https://github.com/openai/whisper/tree/86098128c0b4f24f0e2aa2994de830614b474227) | `86098128c0b4f24f0e2aa2994de830614b474227` |
| [ggml-org/whisper.cpp](https://github.com/ggml-org/whisper.cpp/tree/5922450fbce1ed9d1648babd0d5ac4520055b436) | `5922450fbce1ed9d1648babd0d5ac4520055b436` |
| [ankitects/anki](https://github.com/ankitects/anki/tree/827f4aa42681f1d60ab0fe4ad76eb75d767a385e) | `827f4aa42681f1d60ab0fe4ad76eb75d767a385e` |
| [RealKai42/qwerty-learner](https://github.com/RealKai42/qwerty-learner/tree/1182426f2bd0a28c95302c33f9e19136b1262a70) | `1182426f2bd0a28c95302c33f9e19136b1262a70` |
