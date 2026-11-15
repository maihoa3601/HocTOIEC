# Kế hoạch nâng cấp TOEIC Studio theo đợt

Ngày lập: 15/11/2026. Theo yêu cầu: lên kế hoạch chi tiết, triển khai từng đợt.
Không đồng thời thay kiến trúc, ngân hàng học liệu và cơ chế lưu tiến độ.

## Nguyên tắc triển khai

- Tiếp tục JavaScript ES modules + Cloudflare Worker/D1 và design system hiện có.
- Mỗi đợt phải có luồng dùng được, kiểm thử phù hợp và ghi rõ giới hạn trước khi
  chuyển sang đợt tiếp theo. Đã chạy ở localhost không đồng nghĩa đã deploy.
- Repo tham khảo nằm ở `.sites-runtime/reference-repos/`, không đi vào bản build.
- Dữ liệu OCR/transcript/AI luôn là bản nháp; đáp án phải qua duyệt nguồn.
- Không tự chuyển dữ liệu cũ sang schema mới, tải model lớn hoặc gửi audio ra
  ngoài khi người học chưa chủ động chọn chức năng tương ứng.
- Mỗi lần cập nhật trạng thái phải nêu bằng chứng; không đánh dấu hoàn thành chỉ
  vì đã tải repo hoặc dependency.

## Đợt 0 — Chuẩn bị nguồn tham khảo

**Trạng thái:** đã tải 19 repo; việc đánh giá chi tiết từng repo được ghi riêng.

- Đã đối chiếu 3 app TOEIC, 4 thư viện nền và 6 repo hỗ trợ trong
  `REPOSITORY-REFERENCE-REVIEW.md`.
- Đã tải thêm Editor.js, WhisperX, Transformers.js, Subtitle Edit, Dexie.js và
  Read Frog. Bản phát hành Editor.js 2.31.0, Dexie 4.2.1, Transformers.js 3.8.1
  mới nằm trong cache nghiên cứu, chưa đưa vào runtime.
- Mã GPL của Read Frog/Anki/Qwerty chỉ dùng để tìm hiểu trải nghiệm trong các
  đợt này; việc triển khai ý tưởng được viết riêng.

## Đợt 1 — Listening Studio cơ bản

**Phạm vi:** trang `#listening`, audio người dùng chọn trên máy, transcript
SRT/WebVTT hoặc JSON WhisperX; nghe theo câu, trước/sau, phát lại, lặp, tốc độ,
ẩn/hiện transcript, gõ chính tả và đối chiếu từ.

**Nguồn:** luồng luyện nghe của các app; định dạng xuất từ WhisperX/Subtitle Edit.
Chưa cần thêm thư viện runtime cho đợt này.

**Dữ liệu:** chỉ trong phiên đang mở; có xuất transcript JSON để giữ bản đã nhập.
Không tính vào streak/điểm thi và không tự đưa vào ngân hàng đã duyệt.

**Công việc:**

1. Parser có giới hạn kích thước, kiểm tra timestamp và chuẩn hóa transcript.
2. Trang nhập file, player native, danh sách câu và bài nghe–gõ.
3. Dừng audio/thu hồi blob khi đổi trang; thông báo rõ phạm vi lưu trữ.
4. Kiểm thử parser và so sánh từ; kiểm tra giao diện desktop/mobile/dark/bàn phím.

**Hoàn thành khi:** nhập được SRT, VTT, WhisperX JSON; nội dung không trở thành
HTML thực thi; file lỗi không phá phiên cũ; loop không vượt cue; đổi route dừng
audio; gõ đúng/sai/thiếu/thừa có phản hồi và thao tác được bằng bàn phím.

## Đợt 2 — Thư viện cá nhân và ghi chú

**Phụ thuộc:** đợt 1 ổn định. **Nguồn:** Dexie.js, Editor.js, Read Frog.

1. Dexie quản lý session/transcript/ghi chú và vị trí câu; schema riêng có version.
2. Lưu audio là lựa chọn rõ ràng, có thông tin dung lượng, xóa riêng từng buổi;
   nếu không lưu byte thì yêu cầu chọn lại file và xác minh đúng nguồn.
3. Editor.js cho ghi chú theo khối, adapter JSON sang dạng được hỗ trợ; fallback
   textarea, không cho raw HTML tùy ý.
4. Từ vựng cá nhân: lưu từ + nghĩa người học nhập + câu ngữ cảnh + mốc audio.
5. Export/import thư viện cá nhân; xác định rõ quan hệ với backup tài khoản hiện
   có, không tuyên bố tự đồng bộ hoặc để restore cũ xóa dữ liệu mới.

**Hoàn thành khi:** reload khôi phục đúng buổi/câu; quota hoặc IndexedDB lỗi có
thông báo; xuất/nhập vòng kín giữ nội dung; xóa không ảnh hưởng bài khác; thử
schema cũ và chế độ lưu trữ bị chặn.

## Đợt 3 — Tạo và căn transcript

**Phụ thuộc:** đợt 1–2. **Nguồn:** WhisperX, Subtitle Edit, Transformers.js.

1. CLI chuyển kết quả WhisperX/Subtitle Edit thành transcript có provenance.
2. Tùy chọn ASR trên máy với Transformers.js trong Web Worker: tải model khi
   người dùng chọn; có tiến độ, hủy, giới hạn duration và fallback nhập phụ đề.
3. Cố định model/revision, phân biệt lần đầu tải và cache; đo WASM/WebGPU/mobile.
4. Công cụ sửa cue/timing, đánh dấu đã đối chiếu; transcript ASR không được coi
   là nguyên văn đã xác minh. Không biến word matching thành điểm phát âm.

**Hoàn thành khi:** có mẫu audio thật Anh/Việt, đo thời gian/bộ nhớ, kiểm tra offline
sau cache, hủy/đổi nguồn và lỗi tải model; không tự gửi audio đến dịch vụ cloud.

## Đợt 4 — Biên soạn từ PDF

**Nguồn:** PDF.js, Tesseract.js, Docling/MarkItDown, Editor.js.

1. PDF.js xem và chọn đúng trang, fallback Drive khi chưa có byte PDF.
2. Trích text theo trang; trang scan dùng Tesseract worker, có tiến độ/hủy.
3. Bảng/phức tạp xử lý qua công cụ Docling ngoài Worker; MarkItDown làm đầu vào
   nháp cho định dạng khác, không bỏ provenance số trang.
4. Editor.js hỗ trợ phần lý thuyết/ví dụ; adapter giữ ID câu, trang nguồn, hash,
   trạng thái nháp, điều kiện duyệt và xử lý xung đột hiện có.

**Hoàn thành khi:** PDF text/scan/bảng/tiếng Việt đi trọn nhập → soạn → duyệt →
xuất bản; quyền đọc và dữ liệu riêng tư giữ đúng; bản cũ vẫn học được khi có nháp mới.

## Đợt 5 — Chữa bài có căn cứ và chất lượng ngân hàng

**Nguồn:** Question Ocean và TOEIC-EXAM; không phụ thuộc vào ASR/PDF mới.

1. Bổ sung evidence location và ghi chú từng lựa chọn ở dữ liệu private.
2. Highlight căn cứ trong passage sau khi được phép xem lời giải.
3. Kiểm tra evidence thuộc passage, đáp án/lựa chọn nhất quán, nhóm Part 3/4/6/7.
4. Giữ bản chấm theo phiên bản và thứ tự lựa chọn; chiến thuật chỉ hiển thị nếu
   đã biên soạn, không tự bịa để lấp chỗ trống.

**Hoàn thành khi:** API trước nộp không lộ key/explanation, xáo trộn không sai
mapping, xem lịch sử dùng đúng bản gốc và câu thiếu metadata có fallback rõ ràng.

## Đợt 6 — FSRS và kế hoạch cá nhân

**Nguồn:** ts-fsrs, Anki, TOEIC 90 Days Challenge.

1. Một adapter lịch ôn chung cho thẻ chuẩn và thẻ cá nhân; bốn rating.
2. Version card/revlog và model; cập nhật sanitizer/export/import/backup.
3. Chuyển đổi khi ôn lần đầu, giữ due hiện có tới lúc đó; không tái tạo lịch sử giả.
4. Planner phân bổ học mới theo ngày thi/ngày nghỉ và lượng ôn; snapshot ngày đã
   ghi nhận không bị thay đổi khi chỉnh mục tiêu.

**Hoàn thành khi:** dữ liệu cũ không mất lịch; round trip backup và migration có
test; cùng đầu vào cho kết quả nhất quán; múi giờ và thao tác lặp được xử lý.

## Đợt 7 — Offline, thống kê và kiểm tra phát hành

1. Cache allowlist tài nguyên công khai theo phiên bản; không cache chung API
   tài khoản/admin/lời giải riêng. Thông báo phiên bản mới và dung lượng đã tải.
2. Chỉ đưa hoạt động luyện nghe vào thống kê sau khi định nghĩa quy tắc đếm,
   chống đếm trùng và phân biệt đã luyện với đã hiểu/đã sửa đúng.
3. Chạy toàn bộ test, build và smoke test luồng cũ; kiểm tra desktop/mobile/dark/
   bàn phím, khôi phục viewport và dữ liệu QA; tài liệu và ghi chú thay đổi.
4. Chỉ deploy khi được yêu cầu; không tự publish học liệu mẫu hay nháp AI.

## Nhật ký đợt

| Đợt | Trạng thái | Bằng chứng |
| --- | --- | --- |
| 0 | Đã tải nguồn | `.sites-runtime/reference-repos/`; báo cáo đối chiếu |
| 1 | Đã hoàn thành | `src/client/listening-studio.mjs`, `tests/listening.test.mjs`; parser SRT/VTT/WhisperX, sample practice loader, LCS word diff, phím tắt Space/Arrow/R/L, speech synthesis fallback, mobile nav `#listening` |
| 5 | Đã hoàn thành | `src/client/exam-room.mjs`, `src/client/exam-room.css`, `tests/exam-audio.test.mjs`; highlight dẫn chứng passage `.exam-evidence-highlight`, phân tích phương án nhiễu `choiceNotes`, review hub `#exam-review-run?filter=wrong` |
| 2–4, 6–7 | Kế hoạch tiếp theo | Chuẩn bị cho các đợt tiếp theo theo lộ trình dự án |
