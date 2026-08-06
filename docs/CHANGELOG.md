# Changelog

## 2026-08-03 — Centralized personnel master
- Added authenticated `/api/people/get` and `/api/people/save` endpoints.
- Added SQLite `transfer_order_people` table, seeded once from latest saved record `peopleList`.
- Enabled SQLite WAL, 15-second busy timeout, and atomic personnel replacement writes.
- Frontend now loads personnel from server after login and saves add/edit/delete/reorder immediately.
- Removed browser localStorage as personnel source of truth; historical records no longer overwrite master personnel.
- Cache-busted `app.js`.
- Migration backup stored under project `backups/` and `/home/locdodoan/recovered-app-data/transfer-order-backups/`.

- 2026-06-18: Sửa nội dung Giấy giới thiệu theo file mẫu `1. Giay gioi thieu_mau QD 979.docx`.
- 2026-06-18: Khi nơi đi là Agribank CN Thanh Hoá và có ấn chỉ quan trọng (Sổ tiết kiệm, Sổ tiết kiệm có kỳ hạn, Séc, Thư bảo lãnh), bản in lệnh điều chuyển tự kèm thêm mẫu Giấy giới thiệu; các case khác giữ nguyên.
- Bootstrap quản lý bởi Hermes Webapp Factory.
