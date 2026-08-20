# NPI-CPS — System Overview

> Phiên bản audit: 2026-08-20 · Source tham chiếu: `main@fa71b61`

## 1. Hệ thống giải quyết vấn đề gì?

Ứng dụng hỗ trợ vận hành khách tại event Apple theo một luồng thống nhất, thay cho việc nhân sự phải mở nhiều link hoặc tự nhớ bàn/khâu:

1. Khách Check-in và nhận STT.
2. Điều phối gán khách vào một trong ba khâu: Tư vấn, Thu cũ, Backup.
3. Nhân sự tại bàn Tiếp nhận và Hoàn tất khách.
4. Thu cũ/Backup có thể quét QR, IMEI và chụp ảnh nghiệm thu.
5. Kho bàn giao máy mới cho nhân viên Tư vấn bằng QR bàn và ảnh bàn giao.
6. Dashboard đọc lại dữ liệu Lark để hiển thị bàn, khách chờ và End Flow.

## 2. Thành phần chính

| Thành phần | Công nghệ | Trách nhiệm |
| --- | --- | --- |
| Frontend | React, Vite, TypeScript, TailwindCSS | Giao diện, camera, form, polling, điều hướng vai trò |
| Hosting | Vercel | Build và phát hành frontend, domain production |
| API Gateway | Cloudflare Worker | Kết nối Lark, xác thực, cache, upload, ghi record |
| Shared config | Cloudflare KV | Cấu hình App và danh sách Điều phối dùng chung |
| Data source | Lark Base | Roster, Check-in, Điều phối, Master, đơn hàng, formula/lookup |
| Load test | k6 | Baseline, peak 40 VU, journey và media test |

## 3. Các module giao diện

### 3.1 All in One

Route: `/app` và `/#/app`.

- Đăng nhập bằng `NPI_AIO_User` và `NPI_AIO_Pass` trong `Master_DS`.
- Một tài khoản có thể có nhiều workspace.
- App hiện “Chọn khu vực” khi có nhiều workspace.
- Workspace quyết định màn hình và danh tính ghi record.
- Có nút đổi khu vực và đăng xuất.

### 3.2 Dashboard Điều phối

- Hiển thị sơ đồ bàn theo ba cụm.
- Hiển thị khách đã Check-in, khách chờ Điều phối và khách ở End Flow.
- Điều phối khách vào đúng bàn Tư vấn/Thu cũ/Backup.
- `Submit by` phải là MSNV Điều phối viên đang đăng nhập/chọn workspace DP.

### 3.3 Nhân sự bàn

- Bàn khóa theo workspace `TV...`, `TC...` hoặc `BK...`.
- Tiếp nhận và Hoàn tất qua `/record`.
- Timer trên trình duyệt chỉ dùng đối chiếu; `Proxy Leadtime` do Worker tính là nguồn ưu tiên.
- Thu cũ/Backup có QR, IMEI và tối đa ba ảnh.
- Thu máy nhanh dùng trạng thái riêng `Thu máy nhanh`.

### 3.4 Kho

- Không dùng STT khách.
- Quét QR mã bàn Tư vấn nhận máy.
- Chụp tối đa ba ảnh.
- Ghi trạng thái `Bàn giao kho` qua `/record`.
- `Loại 2` để trống vì đây không phải khâu phục vụ khách.

### 3.5 Màn hình STT và bảng Kho

- `#/tuvanview`, `#/backupview` và route Thu cũ phục vụ màn hình lớn.
- `#/khoview` là kanban Kho.
- Các route cũ được giữ để không làm hỏng link đã phát tại event.

## 4. Nguồn dữ liệu

| Nguồn logic | Vai trò |
| --- | --- |
| `Master_Check in` | STT, tên khách, sản phẩm, ghi chú, trạng thái flow |
| Đơn hàng | Tổng đăng ký và thông tin đơn |
| `Master_Điều phối` | Lịch sử gán khách vào bàn theo khâu |
| Master/`SS_Master` | Tiếp nhận, Hoàn tất, Thu máy nhanh, Bàn giao kho, media |
| `Master_DS` | Roster, workspace, vai trò, MSNV, tài khoản AIO |

Tên bảng vật lý và Table ID được giữ trong cấu hình Worker; tài liệu không công bố Table ID.

## 5. Quy tắc nghiệp vụ không được thay đổi âm thầm

- Chỉ có ba khâu: Tư vấn, Thu cũ, Backup.
- Tên khâu chỉ dùng Tư vấn, Thu cũ và Backup.
- Điều phối ghi `/dispatch-record`.
- Tiếp nhận/Hoàn tất/Thu máy nhanh/Bàn giao kho ghi `/record`.
- `Thu máy nhanh` không phải `Hoàn tất`.
- `Bàn giao kho` không phải `Hoàn tất`.
- Kho không nhập STT khách.
- Ảnh là Lark `file_token[]`, không phải URL hoặc base64 trong record.
- Một lần thao tác chỉ giữ tối đa ba ảnh.
- Không kết luận thành công chỉ từ HTTP 200; phải đối chiếu Base khi test.

## 6. Trạng thái production tại thời điểm audit

- Frontend: `apple.vhws.online`.
- Worker: `vhws-lark-proxy`.
- `/app`: HTTP 200.
- Worker health: đạt.
- Snapshot: đủ năm bảng, không warning tại thời điểm audit.
- Roster: 38 workspace, 38 workspace có mật khẩu.
- Master và Điều phối trống tại ảnh chụp audit; dữ liệu này thay đổi theo event.

## 7. Giới hạn hiện tại

- Bài full load 40 người/10 phút sau cấu hình hiện tại chưa hoàn tất.
- Formula/lookup của Lark có thể hội tụ chậm hơn thời gian Worker tạo record.
- Direct write route hiện cần được đánh giá bảo mật riêng; không được giả định Bearer token đã bảo vệ mọi route.
- Một số tài liệu cũ mô tả schema, số bàn và polling cũ.
- Alias route/code lịch sử cần được loại bỏ dần nhưng không được làm gãy link production trước khi có migration.

## 8. Tài liệu liên quan

- `00-PROJECT-MASTER-PLAN.md`
- `03-ARCHITECTURE-AND-CONNECTIONS.md`
- `04-LARK-DATA-MAPPING.md`
- `05-API-AND-WORKER-ROUTES.md`
- `06-AUTHENTICATION-AND-SECURITY.md`
- `09-DEPLOYMENT-RUNBOOK.md`
