# Authentication & Security

## 1. Phạm vi

Tài liệu mô tả đúng trạng thái hiện tại và các rủi ro cần xử lý. Không chứa credential thật.

## 2. Nguồn tài khoản

### AIO roster

- Username: `Master_DS.NPI_AIO_User`.
- Password: `Master_DS.NPI_AIO_Pass`.
- Workspace: mỗi dòng `Master_DS` có `STT bàn`, `Loại`, tên và MSNV.
- Một username có thể có nhiều workspace.
- Worker cache roster khoảng 60 giây; đổi mật khẩu trong Base không cần deploy nhưng có độ trễ cache.

### Admin

- Username admin được kiểm tra riêng.
- Password nằm trong Cloudflare secret `ADMIN_PASSWORD`.
- Không được đặt admin password trong frontend hoặc Git.

### Staff legacy

- Mã bàn + `STAFF_PASSWORD` dùng chung còn được giữ để tương thích link cũ.
- Xóa secret này sẽ tắt đường legacy.
- Không dùng đường legacy làm hướng dẫn chính cho nhân viên.

## 3. Phiên đăng nhập

- Worker cấp token ký bằng `ADMIN_SESSION_SECRET`.
- TTL hiện tại: 12 giờ.
- Frontend lưu token và metadata session trong localStorage key nội bộ.
- Frontend không lưu password hoặc password hash.
- Session gồm role, workspace, username, MSNV và tên.
- Hết hạn: client xóa session khi gặp 401 hoặc khi `expiresAt` đã qua.

## 4. Role và workspace

| Role | Quyền UI |
| --- | --- |
| `staff` | Màn hình bàn TV/TC/BK được chọn |
| `kho` | Bàn giao và Bảng Kho |
| `dieuphoi` | Dashboard Điều phối |
| `admin` | Danh mục toàn bộ module và PUT cấu hình |

Nếu `Loại` trống, Worker có thể suy role từ tiền tố workspace. Theo quyết định dự án, các dòng DP trống `Loại` được giữ nguyên.

## 5. Authorization server hiện tại

### Đã enforce

- PUT `/config/app`: admin token.
- PUT `/config/coordinators`: admin token.
- Login: credential check và generic error.

### Chưa enforce đầy đủ

Audit source xác nhận các route sau hiện chưa bắt buộc Bearer token tại server:

- POST `/record`;
- POST `/dispatch-record`;
- POST `/upload`;
- GET `/media/:token` khi biết file token.

Frontend có gửi token khi đã đăng nhập, nhưng server không kiểm tra token ở các direct write route. Do đó UI login không phải lớp bảo vệ đầy đủ cho dữ liệu ghi.

## 6. Rủi ro

| Mức | Rủi ro | Ảnh hưởng |
| --- | --- | --- |
| Cao | Ai biết Worker URL có thể POST direct write/upload | Record rác, chi phí media, sai vận hành |
| Cao | Password roster đang là giá trị Base có thể đọc bởi app integration | Lộ Base/app credential làm lộ tài khoản |
| Trung bình | `/roster-check` public trả workspace/username | Tăng khả năng dò user, dù không trả password |
| Trung bình | `/fields` public trả schema/table metadata | Lộ cấu trúc dữ liệu kỹ thuật |
| Trung bình | Media proxy dựa vào file token | Token bị lộ có thể cho phép đọc ảnh |
| Trung bình | Token nằm trong localStorage | XSS hoặc máy dùng chung có thể lấy session |
| Thấp | Staff password legacy dùng chung | Khó truy trách nhiệm nếu tiếp tục sử dụng |

## 7. Kiểm soát vận hành hiện tại

- Worker không trả password trong `/roster-check`.
- Sai user/password dùng chung một thông báo.
- Secret nằm ở Cloudflare, không trong bundle.
- UI khóa nút trong lúc gửi để tránh double-submit.
- Upload tuần tự và giới hạn ba ảnh.
- Direct write dò schema, không tạo record nếu không map được cột nào.
- Production test phải có run ID/thời gian và chủ dự án tự clear Base.

## 8. Khuyến nghị hardening

### Ưu tiên P0 trước event lớn

1. Enforce token hợp lệ cho `/record`, `/dispatch-record` và `/upload`.
2. Enforce role/workspace:
   - staff chỉ ghi workspace thuộc session;
   - Kho chỉ dùng `ban_giao` và workspace KHO;
   - Điều phối chỉ ghi `/dispatch-record`;
   - admin có quyền kỹ thuật cần thiết.
3. Thêm rate limit theo token/IP/route.
4. Hạn chế `/roster-check` và `/fields` bằng admin token hoặc cờ debug.

### P1

5. Thêm idempotency key để chống double-submit.
6. Gắn audit fields/run ID/request ID.
7. Thêm kích thước/MIME limit cho upload.
8. Dùng sessionStorage hoặc cookie HttpOnly nếu chuyển được kiến trúc auth.
9. Tắt `STAFF_PASSWORD` sau khi toàn bộ nhân viên dùng AIO roster.

### P2

10. Hash/rotate mật khẩu roster hoặc chuyển sang identity provider phù hợp.
11. Log security event có retention và redaction.
12. Cơ chế revoke session khi đổi mật khẩu hoặc nhân sự rời event.

## 9. Quy tắc tài liệu và log

- Không chụp ảnh cột password.
- Không lưu raw `/roster-check` trong Git nếu có username.
- Không ghi bearer token, app token, table ID hoặc file token vào PDF.
- Kết quả k6 cần redact URL/query có identifier.
- Screenshot production phải kiểm tra tên/SĐT khách trước khi phát hành.

## 10. Checklist trước event

- Rotate admin/session/Lark secrets nếu cần.
- Xác nhận 38 workspace đúng người và vai trò.
- Kiểm tra tài khoản nhiều workspace.
- Đăng nhập thử staff, DP và Kho.
- Kiểm tra logout và token expiry behavior.
- Kiểm tra Worker route authorization sau mỗi thay đổi bảo mật.
- Chuẩn bị rollback nếu hardening làm hỏng thiết bị cũ.
