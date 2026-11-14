# TOEIC Studio

Web học TOEIC bằng tiếng Việt, sử dụng danh mục và học liệu được đối chiếu từ Google Drive. Giao diện dùng HTML/CSS/JavaScript; API chạy trên Cloudflare Worker với D1. Dự án dùng Node.js tích hợp sẵn, không có thư viện npm cần cài thêm.

## Chạy dự án

Yêu cầu **Node.js 24 trở lên**.

```sh
npm run dev
```

Mở **http://127.0.0.1:4173**. Lệnh này build lần đầu, theo dõi thay đổi source, build lại và khởi động lại máy chủ. Tải lại trình duyệt sau khi terminal báo build xong.

```sh
npm test          # Chạy toàn bộ kiểm thử
npm run build    # Tạo mới dist từ source
npm run preview  # Chạy bản build gần nhất
```

Preview dùng SQLite cục bộ trong `.sites-runtime/preview.sqlite`. Luồng đăng nhập trên localhost mô phỏng một tài khoản quản trị chỉ để phát triển. Website production dùng danh tính do Sites cung cấp.

## Cấu trúc

```text
HocTOIEC/
├── src/
│   ├── client/          # Giao diện, CSS và logic học trên trình duyệt
│   └── server/          # API, chấm bài, tài khoản và quản trị nội dung
├── data/
│   ├── catalog.json     # Danh mục Google Drive
│   ├── learning-bank.json
│   ├── learning-content-a.json
│   ├── learning-content-b.json
│   └── data-audit.json
├── public/              # HTML đầu vào và favicon
├── drizzle/             # Migration database
├── scripts/             # Build, dev, preview và xử lý học liệu
│   └── lib/             # Tiện ích dùng chung cho công cụ
├── tests/               # Kiểm thử client, server, dữ liệu và bản build
├── docs/                # Phạm vi tính năng, nguồn và kiến trúc
├── .openai/hosting.json # Cấu hình Sites
├── .env.example         # Tên biến môi trường; không chứa định danh/tokens
├── package.json
└── dist/                # Chỉ là kết quả build, không lưu vào Git
    ├── client/          # Tài nguyên công khai; ngân hàng đã bỏ đáp án
    ├── server/index.js  # Worker chứa logic server và dữ liệu chấm bài
    └── .openai/hosting.json
```

**Sửa code trong `src/`, HTML/icon trong `public/`, nội dung trong `data/`.** Build tạo lại toàn bộ `dist/`; các thay đổi trực tiếp trong đó sẽ bị thay thế. Dữ liệu phát triển cục bộ nằm ở `.sites-runtime/` và được bỏ qua trong Git.

## Chức năng và học liệu

- Danh mục 20 khóa trong 5 nhóm, duyệt theo khóa → chương → chủ đề → video/tài liệu; tìm kiếm và thu gọn bố cục.
- 13 bài học có nguồn, 250 câu hỏi, 73 flashcard; luyện chọn đáp án, điền từ, sửa lỗi, ghép nghĩa, sắp xếp câu và ôn câu sai.
- Dashboard từ hoạt động thực, lịch ôn thẻ và kế hoạch học theo ngày/tuần. Bài luyện giữ nháp và vị trí câu hỏi.
- Chấm bài trên máy chủ, nhận lời giải sau khi nộp; lịch sử lưu nguyên phiên bản câu hỏi lúc làm.
- Sao lưu thủ công theo tài khoản, xuất/nhập tiến độ và lịch sử. Quản trị viên đối chiếu PDF, lưu nháp, duyệt sửa câu hỏi và xử lý báo lỗi.

Nội dung tương tác chỉ bao phủ các tài liệu đã đọc, chưa bao gồm toàn bộ Drive hoặc ngân hàng đầy đủ Part 1–7. Xem [phạm vi V2](docs/V2-IMPLEMENTATION.md) và [nhật ký nguồn](docs/learning-source-review.md).

Video, audio và PDF gốc vẫn ở Google Drive, với quyền truy cập ban đầu. Danh mục chưa tự đồng bộ. Cập nhật `data/catalog.json` sau khi đọc lại Drive, kiểm thử rồi build/deploy. Ứng dụng không đọc được thời lượng/vị trí phát từ iframe Drive. Các tệp quảng bá được loại khỏi danh sách học liệu.

## Cập nhật ngân hàng học liệu

`data/learning-bank.json` là đầu vào chuẩn của build, gồm đáp án và giải thích để Worker chấm bài. File này không được đưa nguyên vẹn vào tài nguyên công khai. Tạo lại từ nội dung biên soạn bằng:

```sh
npm run data:build
npm test
npm run build
```

Chỉ chạy `data:build` khi muốn tái tạo ngân hàng: nó ghi lại `data/learning-bank.json` từ các định nghĩa nội dung. Build ứng dụng thông thường không tự thay nội dung hoặc phiên bản câu hỏi.

## Triển khai và dữ liệu cá nhân

Sites sử dụng `dist/server/index.js`; Worker nhúng tài nguyên từ `dist/client/`, giữ các URL giao diện hiện tại. `.openai/hosting.json` giữ ID website và D1 binding. Migration trong `drizzle/` được đóng gói lúc deploy; ứng dụng không tạo bảng trong request.

Tiến độ trên trình duyệt lưu trong localStorage; lịch sử bài làm đầy đủ lưu trong IndexedDB. Các khóa lưu trữ và schema không thay đổi trong lần sắp xếp thư mục này. Bản sao theo tài khoản là thủ công, có phát hiện xung đột giữa thiết bị. Không lưu Google tokens hoặc định danh quản trị vào source/client.

Chi tiết: [cấu trúc và build](docs/PROJECT-STRUCTURE.md), [lưu trữ tài khoản](docs/ACCOUNT-STORAGE.md), [quản trị nội dung](docs/CONTENT-REVIEW.md), [kế hoạch học](docs/STUDY-PLANNER.md).
