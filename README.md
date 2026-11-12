# TOEIC Studio

Web học TOEIC cá nhân, giao diện tiếng Việt. Mở video và tài liệu từ Google Drive; tìm kiếm không dấu; lọc chủ đề và khóa học; lưu bài, ghi chú, đánh dấu hoàn thành; lộ trình gợi ý và bộ đếm giờ tập trung.

Thư viện chia 20 khóa vào 5 hướng học. Mỗi khóa giữ cấu trúc thư mục nguồn để duyệt khóa nhỏ → chương → chủ đề → bài giảng/tài liệu. Mục lục mở theo nhánh đang xem, có đường dẫn quay lại từng cấp và liên kết trực tiếp đến chương. Tìm kiếm trong chương bao gồm các mục con; có lựa chọn xem toàn bộ học liệu con, lọc video/tài liệu, trạng thái hoàn thành và phân trang. Playlist của trình xem giới hạn theo chủ đề của bài đang mở.

Kiểm tra phân nhóm, cây thư mục và tính đầy đủ của học liệu: `node scripts/check-hierarchy.mjs`.

## Học và luyện từ tài liệu

Mỗi chủ đề có Góc học: video, tài liệu gốc, phiếu trả lời và ghi chú. Tài liệu được phân vai bài học / đề bài / đáp án theo tên; gợi ý từ chương lân cận được ghi rõ để người học kiểm tra. Phiếu tự đối chiếu lưu riêng theo tài liệu, cho nhập 1–100 câu và tự đánh dấu sau khi mở đáp án gốc; không chấm tự động những tài liệu chưa chuyển đổi.

Đã đọc các trang nguồn để tạo 13 bộ gồm 250 câu và 73 thẻ từ. Ngoài Who/What, hiện tại đơn, hiện tại hoàn thành, từ loại và từ vựng TOEIC List 1, đã bổ sung to be, câu hỏi to be, Where/When, quy tắc động từ, từ loại căn bản, hiện tại tiếp diễn, quá khứ đơn và tương lai đơn. Nguồn thuộc 3 nhóm khóa. Câu hỏi được chuyển hoặc biên soạn theo tài liệu; lời giải do ứng dụng biên soạn, có liên kết tệp và số trang để đối chiếu. Phạm vi này chưa bao gồm toàn bộ tài liệu trong thư viện.

Bài luyện tự lưu nháp, chấm sau khi nộp, giải thích từng câu và tập hợp câu đã trả lời sai. Trả lời đúng khi ôn sẽ loại khỏi danh sách sai. Thẻ từ hẹn ôn theo 1/3/7/14/30 ngày khi đã nhớ và 10 phút khi cần ôn; lịch hiển thị trong ứng dụng, không gửi thông báo.

Kết quả luyện tập, phiếu và thẻ từ lưu trong localStorage riêng, xuất/nhập cùng tiến độ. Chuyển máy cần xuất dữ liệu. Không đưa video/PDF gốc vào bản triển khai. Nội dung câu hỏi ở dist/learning-bank.json; tái tạo bằng node scripts/build-learning-bank.mjs. Kiểm tra chấm bài, nguồn và lưu dữ liệu bằng node scripts/check-learning.mjs.

Có thể thu gọn thanh điều hướng thành dải biểu tượng trên máy tính, ẩn/hiện mục lục khóa học và bảng luyện tập / ghi chú. Lựa chọn bố cục lưu riêng trên trình duyệt. Điện thoại dùng menu trượt; bấm bên ngoài hoặc Escape để đóng.

## Học chủ động

Trang Học chủ động có bài đọc được biên soạn từ tài liệu: quy tắc, ví dụ song ngữ, lỗi dễ nhầm và liên kết trang nguồn. Mỗi chủ đề có chế độ chọn đáp án, tự điền từ hoặc sửa lỗi theo nội dung thực tế. Các kiểu luyện lưu nháp riêng. Ghép từ/nghĩa và sắp xếp câu ví dụ lưu thành lượt chơi khi hoàn thành; không cộng vào tỷ lệ chấm câu hỏi. Thẻ từ có lịch ôn riêng.

Theo dõi chủ đề tính câu trả lời gần nhất theo ID, bao gồm ôn sai và buổi 10 câu, nên làm lại không tăng số câu đã thử. Buổi ôn ưu tiên câu sai rồi phần ít luyện. Dữ liệu cũ được giữ và các mục mới xuất/nhập cùng tiến độ. Chi tiết 100 lượt làm / lượt chơi gần nhất được giữ; câu trả lời gần nhất của từng câu được lưu riêng, không mất khi lịch sử lượt làm được rút gọn. Đây không phải dự đoán điểm TOEIC.

Ngân hàng tái tạo bằng node scripts/build-learning-bank.mjs. Nội dung mở rộng nằm trong scripts/learning-content-a.json, scripts/learning-content-b.json và scripts/enrich-learning-bank.mjs. Nhật ký đọc nguồn ở docs/learning-source-review.md; PDF gốc không nằm trong bản triển khai. Kiểm tra chọn câu, thống kê, ghép từ và xếp câu: node scripts/check-activities.mjs.

## Chạy trên máy

Yêu cầu Node.js. Chạy `node scripts/preview.mjs` rồi mở http://127.0.0.1:4173.

Kiểm tra dữ liệu và các quy tắc tiến độ: `node scripts/check.mjs`.

## Dữ liệu

`dist/catalog.json` là mục lục đã nhập từ thư mục Drive do người dùng cung cấp. Tệp video, âm thanh và tài liệu vẫn nằm trên Google Drive. Web dùng trình xem Drive; người xem cần tài khoản Google có quyền truy cập. Nếu không nhúng được, mở liên kết Drive gốc trong cửa sổ bài học.

Danh mục không tự đồng bộ khi Drive thay đổi. Cập nhật bằng cách đọc lại thư mục trong chat, thay `dist/catalog.json`, kiểm tra và triển khai lại. Không lưu token Google trong mã nguồn. Không thay đổi quyền chia sẻ của Drive.

Tiến độ và ghi chú được lưu trong localStorage theo trình duyệt. Người dùng có thể xuất và nhập JSON trong trang Tiến độ. Web không đọc thời lượng hoặc vị trí xem trong trình phát Drive và không tự đánh dấu hoàn thành. Bộ đếm 25 phút tính thời gian được người dùng bật.

Tên khóa học và chủ đề lấy từ tên tệp/thư mục; chưa phiên âm hoặc xác minh nội dung video. Lộ trình là gợi ý học tập của ứng dụng. Các tệp quảng bá nhóm và thông tin liên hệ được loại khỏi danh sách học liệu.

## Triển khai

Ứng dụng HTML/CSS/JavaScript tĩnh, không cần cài thư viện. Cấu hình Sites nằm trong `.openai/hosting.json`, thư mục xuất bản là `dist`. Site hiện được chia sẻ công khai trong Sites. Quyền truy cập vào Sites và quyền xem nội dung trên Drive vẫn do nền tảng tương ứng quản lý. Font Be Vietnam Pro tải từ Google Fonts; có font hệ thống dự phòng.
