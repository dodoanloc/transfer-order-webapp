# AGENTS.md — Transfer Order

## Project identity
- Tên: Transfer Order
- Slug: transfer-order-webapp
- Đường dẫn: /home/locdodoan/.openclaw/workspace/transfer-order-webapp
- Port: 8892
- Service: transfer-order-webapp
- Trạng thái: active

## Purpose
Route-specific Mẫu 13/14 + Tờ trình; Times New Roman for print; no unnecessary form-data storage.

## User and UX rules
- Người dùng chính: cán bộ nội bộ, ưu tiên thao tác nhanh, ít lỗi.
- UI hiện đại, sạch, card-based.
- Gradient ưu tiên: cyan → indigo.
- Font ưu tiên: Plus Jakarta Sans.
- Mobile tuyệt đối không tràn ngang, không gây side zoom.
- Form và upload file phải có tap target lớn, dễ bấm.
- Với app liên quan Windows/Samba, hiển thị sẵn lệnh Run/PowerShell copy được trong UI.

## Hermes working rules
1. Trước khi sửa code: chạy `git status`.
2. Trước thay đổi lớn: commit backup hoặc tạo checkpoint.
3. Không xoá dữ liệu thật nếu chưa backup.
4. Nếu đổi database schema: backup DB trước, ghi rõ migration/rollback.
5. Sau khi sửa: test chức năng chính, kiểm tra log/service nếu có.
6. Cập nhật `docs/CHANGELOG.md` cho thay đổi quan trọng.
7. Commit với message rõ ràng: `feat:`, `fix:`, `docs:`, `chore:`, `backup:`.

## Common commands
```bash
git status
python3 server.py
systemctl --user status transfer-order-webapp --no-pager
systemctl --user restart transfer-order-webapp
journalctl --user -u transfer-order-webapp -n 100 --no-pager
```

## Rollback
```bash
git log --oneline
git reset --hard <commit_id>
systemctl --user restart transfer-order-webapp
```

Xem thêm: `docs/CONTEXT.md`, `docs/RUNBOOK.md`, `docs/ROLLBACK.md`.
