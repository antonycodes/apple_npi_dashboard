# API & Worker Routes

> Base URL production được cấu hình trong App. Không ghi Lark secret hoặc URL webhook gốc vào tài liệu.

## 1. Response convention

Worker chủ yếu trả JSON:

```json
{
  "code": 0,
  "msg": "success",
  "data": {}
}
```

- `code = 0`: route xử lý thành công ở mức Worker.
- HTTP 2xx + `code=0` chưa thay thế kiểm tra persisted Base ở bài test nghiệp vụ.
- Lỗi schema/Lark thường trả `code=-1` và `msg` chi tiết.

## 2. CORS

- Worker trả CORS cho frontend.
- `OPTIONS` trả 204.
- Client ưu tiên JSON request đọc được status.
- `no-cors` chỉ là fallback legacy và không xác nhận server đã xử lý.

## 3. Route đọc hệ thống

### GET `/health`

Mục đích: xác nhận Worker đang chạy. Không chứng minh từng bảng Lark đều đọc được.

### GET `/dashboard/snapshot`

Trả năm bảng logic:

- `checkin`
- `orders`
- `master`
- `dispatch`
- `dsMaster`

Response có thể chứa `warnings` và trạng thái cache. Client phải phân biệt success đầy đủ, partial và stale.

### GET endpoint từng bảng

`/checkin`, `/orders`, `/master`, `/dispatch`, `/dsMaster` dùng cho kiểm tra riêng, fallback và hậu kiểm.

### GET `/roster-check`

Trả audit roster:

- số dòng;
- số tài khoản đọc được;
- số tài khoản có mật khẩu;
- mismatch user/MSNV;
- workspace và vai trò;
- không trả mật khẩu.

Không công khai output đầy đủ trong PDF vận hành.

## 4. Route schema

### GET `/fields`

Audit Master:

- tên cột;
- type/uiType;
- mapping `ok` hoặc lý do skip;
- table ID có trong response kỹ thuật nhưng không sao chép vào tài liệu phát hành.

### GET `/fields?table=dispatch`

Audit mapping Điều phối và ba cột DS.

## 5. Authentication

### POST `/admin/login`

Request:

```json
{
  "username": "<user>",
  "password": "<password>"
}
```

Response thành công gồm token, TTL, role, desks, workspaces, username, MSNV và tên. Mật khẩu không được trả về hoặc lưu phía frontend.

Worker thử theo thứ tự:

1. tài khoản roster `Master_DS`;
2. admin secret;
3. đường staff password dùng chung legacy nếu còn bật.

Thông báo sai username/mật khẩu được gộp để tránh dò tài khoản.

## 6. Shared config

### GET/PUT `/config/app`

- GET công khai cho thiết bị bootstrap.
- PUT cần Bearer token role admin.
- Lưu cấu hình chuẩn hóa trong KV.

### GET/PUT `/config/coordinators`

- GET công khai.
- PUT cần Bearer token role admin.

## 7. Direct write

### POST `/dispatch-record`

Mục đích: ghi đồng bộ vào bảng Điều phối.

Payload chính:

```json
{
  "stt": "41",
  "phanLoai": "Tư vấn",
  "maBan": "TV1",
  "submitBy": "<MSNV>"
}
```

Worker:

1. đọc schema bảng Dispatch;
2. map field chung;
3. chọn đúng cột DS theo `phanLoai`;
4. tạo record Lark;
5. invalidation snapshot cache;
6. trả `recordId`, `written`, `skipped`.

### POST `/record`

Mục đích: ghi Tiếp nhận, Hoàn tất, Thu máy nhanh hoặc Bàn giao kho.

Worker:

1. parse payload;
2. đọc schema Master;
3. bỏ field rỗng/read-only/person không hợp lệ;
4. nếu `action=hoan_tat`, thử tính `Proxy Leadtime`;
5. tạo record;
6. invalidation cache;
7. trả persisted record ID và mapping result.

## 8. Media

### POST `/upload`

- Content-Type: multipart form-data.
- Field file: `file`.
- Worker upload Lark media và trả `fileToken`.
- App upload tuần tự, tối đa ba ảnh theo UI.

### GET `/media/:file_token`

- Worker lấy tenant token và proxy file từ Lark.
- Dùng để preview/hậu kiểm attachment.
- Không ghi token thật vào tài liệu hoặc log công khai lâu dài.

## 9. Legacy routes

### POST `/webhook` và `/webhook2`

- Forward tới URL lưu trong Worker secret.
- Tồn tại để rollback/tương thích.
- Client hiện normalize `/webhook` → `/dispatch-record` và `/webhook2` → `/record`.
- Không dùng route legacy làm route chính cho test tải.

## 10. Authorization matrix hiện tại

| Route | Public read | Token admin | Token staff/kho/DP | Hiện trạng bảo vệ server |
| --- | --- | --- | --- | --- |
| `/health`, snapshot, table GET | Có | Không cần | Không cần | Public |
| `/roster-check`, `/fields` | Có | Không cần | Không cần | Public technical metadata |
| `/admin/login` | POST public | N/A | N/A | Credential check |
| GET config | Có | Không cần | Không cần | Public bootstrap |
| PUT config | Không | Bắt buộc | Không đủ quyền | Đã enforce |
| `/record` | N/A | Client có thể gửi | Client có thể gửi | **Chưa enforce token trong route** |
| `/dispatch-record` | N/A | Client có thể gửi | Client có thể gửi | **Chưa enforce token trong route** |
| `/upload` | N/A | Client có thể gửi | Client có thể gửi | **Chưa enforce token trong route** |
| `/media/:token` | Có token file | Không cần | Không cần | Biết token thì đọc được |

Đây là hiện trạng audit, không phải thiết kế bảo mật mục tiêu.

## 11. Smoke test tối thiểu sau deploy Worker

1. GET `/health`.
2. GET `/fields` và dispatch fields.
3. GET `/roster-check` chỉ đọc số lượng.
4. GET snapshot và kiểm tra warnings.
5. Nếu được phép ghi: một Dispatch, một Tiếp nhận, một Hoàn tất có media.
6. Đối chiếu record ID và field Base.
7. Kiểm tra `/media/:token`.
8. Xác nhận App thấy dữ liệu sau polling/cache.
