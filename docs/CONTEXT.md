# Context — Transfer Order

## Mục tiêu
Route-specific Mẫu 13/14 + Tờ trình; Times New Roman for print; no unnecessary form-data storage.

## Người dùng
- Cán bộ nội bộ.
- Ưu tiên thao tác nhanh, giao diện rõ, ít phải nhớ kỹ thuật.

## Thông tin kỹ thuật
- Đường dẫn: `/home/locdodoan/.openclaw/workspace/transfer-order-webapp`
- Port: `8892`
- Service: `transfer-order-webapp`
- Stack: Python + SQLite + DOCX/browser print + HTML/CSS/JS

## Luồng chính
- Đăng nhập/nhập dữ liệu nếu có.
- Kiểm tra dữ liệu.
- Xuất/in/tải file nếu có.
- Lưu lịch sử nếu nghiệp vụ yêu cầu.

## Quyết định thiết kế
- UI card-based, bo góc lớn, shadow rõ.
- Gradient cyan → indigo.
- Plus Jakarta Sans cho giao diện; Times New Roman cho biểu mẫu hành chính nếu cần.
- Desktop ưu tiên 2 cột; mobile 1 cột.

## Lưu ý nghiệp vụ
Route-specific Mẫu 13/14 + Tờ trình; Times New Roman for print; no unnecessary form-data storage.

## Không được làm
- Không phá format mẫu biểu khi chưa hỏi Sếp Lộc.
- Không xoá DB/upload/backups nếu chưa có backup mới.
- Không đổi port/service/domain mà không cập nhật registry.
