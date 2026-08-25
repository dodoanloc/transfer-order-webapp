# Lệnh điều chuyển

**Repo:** `transfer-order-webapp`  
**Mục đích:** Lập, quản lý, xác nhận và in lệnh điều chuyển; có kiểm tra dữ liệu và test server.

## Người dùng nên biết

- Đây là mã nguồn ứng dụng nội bộ; dữ liệu runtime, DB, upload và secret không thuộc source code cần commit.
- Thay đổi chức năng phải đi qua branch → Pull Request → CI → reviewer `ktnqagribanktx-lang` → merge.
- Production không deploy trực tiếp từ máy local. Xem [`ROLLBACK.md`](ROLLBACK.md).

## Công nghệ và luồng chính

Python server + static HTML/CSS/JS.

```text
Người dùng → giao diện frontend → backend/API hoặc server → DB/tệp cấu hình
```

## Cấu trúc repo

```text
├── server.py
├── app.js
├── index.html
├── styles.css
├── test_server.py
├── docs/
├── .github/
└── ROLLBACK.md
```

### Thành phần chính

- `server.py`: thành phần cần biết khi sửa app.
- `app.js`: thành phần cần biết khi sửa app.
- `index.html`: thành phần cần biết khi sửa app.
- `styles.css`: thành phần cần biết khi sửa app.
- `test_server.py`: thành phần cần biết khi sửa app.

## Chạy và triển khai

- **Service:** `transfer-order.service`
- **Port ghi nhận:** `?`
- Kiểm tra service: `systemctl --user status transfer-order.service`
- Không sửa trực tiếp DB production khi chưa backup.

## Kiểm tra trước Pull Request

```bash
# Python nếu repo có file .py
python -m py_compile <changed-python-files>

# Node nếu repo có package.json/server.js
node --check <changed-js-file>

# Test riêng của repo nếu có
pytest -q   # hoặc npm test
```

## Quyền và dữ liệu

- Không commit token, password, API key, session, DB production, upload hoặc PII.
- Giữ nguyên phân quyền hiện hữu khi sửa API/UI.
- Với thay đổi schema hoặc file lưu trữ: backup trước, cập nhật runbook, test rollback.
