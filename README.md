# TOEIC Studio

Web học TOEIC cá nhân, giao diện tiếng Việt. Mở video và tài liệu từ Google Drive; tìm kiếm không dấu; lọc chủ đề và khóa học; lưu bài, ghi chú, đánh dấu hoàn thành; lộ trình gợi ý và bộ đếm giờ tập trung.

Thư viện chia 20 khóa vào 5 hướng học. Mỗi khóa giữ cấu trúc thư mục nguồn để duyệt khóa nhỏ → chương → chủ đề → bài giảng/tài liệu. Mục lục mở theo nhánh đang xem, có đường dẫn quay lại từng cấp và liên kết trực tiếp đến chương. Tìm kiếm trong chương bao gồm các mục con; có lựa chọn xem toàn bộ học liệu con, lọc video/tài liệu, trạng thái hoàn thành và phân trang. Playlist của trình xem giới hạn theo chủ đề của bài đang mở.

Kiểm tra phân nhóm, cây thư mục và tính đầy đủ của học liệu: `node scripts/check-hierarchy.mjs`.

## Học và luyện từ tài liệu

Mỗi chủ đề có Góc học: video, tài liệu gốc, phiếu trả lời và ghi chú. Tài liệu được phân vai bài học / đề bài / đáp án theo tên; gợi ý từ chương lân cận được ghi rõ để người học kiểm tra. Phiếu tự đối chiếu lưu riêng theo tài liệu, cho nhập 1–100 câu và tự đánh dấu sau khi mở đáp án gốc; không chấm tự động những tài liệu chưa chuyển đổi.

Đã đọc các trang nguồn để tạo 5 bộ gồm 92 câu và 24 thẻ từ: Who/What, hiện tại đơn, hiện tại hoàn thành, từ loại, từ vựng TOEIC List 1. Nguồn thuộc 3 nhóm khóa. Câu hỏi được chuyển hoặc biên soạn theo tài liệu; lời giải do ứng dụng biên soạn, có liên kết tệp và số trang để đối chiếu. Phạm vi này chưa bao gồm toàn bộ tài liệu trong thư viện.

Bài luyện tự lưu nháp, chấm sau khi nộp, giải thích từng câu và tập hợp câu đã trả lời sai. Trả lời đúng khi ôn sẽ loại khỏi danh sách sai. Thẻ từ hẹn ôn theo 1/3/7/14/30 ngày khi đã nhớ và 10 phút khi cần ôn; lịch hiển thị trong ứng dụng, không gửi thông báo.

Kết quả luyện tập, phiếu và thẻ từ lưu trong localStorage riêng, xuất/nhập cùng tiến độ. Chuyển máy cần xuất dữ liệu. Không đưa video/PDF gốc vào bản triển khai. Nội dung câu hỏi ở dist/learning-bank.json; tái tạo bằng node scripts/build-learning-bank.mjs. Kiểm tra chấm bài, nguồn và lưu dữ liệu bằng node scripts/check-learning.mjs.

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
