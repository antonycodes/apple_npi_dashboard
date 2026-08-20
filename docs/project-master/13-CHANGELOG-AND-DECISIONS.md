# Changelog & Decision Log

## 1. Mục đích

Ghi các quyết định ảnh hưởng nghiệp vụ, data mapping, kết nối hoặc vận hành. Không thay thế Git history; tài liệu giải thích “vì sao”.

## 2. Quyết định hiện hành

### DEC-001 — Ba khâu nghiệp vụ

- Giá trị: Tư vấn, Thu cũ, Backup.
- Không có khâu thứ tư.
- Tài liệu, PDF và giao diện người dùng chỉ dùng ba tên này.

### DEC-002 — Bàn giao Kho là trạng thái riêng

- `action=ban_giao`.
- `Trạng thái=Bàn giao kho`.
- STT khách và `Loại 2` để trống.
- QR là bàn TV nhận máy.

### DEC-003 — Thu máy nhanh không phải Hoàn tất

- `action=thu_may`.
- `Trạng thái=Thu máy nhanh`.
- Không tạo Proxy Leadtime khâu.

### DEC-004 — Master_DS là roster authority

- Username/password/workspace/role/MSNV từ đúng dòng roster.
- Một account có thể có nhiều workspace.
- Không chuẩn hóa bắt buộc `Loại` các dòng DP; Worker suy từ prefix DP.

### DEC-005 — Route ghi trực tiếp

- Điều phối: `/dispatch-record`.
- Staff/Kho: `/record`.
- Webhook legacy chỉ dùng rollback/tương thích.

### DEC-006 — Tối đa ba ảnh

- Thu cũ, Backup, Thu máy và Kho tối đa ba ảnh theo UI.
- Upload tuần tự để dễ xác định ảnh lỗi.

### DEC-007 — Leadtime

- Proxy Leadtime là nguồn đánh giá ưu tiên.
- Brower Leadtime dùng đối chiếu.
- Không tự điền 0 khi thiếu mốc.

### DEC-008 — Load test

- Dùng production thật.
- Chủ dự án tự clear Base sau test.
- Nhóm test phải bàn giao run ID, thời gian, record inventory và evidence.

### DEC-009 — Đối tượng PDF

- PDF cuối dành cho vận hành và nhân viên.
- Chi tiết kỹ thuật sâu giữ ở Markdown trong repository.

## 3. Mốc source/deployment gần nhất

| Commit | Nội dung |
| --- | --- |
| `7c92079` | Sửa nhãn Thu cũ ở popup |
| `f139c6c` | Khôi phục AIO và tối ưu sync vào main |
| `fa71b61` | Direct `/app` và Vercel rewrite |

Production audit ngày 2026-08-20 dùng `main@fa71b61`.

## 4. Mẫu ghi quyết định mới

```text
### DEC-XXX — Tên quyết định

- Ngày:
- Người chốt:
- Bối cảnh:
- Quyết định:
- Lý do:
- Ảnh hưởng App/Worker/Lark:
- Migration/rollback:
- Evidence:
```

## 5. Quy tắc cập nhật

- Thay đổi nghiệp vụ phải cập nhật decision trước hoặc cùng commit.
- Thay field/route phải cập nhật mapping/API docs.
- Thay auth phải cập nhật security matrix.
- Thay load/caching phải cập nhật capacity report.
- Mỗi PDF phát hành phải ghi source commit và ngày audit.
