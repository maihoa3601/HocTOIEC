# Lộ trình Phát triển & Kế hoạch Tận dụng Reference Repositories (TOEIC Studio)

> **Tài liệu hướng dẫn thực thi (Operational Guide & Roadmap)**  
> Ngày cập nhật: 16/11/2026  
> Trạng thái hiện tại: Đã hoàn tất MVP (Đợt 1: Listening Studio; Đợt 5: Phòng thi & Chữa đề có dẫn chứng).  
> 19/19 test suite PASS.

---

## 1. Master Prompt (Dùng để bắt đầu phiên làm việc tiếp theo)

*Sao chép toàn bộ khối bên dưới và dán vào cửa sổ chat (hoặc chạy kèm lệnh `/goal`) để bắt đầu ca phát triển mới:*

```markdown
Bạn là Kỹ sư Trưởng phần mềm chịu trách nhiệm nâng cấp dự án TOEIC Studio (nền tảng luyện thi TOEIC mã nguồn mở chất lượng cao).

### 1. Bối cảnh dự án & Quy chuẩn kỹ thuật:
- **Kiến trúc cốt lõi**: Vanilla ES Modules (trình duyệt) + Cloudflare Worker/D1 SQLite (backend). Giữ mã nguồn thuần, nhẹ, tải trang nhanh; KHÔNG tự ý cài đặt React/Vue hay chuyển sang Firebase.
- **Quy chuẩn UX/UI**: Tuân thủ nghiêm ngặt docs/DESIGN-SYSTEM.md và AGENTS.md:
  + Bảng màu lavender (`--surface`, `--surface-alt`, `--accent-lavender`).
  + Dùng chung các lớp từ `src/client/ui-controls.css` (`.ui-field`, `.ui-input`, `.ui-filter-panel`).
  + Luôn dùng thẻ `<select>` thật cho trợ năng, dark mode tương phản chuẩn WCAG AA, responsive mobile (390px).
  + Phím tắt bàn phím không được xung đột khi người dùng đang nhập dữ liệu trong INPUT/TEXTAREA.
- **Tiến độ đã hoàn thành (MVP)**: 
  + Đợt 1 (Listening Studio: chính tả, SRT/VTT/WhisperX, LCS word diff).
  + Đợt 5 (Phòng thi: cắt 406 file audio/ảnh, highlight bằng chứng passage, giải thích từng phương án choiceNotes).
  + 19/19 test suite hiện đang PASS (`npm test`).

### 2. Kho tài nguyên tham khảo sẵn có:
Toàn bộ mã nguồn tham khảo đã được clone tại thư mục `.sites-runtime/reference-repos/` (không bundle trực tiếp repo tham khảo vào bản build sản phẩm, chỉ chắt lọc và viết lại theo kiến trúc dự án):
1. `kdeppaei/toeic-question-ocean`: Dẫn chứng bài đọc, kiểm tra chất lượng đề (question audit), snapshot phiên làm bài.
2. `SYZBZ/toeic-90days-challenge`: Kế hoạch 90 ngày theo ngày thi thật, phân bổ lát học từ vựng (vocab slices), dashboard tiến độ.
3. `2troll/TOEIC-EXAM`: Cấu trúc chữa bài 3 bước (đáp án, phân tích bẫy distractors, chiến thuật làm nhanh timeHack), thi theo nhóm câu.
4. `katspaugh/wavesurfer.js`: Biểu đồ sóng âm (waveform), đánh dấu vùng nghe A-B, tua âm thanh trực quan.
5. `dexie/Dexie.js`: IndexedDB wrapper siêu nhẹ quản lý audio blob, kho bài tập và ghi chú cá nhân offline.
6. `open-spaced-repetition/ts-fsrs`: Thuật toán lặp lại ngắt quãng thế hệ mới FSRS-7 (Again, Hard, Good, Easy) thay thế mốc cố định.
7. `mozilla/pdf.js` & `naptha/tesseract.js`: Xem tài liệu PDF theo trang và OCR bóc tách câu hỏi trực tiếp trên trình duyệt.
8. `codex-team/editor.js`: Soạn bài và ghi chú ngữ pháp theo khối (block-based JSON).
9. `RealKai42/qwerty-learner`: Cơ chế phản hồi gõ từ vựng tức thì (typing practice).

### 3. Nhiệm vụ thực hiện:
Triển khai đợt nâng cấp tiếp theo theo tài liệu docs/DEVELOPMENT-ROADMAP.md (ưu tiên Đợt 2: Thư viện cá nhân với Dexie.js & Ghi chú, hoặc Đợt kế tiếp do người dùng chỉ định):
1. Kiểm tra trước khi sửa: Rà soát các file liên quan, test suite hiện có, không phá vỡ các chức năng đang hoạt động.
2. Triển khai chuẩn mực:
   - Viết mã mô-đun hóa cao, tách biệt logic tính toán (core) khỏi giao diện (DOM).
   - Xử lý triệt để vòng đời giải phóng tài nguyên (thu hồi Blob URL, remove event listeners khi đổi trang).
   - Bảo mật: escape HTML chống XSS, không làm lộ đáp án trước khi nộp bài.
3. Kiểm thử & Báo cáo:
   - Thêm unit test cho các module mới, đảm bảo `npm run build` và `npm test` đều PASS 100%.
   - Kiểm tra E2E thực tế trên trình duyệt cả giao diện Desktop và Mobile.
   - Báo cáo kết quả cụ thể: file đã sửa/tạo mới, tính năng hoạt động, kèm link file theo định dạng [basename](file:///absolute/path).
```

---

## 2. Bản đồ Tham khảo Repository (`.sites-runtime/reference-repos/`)

| Tên Repository | Công nghệ / Giấy phép | Tinh hoa cần áp dụng vào TOEIC Studio | Vị trí tích hợp trong mã nguồn |
| :--- | :--- | :--- | :--- |
| **kdeppaei/toeic-question-ocean** | Vanilla JS, MIT | • Snapshot phiên học độc lập.<br>• Bộ quy tắc kiểm tra chất lượng ngân hàng đề (`modules/question-quality-audit.js`). | `src/client/exam-core.mjs`<br>`scripts/build-exam-bank.mjs` |
| **SYZBZ/toeic-90days-challenge** | React, MIT | • Thuật toán chia lát từ vựng theo ngày thi (`src/lib/vocabPlan.js`).<br>• Giao diện Dashboard hành trình 90 ngày. | `src/client/planner-core.mjs`<br>`src/client/today-hub.mjs` |
| **2troll/TOEIC-EXAM** | React | • Khung chữa bài 3 bước: `correct` (đáp án), `distractors` (phân tích bẫy), `timeHack` (mẹo làm bài).<br>• Phân nhóm câu linh hoạt. | `src/client/exam-room.mjs`<br>`src/server/exam-service.mjs` |
| **dexie/Dexie.js** (v4.2.1) | TS/JS, Apache-2.0 | • Quản lý IndexedDB lưu trữ Audio Blob, transcript cá nhân, kho từ vựng và bài tập đang làm dở. | `src/client/user-store.mjs`<br>`src/client/listening-studio.mjs` |
| **katspaugh/wavesurfer.js** (v8.1.0) | TS, BSD-3-Clause | • Vẽ sóng âm (waveform) trực quan.<br>• Kéo thả vùng nghe A-B Loop lặp đi lặp lại. | `src/client/listening-studio.mjs`<br>`src/client/exam-audio-player.mjs` |
| **open-spaced-repetition/ts-fsrs** (v6.0.0) | TS/JS, MIT | • Bộ lập lịch ôn tập thông minh FSRS-7 với 4 trạng thái (Again, Hard, Good, Easy) thay cho mốc 1-3-7-14 ngày. | `src/client/learning-core.mjs`<br>`src/client/review-hub.mjs` |
| **mozilla/pdf.js** | JS, Apache-2.0 | • Nạp và hiển thị từng trang tài liệu PDF gốc song song với biểu mẫu biên soạn câu hỏi. | `src/client/import-ui.mjs`<br>`src/client/authoring.mjs` |
| **naptha/tesseract.js** (v7.0.0) | JS, Apache-2.0 | • OCR trích xuất văn bản tiếng Anh / tiếng Việt từ ảnh scan trực tiếp trên trình duyệt bằng Web Worker. | `src/client/ocr-worker.mjs`<br>`src/server/document-imports.mjs` |
| **codex-team/editor.js** (v2.31.0) | JS, Apache-2.0 | • Trình soạn thảo văn bản cấu trúc khối (block-based JSON) cho bài giảng lý thuyết ngữ pháp và ghi chú. | `src/client/note-editor.mjs`<br>`src/client/study-room.mjs` |
| **RealKai42/qwerty-learner** | React, GPL-3.0 | • Luyện gõ phím từ vựng TOEIC với phản hồi tức thì xanh/đỏ và đo tốc độ gõ WPM. | `src/client/vocab-typing.mjs` |

---

## 3. Lộ trình Triển khai Chi tiết Từng Đợt

### 🚀 Đợt 2: Thư viện Cá nhân, Lưu trữ Offline & Ghi chú (Dexie.js + Editor.js)
* **Mục tiêu**: Người học có thể lưu file âm thanh/bài tập cá nhân vào trình duyệt mà không sợ mất khi reload; ghi chú từ vựng/ngữ pháp theo mốc audio.
* **Các file tác động**:
  - `src/client/user-store.mjs` (Tạo mới): Wrapper Dexie.js quản lý các bảng:
    + `audioFiles` (`id`, `name`, `blob`, `duration`, `updatedAt`)
    + `dictationDrafts` (`cueId`, `userInput`, `accuracy`, `completedAt`)
    + `userNotes` (`cueId`, `word`, `contextText`, `audioTimestamp`, `tags`)
  - `src/client/listening-studio.mjs`: Khi chọn file audio, hỏi người học có muốn "Lưu vào Thư viện cá nhân" để lần sau mở lại ngay.
  - `src/client/review-hub.mjs`: Thêm tab "Sổ tay từ vựng & Ghi chú cá nhân".
* **Tiêu chí nghiệm thu**:
  - Tải lại trang (F5) không mất file âm thanh đã lưu.
  - Hiển thị rõ cảnh báo dung lượng lưu trữ (Storage Quota) và nút xoá từng file.
  - Export/Import thư viện ra file JSON an toàn.

---

### 🚀 Đợt 3: Trải nghiệm Luyện nghe Sóng âm Chuyên sâu (WaveSurfer.js + WhisperX)
* **Mục tiêu**: Nâng cấp thanh audio thường thành biểu đồ sóng âm trực quan, chọn vùng nghe A-B bằng chuột/chạm.
* **Các file tác động**:
  - `src/client/listening-studio.mjs`: Tích hợp WaveSurfer.js rendering trên container `#waveform-container`.
  - `src/client/exam-audio-player.mjs`: Bổ sung chế độ mini-waveform khi chữa đề thi Part 3 & Part 4.
  - `src/client/listening-studio.css`: Giao diện waveform theo tone màu lavender/tím của Design System.
* **Tiêu chí nghiệm thu**:
  - Di chuột/chạm kéo tạo vùng A-B mượt mà, bấm phím `L` để bật/tắt lặp đoạn A-B.
  - Hỗ trợ Pre-computed Peaks để không bị đơ trình duyệt trên thiết bị di động với file audio dài (> 10 phút).
  - Thu hồi toàn bộ instance và event listeners khi người dùng chuyển trang (`cleanup()`).

---

### 🚀 Đợt 4: Studio Biên soạn & Bóc tách Đề thi từ PDF (PDF.js + Tesseract.js)
* **Mục tiêu**: Giáo viên/người biên soạn có thể mở file PDF gốc, đối chiếu từng câu hỏi và chạy OCR nhận diện văn bản tự động.
* **Các file tác động**:
  - `src/client/import-ui.mjs`: Màn hình Split-View (Cột trái: PDF.js xem trang gốc; Cột phải: Form biên soạn câu hỏi).
  - `src/client/ocr-worker.mjs` (Tạo mới): Web Worker chạy Tesseract.js nhận diện vùng ảnh khoanh chọn.
  - `src/client/exam-core.mjs`: Bổ sung hàm `auditExamQuality` (tham khảo `Question Ocean`) phát hiện lỗi đề trước khi xuất bản:
    + Cảnh báo lựa chọn A, B, C, D bị trùng lặp nội dung.
    + Cảnh báo đoạn văn Part 6/7 bị thiếu câu hỏi đi kèm.
    + Cảnh báo `evidenceQuote` không tồn tại thực tế trong đoạn văn passage.
* **Tiêu chí nghiệm thu**:
  - Đọc được PDF dạng text và PDF scan.
  - OCR chạy ngầm trong Worker, có thanh tiến độ `%` và nút Hủy (Abort).
  - Đề chưa qua duyệt giáo viên luôn ở trạng thái `draft: true` và không xuất hiện trong danh sách thi chính thức.

---

### 🚀 Đợt 6: Hệ thống Lặp lại Ngắt quãng FSRS & Lộ trình 90 Ngày (ts-fsrs + 90days-challenge)
* **Mục tiêu**: Thay thế cơ chế ôn tập mốc cố định bằng giải thuật FSRS-7 tối ưu cho trí nhớ dài hạn; lập kế hoạch học tập theo ngày thi thật.
* **Các file tác động**:
  - `src/client/learning-core.mjs`: Tích hợp bộ lập lịch FSRS (Again: 1, Hard: 2, Good: 3, Easy: 4) tính toán `stability`, `difficulty`, `due`.
  - `src/client/planner-core.mjs`: Thuật toán phân bổ từ vựng theo lát (vocab slices) dựa trên:
    + Số ngày còn lại đến ngày thi (`targetExamDate`).
    + Mục tiêu điểm số (`targetScore`: 500, 650, 800+).
    + Ngày nghỉ trong tuần do người học tự chọn.
  - `src/client/today-hub.mjs`: Dashboard hiển thị mục tiêu hôm nay, số thẻ FSRS đến hạn ôn và chuỗi ngày học liên tục (streak).
* **Tiêu chí nghiệm thu**:
  - Di chuyển dữ liệu ôn tập cũ sang schema FSRS mượt mà, không làm mất thẻ đang ôn.
  - Bấm 4 nút đánh giá phản hồi lịch ôn kế tiếp chuẩn xác.
  - Thay đổi mục tiêu ngày thi không làm sai lệch lịch sử đã học các ngày trước.

---

### 🚀 Đợt 7: Luyện Phản xạ Từ vựng & PWA Offline (Qwerty-Learner + Service Worker)
* **Mục tiêu**: Người học luyện gõ nhanh từ vựng để ghi nhớ mặt chữ; hỗ trợ cài đặt ứng dụng web (PWA) để học offline.
* **Các file tác động**:
  - `src/client/vocab-typing.mjs` (Tạo mới): Giao diện gõ từ vựng (nghe phát âm -> gõ ký tự -> hiển thị xanh/đỏ tức thì -> đo tốc độ WPM).
  - `public/sw.js`: Service Worker cấu hình Cache-First cho static assets (JS, CSS, Media cắt sẵn) và Network-First cho dữ liệu cá nhân.
  - `public/manifest.json`: Khai báo PWA (icon, theme_color lavender, display standalone).
* **Tiêu chí nghiệm thu**:
  - Ngắt mạng Internet vẫn mở được ứng dụng và làm bài tập đã lưu trong cache.
  - Giao diện gõ phím mượt mà, hỗ trợ phát âm chuẩn IPA Web Speech API.

---

## 4. Bảng Kiểm Tra Chất Lượng (Quality Checklist Trước Khi Bàn Giao)

Mỗi đợt hoàn thành bắt buộc phải vượt qua các chốt kiểm tra sau:

1. [ ] **Build Check**: `node scripts/build.mjs` chạy thành công không có cảnh báo.
2. [ ] **Test Check**: `npm test` vượt qua toàn bộ test suite (hiện tại là 19/19 files).
3. [ ] **Memory & Security Check**:
   - Mọi Blob URL đều có `URL.revokeObjectURL`.
   - Mọi Event Listener trên `window` đều có `removeEventListener` trong hàm `cleanup()`.
   - Đáp án đề thi và giải thích không bị rò rỉ trước khi nộp bài.
4. [ ] **UI/UX & Accessibility Check**:
   - Tương thích tốt trên màn hình Desktop (1280x800) và Mobile (390px).
   - Kiểm tra Dark Mode hiển thị rõ ràng, độ tương phản cao.
   - Thao tác được hoàn toàn bằng bàn phím (Tab, Enter, Space, Arrow).
5. [ ] **Browser Verification**: Kiểm tra trực tiếp trên trình duyệt Chrome thật, chụp ảnh màn hình lưu vào báo cáo nghiệm thu.
