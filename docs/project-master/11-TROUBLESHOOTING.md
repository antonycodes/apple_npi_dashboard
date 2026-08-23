# Troubleshooting

## 1. Nguyên tắc chẩn đoán

Xác định lỗi ở lớp nào:

1. Thiết bị/mạng.
2. Vercel/frontend.
3. Worker/API/cache.
4. Lark record.
5. Lark formula/lookup.

Không sửa nhiều lớp cùng lúc.

## 2. `/app` 404 hoặc vào Dashboard

**Kiểm tra**

- HTTP status `/app`.
- `vercel.json` rewrite.
- `src/App.tsx` pathname routing.
- bundle production có `AppPage`.
- domain đang trỏ deployment nào.

**Nguyên nhân đã từng xảy ra**

Source AIO nằm ở branch khác nhưng deploy `main` chưa chứa commit AIO.

## 3. Sai tên/role/workspace sau login

- Kiểm tra đúng dòng `Master_DS`.
- So `NPI_AIO_User` với `MSNV` và `STT bàn`.
- Kiểm tra tài khoản có nhiều workspace.
- Kiểm tra cache roster 60 giây.
- DP có thể có `Loại` trống và được suy từ tiền tố.

## 4. Login vẫn lỗi sau khi đổi password

- Chờ tối đa khoảng 60 giây do roster cache.
- Kiểm tra mọi dòng cùng username có password nhất quán.
- Không ghi password vào log/screenshot.
- Kiểm tra Worker đọc được roster trước khi reset thêm.

## 5. QR bàn Tư vấn báo không tồn tại

- Chuẩn hóa chữ hoa và bỏ khoảng trắng.
- QR phải là `TV` + số.
- Kiểm tra `Master_DS.STT bàn`, không dùng STT khách.
- Kiểm tra snapshot/roster mới nhất.
- Kiểm tra tài khoản/bàn có bị trùng hoặc thiếu.

## 6. Snapshot chậm hoặc partial

- Xem `msg`, `warnings`, `cache`.
- Gọi từng bảng để tìm nguồn chậm.
- Kiểm tra Lark timeout/rate limit.
- Không tăng polling ngay.
- Nếu stale ngắn hạn nhưng dữ liệu usable, ghi nhận tuổi dữ liệu.

## 7. Làm mới rất lâu

- Xác nhận serialized polling đang hoạt động.
- Kiểm tra request có chồng hay không.
- Kiểm tra 20 giây timeout.
- Kiểm tra edge cache hit/miss.
- Đo p50/p95, không đánh giá bằng một lần refresh.

## 8. POST thành công nhưng không thấy record

- Kiểm tra `body.code` và `recordId`.
- Đọc endpoint bảng.
- Tìm record raw trước khi chờ formula.
- Kiểm tra `written`/`skipped`.
- Nếu route legacy, HTTP 200 có thể chỉ là trigger acceptance.

## 9. `Loại 2` hoặc tên/bàn rỗng

- `/fields` phải báo `Loại 2 ok=true`.
- `Họ và tên`/`TV_MãNV` là formula/lookup nên Worker không ghi trực tiếp.
- Kiểm tra field liên kết/lookup trong Base.
- Không đổi Worker để ép text vào field read-only.

## 10. Hiển thị sai khâu

- Giá trị chuẩn chỉ là Tư vấn, Thu cũ, Backup.
- Kiểm tra `Loại 2`, `Phân loại` và mapper normalized stage.
- `Thu máy nhanh`/`Bàn giao kho` không được tính là Hoàn tất khâu.
- Kiểm tra Done in Flow formula chọn dòng Hoàn tất mới nhất.

## 11. Ảnh upload được nhưng không hiện

- Kiểm tra `/upload` trả token.
- GET `/media/:token`.
- `/record` phải có attachment token array.
- Kiểm tra field còn type Attachment.
- Kiểm tra `skipped` và record raw.

## 12. Timer/leadtime sai

- Timer UI phải đọc lại mốc `Thời gian` của dòng Tiếp nhận từ Base sau reload/đổi máy;
  chỉ dùng mốc tạm nếu record vừa bấm chưa xuất hiện.
- Dùng `Proxy Leadtime` làm nguồn chính.
- Kiểm tra cặp Tiếp nhận/Hoàn tất cùng STT và `Loại 2`.
- Leadtime âm/không tìm thấy mốc phải để trống, không tự điền 0.

## 13. Không cập nhật được config

- PUT config cần admin token.
- Kiểm tra token hết hạn.
- Kiểm tra KV binding `CONFIG`.
- GET config public không chứng minh PUT có quyền.

## 14. Worker deploy xong nhưng App vẫn như cũ

- Worker và frontend deploy độc lập.
- Kiểm tra đúng Worker name/account.
- Kiểm tra Vercel commit/deployment.
- Kiểm tra config App đang trỏ Worker nào.

## 15. Checklist evidence

Khi escalation, gửi:

- timestamp;
- route/status/body đã redact;
- deployment/commit;
- workspace/STT;
- screenshot;
- record ID nếu có;
- cache/warnings;
- thao tác retry đã thực hiện.
