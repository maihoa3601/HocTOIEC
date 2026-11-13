# 🚀 TOEIC STUDIO V2
## MASTER FEATURE PLAN
### Nền tảng tự học TOEIC thông minh từ tài liệu Google Drive

**Phiên bản:** 2.0  
**Loại sản phẩm:** Personal TOEIC Learning Platform  
**Định hướng:** PDF-Driven Learning System  
**Nguyên tắc:** Học từ tài liệu thật – Luyện tập tương tác – Theo dõi tiến độ – Cá nhân hóa.

---

# I. TỔNG QUAN SẢN PHẨM

## 1. Mục tiêu

Phát triển TOEIC Studio từ một website quản lý tài liệu thành một hệ thống tự học TOEIC hoàn chỉnh.

Hệ thống sử dụng tài liệu PDF, audio và video từ Google Drive để xây dựng:

- Thư viện học tập thông minh.
- Bài học ngữ pháp tương tác.
- Kho từ vựng và flashcard.
- Hệ thống luyện tập TOEIC Part 1–7.
- Luyện nghe và chép chính tả.
- Luyện đọc hiểu và tài liệu song ngữ.
- Sổ câu sai và lịch ôn tập.
- Thi thử TOEIC.
- Dashboard học tập cá nhân.
- Trợ lý AI giải thích kiến thức.
- Hệ thống quản trị và xử lý tài liệu.

## 2. Nguồn nội dung

Theo thông tin đã kiểm kê, Google Drive chứa các nhóm tài liệu:

| Nhóm | Nội dung | Module sử dụng |
|---|---|---|
| Vocabulary | Từ vựng TOEIC | Vocabulary Studio |
| Grammar | 17 chủ đề ngữ pháp | Grammar Studio |
| Part 1 | Photographs | Listening Practice |
| Part 2 | Question–Response | Listening Practice |
| Part 3 | Conversations | Listening Practice |
| Part 4 | Talks | Listening Practice |
| Part 5 | Incomplete Sentences | Reading Practice |
| Part 6 | Text Completion | Reading Practice |
| Part 7 | Reading Comprehension | Reading Practice |
| Dictation | Nghe chép chính tả | Listening Studio |
| TED Talks | Video, audio và tài liệu học | Video & Reading Studio |

**Lưu ý:** Nội dung bên trong từng PDF chưa được xác minh do vấn đề quyền truy cập. Các dạng bài, đáp án, transcript và nội dung tương tác phải được đối chiếu với tài liệu thật trước khi xuất bản.

## 3. Quy trình học tập chính

TOEIC Studio cần hỗ trợ một chu trình học khép kín:

**Khám phá tài liệu → Học lý thuyết → Luyện tập → Chữa bài → Lưu câu sai → Ôn tập → Theo dõi tiến bộ.**

Hệ thống phải ghi nhớ trạng thái người học xuyên suốt quá trình này.

---

# II. KIẾN TRÚC CHỨC NĂNG

TOEIC Studio V2 được chia thành bốn hệ thống.

| Hệ thống | Module | Vai trò |
|---|---|---|
| Content Engine | Drive, PDF, OCR, Import, Review | Chuẩn hóa tài liệu thành nội dung học |
| Learning Engine | Vocabulary, Grammar, Practice, Listening, Reading | Cung cấp bài học và bài tập tương tác |
| Personal Learning Engine | Dashboard, Progress, Mistakes, SRS, Planner | Quản lý quá trình học cá nhân |
| Intelligence & Management | Mock Test, AI Tutor, Analytics, Admin | Phân tích, hỗ trợ và quản trị |

## 1. Content Engine

Đây là nền tảng dữ liệu.

Nhiệm vụ chính là chuyển tài liệu gốc thành dữ liệu có cấu trúc, có thể tìm kiếm, chỉnh sửa và sử dụng lại.

## 2. Learning Engine

Sử dụng dữ liệu đã kiểm duyệt để tạo bài học và bài luyện.

Các module học tập phải dùng chung ngân hàng nội dung, thay vì tạo các bản sao câu hỏi độc lập.

## 3. Personal Learning Engine

Quản lý tiến độ, ghi chú, từ vựng cá nhân, lỗi sai và kết quả luyện tập của từng người dùng.

## 4. Intelligence & Management

Quản lý chất lượng nội dung, cung cấp các bài thi thử và bổ sung khả năng học tập cá nhân hóa bằng AI.

---

# III. CHI TIẾT CÁC MODULE

# MODULE 01 — SMART DASHBOARD

**Ưu tiên: P0**

Dashboard là trung tâm học tập cá nhân.

### 1. Learning Overview

Hiển thị:

- Mục tiêu TOEIC.
- Điểm thi thử gần nhất nếu có.
- Tổng số bài đã hoàn thành.
- Tổng thời gian học.
- Số từ vựng đã học.
- Số ngày học liên tiếp.
- Tiến độ hoàn thành mục tiêu.

Không tạo số liệu giả khi người dùng chưa có lịch sử học.

### 2. Continue Learning

Tự động hiển thị bài đang học dở.

Mỗi thẻ bài học gồm:

- Tên bài.
- Loại nội dung.
- Tiến độ hoàn thành.
- Thời điểm học gần nhất.
- Nút tiếp tục.

Khi nhấn **Continue**, hệ thống khôi phục đúng vị trí đang học.

### 3. Today's Learning

Danh sách nhiệm vụ học tập trong ngày:

- Từ vựng đến hạn ôn.
- Bài đang học.
- Câu sai cần luyện lại.
- Mục tiêu thời gian học.
- Bài học được đề xuất.

### 4. Learning Analytics

Các biểu đồ:

- Thời gian học theo ngày.
- Số bài hoàn thành.
- Tỷ lệ đúng theo Part.
- Tiến bộ qua các lần luyện.
- Kết quả thi thử.

### 5. Study Streak

Theo dõi số ngày học liên tiếp dựa trên hoạt động học hợp lệ.

### 6. Quick Actions

Các hành động nhanh:

- Continue Learning.
- Start Practice.
- Review Vocabulary.
- Review Mistakes.
- Open Library.

---

# MODULE 02 — GOOGLE DRIVE & PDF CONTENT ENGINE

**Ưu tiên: P0 — Nền tảng bắt buộc**

## 1. Google Drive Integration

Các tính năng:

- Kết nối nguồn Google Drive được cấp quyền.
- Quét thư mục và thư mục con.
- Nhập danh sách PDF, audio và video.
- Đồng bộ thủ công.
- Phát hiện file mới.
- Phát hiện file cập nhật.
- Theo dõi file không còn truy cập được.
- Quản lý trạng thái đồng bộ.

## 2. Smart File Detection

Nhận diện:

- Tên file.
- Định dạng.
- Kích thước.
- Drive File ID.
- Phiên bản file.
- Dấu vân tay nội dung.
- Đường dẫn thư mục.
- Trạng thái xử lý.

Sử dụng dấu vân tay nội dung để phát hiện file trùng, thay vì chỉ dựa vào tên.

## 3. PDF Extraction

Quy trình:

**PDF → Extract → Structure → Validate → Review → Publish**

Các bước:

1. Đọc văn bản có sẵn trong PDF.
2. Sử dụng OCR đối với trang scan cần thiết.
3. Nhận diện tiêu đề và mục lục.
4. Tách lý thuyết, ví dụ và bài tập.
5. Nhận diện câu hỏi và lựa chọn.
6. Nhận diện đáp án và giải thích.
7. Giữ bảng, hình ảnh và bố cục quan trọng.
8. Liên kết nội dung với số trang nguồn.

## 4. Content Classification

Phân loại nội dung thành:

- Course.
- Lesson.
- Topic.
- Grammar Theory.
- Vocabulary.
- Reading Passage.
- Question.
- Answer.
- Explanation.
- Transcript.
- Media.

## 5. Source Tracking

Mỗi nội dung phải lưu:

- File gốc.
- Drive ID.
- Trang nguồn.
- Phiên bản nhập.
- Trạng thái kiểm duyệt.
- Thời điểm cập nhật.

Người học có thể mở lại trang PDF gốc từ bài học hoặc phần chữa bài nếu có quyền truy cập phù hợp.

## 6. Import Status

Trạng thái xử lý:

| Trạng thái | Ý nghĩa |
|---|---|
| Pending | Chưa xử lý |
| Processing | Đang xử lý |
| Needs Review | Cần kiểm tra |
| Approved | Đã kiểm duyệt |
| Published | Đã xuất bản |
| Failed | Xử lý lỗi |

Các file lỗi có thể được xử lý lại riêng lẻ.

Quá trình nhập phải có cơ chế chống tạo dữ liệu trùng khi chạy lại.

## 7. Content Review

Màn hình kiểm duyệt chia hai phần:

**Bên trái:** PDF gốc.

**Bên phải:** Nội dung trích xuất có thể chỉnh sửa.

Người quản trị có thể:

- Sửa văn bản OCR.
- Sửa câu hỏi.
- Sửa lựa chọn.
- Kiểm tra đáp án.
- Kiểm tra hình ảnh.
- Liên kết audio.
- Xác nhận trang nguồn.
- Duyệt và xuất bản bài học.

Câu hỏi chưa xác minh đáp án không được đưa vào hệ thống chấm điểm tự động.

## 8. Content Origin

Phân biệt ba loại nội dung:

- **Original:** Nội dung gốc trong PDF.
- **Adapted:** Nội dung chỉnh sửa từ PDF.
- **Generated:** Nội dung được AI hoặc hệ thống tạo thêm.

Nội dung sinh tự động phải được gắn nhãn rõ ràng.

---

# MODULE 03 — SMART LIBRARY

**Ưu tiên: P0**

Thư viện giúp người học tìm và quản lý tài liệu.

## 1. Library View

Hỗ trợ hai chế độ:

- Grid View.
- List View.

Mỗi tài liệu hiển thị:

- Thumbnail.
- Tên.
- Loại tài liệu.
- Khóa học.
- TOEIC Part.
- Trạng thái học.
- Tiến độ hoàn thành.

## 2. Smart Search

Tìm kiếm theo:

- Tên tài liệu.
- Tên bài học.
- Từ vựng.
- Chủ đề ngữ pháp.
- Nội dung câu hỏi.
- Nội dung PDF đã được lập chỉ mục.

## 3. Advanced Filter

Bộ lọc:

**Category**

- All.
- Vocabulary.
- Grammar.
- Listening.
- Reading.
- Mock Test.
- TED Talks.

**Status**

- Not Started.
- In Progress.
- Completed.
- Bookmarked.

## 4. My Collection

Người dùng có thể:

- Đánh dấu yêu thích.
- Ghim tài liệu.
- Tạo playlist.
- Xem lịch sử truy cập.
- Lưu tài liệu cần học sau.

---

# MODULE 04 — VOCABULARY STUDIO

**Ưu tiên: P0**

## 1. Vocabulary Library

Phân loại từ theo:

- Khóa học.
- Bài học.
- Chủ đề.
- TOEIC Part.
- Danh sách cá nhân.

Thông tin từ vựng:

- Từ tiếng Anh.
- Nghĩa.
- Loại từ.
- Phiên âm.
- Ví dụ.
- Bản dịch.
- Audio phát âm.
- Trang tài liệu nguồn.

Chỉ hiển thị những trường có dữ liệu được xác nhận. Nội dung bổ sung bằng AI phải được gắn nhãn.

## 2. Flashcard

Các chế độ:

- English → Vietnamese.
- Vietnamese → English.
- Random.
- Review Due Cards.

## 3. Memory Rating

Người học chọn:

- Again.
- Hard.
- Good.
- Easy.

Hệ thống dựa trên phản hồi để lên lịch ôn tập.

## 4. Vocabulary Practice

Hỗ trợ:

- Chọn nghĩa.
- Gõ từ.
- Điền từ.
- Ghép từ và nghĩa.
- Nhận diện từ qua audio.

## 5. Personal Vocabulary

Cho phép lưu từ từ:

- Reading.
- Grammar.
- Practice.
- Listening Transcript.
- TED Talks.

## 6. Vocabulary Statistics

Thống kê:

- Tổng số từ đã lưu.
- Từ mới.
- Từ đã nhớ.
- Từ khó.
- Từ đến hạn ôn.
- Tỷ lệ ghi nhớ.

---

# MODULE 05 — GRAMMAR STUDIO

**Ưu tiên: P0**

Tổ chức theo 17 chủ đề ngữ pháp có trong Drive.

## 1. Grammar Course

Mỗi bài bao gồm:

- Tiêu đề.
- Mục tiêu bài học.
- Lý thuyết.
- Công thức.
- Ví dụ.
- Lưu ý.
- Bài tập.
- Tài liệu nguồn.

## 2. Interactive Learning

Các chức năng:

- Mục lục bài học.
- Chuyển nhanh giữa các phần.
- Đánh dấu nội dung quan trọng.
- Ghi chú cá nhân.
- Lưu vị trí đang đọc.
- Tiếp tục học.

## 3. Grammar Practice

Sau mỗi phần lý thuyết, người học có thể luyện tập ngay với các câu hỏi liên quan.

## 4. Grammar Review

Khi trả lời sai:

- Hiển thị giải thích.
- Chỉ ra kiến thức liên quan.
- Liên kết về phần lý thuyết.
- Cho phép lưu để ôn lại.

## 5. Grammar Analytics

Thống kê:

- Số bài hoàn thành.
- Tỷ lệ đúng từng chủ đề.
- Chủ đề thường sai.
- Chủ đề cần ôn tập.

---

# MODULE 06 — TOEIC PRACTICE ENGINE

**Ưu tiên: P0**

Đây là hệ thống luyện tập trung tâm.

## 1. Practice by Part

### Listening

- Part 1: Photographs.
- Part 2: Question–Response.
- Part 3: Conversations.
- Part 4: Talks.

### Reading

- Part 5: Incomplete Sentences.
- Part 6: Text Completion.
- Part 7: Reading Comprehension.

## 2. Practice Modes

### Learning Mode

- Làm từng câu.
- Không giới hạn thời gian.
- Xem đáp án sau khi trả lời.
- Xem giải thích.
- Lưu câu hỏi.

### Practice Mode

- Làm một nhóm câu hỏi.
- Nộp bài để xem kết quả.
- Hiển thị câu đúng và sai.
- Lưu lượt làm.

### Test Mode

- Có thời gian giới hạn.
- Không hiển thị đáp án trước khi nộp.
- Tự động chấm các câu đủ điều kiện.
- Hiển thị kết quả sau khi hoàn thành.

## 3. Question Types

Hỗ trợ theo dạng thực tế trong PDF:

- Multiple Choice.
- Fill in the Blank.
- Matching.
- Short Answer.
- Question Group.
- Audio-based Question.
- Passage-based Question.

## 4. Question Navigation

Hiển thị:

- Tổng số câu.
- Câu đã trả lời.
- Câu chưa trả lời.
- Câu đánh dấu.
- Thời gian làm bài.

## 5. Auto Save

Tự động lưu:

- Câu trả lời.
- Câu đánh dấu.
- Vị trí câu hiện tại.
- Thời gian đã làm.
- Trạng thái phiên.

## 6. Answer Review

Hiển thị:

- Lựa chọn của người học.
- Đáp án đúng.
- Giải thích.
- Nội dung liên quan.
- Trang PDF nguồn.

## 7. Retake

Cho phép làm lại bài.

Mỗi lượt làm được lưu riêng, không ghi đè lịch sử.

## 8. Report Question

Người học báo lỗi:

- Sai đáp án.
- Sai câu hỏi.
- Thiếu hình.
- Thiếu audio.
- Giải thích không chính xác.

---

# MODULE 07 — LISTENING STUDIO

**Ưu tiên: P1**

## 1. Advanced Audio Player

Hỗ trợ:

- Play/Pause.
- Tua nhanh và tua lại.
- Điều chỉnh tốc độ.
- Lặp đoạn A–B.
- Ghi nhớ vị trí đang nghe.
- Đánh dấu đoạn khó.

## 2. Listening Practice

Hiển thị audio bên cạnh:

- Câu hỏi.
- Đáp án lựa chọn.
- Hình minh họa.
- PDF nguồn.

## 3. Dictation Mode

Người học:

1. Nghe audio.
2. Nhập nội dung nghe được.
3. Nộp câu trả lời.
4. Xem transcript.
5. Đối chiếu từ sai hoặc thiếu.
6. Lưu đoạn cần luyện lại.

## 4. Transcript Mode

Các chế độ:

- Hide Transcript.
- Show Transcript.
- Highlight Vocabulary.
- Save Vocabulary.

## 5. Sentence Listening

Chỉ bật khi có mốc thời gian chính xác.

Các tính năng nâng cao:

- Nghe từng câu.
- Lặp từng câu.
- Tô sáng transcript đồng bộ.
- Chuyển đến câu tương ứng.

---

# MODULE 08 — READING STUDIO

**Ưu tiên: P1**

## 1. Reading Viewer

Hỗ trợ:

- Nội dung tiếng Anh.
- Bản dịch tiếng Việt nếu có.
- Chế độ song ngữ.
- Điều chỉnh cỡ chữ.
- Ghi nhớ vị trí đọc.

## 2. Interactive Reading

Người dùng có thể:

- Chọn từ.
- Lưu từ vựng.
- Ghi chú.
- Đánh dấu đoạn văn.
- Tìm kiếm nội dung.

## 3. Reading Practice

Hiển thị câu hỏi bên cạnh đoạn đọc.

Các nhóm câu hỏi dùng chung đoạn đọc được giữ nguyên.

## 4. Document Layout

Bảo toàn các thành phần quan trọng:

- Email.
- Advertisement.
- Notice.
- Table.
- Chart.
- Image.
- Multiple Passages.

## 5. TED Talks Learning

Kết hợp:

- Video.
- Transcript.
- Bản dịch nếu có.
- Ghi chú.
- Từ vựng.
- Vị trí video.

---

# MODULE 09 — VIDEO LEARNING

**Ưu tiên: P1**

## 1. Video Player

Hỗ trợ video từ nguồn được cấp quyền.

Các chức năng:

- Play/Pause.
- Playback Speed.
- Continue Watching.
- Fullscreen.
- Learning Progress.

## 2. Timestamp Notes

Ghi chú liên kết với thời điểm trong video.

Ví dụ:

00:05:20 — Cách xác định Main Idea.

00:12:45 — Từ vựng quan trọng.

00:18:30 — Mẹo làm bài TOEIC.

Nhấn vào ghi chú để quay đến thời điểm tương ứng.

## 3. Video Bookmarks

Đánh dấu đoạn quan trọng để xem lại.

## 4. Related Lessons

Gợi ý bài học liên quan dựa trên chủ đề và metadata đã xác nhận.

---

# MODULE 10 — MISTAKE REVIEW

**Ưu tiên: P1**

## 1. My Mistakes

Tự động lưu câu trả lời sai từ các lượt làm bài.

## 2. Mistake Classification

Phân loại theo:

- TOEIC Part.
- Chủ đề.
- Bài học.
- Dạng câu hỏi.
- Số lần trả lời sai.

## 3. Mistake Reason

Người học có thể ghi nguyên nhân:

- Thiếu từ vựng.
- Sai ngữ pháp.
- Nghe nhầm.
- Đọc thiếu thông tin.
- Thiếu thời gian.
- Nhầm đáp án.

## 4. Review Mistakes

Tạo bài ôn từ:

- Câu sai.
- Câu đã đánh dấu.
- Câu thường sai.
- Câu chưa nắm vững.

## 5. Learning Connection

Đề xuất quay lại:

- Bài ngữ pháp.
- Từ vựng liên quan.
- Đoạn nghe.
- Đoạn đọc.

## 6. Mistake Progress

Theo dõi:

- Số lần sai.
- Lần ôn gần nhất.
- Kết quả gần nhất.
- Tình trạng đã nắm vững hay chưa.

---

# MODULE 11 — STUDY PLANNER

**Ưu tiên: P1**

## 1. Goal Setting

Người học có thể thiết lập:

- Điểm TOEIC mục tiêu.
- Thời hạn dự kiến.
- Thời gian học mỗi ngày.
- Số từ vựng mỗi ngày.
- Số câu luyện tập mỗi ngày.

## 2. Learning Schedule

Tạo kế hoạch học theo:

- Ngày.
- Tuần.
- Chủ đề.
- TOEIC Part.

## 3. Daily Tasks

Các nhiệm vụ:

- Học bài mới.
- Ôn từ vựng.
- Luyện câu sai.
- Luyện Listening.
- Luyện Reading.

## 4. Schedule Tracking

Hiển thị:

- Nhiệm vụ hoàn thành.
- Nhiệm vụ chưa hoàn thành.
- Tiến độ mục tiêu.
- Lịch sử học.

## 5. Adaptive Planner

Ở giai đoạn nâng cao, đề xuất điều chỉnh lịch học dựa trên kết quả thật.

---

# MODULE 12 — MOCK TEST

**Ưu tiên: P2**

Chỉ triển khai đầy đủ khi ngân hàng đề đã đủ và được kiểm duyệt.

## 1. Test Modes

- Listening Test.
- Reading Test.
- Full TOEIC Test.

## 2. Exam Interface

Hỗ trợ:

- Đồng hồ đếm ngược.
- Phiếu trả lời.
- Điều hướng câu.
- Đánh dấu câu.
- Lưu trạng thái.
- Tự động nộp khi hết giờ.

## 3. Exam Result

Hiển thị:

- Số câu đúng.
- Số câu sai.
- Accuracy.
- Kết quả theo Part.
- Thời gian hoàn thành.

Chỉ quy đổi sang điểm TOEIC khi có phương pháp quy đổi phù hợp và có thể giải thích được.

## 4. Test Analytics

- So sánh các lần thi.
- Phân tích Part yếu.
- Phân tích dạng câu thường sai.
- Theo dõi xu hướng tiến bộ.

---

# MODULE 13 — LEARNING ANALYTICS

**Ưu tiên: P1**

## 1. Study Activity

Biểu đồ thời gian học theo ngày và tuần.

## 2. Learning Heatmap

Hiển thị lịch hoạt động học tập.

## 3. Accuracy by Part

Thống kê tỷ lệ đúng của từng Part.

## 4. Vocabulary Progress

Theo dõi số từ đã học và khả năng ghi nhớ.

## 5. Grammar Progress

Thống kê kết quả theo 17 chủ đề.

## 6. Score History

Biểu đồ kết quả qua các lần luyện và thi thử.

## 7. Weakness Analysis

Xác định:

- Part yếu nhất.
- Chủ đề ngữ pháp yếu.
- Từ thường quên.
- Dạng câu thường sai.
- Bài học cần ôn lại.

Mọi thống kê phải có nguồn từ hoạt động học thực tế.

---

# MODULE 14 — AI TOEIC ASSISTANT

**Ưu tiên: P2**

AI là lớp hỗ trợ, không thay thế nội dung và đáp án đã kiểm duyệt.

## 1. AI Explain

Giải thích:

- Vì sao đáp án đúng.
- Vì sao đáp án khác sai.
- Kiến thức ngữ pháp.
- Từ vựng quan trọng.
- Ví dụ tương tự.

## 2. AI Learning Coach

Phân tích tiến độ và đề xuất kế hoạch học phù hợp.

## 3. AI Vocabulary Assistant

Hỗ trợ:

- Giải thích từ.
- Tạo ví dụ.
- Tạo flashcard.
- Tạo câu hỏi luyện tập.

## 4. AI Reading Assistant

Hỗ trợ:

- Giải thích đoạn đọc.
- Phân tích cấu trúc câu.
- Làm rõ từ vựng.
- Tóm tắt nội dung.

## 5. AI Content Generation

Tạo bài tập bổ sung từ nội dung đã có quyền sử dụng.

Bài tập do AI tạo phải có nhãn Generated và không được nhầm với câu hỏi gốc.

---

# MODULE 15 — GAMIFICATION

**Ưu tiên: P2**

Mục tiêu là tăng động lực học tập.

## 1. Study Streak

Ghi nhận số ngày học liên tiếp.

## 2. Experience Points

Nhận XP khi:

- Hoàn thành bài học.
- Làm bài luyện.
- Ôn từ vựng.
- Hoàn thành nhiệm vụ.

## 3. Achievements

Ví dụ:

- First Lesson.
- 7-Day Streak.
- 100 Words Learned.
- Grammar Master.
- Listening Explorer.

## 4. Weekly Goals

Hiển thị tiến độ mục tiêu mỗi tuần.

Gamification không được làm sai lệch kết quả học hoặc khuyến khích làm bài qua loa để tích điểm.

---

# MODULE 16 — ADMIN & CONTENT MANAGEMENT

**Ưu tiên: P0**

## 1. Admin Dashboard

Thống kê:

- Tổng số file.
- File đã xử lý.
- File lỗi.
- File cần kiểm duyệt.
- Bài đã xuất bản.
- Câu hỏi chưa xác minh.
- Báo lỗi từ người học.

## 2. Content Management

Quản lý:

- Course.
- Lesson.
- Vocabulary.
- Grammar.
- Questions.
- Answers.
- Reading Passages.
- Audio.
- Video.

## 3. PDF Review

Xem PDF gốc và nội dung trích xuất cạnh nhau.

## 4. Question Review

Chỉnh sửa và xác minh câu hỏi, đáp án, giải thích.

## 5. Import History

Theo dõi lịch sử nhập và xử lý tài liệu.

## 6. Content Versioning

Lưu phiên bản nội dung.

Khi chỉnh sửa câu hỏi, kết quả làm bài cũ vẫn liên kết với phiên bản mà người học đã làm.

## 7. Permissions

Phân quyền cơ bản:

- Admin.
- Content Editor.
- Learner.

---

# IV. THIẾT KẾ GIAO DIỆN

## 1. Design Direction

TOEIC Studio nên có giao diện:

- Hiện đại.
- Tối giản.
- Dễ tập trung học.
- Thân thiện.
- Responsive.
- Hỗ trợ Dark Mode.
- Phù hợp cả desktop và mobile.

## 2. Desktop Navigation

Sidebar đề xuất:

**LEARNING**

- 🏠 Dashboard
- 📚 Library
- 📖 Vocabulary
- 🧠 Grammar
- 🎧 Listening
- 📄 Reading
- ✅ Practice

**MY LEARNING**

- 📝 My Mistakes
- 📅 Study Planner
- 📊 Analytics
- ⭐ My Collection

**ADVANCED**

- ⏱️ Mock Tests
- 🤖 AI Tutor

**SYSTEM**

- ⚙️ Settings
- 🛠️ Admin

Các mục chưa triển khai có thể ẩn thay vì hiển thị như tính năng đã hoạt động.

## 3. Dashboard Layout

```text
┌────────────────────────────────────────────────────────┐
│ TOEIC STUDIO                           Search   Profile│
├───────────────┬────────────────────────────────────────┤
│               │                                        │
│ Dashboard     │ Welcome Back 👋                        │
│ Library       │ Your TOEIC Learning Journey            │
│ Vocabulary    │                                        │
│ Grammar       │ ┌─────────┐ ┌──────────┐ ┌──────────┐ │
│ Listening     │ │ Target  │ │ Streak   │ │ Progress │ │
│ Reading       │ │ 800+    │ │ 12 days  │ │ 65%      │ │
│ Practice      │ └─────────┘ └──────────┘ └──────────┘ │
│               │                                        │
│ My Mistakes   │ Continue Learning                      │
│ Study Planner │ ┌────────────┐ ┌────────────┐          │
│ Analytics     │ │ Grammar    │ │ Listening  │          │
│               │ │ Lesson     │ │ Practice   │          │
│ Mock Tests    │ └────────────┘ └────────────┘          │
│ AI Tutor      │                                        │
│               │ Today's Mission                        │
│ Settings      │                                        │
│               │ □ Review Vocabulary                    │
│               │ □ Practice Part 5                      │
│               │ □ Listening 20 minutes                 │
│               │                                        │
└───────────────┴────────────────────────────────────────┘
```

## 4. Learning Workspace

Màn hình học trên desktop nên ưu tiên bố cục hai cột:

**Cột trái:** Lý thuyết, PDF, đoạn đọc hoặc media.

**Cột phải:** Câu hỏi, ghi chú, từ vựng hoặc nội dung tương tác.

Người học có thể thay đổi kích thước hai cột.

Trên mobile, bố cục chuyển thành các tab hoặc khối xếp dọc.

## 5. Mobile Navigation

Thanh điều hướng dưới:

- Home.
- Library.
- Practice.
- Progress.
- Profile.

Các module khác nằm trong menu mở rộng.

---

# V. DATABASE & SYSTEM ARCHITECTURE

## 1. Data Architecture

Hệ thống được thiết kế quanh các nhóm dữ liệu sau.

| Nhóm | Bảng dữ liệu chính |
|---|---|
| Users | users, user_settings |
| Learning Content | courses, lessons, topics |
| Source Files | source_files, source_versions, import_jobs |
| Content Review | content_revisions, review_tasks |
| Vocabulary | vocabulary, vocabulary_examples |
| Grammar | grammar_topics, grammar_sections |
| Questions | questions, question_versions, question_groups |
| Answers | answer_keys, explanations |
| Reading | reading_passages |
| Media | media_assets, transcripts |
| Practice | practice_sessions, user_answers |
| Vocabulary Review | user_vocabulary, vocabulary_reviews |
| Mistakes | user_mistakes |
| Learning Progress | lesson_progress, study_sessions |
| Notes | user_notes, bookmarks |
| Study Planner | study_goals, study_tasks |
| Mock Tests | tests, test_attempts |
| Administration | content_reports, audit_logs |

Đây là danh sách logic ban đầu. Tên bảng và quan hệ cụ thể cần được hoàn thiện sau khi phân tích PDF mẫu.

## 2. Data Relationships

Luồng nội dung:

**Source File → Source Version → Lesson → Question Group → Question Version → Answer Key**

Luồng người học:

**User → Practice Session → User Answers → Result → Mistake Review → Progress**

## 3. Storage

- Database lưu dữ liệu có cấu trúc.
- Google Drive hoặc file storage lưu tài liệu gốc và media.
- Cache hỗ trợ truy cập nội dung thường dùng.
- Search Index hỗ trợ tìm kiếm toàn văn.

## 4. Security

Các yêu cầu:

- Xác thực người dùng.
- Phân quyền truy cập.
- Bảo vệ dữ liệu cá nhân.
- Đáp án chấm điểm nằm ở phía máy chủ.
- Không công khai tài liệu Drive riêng tư.
- Kiểm tra quyền sử dụng tài liệu trước khi trích xuất và xuất bản.
- Lưu lịch sử chỉnh sửa nội dung.

## 5. Reliability

- Tự lưu tiến độ.
- Khôi phục phiên học.
- Nhập file không tạo dữ liệu trùng.
- Cho phép xử lý lại file lỗi.
- Lưu phiên bản câu hỏi.
- Sao lưu dữ liệu.
- Theo dõi lỗi hệ thống.

---

# VI. ROADMAP PHÁT TRIỂN

## PHASE 0 — FOUNDATION

**Mục tiêu:** Chuẩn bị dữ liệu và kiến trúc.

### Công việc

- Khôi phục quyền truy cập tài liệu.
- Kiểm kê thư mục Google Drive.
- Phân loại PDF, audio, video.
- Kiểm tra các định dạng PDF mẫu.
- Thiết kế database ban đầu.
- Xây dựng cơ chế quản lý nguồn.
- Thiết lập xác thực và phân quyền.

### Điều kiện hoàn thành

Có thể truy cập và kiểm tra các tài liệu mẫu được cấp quyền.

---

## PHASE 1 — PDF CONTENT ENGINE + FIRST LEARNING FLOW

**Mục tiêu:** Chuyển một bài thật từ PDF thành bài học hoàn chỉnh.

### Công việc

- PDF Extraction.
- OCR khi cần.
- Content Classification.
- PDF Review.
- Grammar Lesson.
- Practice Questions.
- Answer Validation.
- Auto Save.
- Basic Progress Tracking.

### Điều kiện hoàn thành

Người học có thể:

1. Mở một bài ngữ pháp được nhập từ PDF.
2. Học lý thuyết.
3. Làm bài tập.
4. Xem đáp án và giải thích.
5. Lưu kết quả.
6. Thoát website.
7. Quay lại và tiếp tục học.

Nội dung phải truy ngược được về trang PDF nguồn.

---

## PHASE 2 — CORE LEARNING PLATFORM

**Mục tiêu:** Hoàn thiện trải nghiệm tự học cơ bản.

### Công việc

- Smart Dashboard.
- Smart Library.
- Search & Filter.
- Vocabulary Library.
- Flashcards.
- Grammar Courses.
- Practice Engine.
- Continue Learning.
- Favorites.
- Personal Notes.
- Responsive Layout.

### Điều kiện hoàn thành

Người học có thể sử dụng thống nhất các chức năng thư viện, ngữ pháp, từ vựng và luyện tập.

Tiến độ được lưu theo tài khoản.

---

## PHASE 3 — CONTENT EXPANSION

**Mục tiêu:** Mở rộng nội dung từ toàn bộ tài liệu hợp lệ trong Drive.

### Công việc

- Nhập thêm tài liệu.
- Chống trùng nội dung.
- Quản lý phiên bản.
- Xử lý file lỗi.
- Kiểm duyệt câu hỏi.
- Liên kết audio.
- Phân loại đầy đủ theo Part.
- Tìm kiếm toàn văn.

### Điều kiện hoàn thành

Mọi file đều có trạng thái rõ ràng.

Biết được tài liệu nào:

- Đã nhập.
- Đã kiểm duyệt.
- Đã xuất bản.
- Còn thiếu dữ liệu.
- Cần xử lý lại.

---

## PHASE 4 — ADVANCED LEARNING

**Mục tiêu:** Phát triển khả năng luyện TOEIC chuyên sâu.

### Công việc

- Listening Studio.
- Dictation Mode.
- Advanced Audio Player.
- Reading Studio.
- Bilingual Reading.
- Video Learning.
- Timestamp Notes.
- Mistake Review.
- Spaced Repetition.

### Điều kiện hoàn thành

Người học có thể luyện nghe, đọc, chép chính tả và ôn câu sai bằng nội dung được liên kết chính xác với tài liệu nguồn.

---

## PHASE 5 — PERSONALIZATION

**Mục tiêu:** Cá nhân hóa quá trình học tập.

### Công việc

- Learning Analytics.
- Study Planner.
- Daily Missions.
- Goal Tracking.
- Learning Heatmap.
- Progress Charts.
- Weakness Analysis.
- Smart Recommendations.

### Điều kiện hoàn thành

Các thống kê và đề xuất được xây dựng từ dữ liệu học thực tế.

---

## PHASE 6 — EXAM & INTELLIGENCE

**Mục tiêu:** Hoàn thiện các tính năng nâng cao.

### Công việc

- Mock Test.
- Test Analytics.
- AI Explain.
- AI Learning Coach.
- AI Vocabulary Assistant.
- AI Reading Assistant.
- Gamification.

### Điều kiện hoàn thành

Hệ thống có thể hỗ trợ người học đánh giá năng lực, phân tích điểm yếu và nhận gợi ý học tập phù hợp.

---

# VII. MA TRẬN ƯU TIÊN

| Module | P0 | P1 | P2 |
|---|:---:|:---:|:---:|
| Google Drive Integration | ✅ | | |
| PDF Extraction & Review | ✅ | | |
| Database Foundation | ✅ | | |
| Admin Content Management | ✅ | | |
| Smart Library | ✅ | | |
| Smart Search cơ bản | ✅ | | |
| Dashboard cơ bản | ✅ | | |
| Vocabulary Library | ✅ | | |
| Flashcards cơ bản | ✅ | | |
| Grammar Studio | ✅ | | |
| Practice Engine | ✅ | | |
| Auto Save | ✅ | | |
| Continue Learning | ✅ | | |
| Listening Studio | | ✅ | |
| Dictation | | ✅ | |
| Reading Studio | | ✅ | |
| Video Learning | | ✅ | |
| Mistake Review | | ✅ | |
| Spaced Repetition | | ✅ | |
| Study Planner | | ✅ | |
| Learning Analytics | | ✅ | |
| Mock Test | | | ✅ |
| AI Tutor | | | ✅ |
| Gamification | | | ✅ |

**P0:** Nền tảng thiết yếu.  
**P1:** Nâng cao chất lượng và hiệu quả tự học.  
**P2:** Mở rộng khi nền tảng và dữ liệu đã ổn định.

---

# VIII. MVP — PHIÊN BẢN NÊN XÂY ĐẦU TIÊN

## Mục tiêu MVP

Xây dựng một quy trình hoàn chỉnh từ tài liệu PDF đến kết quả học tập.

### Phạm vi

**1. Google Drive**

- Kết nối nguồn.
- Chọn PDF.
- Nhập nội dung.

**2. PDF Engine**

- Trích xuất.
- Chuẩn hóa.
- Kiểm duyệt.
- Xuất bản.

**3. Grammar**

- Hiển thị bài học thật.
- Lý thuyết và ví dụ.
- Liên kết trang nguồn.

**4. Practice**

- Làm câu hỏi.
- Chấm điểm.
- Xem giải thích.
- Lưu câu sai.

**5. Dashboard**

- Hiển thị bài đang học.
- Continue Learning.
- Tiến độ cơ bản.

**6. Account & Progress**

- Lưu kết quả.
- Khôi phục trạng thái.
- Lưu lịch sử làm bài.

## MVP User Flow

```text
GOOGLE DRIVE
     │
     ▼
SELECT PDF
     │
     ▼
PDF EXTRACTION
     │
     ▼
CONTENT REVIEW
     │
     ▼
PUBLISH LESSON
     │
     ▼
GRAMMAR LEARNING
     │
     ▼
PRACTICE
     │
     ▼
ANSWER REVIEW
     │
     ▼
SAVE MISTAKES
     │
     ▼
LEARNING PROGRESS
     │
     ▼
DASHBOARD
     │
     ▼
CONTINUE LEARNING
```

### MVP Acceptance Criteria

MVP hoàn thành khi:

- Một PDF thật được nhập thành công.
- Nội dung hiển thị đúng và có thể truy ngược nguồn.
- Câu hỏi được kiểm duyệt trước khi chấm tự động.
- Người học hoàn thành được một bài luyện.
- Kết quả được lưu.
- Lượt làm cũ không bị mất.
- Tiến độ được khôi phục khi đăng nhập lại.
- Nhập lại PDF không tạo nội dung trùng.
- Giao diện hoạt động tốt trên desktop và mobile.

---

# IX. NGUYÊN TẮC PHÁT TRIỂN

## 1. Source First

Nội dung gốc trong Drive là nguồn tham chiếu chính.

Không tự suy đoán đáp án hoặc nội dung thiếu.

## 2. Quality Before Quantity

Ưu tiên một bài học hoàn chỉnh, chính xác trước khi nhập hàng loạt.

## 3. Reusable Content

Một câu hỏi có thể được sử dụng trong nhiều chế độ học nhưng vẫn dùng chung hệ thống định danh và phiên bản.

## 4. User Data Ownership

Ghi chú, từ đã lưu, kết quả và tiến độ thuộc riêng từng tài khoản.

## 5. Progressive Enhancement

Xây dựng tính năng từ đơn giản đến nâng cao.

Không triển khai AI hoặc thi thử trước khi dữ liệu cốt lõi đủ chất lượng.

## 6. Mobile Friendly

Các chức năng học tập thiết yếu phải sử dụng được trên điện thoại.

## 7. Traceability

Nội dung học, câu hỏi và đáp án phải có khả năng truy ngược nguồn và phiên bản.

## 8. Data Integrity

Không làm mất lịch sử học khi cập nhật, sửa hoặc nhập lại tài liệu.

---

# X. KẾT QUẢ SẢN PHẨM MONG MUỐN

Sau khi hoàn thiện, TOEIC Studio có thể cung cấp một hệ sinh thái tự học gồm:

### Content

Một kho nội dung được tạo từ tài liệu Google Drive, có kiểm duyệt và quản lý nguồn.

### Learning

Người học tiếp cận kiến thức TOEIC qua bài học tương tác, thay vì chỉ mở PDF.

### Practice

Các câu hỏi từ tài liệu trở thành bài luyện trực tuyến có chấm điểm và giải thích.

### Review

Hệ thống giúp ôn lại kiến thức chưa nắm vững bằng flashcard, sổ câu sai và lịch ôn.

### Progress

Mọi hoạt động được lưu để người học theo dõi kết quả và tiếp tục học trên nhiều thiết bị.

### Intelligence

AI hỗ trợ giải thích và gợi ý học tập dựa trên dữ liệu đáng tin cậy.

---

# XI. KẾT LUẬN

**TOEIC Studio V2 là hệ thống học TOEIC cá nhân hóa, lấy tài liệu PDF trong Google Drive làm nguồn nội dung chính.**

Sản phẩm kết hợp bốn năng lực:

**1. Content Engine:** Chuyển tài liệu thành dữ liệu học tập được kiểm duyệt.

**2. Learning Engine:** Biến nội dung thành bài học, flashcard và bài luyện tương tác.

**3. Personal Learning Engine:** Ghi nhớ tiến độ, kết quả, lỗi sai và lịch ôn cá nhân.

**4. Intelligence Engine:** Phân tích năng lực và hỗ trợ học tập thông minh.

### Chiến lược triển khai

**Làm tốt một bài học thật → Hoàn thiện quy trình học → Mở rộng thư viện → Phát triển luyện tập chuyên sâu → Cá nhân hóa → Tích hợp AI.**

Mục tiêu cuối cùng không chỉ là xây dựng một website có nhiều tính năng, mà là tạo ra một môi trường tự học TOEIC hiệu quả, chính xác, dễ sử dụng và có thể phát triển lâu dài.