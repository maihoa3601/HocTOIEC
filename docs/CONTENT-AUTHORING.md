# Biên soạn bài học từ tài liệu

Chức năng dành cho Admin/Editor tại `/#imports`. Người học chỉ nhận nội dung đã được duyệt và xuất bản.

## Quy trình

1. Nhập gói văn bản đã trích xuất từ PDF/OCR. Bản gốc vẫn nằm trên Drive; giữ số trang và đối chiếu hình, đặc biệt với bảng và đáp án.
2. Chọn **Tạo bài học từ tài liệu**. Điền tên, chủ đề, ý chính và nhãn Original/Adapted/Generated.
3. Trong **Ý chính & ví dụ**, chia kiến thức thành phần nhỏ, chọn đúng trang nguồn và viết ví dụ Anh–Việt.
4. Trong **Câu luyện**, chọn trắc nghiệm, điền từ, sửa lỗi hoặc dịch với đáp án định trước. Mỗi câu phải có lời giải và trang nguồn.
5. Có thể chọn **Tạo câu điền từ từ ví dụ** để ẩn đúng một từ/cụm từ. Hệ thống giữ đáp án đó và gắn nhãn Generated; người biên soạn vẫn phải viết lời giải và kiểm tra ngữ cảnh.
6. Thêm thẻ từ với nghĩa, ví dụ và trang nguồn; lưu vào bản nháp. Bài chưa có đủ ý chính, phần kiến thức hoặc câu luyện vẫn có thể lưu riêng tư, nhưng chưa được duyệt.
7. Admin đối chiếu tất cả trang, câu hỏi, đáp án và lời giải, ghi chú rồi duyệt. Xuất bản là bước riêng. Chỉnh sửa sẽ yêu cầu kiểm duyệt lại.

Trang PDF và vị trí thu phóng được giữ khi chuyển phần soạn. Bộ chọn trang phía trên chuyển văn bản OCR; hãy chuyển đến cùng trang trong trình xem Drive. Trên màn hình nhỏ, tài liệu và biểu mẫu xếp dọc.

## Bổ sung và tránh mất nội dung

- Lần nhập đã xuất bản không bị sửa trực tiếp. Tạo phiên bản bổ sung từ lần xuất bản hiện tại; nội dung đang học được giữ cho đến khi bản mới xuất bản.
- Câu hỏi đã được sửa riêng sau lần nhập được mang sang bản bổ sung, tránh phục hồi nhầm đáp án/lời giải cũ.
- Lưu bản nháp kiểm tra phiên bản đã mở. Nếu người khác đã sửa, hệ thống từ chối ghi đè; bản đang soạn vẫn ở biểu mẫu. Có thể tải bản thảo JSON trước khi tải lại và hợp nhất thay đổi.
- Đóng khi có thay đổi chưa lưu hiển thị lựa chọn tiếp tục hoặc bỏ thay đổi trong lần mở này. Tải lại/đóng tab có cảnh báo của trình duyệt.
- Không đưa quảng bá, số điện thoại hoặc thông tin liên hệ trong nguồn vào nội dung học. OCR gốc chỉ có ở trang quản trị để đối chiếu.

## Bằng chứng kiểm thử cho đợt này

- `tests/authoring.test.mjs`: giữ mã câu khi sửa, không thay đổi bản nguồn đã mở, liên kết trang, lưu bài chưa hoàn chỉnh, chặn cụm điền từ bị lặp/không trọn từ và bắt buộc lời giải.
- `tests/imports.test.mjs`: phân quyền, tạo phiên bản lặp an toàn, không tạo nhánh từ phiên bản xuất bản cũ, giữ câu hỏi đã sửa, không xuất bản bản nháp thiếu nội dung, nhập → soạn → duyệt → xuất bản → chấm câu mới, và giữ lịch sử cũ.
- Browser local: tạo phiên bản Unit 11, lưu bài chỉ có tên và thấy ba yêu cầu còn thiếu; mở lại, thêm ý chính, phần kiến thức, ví dụ, câu điền từ và thẻ từ. Lưu câu chưa có lời giải bị chặn; sau khi bổ sung, bản nháp có 2 bài/17 câu và câu mới mang trang nguồn 2. Đây là dữ liệu QA local, không tự đưa vào ngân hàng public.
- Browser local: chuyển trình xem Drive sang trang 2 rồi chuyển phần soạn; PDF vẫn ở trang 2.

Việc này hoàn thiện thêm phần biên soạn sau trích xuất, chưa hoàn tất toàn bộ master plan. OCR trực tiếp trên trình duyệt, tự động nhận diện cấu trúc PDF, hình/audio, đồng bộ Drive và các mô-đun còn thiếu vẫn cần triển khai.

Kiểm tra bổ sung: toàn bộ 11 tệp kiểm thử đã qua; bản nháp QA được duyệt/xuất bản local và câu điền từ chấm đúng 1/1, có lời giải cùng trang nguồn 2. Đã thử cảnh báo khi đóng với thay đổi chưa lưu, tiếp tục biên soạn, tải bản thảo JSON và bỏ thay đổi QA. Bản nâng cấp có kiểm thử dấu vân tay gói v13 để việc nhập lại không đổi định danh; giữ thứ tự bài đã biên soạn khi xuất bản. Kiểm thử xung đột xác nhận lưu tiếp một bản nháp cũ không tự bỏ các điều kiện phiên bản đã ghi nhận.

Kiểm tra màn hình nhỏ phát hiện tên PDF dài làm tràn ngang trang nhập; đã cho tên tệp tự xuống dòng. Trình biên soạn có thể thu gọn riêng PDF và OCR để tập trung vào biểu mẫu. Trình xem Drive từng đóng kết nối trong QA; liên kết mở PDF gốc là cách tiếp tục đối chiếu khi iframe không tải được.
Xác minh mobile cuối: viewport 390 px, trang có clientWidth/scrollWidth cùng 375 px; hộp biên soạn có clientWidth/scrollWidth cùng 362 px. PDF và OCR đều thu gọn được, chuyển sang Câu luyện vẫn giữ nội dung. Viewport được khôi phục sau QA.
