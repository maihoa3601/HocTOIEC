# TOEIC Studio

Web học TOEIC cá nhân, giao diện tiếng Việt. Mở video và tài liệu từ Google Drive; tìm kiếm không dấu; lọc chủ đề và khóa học; lưu bài, ghi chú, đánh dấu hoàn thành; lộ trình gợi ý và bộ đếm giờ tập trung.

Thư viện chia 20 khóa vào 5 hướng học. Mỗi khóa giữ cấu trúc thư mục nguồn để duyệt khóa nhỏ → chương → chủ đề → bài giảng/tài liệu. Mục lục mở theo nhánh đang xem, có đường dẫn quay lại từng cấp và liên kết trực tiếp đến chương. Tìm kiếm trong chương bao gồm các mục con; có lựa chọn xem toàn bộ học liệu con, lọc video/tài liệu, trạng thái hoàn thành và phân trang. Playlist của trình xem giới hạn theo chủ đề của bài đang mở.

Kiểm tra phân nhóm, cây thư mục và tính đầy đủ của học liệu: `node scripts/check-hierarchy.mjs`.

## Chạy trên máy

Yêu cầu Node.js. Chạy `node scripts/preview.mjs` rồi mở http://127.0.0.1:4173.

Kiểm tra dữ liệu và các quy tắc tiến độ: `node scripts/check.mjs`.

## Dữ liệu

`dist/catalog.json` là mục lục đã nhập từ thư mục Drive do người dùng cung cấp. Tệp video, âm thanh và tài liệu vẫn nằm trên Google Drive. Web dùng trình xem Drive; người xem cần tài khoản Google có quyền truy cập. Nếu không nhúng được, mở liên kết Drive gốc trong cửa sổ bài học.

Danh mục không tự đồng bộ khi Drive thay đổi. Cập nhật bằng cách đọc lại thư mục trong chat, thay `dist/catalog.json`, kiểm tra và triển khai lại. Không lưu token Google trong mã nguồn. Không thay đổi quyền chia sẻ của Drive.

Tiến độ và ghi chú được lưu trong localStorage theo trình duyệt. Người dùng có thể xuất và nhập JSON trong trang Tiến độ. Web không đọc thời lượng hoặc vị trí xem trong trình phát Drive và không tự đánh dấu hoàn thành. Bộ đếm 25 phút tính thời gian được người dùng bật.

Tên khóa học và chủ đề lấy từ tên tệp/thư mục; chưa phiên âm hoặc xác minh nội dung video. Lộ trình là gợi ý học tập của ứng dụng. Các tệp quảng bá nhóm và thông tin liên hệ được loại khỏi danh sách học liệu.

## Triển khai

Ứng dụng HTML/CSS/JavaScript tĩnh, không cần cài thư viện. Cấu hình Sites nằm trong `.openai/hosting.json`, thư mục xuất bản là `dist`. Site khởi tạo riêng tư. Font Be Vietnam Pro tải từ Google Fonts; có font hệ thống dự phòng.
