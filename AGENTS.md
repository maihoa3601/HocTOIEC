# Quy chuẩn giao diện TOEIC Studio

Khi thêm hoặc sửa giao diện, đọc [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)
trước khi triển khai. Đây là nguồn quy chuẩn UX/UI của dự án.

- Dùng palette, khoảng cách, typography và trạng thái được mô tả trong tài liệu.
- Component biểu mẫu dùng chung nằm ở `src/client/ui-controls.css`. Dùng lại
  `.ui-field`, `.ui-input`, `.ui-filter-panel`, `.ui-filter-bar`; không tạo một
  bộ CSS select riêng cho mỗi trang.
- Giữ `<select>` thật, nhãn rõ ràng và các sự kiện `change` hiện có. Dùng
  progressive enhancement cho popup; luôn giữ fallback và thao tác bàn phím.
- CSS của trang chỉ quyết định bố cục riêng. Nếu cần biến thể dùng lại, thêm
  vào component chung và cập nhật tài liệu thiết kế cùng lần sửa.
- Kiểm tra thay đổi giao diện trên desktop, mobile, chế độ tối và bàn phím.
  Trả viewport của trình duyệt về mặc định sau khi kiểm tra responsive; không
  để lại cấu hình kích thước cố định trong Chrome của người dùng.
- Sửa nguồn trong `src/` và `public/`, không sửa trực tiếp `dist/`.
