# Architecture & Connections

## 1. Sơ đồ tổng thể

```text
Thiết bị người dùng
  ├─ iPad Điều phối
  ├─ iPad Kho
  └─ iPhone nhân sự
          │
          │ HTTPS
          ▼
Frontend Vercel — apple.vhws.online
          │
          │ JSON / multipart
          ▼
Cloudflare Worker — vhws-lark-proxy
  ├─ Auth roster
  ├─ Snapshot/cache
  ├─ Direct write
  ├─ Upload/media proxy
  └─ KV shared config
          │
          │ Lark Open API
          ▼
Lark Base
```

## 2. Frontend trên Vercel

### Build và routing

- Build command: `npm run build`.
- Output: Vite static bundle.
- Production domain: `apple.vhws.online`.
- `vercel.json` rewrite `/app` và `/app/:path*` về `/index.html`.
- React router hiện là hash router kết hợp kiểm tra pathname `/app`.

### Cấu hình runtime

Frontend không hardcode Lark credentials. Runtime config đến từ:

1. cấu hình dùng chung tại Worker `/config/app`;
2. query `?api=...` trong link triển khai;
3. localStorage/cài đặt trên máy;
4. biến `VITE_*` chỉ làm giá trị khởi tạo khi build.

## 3. Frontend → Worker

### Đường đọc

- Dashboard và các module gọi `/dashboard/snapshot` hoặc endpoint bảng.
- Polling được serialize; không khởi chạy lượt mới khi lượt cũ chưa xong.
- Timeout một lượt đọc là 20 giây.
- Cấu hình dùng chung được đồng bộ định kỳ.
- UI giữ dữ liệu cũ trong lúc refresh để tránh nhấp nháy hoặc mất ngữ cảnh.

### Đường ghi

- Điều phối: JSON POST `/dispatch-record`.
- Nhân sự/Kho: JSON POST `/record`.
- Ảnh: multipart POST `/upload`, nhận `file_token`, sau đó gửi token trong `/record`.
- Xem ảnh: GET `/media/:file_token`.

### Error handling

- Client kiểm tra HTTP status và `body.code`.
- HTTP 401 xóa session và yêu cầu đăng nhập lại.
- Lỗi Worker/Lark được hiển thị chi tiết khi có `msg`.
- UI có pending state; polling vẫn là nguồn xác nhận trạng thái thực.

## 4. Worker → Lark

### Xác thực Lark

- Tenant token lấy từ App ID/App Secret trong Worker secret.
- App token và Table ID chỉ tồn tại ở Worker/runtime configuration.
- Token được cache trong isolate để giảm request xác thực.

### Đọc dữ liệu

- Worker gọi Lark list/search records.
- `fetchCoHanGio` chặn request Lark treo quá lâu.
- Snapshot đọc song song năm bảng.
- Một bảng lỗi có thể tạo partial snapshot; Worker ưu tiên giữ App usable.

### Ghi dữ liệu

- Worker dò schema trước khi map.
- Field không tồn tại/read-only/person không phù hợp được đưa vào `skipped`.
- Nếu không map được cột nào, Worker trả lỗi thay vì tạo record rỗng.
- Sau ghi thành công, snapshot cache được invalidation.

## 5. Cache design

| Lớp | Phạm vi | Mục đích |
| --- | --- | --- |
| Token cache | Worker isolate | Giảm request xác thực Lark |
| Roster cache | Worker | Đăng nhập nhanh, mật khẩu Base cập nhật sau tối đa khoảng 60 giây |
| Schema cache | Theo table ID, 10 phút | Không gọi field API mỗi record |
| Snapshot memory | Isolate, 500 ms fresh | Gộp burst request gần nhau |
| Stale fallback | 30 giây | Giữ App usable khi Lark lỗi ngắn hạn |
| Edge cache | Cloudflare cache | Hấp thụ nhiều thiết bị polling đồng thời |

Cache chỉ tối ưu đường đọc. Khi đánh giá đồng bộ phải đo cả `cache state`, tuổi dữ liệu và thời gian formula Lark hội tụ.

## 6. Shared configuration trong KV

Binding: `CONFIG`.

- `/config/app`: cấu hình kết nối/field dùng chung.
- `/config/coordinators`: danh sách Điều phối viên.
- GET được mở cho thiết bị vận hành khởi động không cần admin.
- PUT yêu cầu token role admin.

KV không lưu mật khẩu roster; mật khẩu AIO nằm trong `Master_DS`.

## 7. Deployment boundaries

Frontend và Worker deploy độc lập:

| Thay đổi | Deploy |
| --- | --- |
| UI, route, mapper frontend | Vercel |
| API route, cache, schema map trực tiếp | Cloudflare Worker |
| Tên field/option/formula | Lark Base |
| Cấu hình runtime dùng chung | KV qua App/Admin |

Một thay đổi có thể cần deploy nhiều lớp. Không được kết luận “đã triển khai” nếu chỉ build frontend trong khi Worker hoặc Base chưa thay đổi.

## 8. Failure modes

### Vercel hoạt động, Worker lỗi

App tải được nhưng login/data/write lỗi. Kiểm tra `/health`, `/roster-check`, `/fields` và snapshot.

### Worker hoạt động, Lark chậm

Health có thể vẫn 200; snapshot có warning/stale. Kiểm tra cache state và từng endpoint bảng.

### Record tạo nhưng App chưa hiện

Kiểm tra record thô, formula/lookup, cache invalidation, polling và field map. Không gửi lặp ngay nếu chưa xác định record có tồn tại.

### `/app` trả Dashboard hoặc 404

Kiểm tra `vercel.json`, pathname routing trong `src/App.tsx`, deployment commit và domain alias.

## 9. Nguyên tắc thay đổi kiến trúc

- Giữ secret ngoài frontend.
- Route ghi mới phải có idempotency/traceability hoặc run ID khi test.
- Không tăng polling trước khi đo cache hit và Lark request thực.
- Không xóa route legacy trong ngày event nếu chưa có migration.
- Mọi field map mới phải có `/fields` audit và test record tối thiểu.
