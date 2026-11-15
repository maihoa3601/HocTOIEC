# Master Plan V2 — requirement audit

Full goal remains active. This checklist preserves all 16 modules and the architecture/roadmap/MVP items. Unverified means completion has not been proved, including where a basic implementation exists.

## Module delivery evidence

| Module | Current status | Evidence to inspect |
| --- | --- | --- |
| M01 SMART DASHBOARD | partial | [src/client/studio-v2.mjs](../src/client/studio-v2.mjs), [src/client/app.js](../src/client/app.js) |
| M02 GOOGLE DRIVE & PDF CONTENT ENGINE | in_progress | [scripts/extract-pdf.py](../scripts/extract-pdf.py), [src/server/document-imports.mjs](../src/server/document-imports.mjs), [tests/imports.test.mjs](../tests/imports.test.mjs) |
| M03 SMART LIBRARY | partial | [src/client/library-view.mjs](../src/client/library-view.mjs), [tests/hierarchy.test.mjs](../tests/hierarchy.test.mjs) |
| M04 VOCABULARY STUDIO | partial | [src/client/learning.mjs](../src/client/learning.mjs), [tests/v2.test.mjs](../tests/v2.test.mjs) |
| M05 GRAMMAR STUDIO | partial | [data/learning-bank.json](../data/learning-bank.json), [tests/learning.test.mjs](../tests/learning.test.mjs) |
| M06 TOEIC PRACTICE ENGINE | partial | [src/client/learning.mjs](../src/client/learning.mjs), [src/server/content-admin.mjs](../src/server/content-admin.mjs) |
| M07 LISTENING STUDIO | in_progress | [src/client/listening-studio.mjs](../src/client/listening-studio.mjs), [tests/listening.test.mjs](../tests/listening.test.mjs) |
| M08 READING STUDIO | partial | [src/client/learning.mjs](../src/client/learning.mjs) |
| M09 VIDEO LEARNING | partial | [src/client/app.js](../src/client/app.js) |
| M10 MISTAKE REVIEW | partial | [src/client/learning-core.mjs](../src/client/learning-core.mjs), [tests/activities.test.mjs](../tests/activities.test.mjs) |
| M11 STUDY PLANNER | partial | [src/client/study-planner.mjs](../src/client/study-planner.mjs), [tests/planner.test.mjs](../tests/planner.test.mjs) |
| M12 MOCK TEST | in_progress | [src/client/exam-room.mjs](../src/client/exam-room.mjs), [src/client/exam-audio-player.mjs](../src/client/exam-audio-player.mjs), [tests/exam-room.test.mjs](../tests/exam-room.test.mjs), [tests/exam-audio.test.mjs](../tests/exam-audio.test.mjs) |
| M13 LEARNING ANALYTICS | partial | [src/client/active-learning.mjs](../src/client/active-learning.mjs) |
| M14 AI TOEIC ASSISTANT | not_started |  |
| M15 GAMIFICATION | partial | [src/client/studio-v2.mjs](../src/client/studio-v2.mjs) |
| M16 ADMIN & CONTENT MANAGEMENT | in_progress | [src/client/import-ui.mjs](../src/client/import-ui.mjs), [src/server/document-imports.mjs](../src/server/document-imports.mjs), [tests/imports.test.mjs](../tests/imports.test.mjs) |

## Detailed acceptance checklist

Read each source requirement in TOEIC-STUDIO-V2-PLAN.md at the recorded line. Do not mark the goal complete until every requirement has sufficient evidence or an explicit user-approved scope change.

### Overview

- [ ] **X-R001** MASTER FEATURE PLAN — unverified; plan line 2.

### I. TỔNG QUAN SẢN PHẨM

- [ ] **X-R002** 1. Mục tiêu — unverified; plan line 14.
- [ ] **X-R003** Thư viện học tập thông minh. — unverified; plan line 20.
- [ ] **X-R004** Bài học ngữ pháp tương tác. — unverified; plan line 21.
- [ ] **X-R005** Kho từ vựng và flashcard. — unverified; plan line 22.
- [ ] **X-R006** Hệ thống luyện tập TOEIC Part 1–7. — unverified; plan line 23.
- [ ] **X-R007** Luyện nghe và chép chính tả. — unverified; plan line 24.
- [ ] **X-R008** Luyện đọc hiểu và tài liệu song ngữ. — unverified; plan line 25.
- [ ] **X-R009** Sổ câu sai và lịch ôn tập. — unverified; plan line 26.
- [ ] **X-R010** Thi thử TOEIC. — unverified; plan line 27.
- [ ] **X-R011** Dashboard học tập cá nhân. — unverified; plan line 28.
- [ ] **X-R012** Trợ lý AI giải thích kiến thức. — unverified; plan line 29.
- [ ] **X-R013** Hệ thống quản trị và xử lý tài liệu. — unverified; plan line 30.
- [ ] **X-R014** 2. Nguồn nội dung — unverified; plan line 32.
- [ ] **X-R015** 3. Quy trình học tập chính — unverified; plan line 52.

### II. KIẾN TRÚC CHỨC NĂNG

- [ ] **X-R016** 1. Content Engine — unverified; plan line 73.
- [ ] **X-R017** 2. Learning Engine — unverified; plan line 79.
- [ ] **X-R018** 3. Personal Learning Engine — unverified; plan line 85.
- [ ] **X-R019** 4. Intelligence & Management — unverified; plan line 89.

### SMART DASHBOARD

- [ ] **M01-R001** Mục tiêu TOEIC. — unverified; plan line 107.
- [ ] **M01-R002** Điểm thi thử gần nhất nếu có. — unverified; plan line 108.
- [ ] **M01-R003** Tổng số bài đã hoàn thành. — unverified; plan line 109.
- [ ] **M01-R004** Tổng thời gian học. — unverified; plan line 110.
- [ ] **M01-R005** Số từ vựng đã học. — unverified; plan line 111.
- [ ] **M01-R006** Số ngày học liên tiếp. — unverified; plan line 112.
- [ ] **M01-R007** Tiến độ hoàn thành mục tiêu. — unverified; plan line 113.
- [ ] **M01-R008** Tên bài. — unverified; plan line 123.
- [ ] **M01-R009** Loại nội dung. — unverified; plan line 124.
- [ ] **M01-R010** Tiến độ hoàn thành. — unverified; plan line 125.
- [ ] **M01-R011** Thời điểm học gần nhất. — unverified; plan line 126.
- [ ] **M01-R012** Nút tiếp tục. — unverified; plan line 127.
- [ ] **M01-R013** Từ vựng đến hạn ôn. — unverified; plan line 135.
- [ ] **M01-R014** Bài đang học. — unverified; plan line 136.
- [ ] **M01-R015** Câu sai cần luyện lại. — unverified; plan line 137.
- [ ] **M01-R016** Mục tiêu thời gian học. — unverified; plan line 138.
- [ ] **M01-R017** Bài học được đề xuất. — unverified; plan line 139.
- [ ] **M01-R018** Thời gian học theo ngày. — unverified; plan line 145.
- [ ] **M01-R019** Số bài hoàn thành. — unverified; plan line 146.
- [ ] **M01-R020** Tỷ lệ đúng theo Part. — unverified; plan line 147.
- [ ] **M01-R021** Tiến bộ qua các lần luyện. — unverified; plan line 148.
- [ ] **M01-R022** Kết quả thi thử. — unverified; plan line 149.
- [ ] **M01-R023** Continue Learning. — unverified; plan line 159.
- [ ] **M01-R024** Start Practice. — unverified; plan line 160.
- [ ] **M01-R025** Review Vocabulary. — unverified; plan line 161.
- [ ] **M01-R026** Review Mistakes. — unverified; plan line 162.
- [ ] **M01-R027** Open Library. — unverified; plan line 163.

### GOOGLE DRIVE & PDF CONTENT ENGINE

- [ ] **M02-R001** 1. Google Drive Integration — unverified; plan line 171.
- [ ] **M02-R002** Kết nối nguồn Google Drive được cấp quyền. — unverified; plan line 175.
- [ ] **M02-R003** Quét thư mục và thư mục con. — unverified; plan line 176.
- [ ] **M02-R004** Nhập danh sách PDF, audio và video. — unverified; plan line 177.
- [ ] **M02-R005** Đồng bộ thủ công. — unverified; plan line 178.
- [ ] **M02-R006** Phát hiện file mới. — unverified; plan line 179.
- [ ] **M02-R007** Phát hiện file cập nhật. — unverified; plan line 180.
- [ ] **M02-R008** Theo dõi file không còn truy cập được. — unverified; plan line 181.
- [ ] **M02-R009** Quản lý trạng thái đồng bộ. — unverified; plan line 182.
- [ ] **M02-R010** 2. Smart File Detection — unverified; plan line 184.
- [ ] **M02-R011** Tên file. — unverified; plan line 188.
- [ ] **M02-R012** Định dạng. — unverified; plan line 189.
- [ ] **M02-R013** Kích thước. — unverified; plan line 190.
- [ ] **M02-R014** Drive File ID. — unverified; plan line 191.
- [ ] **M02-R015** Phiên bản file. — unverified; plan line 192.
- [ ] **M02-R016** Dấu vân tay nội dung. — unverified; plan line 193.
- [ ] **M02-R017** Đường dẫn thư mục. — unverified; plan line 194.
- [ ] **M02-R018** Trạng thái xử lý. — unverified; plan line 195.
- [ ] **M02-R019** 3. PDF Extraction — unverified; plan line 199.
- [ ] **M02-R020** Đọc văn bản có sẵn trong PDF. — unverified; plan line 207.
- [ ] **M02-R021** Sử dụng OCR đối với trang scan cần thiết. — unverified; plan line 208.
- [ ] **M02-R022** Nhận diện tiêu đề và mục lục. — unverified; plan line 209.
- [ ] **M02-R023** Tách lý thuyết, ví dụ và bài tập. — unverified; plan line 210.
- [ ] **M02-R024** Nhận diện câu hỏi và lựa chọn. — unverified; plan line 211.
- [ ] **M02-R025** Nhận diện đáp án và giải thích. — unverified; plan line 212.
- [ ] **M02-R026** Giữ bảng, hình ảnh và bố cục quan trọng. — unverified; plan line 213.
- [ ] **M02-R027** Liên kết nội dung với số trang nguồn. — unverified; plan line 214.
- [ ] **M02-R028** 4. Content Classification — unverified; plan line 216.
- [ ] **M02-R029** Course. — unverified; plan line 220.
- [ ] **M02-R030** Lesson. — unverified; plan line 221.
- [ ] **M02-R031** Topic. — unverified; plan line 222.
- [ ] **M02-R032** Grammar Theory. — unverified; plan line 223.
- [ ] **M02-R033** Vocabulary. — unverified; plan line 224.
- [ ] **M02-R034** Reading Passage. — unverified; plan line 225.
- [ ] **M02-R035** Question. — unverified; plan line 226.
- [ ] **M02-R036** Answer. — unverified; plan line 227.
- [ ] **M02-R037** Explanation. — unverified; plan line 228.
- [ ] **M02-R038** Transcript. — unverified; plan line 229.
- [ ] **M02-R039** Media. — unverified; plan line 230.
- [ ] **M02-R040** 5. Source Tracking — unverified; plan line 232.
- [ ] **M02-R041** File gốc. — unverified; plan line 236.
- [ ] **M02-R042** Drive ID. — unverified; plan line 237.
- [ ] **M02-R043** Trang nguồn. — unverified; plan line 238.
- [ ] **M02-R044** Phiên bản nhập. — unverified; plan line 239.
- [ ] **M02-R045** Trạng thái kiểm duyệt. — unverified; plan line 240.
- [ ] **M02-R046** Thời điểm cập nhật. — unverified; plan line 241.
- [ ] **M02-R047** 6. Import Status — unverified; plan line 245.
- [ ] **M02-R048** 7. Content Review — unverified; plan line 262.
- [ ] **M02-R049** Sửa văn bản OCR. — unverified; plan line 272.
- [ ] **M02-R050** Sửa câu hỏi. — unverified; plan line 273.
- [ ] **M02-R051** Sửa lựa chọn. — unverified; plan line 274.
- [ ] **M02-R052** Kiểm tra đáp án. — unverified; plan line 275.
- [ ] **M02-R053** Kiểm tra hình ảnh. — unverified; plan line 276.
- [ ] **M02-R054** Liên kết audio. — unverified; plan line 277.
- [ ] **M02-R055** Xác nhận trang nguồn. — unverified; plan line 278.
- [ ] **M02-R056** Duyệt và xuất bản bài học. — unverified; plan line 279.
- [ ] **M02-R057** 8. Content Origin — unverified; plan line 283.
- [ ] **M02-R058** **Original:** Nội dung gốc trong PDF. — unverified; plan line 287.
- [ ] **M02-R059** **Adapted:** Nội dung chỉnh sửa từ PDF. — unverified; plan line 288.
- [ ] **M02-R060** **Generated:** Nội dung được AI hoặc hệ thống tạo thêm. — unverified; plan line 289.

### SMART LIBRARY

- [ ] **M03-R001** 1. Library View — unverified; plan line 301.
- [ ] **M03-R002** Grid View. — unverified; plan line 305.
- [ ] **M03-R003** List View. — unverified; plan line 306.
- [ ] **M03-R004** Thumbnail. — unverified; plan line 310.
- [ ] **M03-R005** Tên. — unverified; plan line 311.
- [ ] **M03-R006** Loại tài liệu. — unverified; plan line 312.
- [ ] **M03-R007** Khóa học. — unverified; plan line 313.
- [ ] **M03-R008** TOEIC Part. — unverified; plan line 314.
- [ ] **M03-R009** Trạng thái học. — unverified; plan line 315.
- [ ] **M03-R010** Tiến độ hoàn thành. — unverified; plan line 316.
- [ ] **M03-R011** 2. Smart Search — unverified; plan line 318.
- [ ] **M03-R012** Tên tài liệu. — unverified; plan line 322.
- [ ] **M03-R013** Tên bài học. — unverified; plan line 323.
- [ ] **M03-R014** Từ vựng. — unverified; plan line 324.
- [ ] **M03-R015** Chủ đề ngữ pháp. — unverified; plan line 325.
- [ ] **M03-R016** Nội dung câu hỏi. — unverified; plan line 326.
- [ ] **M03-R017** Nội dung PDF đã được lập chỉ mục. — unverified; plan line 327.
- [ ] **M03-R018** 3. Advanced Filter — unverified; plan line 329.
- [ ] **M03-R019** All. — unverified; plan line 335.
- [ ] **M03-R020** Vocabulary. — unverified; plan line 336.
- [ ] **M03-R021** Grammar. — unverified; plan line 337.
- [ ] **M03-R022** Listening. — unverified; plan line 338.
- [ ] **M03-R023** Reading. — unverified; plan line 339.
- [ ] **M03-R024** Mock Test. — unverified; plan line 340.
- [ ] **M03-R025** TED Talks. — unverified; plan line 341.
- [ ] **M03-R026** Not Started. — unverified; plan line 345.
- [ ] **M03-R027** In Progress. — unverified; plan line 346.
- [ ] **M03-R028** Completed. — unverified; plan line 347.
- [ ] **M03-R029** Bookmarked. — unverified; plan line 348.
- [ ] **M03-R030** 4. My Collection — unverified; plan line 350.
- [ ] **M03-R031** Đánh dấu yêu thích. — unverified; plan line 354.
- [ ] **M03-R032** Ghim tài liệu. — unverified; plan line 355.
- [ ] **M03-R033** Tạo playlist. — unverified; plan line 356.
- [ ] **M03-R034** Xem lịch sử truy cập. — unverified; plan line 357.
- [ ] **M03-R035** Lưu tài liệu cần học sau. — unverified; plan line 358.

### VOCABULARY STUDIO

- [ ] **M04-R001** 1. Vocabulary Library — unverified; plan line 366.
- [ ] **M04-R002** Khóa học. — unverified; plan line 370.
- [ ] **M04-R003** Bài học. — unverified; plan line 371.
- [ ] **M04-R004** Chủ đề. — unverified; plan line 372.
- [ ] **M04-R005** TOEIC Part. — unverified; plan line 373.
- [ ] **M04-R006** Danh sách cá nhân. — unverified; plan line 374.
- [ ] **M04-R007** Từ tiếng Anh. — unverified; plan line 378.
- [ ] **M04-R008** Nghĩa. — unverified; plan line 379.
- [ ] **M04-R009** Loại từ. — unverified; plan line 380.
- [ ] **M04-R010** Phiên âm. — unverified; plan line 381.
- [ ] **M04-R011** Ví dụ. — unverified; plan line 382.
- [ ] **M04-R012** Bản dịch. — unverified; plan line 383.
- [ ] **M04-R013** Audio phát âm. — unverified; plan line 384.
- [ ] **M04-R014** Trang tài liệu nguồn. — unverified; plan line 385.
- [ ] **M04-R015** 2. Flashcard — unverified; plan line 389.
- [ ] **M04-R016** English → Vietnamese. — unverified; plan line 393.
- [ ] **M04-R017** Vietnamese → English. — unverified; plan line 394.
- [ ] **M04-R018** Random. — unverified; plan line 395.
- [ ] **M04-R019** Review Due Cards. — unverified; plan line 396.
- [ ] **M04-R020** 3. Memory Rating — unverified; plan line 398.
- [ ] **M04-R021** Again. — unverified; plan line 402.
- [ ] **M04-R022** Hard. — unverified; plan line 403.
- [ ] **M04-R023** Good. — unverified; plan line 404.
- [ ] **M04-R024** Easy. — unverified; plan line 405.
- [ ] **M04-R025** 4. Vocabulary Practice — unverified; plan line 409.
- [ ] **M04-R026** Chọn nghĩa. — unverified; plan line 413.
- [ ] **M04-R027** Gõ từ. — unverified; plan line 414.
- [ ] **M04-R028** Điền từ. — unverified; plan line 415.
- [ ] **M04-R029** Ghép từ và nghĩa. — unverified; plan line 416.
- [ ] **M04-R030** Nhận diện từ qua audio. — unverified; plan line 417.
- [ ] **M04-R031** 5. Personal Vocabulary — unverified; plan line 419.
- [ ] **M04-R032** Reading. — unverified; plan line 423.
- [ ] **M04-R033** Grammar. — unverified; plan line 424.
- [ ] **M04-R034** Practice. — unverified; plan line 425.
- [ ] **M04-R035** Listening Transcript. — unverified; plan line 426.
- [ ] **M04-R036** TED Talks. — unverified; plan line 427.
- [ ] **M04-R037** 6. Vocabulary Statistics — unverified; plan line 429.
- [ ] **M04-R038** Tổng số từ đã lưu. — unverified; plan line 433.
- [ ] **M04-R039** Từ mới. — unverified; plan line 434.
- [ ] **M04-R040** Từ đã nhớ. — unverified; plan line 435.
- [ ] **M04-R041** Từ khó. — unverified; plan line 436.
- [ ] **M04-R042** Từ đến hạn ôn. — unverified; plan line 437.
- [ ] **M04-R043** Tỷ lệ ghi nhớ. — unverified; plan line 438.

### GRAMMAR STUDIO

- [ ] **M05-R001** 1. Grammar Course — unverified; plan line 448.
- [ ] **M05-R002** Tiêu đề. — unverified; plan line 452.
- [ ] **M05-R003** Mục tiêu bài học. — unverified; plan line 453.
- [ ] **M05-R004** Lý thuyết. — unverified; plan line 454.
- [ ] **M05-R005** Công thức. — unverified; plan line 455.
- [ ] **M05-R006** Ví dụ. — unverified; plan line 456.
- [ ] **M05-R007** Lưu ý. — unverified; plan line 457.
- [ ] **M05-R008** Bài tập. — unverified; plan line 458.
- [ ] **M05-R009** Tài liệu nguồn. — unverified; plan line 459.
- [ ] **M05-R010** 2. Interactive Learning — unverified; plan line 461.
- [ ] **M05-R011** Mục lục bài học. — unverified; plan line 465.
- [ ] **M05-R012** Chuyển nhanh giữa các phần. — unverified; plan line 466.
- [ ] **M05-R013** Đánh dấu nội dung quan trọng. — unverified; plan line 467.
- [ ] **M05-R014** Ghi chú cá nhân. — unverified; plan line 468.
- [ ] **M05-R015** Lưu vị trí đang đọc. — unverified; plan line 469.
- [ ] **M05-R016** Tiếp tục học. — unverified; plan line 470.
- [ ] **M05-R017** 3. Grammar Practice — unverified; plan line 472.
- [ ] **M05-R018** 4. Grammar Review — unverified; plan line 476.
- [ ] **M05-R019** Hiển thị giải thích. — unverified; plan line 480.
- [ ] **M05-R020** Chỉ ra kiến thức liên quan. — unverified; plan line 481.
- [ ] **M05-R021** Liên kết về phần lý thuyết. — unverified; plan line 482.
- [ ] **M05-R022** Cho phép lưu để ôn lại. — unverified; plan line 483.
- [ ] **M05-R023** 5. Grammar Analytics — unverified; plan line 485.
- [ ] **M05-R024** Số bài hoàn thành. — unverified; plan line 489.
- [ ] **M05-R025** Tỷ lệ đúng từng chủ đề. — unverified; plan line 490.
- [ ] **M05-R026** Chủ đề thường sai. — unverified; plan line 491.
- [ ] **M05-R027** Chủ đề cần ôn tập. — unverified; plan line 492.

### TOEIC PRACTICE ENGINE

- [ ] **M06-R001** 1. Practice by Part — unverified; plan line 502.
- [ ] **M06-R002** Part 1: Photographs. — unverified; plan line 506.
- [ ] **M06-R003** Part 2: Question–Response. — unverified; plan line 507.
- [ ] **M06-R004** Part 3: Conversations. — unverified; plan line 508.
- [ ] **M06-R005** Part 4: Talks. — unverified; plan line 509.
- [ ] **M06-R006** Part 5: Incomplete Sentences. — unverified; plan line 513.
- [ ] **M06-R007** Part 6: Text Completion. — unverified; plan line 514.
- [ ] **M06-R008** Part 7: Reading Comprehension. — unverified; plan line 515.
- [ ] **M06-R009** 2. Practice Modes — unverified; plan line 517.
- [ ] **M06-R010** Làm từng câu. — unverified; plan line 521.
- [ ] **M06-R011** Không giới hạn thời gian. — unverified; plan line 522.
- [ ] **M06-R012** Xem đáp án sau khi trả lời. — unverified; plan line 523.
- [ ] **M06-R013** Xem giải thích. — unverified; plan line 524.
- [ ] **M06-R014** Lưu câu hỏi. — unverified; plan line 525.
- [ ] **M06-R015** Làm một nhóm câu hỏi. — unverified; plan line 529.
- [ ] **M06-R016** Nộp bài để xem kết quả. — unverified; plan line 530.
- [ ] **M06-R017** Hiển thị câu đúng và sai. — unverified; plan line 531.
- [ ] **M06-R018** Lưu lượt làm. — unverified; plan line 532.
- [ ] **M06-R019** Có thời gian giới hạn. — unverified; plan line 536.
- [ ] **M06-R020** Không hiển thị đáp án trước khi nộp. — unverified; plan line 537.
- [ ] **M06-R021** Tự động chấm các câu đủ điều kiện. — unverified; plan line 538.
- [ ] **M06-R022** Hiển thị kết quả sau khi hoàn thành. — unverified; plan line 539.
- [ ] **M06-R023** 3. Question Types — unverified; plan line 541.
- [ ] **M06-R024** Multiple Choice. — unverified; plan line 545.
- [ ] **M06-R025** Fill in the Blank. — unverified; plan line 546.
- [ ] **M06-R026** Matching. — unverified; plan line 547.
- [ ] **M06-R027** Short Answer. — unverified; plan line 548.
- [ ] **M06-R028** Question Group. — unverified; plan line 549.
- [ ] **M06-R029** Audio-based Question. — unverified; plan line 550.
- [ ] **M06-R030** Passage-based Question. — unverified; plan line 551.
- [ ] **M06-R031** 4. Question Navigation — unverified; plan line 553.
- [ ] **M06-R032** Tổng số câu. — unverified; plan line 557.
- [ ] **M06-R033** Câu đã trả lời. — unverified; plan line 558.
- [ ] **M06-R034** Câu chưa trả lời. — unverified; plan line 559.
- [ ] **M06-R035** Câu đánh dấu. — unverified; plan line 560.
- [ ] **M06-R036** Thời gian làm bài. — unverified; plan line 561.
- [ ] **M06-R037** 5. Auto Save — unverified; plan line 563.
- [ ] **M06-R038** Câu trả lời. — unverified; plan line 567.
- [ ] **M06-R039** Câu đánh dấu. — unverified; plan line 568.
- [ ] **M06-R040** Vị trí câu hiện tại. — unverified; plan line 569.
- [ ] **M06-R041** Thời gian đã làm. — unverified; plan line 570.
- [ ] **M06-R042** Trạng thái phiên. — unverified; plan line 571.
- [ ] **M06-R043** 6. Answer Review — unverified; plan line 573.
- [ ] **M06-R044** Lựa chọn của người học. — unverified; plan line 577.
- [ ] **M06-R045** Đáp án đúng. — unverified; plan line 578.
- [ ] **M06-R046** Giải thích. — unverified; plan line 579.
- [ ] **M06-R047** Nội dung liên quan. — unverified; plan line 580.
- [ ] **M06-R048** Trang PDF nguồn. — unverified; plan line 581.
- [ ] **M06-R049** 7. Retake — unverified; plan line 583.
- [ ] **M06-R050** 8. Report Question — unverified; plan line 589.
- [ ] **M06-R051** Sai đáp án. — unverified; plan line 593.
- [ ] **M06-R052** Sai câu hỏi. — unverified; plan line 594.
- [ ] **M06-R053** Thiếu hình. — unverified; plan line 595.
- [ ] **M06-R054** Thiếu audio. — unverified; plan line 596.
- [ ] **M06-R055** Giải thích không chính xác. — unverified; plan line 597.

### LISTENING STUDIO

- [ ] **M07-R001** 1. Advanced Audio Player — unverified; plan line 605.
- [x] **M07-R002** Play/Pause. — verified in [src/client/listening-studio.mjs](../src/client/listening-studio.mjs#L97-L113) and [tests/listening.test.mjs](../tests/listening.test.mjs).
- [ ] **M07-R003** Tua nhanh và tua lại. — unverified; plan line 610.
- [x] **M07-R004** Điều chỉnh tốc độ. — verified in [src/client/listening-studio.mjs](../src/client/listening-studio.mjs#L60) and [tests/listening.test.mjs](../tests/listening.test.mjs).
- [x] **M07-R005** Lặp đoạn A–B. — verified in [src/client/listening-studio.mjs](../src/client/listening-studio.mjs#L143-L148) and [tests/listening.test.mjs](../tests/listening.test.mjs).
- [ ] **M07-R006** Ghi nhớ vị trí đang nghe. — unverified; plan line 613.
- [ ] **M07-R007** Đánh dấu đoạn khó. — unverified; plan line 614.
- [ ] **M07-R008** 2. Listening Practice — unverified; plan line 616.
- [ ] **M07-R009** Câu hỏi. — unverified; plan line 620.
- [ ] **M07-R010** Đáp án lựa chọn. — unverified; plan line 621.
- [ ] **M07-R011** Hình minh họa. — unverified; plan line 622.
- [ ] **M07-R012** PDF nguồn. — unverified; plan line 623.
- [x] **M07-R013** 3. Dictation Mode — verified in [src/client/listening-studio.mjs](../src/client/listening-studio.mjs#L71-L73) and [tests/listening.test.mjs](../tests/listening.test.mjs).
- [x] **M07-R014** Nghe audio. — verified in [src/client/listening-studio.mjs](../src/client/listening-studio.mjs#L97-L113).
- [x] **M07-R015** Nhập nội dung nghe được. — verified in [src/client/listening-studio.mjs](../src/client/listening-studio.mjs#L71).
- [x] **M07-R016** Nộp câu trả lời. — verified in [src/client/listening-studio.mjs](../src/client/listening-studio.mjs#L173-L188).
- [x] **M07-R017** Xem transcript. — verified in [src/client/listening-studio.mjs](../src/client/listening-studio.mjs#L69-L70).
- [x] **M07-R018** Đối chiếu từ sai hoặc thiếu. — verified in [src/client/listening-core.mjs](../src/client/listening-core.mjs#L107-L147) and [tests/listening.test.mjs](../tests/listening.test.mjs).
- [ ] **M07-R019** Lưu đoạn cần luyện lại. — unverified; plan line 634.
- [x] **M07-R020** 4. Transcript Mode — verified in [src/client/listening-studio.mjs](../src/client/listening-studio.mjs#L69-L70).
- [x] **M07-R021** Hide Transcript. — verified in [src/client/listening-studio.mjs](../src/client/listening-studio.mjs#L69-L70).
- [x] **M07-R022** Show Transcript. — verified in [src/client/listening-studio.mjs](../src/client/listening-studio.mjs#L69-L70).
- [ ] **M07-R023** Highlight Vocabulary. — unverified; plan line 642.
- [ ] **M07-R024** Save Vocabulary. — unverified; plan line 643.
- [x] **M07-R025** 5. Sentence Listening — verified in [src/client/listening-studio.mjs](../src/client/listening-studio.mjs#L80-L95).
- [x] **M07-R026** Nghe từng câu. — verified in [src/client/listening-studio.mjs](../src/client/listening-studio.mjs#L97-L113).
- [x] **M07-R027** Lặp từng câu. — verified in [src/client/listening-studio.mjs](../src/client/listening-studio.mjs#L143-L148).
- [ ] **M07-R028** Tô sáng transcript đồng bộ. — unverified; plan line 653.
- [x] **M07-R029** Chuyển đến câu tương ứng. — verified in [src/client/listening-studio.mjs](../src/client/listening-studio.mjs#L92-L95).

### READING STUDIO

- [ ] **M08-R001** 1. Reading Viewer — unverified; plan line 662.
- [ ] **M08-R002** Nội dung tiếng Anh. — unverified; plan line 666.
- [ ] **M08-R003** Bản dịch tiếng Việt nếu có. — unverified; plan line 667.
- [ ] **M08-R004** Chế độ song ngữ. — unverified; plan line 668.
- [ ] **M08-R005** Điều chỉnh cỡ chữ. — unverified; plan line 669.
- [ ] **M08-R006** Ghi nhớ vị trí đọc. — unverified; plan line 670.
- [ ] **M08-R007** 2. Interactive Reading — unverified; plan line 672.
- [ ] **M08-R008** Chọn từ. — unverified; plan line 676.
- [ ] **M08-R009** Lưu từ vựng. — unverified; plan line 677.
- [ ] **M08-R010** Ghi chú. — unverified; plan line 678.
- [ ] **M08-R011** Đánh dấu đoạn văn. — unverified; plan line 679.
- [ ] **M08-R012** Tìm kiếm nội dung. — unverified; plan line 680.
- [ ] **M08-R013** 3. Reading Practice — unverified; plan line 682.
- [ ] **M08-R014** 4. Document Layout — unverified; plan line 688.
- [ ] **M08-R015** Email. — unverified; plan line 692.
- [ ] **M08-R016** Advertisement. — unverified; plan line 693.
- [ ] **M08-R017** Notice. — unverified; plan line 694.
- [ ] **M08-R018** Table. — unverified; plan line 695.
- [ ] **M08-R019** Chart. — unverified; plan line 696.
- [ ] **M08-R020** Image. — unverified; plan line 697.
- [ ] **M08-R021** Multiple Passages. — unverified; plan line 698.
- [ ] **M08-R022** 5. TED Talks Learning — unverified; plan line 700.
- [ ] **M08-R023** Video. — unverified; plan line 704.
- [ ] **M08-R024** Transcript. — unverified; plan line 705.
- [ ] **M08-R025** Bản dịch nếu có. — unverified; plan line 706.
- [ ] **M08-R026** Ghi chú. — unverified; plan line 707.
- [ ] **M08-R027** Từ vựng. — unverified; plan line 708.
- [ ] **M08-R028** Vị trí video. — unverified; plan line 709.

### VIDEO LEARNING

- [ ] **M09-R001** 1. Video Player — unverified; plan line 717.
- [ ] **M09-R002** Play/Pause. — unverified; plan line 723.
- [ ] **M09-R003** Playback Speed. — unverified; plan line 724.
- [ ] **M09-R004** Continue Watching. — unverified; plan line 725.
- [ ] **M09-R005** Fullscreen. — unverified; plan line 726.
- [ ] **M09-R006** Learning Progress. — unverified; plan line 727.
- [ ] **M09-R007** 2. Timestamp Notes — unverified; plan line 729.
- [ ] **M09-R008** 3. Video Bookmarks — unverified; plan line 743.
- [ ] **M09-R009** 4. Related Lessons — unverified; plan line 747.

### MISTAKE REVIEW

- [ ] **M10-R001** 1. My Mistakes — unverified; plan line 757.
- [ ] **M10-R002** 2. Mistake Classification — unverified; plan line 761.
- [ ] **M10-R003** TOEIC Part. — unverified; plan line 765.
- [ ] **M10-R004** Chủ đề. — unverified; plan line 766.
- [ ] **M10-R005** Bài học. — unverified; plan line 767.
- [ ] **M10-R006** Dạng câu hỏi. — unverified; plan line 768.
- [ ] **M10-R007** Số lần trả lời sai. — unverified; plan line 769.
- [ ] **M10-R008** 3. Mistake Reason — unverified; plan line 771.
- [ ] **M10-R009** Thiếu từ vựng. — unverified; plan line 775.
- [ ] **M10-R010** Sai ngữ pháp. — unverified; plan line 776.
- [ ] **M10-R011** Nghe nhầm. — unverified; plan line 777.
- [ ] **M10-R012** Đọc thiếu thông tin. — unverified; plan line 778.
- [ ] **M10-R013** Thiếu thời gian. — unverified; plan line 779.
- [ ] **M10-R014** Nhầm đáp án. — unverified; plan line 780.
- [ ] **M10-R015** 4. Review Mistakes — unverified; plan line 782.
- [ ] **M10-R016** Câu sai. — unverified; plan line 786.
- [ ] **M10-R017** Câu đã đánh dấu. — unverified; plan line 787.
- [ ] **M10-R018** Câu thường sai. — unverified; plan line 788.
- [ ] **M10-R019** Câu chưa nắm vững. — unverified; plan line 789.
- [ ] **M10-R020** 5. Learning Connection — unverified; plan line 791.
- [ ] **M10-R021** Bài ngữ pháp. — unverified; plan line 795.
- [ ] **M10-R022** Từ vựng liên quan. — unverified; plan line 796.
- [ ] **M10-R023** Đoạn nghe. — unverified; plan line 797.
- [ ] **M10-R024** Đoạn đọc. — unverified; plan line 798.
- [ ] **M10-R025** 6. Mistake Progress — unverified; plan line 800.
- [ ] **M10-R026** Số lần sai. — unverified; plan line 804.
- [ ] **M10-R027** Lần ôn gần nhất. — unverified; plan line 805.
- [ ] **M10-R028** Kết quả gần nhất. — unverified; plan line 806.
- [ ] **M10-R029** Tình trạng đã nắm vững hay chưa. — unverified; plan line 807.

### STUDY PLANNER

- [ ] **M11-R001** 1. Goal Setting — unverified; plan line 815.
- [ ] **M11-R002** Điểm TOEIC mục tiêu. — unverified; plan line 819.
- [ ] **M11-R003** Thời hạn dự kiến. — unverified; plan line 820.
- [ ] **M11-R004** Thời gian học mỗi ngày. — unverified; plan line 821.
- [ ] **M11-R005** Số từ vựng mỗi ngày. — unverified; plan line 822.
- [ ] **M11-R006** Số câu luyện tập mỗi ngày. — unverified; plan line 823.
- [ ] **M11-R007** 2. Learning Schedule — unverified; plan line 825.
- [ ] **M11-R008** Ngày. — unverified; plan line 829.
- [ ] **M11-R009** Tuần. — unverified; plan line 830.
- [ ] **M11-R010** Chủ đề. — unverified; plan line 831.
- [ ] **M11-R011** TOEIC Part. — unverified; plan line 832.
- [ ] **M11-R012** 3. Daily Tasks — unverified; plan line 834.
- [ ] **M11-R013** Học bài mới. — unverified; plan line 838.
- [ ] **M11-R014** Ôn từ vựng. — unverified; plan line 839.
- [ ] **M11-R015** Luyện câu sai. — unverified; plan line 840.
- [ ] **M11-R016** Luyện Listening. — unverified; plan line 841.
- [ ] **M11-R017** Luyện Reading. — unverified; plan line 842.
- [ ] **M11-R018** 4. Schedule Tracking — unverified; plan line 844.
- [ ] **M11-R019** Nhiệm vụ hoàn thành. — unverified; plan line 848.
- [ ] **M11-R020** Nhiệm vụ chưa hoàn thành. — unverified; plan line 849.
- [ ] **M11-R021** Tiến độ mục tiêu. — unverified; plan line 850.
- [ ] **M11-R022** Lịch sử học. — unverified; plan line 851.
- [ ] **M11-R023** 5. Adaptive Planner — unverified; plan line 853.

### MOCK TEST

- [ ] **M12-R001** 1. Test Modes — unverified; plan line 865.
- [ ] **M12-R002** Listening Test. — unverified; plan line 867.
- [ ] **M12-R003** Reading Test. — unverified; plan line 868.
- [ ] **M12-R004** Full TOEIC Test. — unverified; plan line 869.
- [ ] **M12-R005** 2. Exam Interface — unverified; plan line 871.
- [ ] **M12-R006** Đồng hồ đếm ngược. — unverified; plan line 875.
- [ ] **M12-R007** Phiếu trả lời. — unverified; plan line 876.
- [ ] **M12-R008** Điều hướng câu. — unverified; plan line 877.
- [ ] **M12-R009** Đánh dấu câu. — unverified; plan line 878.
- [ ] **M12-R010** Lưu trạng thái. — unverified; plan line 879.
- [ ] **M12-R011** Tự động nộp khi hết giờ. — unverified; plan line 880.
- [ ] **M12-R012** 3. Exam Result — unverified; plan line 882.
- [ ] **M12-R013** Số câu đúng. — unverified; plan line 886.
- [ ] **M12-R014** Số câu sai. — unverified; plan line 887.
- [ ] **M12-R015** Accuracy. — unverified; plan line 888.
- [ ] **M12-R016** Kết quả theo Part. — unverified; plan line 889.
- [ ] **M12-R017** Thời gian hoàn thành. — unverified; plan line 890.
- [ ] **M12-R018** 4. Test Analytics — unverified; plan line 894.
- [ ] **M12-R019** So sánh các lần thi. — unverified; plan line 896.
- [ ] **M12-R020** Phân tích Part yếu. — unverified; plan line 897.
- [ ] **M12-R021** Phân tích dạng câu thường sai. — unverified; plan line 898.
- [ ] **M12-R022** Theo dõi xu hướng tiến bộ. — unverified; plan line 899.

### LEARNING ANALYTICS

- [ ] **M13-R001** 1. Study Activity — unverified; plan line 907.
- [ ] **M13-R002** 2. Learning Heatmap — unverified; plan line 911.
- [ ] **M13-R003** 3. Accuracy by Part — unverified; plan line 915.
- [ ] **M13-R004** 4. Vocabulary Progress — unverified; plan line 919.
- [ ] **M13-R005** 5. Grammar Progress — unverified; plan line 923.
- [ ] **M13-R006** 6. Score History — unverified; plan line 927.
- [ ] **M13-R007** 7. Weakness Analysis — unverified; plan line 931.
- [ ] **M13-R008** Part yếu nhất. — unverified; plan line 935.
- [ ] **M13-R009** Chủ đề ngữ pháp yếu. — unverified; plan line 936.
- [ ] **M13-R010** Từ thường quên. — unverified; plan line 937.
- [ ] **M13-R011** Dạng câu thường sai. — unverified; plan line 938.
- [ ] **M13-R012** Bài học cần ôn lại. — unverified; plan line 939.

### AI TOEIC ASSISTANT

- [ ] **M14-R001** 1. AI Explain — unverified; plan line 951.
- [ ] **M14-R002** Vì sao đáp án đúng. — unverified; plan line 955.
- [ ] **M14-R003** Vì sao đáp án khác sai. — unverified; plan line 956.
- [ ] **M14-R004** Kiến thức ngữ pháp. — unverified; plan line 957.
- [ ] **M14-R005** Từ vựng quan trọng. — unverified; plan line 958.
- [ ] **M14-R006** Ví dụ tương tự. — unverified; plan line 959.
- [ ] **M14-R007** 2. AI Learning Coach — unverified; plan line 961.
- [ ] **M14-R008** 3. AI Vocabulary Assistant — unverified; plan line 965.
- [ ] **M14-R009** Giải thích từ. — unverified; plan line 969.
- [ ] **M14-R010** Tạo ví dụ. — unverified; plan line 970.
- [ ] **M14-R011** Tạo flashcard. — unverified; plan line 971.
- [ ] **M14-R012** Tạo câu hỏi luyện tập. — unverified; plan line 972.
- [ ] **M14-R013** 4. AI Reading Assistant — unverified; plan line 974.
- [ ] **M14-R014** Giải thích đoạn đọc. — unverified; plan line 978.
- [ ] **M14-R015** Phân tích cấu trúc câu. — unverified; plan line 979.
- [ ] **M14-R016** Làm rõ từ vựng. — unverified; plan line 980.
- [ ] **M14-R017** Tóm tắt nội dung. — unverified; plan line 981.
- [ ] **M14-R018** 5. AI Content Generation — unverified; plan line 983.

### GAMIFICATION

- [ ] **M15-R001** 1. Study Streak — unverified; plan line 997.
- [ ] **M15-R002** 2. Experience Points — unverified; plan line 1001.
- [ ] **M15-R003** Hoàn thành bài học. — unverified; plan line 1005.
- [ ] **M15-R004** Làm bài luyện. — unverified; plan line 1006.
- [ ] **M15-R005** Ôn từ vựng. — unverified; plan line 1007.
- [ ] **M15-R006** Hoàn thành nhiệm vụ. — unverified; plan line 1008.
- [ ] **M15-R007** 3. Achievements — unverified; plan line 1010.
- [ ] **M15-R008** First Lesson. — unverified; plan line 1014.
- [ ] **M15-R009** 7-Day Streak. — unverified; plan line 1015.
- [ ] **M15-R010** 100 Words Learned. — unverified; plan line 1016.
- [ ] **M15-R011** Grammar Master. — unverified; plan line 1017.
- [ ] **M15-R012** Listening Explorer. — unverified; plan line 1018.
- [ ] **M15-R013** 4. Weekly Goals — unverified; plan line 1020.

### ADMIN & CONTENT MANAGEMENT

- [ ] **M16-R001** 1. Admin Dashboard — unverified; plan line 1032.
- [ ] **M16-R002** Tổng số file. — unverified; plan line 1036.
- [ ] **M16-R003** File đã xử lý. — unverified; plan line 1037.
- [ ] **M16-R004** File lỗi. — unverified; plan line 1038.
- [ ] **M16-R005** File cần kiểm duyệt. — unverified; plan line 1039.
- [ ] **M16-R006** Bài đã xuất bản. — unverified; plan line 1040.
- [ ] **M16-R007** Câu hỏi chưa xác minh. — unverified; plan line 1041.
- [ ] **M16-R008** Báo lỗi từ người học. — unverified; plan line 1042.
- [ ] **M16-R009** 2. Content Management — unverified; plan line 1044.
- [ ] **M16-R010** Course. — unverified; plan line 1048.
- [ ] **M16-R011** Lesson. — unverified; plan line 1049.
- [ ] **M16-R012** Vocabulary. — unverified; plan line 1050.
- [ ] **M16-R013** Grammar. — unverified; plan line 1051.
- [ ] **M16-R014** Questions. — unverified; plan line 1052.
- [ ] **M16-R015** Answers. — unverified; plan line 1053.
- [ ] **M16-R016** Reading Passages. — unverified; plan line 1054.
- [ ] **M16-R017** Audio. — unverified; plan line 1055.
- [ ] **M16-R018** Video. — unverified; plan line 1056.
- [ ] **M16-R019** 3. PDF Review — unverified; plan line 1058.
- [ ] **M16-R020** 4. Question Review — unverified; plan line 1062.
- [ ] **M16-R021** 5. Import History — unverified; plan line 1066.
- [ ] **M16-R022** 6. Content Versioning — unverified; plan line 1070.
- [ ] **M16-R023** 7. Permissions — unverified; plan line 1076.
- [ ] **M16-R024** Admin. — unverified; plan line 1080.
- [ ] **M16-R025** Content Editor. — unverified; plan line 1081.
- [ ] **M16-R026** Learner. — unverified; plan line 1082.

### IV. THIẾT KẾ GIAO DIỆN

- [ ] **X-R020** 1. Design Direction — unverified; plan line 1088.
- [ ] **X-R021** Hiện đại. — unverified; plan line 1092.
- [ ] **X-R022** Tối giản. — unverified; plan line 1093.
- [ ] **X-R023** Dễ tập trung học. — unverified; plan line 1094.
- [ ] **X-R024** Thân thiện. — unverified; plan line 1095.
- [ ] **X-R025** Responsive. — unverified; plan line 1096.
- [ ] **X-R026** Hỗ trợ Dark Mode. — unverified; plan line 1097.
- [ ] **X-R027** Phù hợp cả desktop và mobile. — unverified; plan line 1098.
- [ ] **X-R028** 2. Desktop Navigation — unverified; plan line 1100.
- [ ] **X-R029** 🏠 Dashboard — unverified; plan line 1106.
- [ ] **X-R030** 📚 Library — unverified; plan line 1107.
- [ ] **X-R031** 📖 Vocabulary — unverified; plan line 1108.
- [ ] **X-R032** 🧠 Grammar — unverified; plan line 1109.
- [ ] **X-R033** 🎧 Listening — unverified; plan line 1110.
- [ ] **X-R034** 📄 Reading — unverified; plan line 1111.
- [ ] **X-R035** ✅ Practice — unverified; plan line 1112.
- [ ] **X-R036** 📝 My Mistakes — unverified; plan line 1116.
- [ ] **X-R037** 📅 Study Planner — unverified; plan line 1117.
- [ ] **X-R038** 📊 Analytics — unverified; plan line 1118.
- [ ] **X-R039** ⭐ My Collection — unverified; plan line 1119.
- [ ] **X-R040** ⏱️ Mock Tests — unverified; plan line 1123.
- [ ] **X-R041** 🤖 AI Tutor — unverified; plan line 1124.
- [ ] **X-R042** ⚙️ Settings — unverified; plan line 1128.
- [ ] **X-R043** 🛠️ Admin — unverified; plan line 1129.
- [ ] **X-R044** 3. Dashboard Layout — unverified; plan line 1133.
- [ ] **X-R045** 4. Learning Workspace — unverified; plan line 1163.
- [ ] **X-R046** 5. Mobile Navigation — unverified; plan line 1175.
- [ ] **X-R047** Home. — unverified; plan line 1179.
- [ ] **X-R048** Library. — unverified; plan line 1180.
- [ ] **X-R049** Practice. — unverified; plan line 1181.
- [ ] **X-R050** Progress. — unverified; plan line 1182.
- [ ] **X-R051** Profile. — unverified; plan line 1183.

### V. DATABASE & SYSTEM ARCHITECTURE

- [ ] **X-R052** 1. Data Architecture — unverified; plan line 1191.
- [ ] **X-R053** 2. Data Relationships — unverified; plan line 1218.
- [ ] **X-R054** 3. Storage — unverified; plan line 1228.
- [ ] **X-R055** Database lưu dữ liệu có cấu trúc. — unverified; plan line 1230.
- [ ] **X-R056** Google Drive hoặc file storage lưu tài liệu gốc và media. — unverified; plan line 1231.
- [ ] **X-R057** Cache hỗ trợ truy cập nội dung thường dùng. — unverified; plan line 1232.
- [ ] **X-R058** Search Index hỗ trợ tìm kiếm toàn văn. — unverified; plan line 1233.
- [ ] **X-R059** 4. Security — unverified; plan line 1235.
- [ ] **X-R060** Xác thực người dùng. — unverified; plan line 1239.
- [ ] **X-R061** Phân quyền truy cập. — unverified; plan line 1240.
- [ ] **X-R062** Bảo vệ dữ liệu cá nhân. — unverified; plan line 1241.
- [ ] **X-R063** Đáp án chấm điểm nằm ở phía máy chủ. — unverified; plan line 1242.
- [ ] **X-R064** Không công khai tài liệu Drive riêng tư. — unverified; plan line 1243.
- [ ] **X-R065** Kiểm tra quyền sử dụng tài liệu trước khi trích xuất và xuất bản. — unverified; plan line 1244.
- [ ] **X-R066** Lưu lịch sử chỉnh sửa nội dung. — unverified; plan line 1245.
- [ ] **X-R067** 5. Reliability — unverified; plan line 1247.
- [ ] **X-R068** Tự lưu tiến độ. — unverified; plan line 1249.
- [ ] **X-R069** Khôi phục phiên học. — unverified; plan line 1250.
- [ ] **X-R070** Nhập file không tạo dữ liệu trùng. — unverified; plan line 1251.
- [ ] **X-R071** Cho phép xử lý lại file lỗi. — unverified; plan line 1252.
- [ ] **X-R072** Lưu phiên bản câu hỏi. — unverified; plan line 1253.
- [ ] **X-R073** Sao lưu dữ liệu. — unverified; plan line 1254.
- [ ] **X-R074** Theo dõi lỗi hệ thống. — unverified; plan line 1255.

### VI. ROADMAP PHÁT TRIỂN

- [ ] **X-R075** PHASE 0 — FOUNDATION — unverified; plan line 1261.
- [ ] **X-R076** Khôi phục quyền truy cập tài liệu. — unverified; plan line 1267.
- [ ] **X-R077** Kiểm kê thư mục Google Drive. — unverified; plan line 1268.
- [ ] **X-R078** Phân loại PDF, audio, video. — unverified; plan line 1269.
- [ ] **X-R079** Kiểm tra các định dạng PDF mẫu. — unverified; plan line 1270.
- [ ] **X-R080** Thiết kế database ban đầu. — unverified; plan line 1271.
- [ ] **X-R081** Xây dựng cơ chế quản lý nguồn. — unverified; plan line 1272.
- [ ] **X-R082** Thiết lập xác thực và phân quyền. — unverified; plan line 1273.
- [ ] **X-R083** PHASE 1 — PDF CONTENT ENGINE + FIRST LEARNING FLOW — unverified; plan line 1281.
- [ ] **X-R084** PDF Extraction. — unverified; plan line 1287.
- [ ] **X-R085** OCR khi cần. — unverified; plan line 1288.
- [ ] **X-R086** Content Classification. — unverified; plan line 1289.
- [ ] **X-R087** PDF Review. — unverified; plan line 1290.
- [ ] **X-R088** Grammar Lesson. — unverified; plan line 1291.
- [ ] **X-R089** Practice Questions. — unverified; plan line 1292.
- [ ] **X-R090** Answer Validation. — unverified; plan line 1293.
- [ ] **X-R091** Auto Save. — unverified; plan line 1294.
- [ ] **X-R092** Basic Progress Tracking. — unverified; plan line 1295.
- [ ] **X-R093** Mở một bài ngữ pháp được nhập từ PDF. — unverified; plan line 1301.
- [ ] **X-R094** Học lý thuyết. — unverified; plan line 1302.
- [ ] **X-R095** Làm bài tập. — unverified; plan line 1303.
- [ ] **X-R096** Xem đáp án và giải thích. — unverified; plan line 1304.
- [ ] **X-R097** Lưu kết quả. — unverified; plan line 1305.
- [ ] **X-R098** Thoát website. — unverified; plan line 1306.
- [ ] **X-R099** Quay lại và tiếp tục học. — unverified; plan line 1307.
- [ ] **X-R100** PHASE 2 — CORE LEARNING PLATFORM — unverified; plan line 1313.
- [ ] **X-R101** Smart Dashboard. — unverified; plan line 1319.
- [ ] **X-R102** Smart Library. — unverified; plan line 1320.
- [ ] **X-R103** Search & Filter. — unverified; plan line 1321.
- [ ] **X-R104** Vocabulary Library. — unverified; plan line 1322.
- [ ] **X-R105** Flashcards. — unverified; plan line 1323.
- [ ] **X-R106** Grammar Courses. — unverified; plan line 1324.
- [ ] **X-R107** Practice Engine. — unverified; plan line 1325.
- [ ] **X-R108** Continue Learning. — unverified; plan line 1326.
- [ ] **X-R109** Favorites. — unverified; plan line 1327.
- [ ] **X-R110** Personal Notes. — unverified; plan line 1328.
- [ ] **X-R111** Responsive Layout. — unverified; plan line 1329.
- [ ] **X-R112** PHASE 3 — CONTENT EXPANSION — unverified; plan line 1339.
- [ ] **X-R113** Nhập thêm tài liệu. — unverified; plan line 1345.
- [ ] **X-R114** Chống trùng nội dung. — unverified; plan line 1346.
- [ ] **X-R115** Quản lý phiên bản. — unverified; plan line 1347.
- [ ] **X-R116** Xử lý file lỗi. — unverified; plan line 1348.
- [ ] **X-R117** Kiểm duyệt câu hỏi. — unverified; plan line 1349.
- [ ] **X-R118** Liên kết audio. — unverified; plan line 1350.
- [ ] **X-R119** Phân loại đầy đủ theo Part. — unverified; plan line 1351.
- [ ] **X-R120** Tìm kiếm toàn văn. — unverified; plan line 1352.
- [ ] **X-R121** Đã nhập. — unverified; plan line 1360.
- [ ] **X-R122** Đã kiểm duyệt. — unverified; plan line 1361.
- [ ] **X-R123** Đã xuất bản. — unverified; plan line 1362.
- [ ] **X-R124** Còn thiếu dữ liệu. — unverified; plan line 1363.
- [ ] **X-R125** Cần xử lý lại. — unverified; plan line 1364.
- [ ] **X-R126** PHASE 4 — ADVANCED LEARNING — unverified; plan line 1368.
- [ ] **X-R127** Listening Studio. — unverified; plan line 1374.
- [ ] **X-R128** Dictation Mode. — unverified; plan line 1375.
- [ ] **X-R129** Advanced Audio Player. — unverified; plan line 1376.
- [ ] **X-R130** Reading Studio. — unverified; plan line 1377.
- [ ] **X-R131** Bilingual Reading. — unverified; plan line 1378.
- [ ] **X-R132** Video Learning. — unverified; plan line 1379.
- [ ] **X-R133** Timestamp Notes. — unverified; plan line 1380.
- [ ] **X-R134** Mistake Review. — unverified; plan line 1381.
- [ ] **X-R135** Spaced Repetition. — unverified; plan line 1382.
- [ ] **X-R136** PHASE 5 — PERSONALIZATION — unverified; plan line 1390.
- [ ] **X-R137** Learning Analytics. — unverified; plan line 1396.
- [ ] **X-R138** Study Planner. — unverified; plan line 1397.
- [ ] **X-R139** Daily Missions. — unverified; plan line 1398.
- [ ] **X-R140** Goal Tracking. — unverified; plan line 1399.
- [ ] **X-R141** Learning Heatmap. — unverified; plan line 1400.
- [ ] **X-R142** Progress Charts. — unverified; plan line 1401.
- [ ] **X-R143** Weakness Analysis. — unverified; plan line 1402.
- [ ] **X-R144** Smart Recommendations. — unverified; plan line 1403.
- [ ] **X-R145** PHASE 6 — EXAM & INTELLIGENCE — unverified; plan line 1411.
- [ ] **X-R146** Mock Test. — unverified; plan line 1417.
- [ ] **X-R147** Test Analytics. — unverified; plan line 1418.
- [ ] **X-R148** AI Explain. — unverified; plan line 1419.
- [ ] **X-R149** AI Learning Coach. — unverified; plan line 1420.
- [ ] **X-R150** AI Vocabulary Assistant. — unverified; plan line 1421.
- [ ] **X-R151** AI Reading Assistant. — unverified; plan line 1422.
- [ ] **X-R152** Gamification. — unverified; plan line 1423.

### VIII. MVP — PHIÊN BẢN NÊN XÂY ĐẦU TIÊN

- [ ] **X-R153** Mục tiêu MVP — unverified; plan line 1468.
- [ ] **X-R154** Kết nối nguồn. — unverified; plan line 1476.
- [ ] **X-R155** Chọn PDF. — unverified; plan line 1477.
- [ ] **X-R156** Nhập nội dung. — unverified; plan line 1478.
- [ ] **X-R157** Trích xuất. — unverified; plan line 1482.
- [ ] **X-R158** Chuẩn hóa. — unverified; plan line 1483.
- [ ] **X-R159** Kiểm duyệt. — unverified; plan line 1484.
- [ ] **X-R160** Xuất bản. — unverified; plan line 1485.
- [ ] **X-R161** Hiển thị bài học thật. — unverified; plan line 1489.
- [ ] **X-R162** Lý thuyết và ví dụ. — unverified; plan line 1490.
- [ ] **X-R163** Liên kết trang nguồn. — unverified; plan line 1491.
- [ ] **X-R164** Làm câu hỏi. — unverified; plan line 1495.
- [ ] **X-R165** Chấm điểm. — unverified; plan line 1496.
- [ ] **X-R166** Xem giải thích. — unverified; plan line 1497.
- [ ] **X-R167** Lưu câu sai. — unverified; plan line 1498.
- [ ] **X-R168** Hiển thị bài đang học. — unverified; plan line 1502.
- [ ] **X-R169** Continue Learning. — unverified; plan line 1503.
- [ ] **X-R170** Tiến độ cơ bản. — unverified; plan line 1504.
- [ ] **X-R171** Lưu kết quả. — unverified; plan line 1508.
- [ ] **X-R172** Khôi phục trạng thái. — unverified; plan line 1509.
- [ ] **X-R173** Lưu lịch sử làm bài. — unverified; plan line 1510.
- [ ] **X-R174** MVP User Flow — unverified; plan line 1512.
- [ ] **X-R175** Một PDF thật được nhập thành công. — unverified; plan line 1555.
- [ ] **X-R176** Nội dung hiển thị đúng và có thể truy ngược nguồn. — unverified; plan line 1556.
- [ ] **X-R177** Câu hỏi được kiểm duyệt trước khi chấm tự động. — unverified; plan line 1557.
- [ ] **X-R178** Người học hoàn thành được một bài luyện. — unverified; plan line 1558.
- [ ] **X-R179** Kết quả được lưu. — unverified; plan line 1559.
- [ ] **X-R180** Lượt làm cũ không bị mất. — unverified; plan line 1560.
- [ ] **X-R181** Tiến độ được khôi phục khi đăng nhập lại. — unverified; plan line 1561.
- [ ] **X-R182** Nhập lại PDF không tạo nội dung trùng. — unverified; plan line 1562.
- [ ] **X-R183** Giao diện hoạt động tốt trên desktop và mobile. — unverified; plan line 1563.

### IX. NGUYÊN TẮC PHÁT TRIỂN

- [ ] **X-R184** 1. Source First — unverified; plan line 1569.
- [ ] **X-R185** 2. Quality Before Quantity — unverified; plan line 1575.
- [ ] **X-R186** 3. Reusable Content — unverified; plan line 1579.
- [ ] **X-R187** 4. User Data Ownership — unverified; plan line 1583.
- [ ] **X-R188** 5. Progressive Enhancement — unverified; plan line 1587.
- [ ] **X-R189** 6. Mobile Friendly — unverified; plan line 1593.
- [ ] **X-R190** 7. Traceability — unverified; plan line 1597.
- [ ] **X-R191** 8. Data Integrity — unverified; plan line 1601.

## Current next work

1. Validate and finish PDF/OCR → review → publish → learn workflow with real files, including source updates and duplicate handling.
2. Map verified grammar coverage to the intended 17-topic syllabus and expand source-read content; preserve reading/audio question groups.
3. Build Listening/Dictation and Reading interactions from verified media/text.
4. Complete analytics, personal vocabulary/mistake classification, adaptive plans, sync, mock tests, AI and gamification.
5. Run each required data/API/UI/mobile/recovery gate; keep unresolved items explicit.

No estimated completion percentage is inferred from test counts.
