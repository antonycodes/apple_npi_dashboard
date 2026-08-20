# NPI-CPS — Project Master Plan

> Tài liệu gốc để lưu trữ, vận hành, phát triển và bàn giao hệ thống.
> Trạng thái audit: **2026-08-20** · Source: `main@fa71b61` · Production: `https://apple.vhws.online`

## 1. Mục đích tài liệu

Tài liệu này định nghĩa phạm vi và kế hoạch xây dựng bộ hồ sơ hoàn chỉnh cho dự án **NPI-CPS**. Mục tiêu cuối cùng là để một người không tham gia phát triển ban đầu vẫn có thể:

- hiểu luồng nghiệp vụ của Điều phối, Tư vấn, Thu cũ, Backup và Kho;
- biết App, Vercel, Cloudflare Worker và Lark Base kết nối với nhau thế nào;
- tra được nguồn và đích của từng trường dữ liệu quan trọng;
- triển khai, kiểm tra, giám sát và rollback hệ thống;
- vận hành tại event với khoảng 40 nhân sự;
- chẩn đoán lỗi đồng bộ bằng bằng chứng thay vì suy đoán;
- sử dụng tài liệu giao diện đúng thiết bị: iPad cho Điều phối/Kho và iPhone cho nhân sự bàn.

Đây là **master plan**, chưa phải tài liệu hướng dẫn cuối cùng. Các tài liệu chuyên đề, screenshot và mockup sẽ được tạo ở các giai đoạn sau khi audit hoàn tất.

## 2. Quy ước mức độ xác minh

Mọi tài liệu trong bộ project-master phải gắn một trong ba trạng thái:

- **Đã xác minh:** có bằng chứng từ source hiện tại, production, schema Lark hoặc kết quả test lưu trữ.
- **Quan sát tạm thời:** đo tại một thời điểm nhưng chưa đủ để kết luận dài hạn.
- **Chưa xác minh:** thiết kế hoặc kỳ vọng nghiệp vụ chưa có bài test/bằng chứng cuối cùng.

Không được dùng kết quả `npm run build`, HTTP 200 hoặc k6 0% lỗi để tự kết luận rằng luồng Lark đã lưu đúng. Luồng ghi chỉ đạt khi đối chiếu được record và field thực tế trong Base.

## 3. Tóm tắt sản phẩm hiện tại

### 3.1 Mục tiêu sản phẩm

NPI-CPS gom các màn hình vận hành của event vào một ứng dụng web:

- Dashboard Điều phối;
- màn hình nhân sự Tư vấn;
- màn hình nhân sự Thu cũ;
- màn hình nhân sự Backup;
- module Kho bàn giao máy;
- các màn hình STT theo khu vực;
- bảng Kho/kanban;
- Cài đặt và Quản trị.

### 3.2 URL production

| Mục đích | URL/route | Trạng thái |
| --- | --- | --- |
| All in One trực tiếp | `https://apple.vhws.online/app` | Đã xác minh HTTP 200 và bundle AIO |
| All in One hash route | `https://apple.vhws.online/#/app` | Đã có trong router |
| Dashboard Điều phối | `https://apple.vhws.online/#/` | Route cũ được giữ |
| Màn hình Tư vấn | `#/tuvanview` | Route cũ được giữ |
| Màn hình Thu cũ | `#/thucuvview` | UI hiển thị nhãn **Thu cũ** |
| Màn hình Backup | `#/backupview` | Route cũ được giữ |
| Bảng Kho | `#/khoview` | Route cũ được giữ |
| Màn hình nhân sự tổng | `#/nv` | Route cũ được giữ |
| Link khóa theo bàn | `#/tvN`, `#/tcN`, `#/bkN` | Route cũ được giữ |
| Cài đặt | `#/settings` | Có sẵn |
| Quản trị | `#/admin` | Có sẵn |

`vercel.json` rewrite `/app` và `/app/:path*` về `index.html`; router phía client đồng thời nhận diện `window.location.pathname` để `/app` không rơi về Dashboard.

### 3.3 Các khâu nghiệp vụ chuẩn

Chỉ có ba khâu phục vụ khách:

1. **Tư vấn**
2. **Thu cũ**
3. **Backup**

Tên khâu trên giao diện và tài liệu chỉ dùng **Tư vấn**, **Thu cũ**, **Backup**. Route/comment lịch sử không được đưa vào hướng dẫn người dùng.

**Bàn giao kho** là một nghiệp vụ riêng:

- không phải khâu thứ tư của khách;
- không dùng trạng thái `Hoàn tất`;
- không nhập hoặc quét STT khách;
- trạng thái ghi là `Bàn giao kho`;
- QR chứa mã bàn Tư vấn nhận máy, ví dụ `TV1`, `TV2`;
- Kho chụp tối đa 3 ảnh trước khi submit.

## 4. Vai trò và điều hướng AIO

Nguồn phân quyền là bảng `Master_DS`. Sau đăng nhập, Worker trả về danh sách workspace của tài khoản; App tự điều hướng:

| Vai trò Worker | Nguồn nhận diện | Màn hình AIO |
| --- | --- | --- |
| `staff` | `Loại` Tư vấn/Thu cũ/Backup hoặc mã bàn tương ứng | `StaffPage` khóa theo workspace |
| `kho` | `Loại = Kho` hoặc mã `KHO...` | `KhoAppPage` |
| `dieuphoi` | `Loại = Điều phối` hoặc mã `DP...` | Dashboard Điều phối |
| `admin` | Tài khoản admin | Danh mục mở toàn bộ module |

Một tài khoản có thể có nhiều workspace. Khi đó AIO hiện **Chọn khu vực**, chỉ liệt kê các workspace thuộc chính tài khoản đó. Người dùng có thể đổi khu vực hoặc đăng xuất.

### 4.1 Audit roster production ngày 2026-08-20

| Chỉ số | Kết quả |
| --- | ---: |
| Dòng `Master_DS` | 38 |
| Workspace đọc được | 38 |
| Workspace có mật khẩu | 38 |
| Dòng `NPI_AIO_User` lệch `MSNV` | 0 |
| Workspace vai trò nhân sự | 28 |
| Workspace Kho | 6 |
| Workspace Điều phối | 4 |
| Tài khoản có nhiều workspace | 6 |

Ba dòng DP đang để trống `Loại`; Worker vẫn suy vai trò Điều phối từ tiền tố mã bàn. Theo quyết định dự án, không yêu cầu chuẩn hóa các dòng này; tài liệu chỉ ghi rõ cơ chế suy vai trò để phục vụ kiểm tra sự cố.

Không lưu username cụ thể hoặc mật khẩu trong bộ tài liệu Git.

## 5. Kiến trúc hệ thống

```text
iPhone nhân sự / iPad Điều phối / iPad Kho
                      │
                      ▼
          React + Vite + TypeScript
             apple.vhws.online
                 (Vercel)
                      │ HTTPS
                      ▼
        Cloudflare Worker: vhws-lark-proxy
          ├─ xác thực roster
          ├─ đọc và cache snapshot
          ├─ ghi Điều phối/Master
          ├─ upload và proxy media
          ├─ lưu cấu hình dùng chung trong KV
          └─ che Lark credentials khỏi frontend
                      │ Lark Open API
                      ▼
                   Lark Base
```

### 5.1 Phân trách nhiệm

**Vercel**

- host static frontend;
- build bằng `npm run build`;
- gắn domain `apple.vhws.online`;
- rewrite direct route `/app` về SPA entry.

**Cloudflare Worker**

- giữ Lark app credentials và token;
- đọc năm nguồn dữ liệu chính;
- gộp snapshot Dashboard;
- timeout/caching/fallback khi Lark chậm;
- xác thực tài khoản AIO từ `Master_DS`;
- ghi trực tiếp `/dispatch-record` và `/record`;
- upload ảnh và trả media token;
- lưu cấu hình dùng chung trong KV binding `CONFIG`.

**Lark Base**

- nguồn sự thật về roster, check-in, đơn hàng và log vận hành;
- chứa formula/lookup quyết định tên khách, trạng thái và End Flow;
- mật khẩu AIO có thể thay đổi tại Base; Worker đọc roster với cache ngắn.

**Trình duyệt**

- điều hướng theo vai trò/workspace;
- camera QR/IMEI và chọn ảnh;
- trạng thái gửi tạm thời, cảnh báo chậm và timer trên thiết bị;
- polling cấu hình/snapshot;
- không được chứa Lark secret.

## 6. Phương thức kết nối

### 6.1 Frontend → Worker

- Giao thức: HTTPS JSON; upload dùng multipart form-data.
- API URL lấy từ cấu hình dùng chung hoặc tham số link `?api=...`.
- App hiện ưu tiên Proxy/Worker; Direct API chỉ là cơ chế cấu hình cũ/dự phòng.
- Các hook dùng serialized polling: lượt mới chỉ chạy sau khi lượt trước kết thúc, tránh chồng request vô hạn.
- Timeout một lượt đọc: 20 giây.
- Cấu hình dùng chung được kiểm tra mỗi 5 giây.
- Cấu hình live hiện đặt nhịp đọc snapshot nhanh; Worker edge cache hấp thụ phần lớn request trình duyệt.

### 6.2 Worker → Lark

- Worker dùng tenant access token từ `LARK_APP_ID` và `LARK_APP_SECRET`.
- App/Base token và Table ID lấy từ Worker secrets/configuration.
- Table ID và secret không ghi vào tài liệu public.
- Schema field được cache 10 phút theo từng table ID.
- Roster `Master_DS` được cache khoảng 60 giây.
- Token và app token được cache trong Worker isolate.

### 6.3 Snapshot và cache

Các nguồn trong snapshot:

- `checkin`
- `orders`
- `master`
- `dispatch`
- `dsMaster`

Thông số source hiện tại:

| Cơ chế | Giá trị |
| --- | ---: |
| Snapshot memory fresh TTL | 500 ms |
| Snapshot stale fallback | 30 giây |
| Edge snapshot fresh window | 500 ms |
| Edge cache TTL | 60 giây |
| Schema cache | 10 phút |
| Request timeout frontend | 20 giây |

Edge cache trả dữ liệu nhanh và làm mới Lark ở nền. Đường ghi không dùng cache và sẽ invalidation cache liên quan. Tài liệu hiệu năng phải phân biệt:

- thời gian App nhận snapshot;
- độ tuổi dữ liệu trong snapshot;
- thời gian Lark cập nhật formula/lookup sau khi ghi.

## 7. API Worker cần tài liệu hóa

| Route | Method | Chức năng | Ghi dữ liệu |
| --- | --- | --- | --- |
| `/health` | GET | Kiểm tra Worker | Không |
| `/dashboard/snapshot` | GET | Đọc gộp 5 bảng | Không |
| `/checkin`, `/orders`, `/master`, `/dispatch`, `/dsMaster` | GET | Đọc từng bảng | Không |
| `/roster-check` | GET | Audit roster an toàn, không trả mật khẩu | Không |
| `/admin/login` | POST | Đăng nhập admin/AIO | Không |
| `/config/app` | GET/PUT | Cấu hình dùng chung | PUT có thay đổi KV |
| `/config/coordinators` | GET/PUT | Cấu hình Điều phối | PUT có thay đổi KV |
| `/fields` | GET | Audit mapping Master | Không |
| `/fields?table=dispatch` | GET | Audit mapping Điều phối | Không |
| `/dispatch-record` | POST | Ghi bảng Điều phối | Có |
| `/record` | POST | Ghi Master | Có |
| `/upload` | POST | Upload ảnh Lark | Có |
| `/media/:file_token` | GET | Xem lại media | Không |
| `/webhook`, `/webhook2` | POST | Route legacy/rollback | Có qua webhook ngoài |

Quy tắc chuẩn hiện tại:

- Điều phối → `/dispatch-record`.
- Tiếp nhận, Hoàn tất, Thu máy nhanh, Bàn giao kho → `/record`.
- Không dùng HTTP 2xx của route legacy để suy ra rằng Base đã nhận đủ record.

## 8. Data mapping trọng yếu

### 8.1 Master/SS_Master — ghi qua `/record`

| Payload App | Cột Lark | Kiểu production | Trạng thái mapping | Ghi chú |
| --- | --- | --- | --- | --- |
| `stt` | `STT Input` | Barcode/Text | Ghi được | Kho để trống |
| `hoTen` | `Họ và tên` | Formula | Không ghi trực tiếp | Lark tự tính |
| `maBan` | `TV_MãNV` | Lookup | Không ghi trực tiếp | Suy qua roster/field liên kết hiện có |
| `trangThai` | `Trạng thái` | Single select | Ghi được | `Tiếp nhận`, `Hoàn tất`, `Thu máy nhanh`, `Bàn giao kho` |
| `msnv` | `Submit by` | Text | Ghi được | Người thực hiện |
| `nhanSu` | `Người` | Person | Không ghi text | Cần `open_id`; Worker bỏ qua an toàn |
| `phanLoai` | `Loại 2` | Single select | Ghi được | Chỉ `Tư vấn`, `Thu cũ`, `Backup`; Kho để trống |
| `thoiGian` | `Thời gian` | DateTime | Ghi được | ISO time → Lark timestamp |
| `checkBackup` | `Back up` | Single select | Ghi được | Không dùng ở mọi khâu |
| `thuLaiMay` | `Thu lại máy` | Single select | Ghi được | `Thu máy ngay`/`Thu máy sau` |
| `scanQr` | `Scan QR máy cũ` | Barcode | Ghi được | Máy cũ hoặc QR bàn nhận Kho theo luồng hiện tại |
| `imei` | `Scan IMEI` | Barcode | Ghi được | Khâu máy cũ |
| `hinhNghiemThu` | `Hình nghiệm thu máy cũ` | Attachment | Ghi được | Mảng file token, tối đa 3 ảnh từ UI |
| `leadtimeGiay` | `Brower Leadtime` | Number | Ghi được | App tính, dùng đối chiếu |
| Worker tính | `Proxy Leadtime` | Number | Ghi được | Nguồn ưu tiên để đánh giá |

### 8.2 Điều phối — ghi qua `/dispatch-record`

| Payload | Cột Lark | Trạng thái |
| --- | --- | --- |
| `stt` | `STT input` | Ghi được |
| `phanLoai` | `Phân loại` | Ghi được |
| `submitBy` | `Submit by` | Ghi được |
| `maBan`, khâu Tư vấn | `DS Tư vấn` | Ghi được |
| `maBan`, khâu Thu cũ | `DS Thu cũ` | Ghi được |
| `maBan`, khâu Backup | `DS Backup` | Ghi được |

`Submit by` của Điều phối phải là MSNV của Điều phối viên được xác định từ đúng workspace `DP...`, không phải nhân sự bàn nhận khách.

### 8.3 Master_DS — roster và workspace

Các field phải được tài liệu hóa chi tiết ở `04-LARK-DATA-MAPPING.md`:

- `STT bàn`
- `Loại`
- `NV Tư vấn`
- `MSNV`
- `NPI_AIO_User`
- `NPI_AIO_Pass`
- `STT tiếp theo`
- `Sl khách chờ`
- các hyperlink legacy/dự phòng.

`Master_DS` là nguồn quyền truy cập và workspace, không phải nguồn chính xác định trạng thái đang phục vụ của khách.

## 9. Audit production ngày 2026-08-20

### 9.1 Vercel

- Project: `apple-npi`.
- Production domain: `apple.vhws.online`.
- Frontend commit: `fa71b61`.
- `/app` trả HTTP 200 và cùng SPA entry với `/`.
- Bundle production đã có đăng nhập AIO, Chọn khu vực, Kho, Bàn giao kho và nhãn Thu cũ.

### 9.2 Cloudflare Worker

- Worker: `vhws-lark-proxy`.
- `/health`: `code=0`, spot-check khoảng 0,21 giây.
- `/fields`: mapping ghi chính của Master hợp lệ; ba field formula/lookup/person được bỏ qua có chủ đích.
- `/fields?table=dispatch`: toàn bộ mapping Điều phối chính hợp lệ.
- `/roster-check`: 38/38 workspace đọc được và có mật khẩu.
- `/dashboard/snapshot`: `code=0`, `msg=success`, không warning tại thời điểm audit.

### 9.3 Snapshot tại thời điểm audit

| Bảng logic | Số dòng |
| --- | ---: |
| Check-in | 42 |
| Đơn hàng | 50 |
| Master | 0 |
| Điều phối | 0 |
| Master_DS | 38 |

Đây là ảnh chụp thời điểm, không phải dữ liệu cố định của dự án.

### 9.4 Tài liệu hiện có cần cập nhật hoặc đánh dấu lịch sử

| Tài liệu | Vấn đề audit | Hướng xử lý |
| --- | --- | --- |
| `README.md` | Trộn mô tả kiến trúc cũ với các bổ sung mới; một số đoạn còn nói branch tối ưu riêng và nhịp polling cũ | Giữ quick-start, thay phần kiến trúc bằng link sang project-master |
| `docs/PROJECT_OVERVIEW.md` | Còn mô hình 38 bàn/TV18, năm bảng kiểu cũ, polling 30 giây và chưa có AIO/Kho | Gắn nhãn historical trước khi viết lại |
| `docs/LARK_SETUP.md` | Có giá trị tham khảo thiết lập ban đầu nhưng phải đối chiếu Worker/KV/route trực tiếp hiện tại | Tách setup hiện hành và migration/legacy |
| `k6/README.md` | Có lệnh test nhưng chưa phải báo cáo năng lực production có evidence | Giữ hướng dẫn chạy; kết quả chính chuyển sang `08-LOAD-CAPACITY-REPORT.md` |
| `k6/END_FLOW_SCENARIO.md` | Mô tả một kịch bản chuyên biệt, không bao phủ AIO/Kho hiện tại | Giữ làm test reference và liên kết từ test matrix |

Không xóa tài liệu cũ trước khi nội dung còn giá trị đã được chuyển sang bộ project-master.

## 10. Giao diện và thiết bị mục tiêu

### 10.1 iPad — Điều phối

Mockup sẽ dùng giao diện production thật ở:

- iPad Pro 12.9 inch ngang, mục tiêu `1366 × 1024`;
- iPad 10.9 inch ngang, mục tiêu `1180 × 820`.

Các trạng thái cần chụp:

1. đăng nhập AIO;
2. Chọn khu vực DP;
3. Dashboard đầy đủ;
4. khách chờ Check-in;
5. khách chờ Điều phối;
6. popup bàn và popup khách;
7. form Điều phối cho ba khâu;
8. End Flow;
9. loading, partial snapshot, stale cache và lỗi mạng;
10. đăng xuất/đổi khu vực.

### 10.2 iPad — Kho

Mockup chính:

- iPad ngang cho Bảng Kho/kanban;
- iPad dọc hoặc ngang cho Bàn giao tùy kết quả audit thực tế.

Các trạng thái cần chụp:

1. đăng nhập Kho;
2. chọn `KHO...`;
3. tab Bàn giao;
4. scan QR `TV...`;
5. QR hợp lệ/không hợp lệ;
6. chọn 1–3 ảnh, preview, xóa/chụp lại;
7. submit `Bàn giao kho`;
8. thành công/thất bại;
9. tab Bảng Kho và lịch sử.

### 10.3 iPhone — nhân sự bàn

Viewport mục tiêu:

- iPhone Pro hiện đại: khoảng `393 × 852`;
- màn hình nhỏ dự phòng: `375 × 667`.

Các trạng thái cần chụp:

1. đăng nhập;
2. chọn workspace;
3. bàn không có khách;
4. khách chờ Tiếp nhận;
5. form kiểm tra lại;
6. đang phục vụ và timer;
7. Hoàn tất Tư vấn;
8. Thu cũ/Backup có QR, IMEI và ảnh;
9. Thu máy nhanh;
10. gửi chậm, lỗi upload, retry và cảnh báo chưa thấy Lark;
11. đổi khu vực và đăng xuất.

Mockup phải đặt screenshot thật trong khung thiết bị; wireframe chỉ dùng để giải thích cấu trúc khi chưa có dữ liệu production an toàn để chụp.

## 11. Khả năng chịu tải và tiêu chuẩn kết luận

### 11.1 Điều đã biết

- Worker có cache snapshot memory + edge và stale fallback.
- Frontend dùng serialized polling và timeout, giảm hiện tượng request chồng nhau.
- Route ghi trực tiếp tách khỏi đường cache đọc.
- Repository có các script k6 cho stress, journey, peak 40 VU và media live.
- Các bài live trước đây đã chứng minh được một số route/attachment, nhưng kết quả phải được gom lại thành artifact có thể truy vết.

### 11.2 Điều chưa được phép khẳng định

Chưa được ghi “đảm bảo 40 người sử dụng xuyên suốt” cho đến khi hoàn thành bài test chuẩn, vì bài live 40 người/10 phút toàn kịch bản gần nhất chưa được chạy đầy đủ sau cấu hình hiện tại.

### 11.3 Bài test chuẩn phải thực hiện

- 40 phiên đồng thời trong 10 phút;
- 30 nhân sự bàn, 4 Điều phối, 6 Kho;
- polling thực tế;
- đủ Tư vấn, Thu cũ, Backup, Thu máy nhanh và Bàn giao kho;
- sử dụng 1–3 ảnh ở các bước cần ảnh;
- dùng bộ 6 ảnh mẫu thiết bị đã được cung cấp;
- đo p50, p90, p95, p99, max, error rate và snapshot freshness;
- kiểm tra trực tiếp record Master/Điều phối, QR, IMEI, attachment và End Flow;
- lưu JSON/CSV kết quả, run ID, deployment ID, Worker version và ảnh chụp dashboard;
- kiểm tra recovery sau tải.

### 11.4 Tiêu chí mục tiêu ban đầu

| Chỉ số | Mục tiêu |
| --- | ---: |
| HTTP/application error | < 1% |
| Snapshot usable | > 99% |
| Snapshot hoàn chỉnh | > 95% |
| p95 App nhận dữ liệu | < 5 giây, đánh giá lại sau test thực tế |
| Ghi Master/Điều phối bị mất | 0 |
| Attachment không tải lại được | 0 |
| Sai mapping khâu/bàn/người gửi | 0 |

Nếu không đạt `<5 giây` nhưng người dùng vẫn thao tác liên tục, báo cáo phải tách rõ latency hiển thị, latency ghi và latency formula Lark trước khi quyết định tối ưu tiếp.

## 12. Rủi ro chính

| Rủi ro | Ảnh hưởng | Kiểm soát hiện có | Việc cần làm |
| --- | --- | --- | --- |
| Lark chậm/rate limit | Snapshot thiếu hoặc chậm | timeout, edge cache, stale fallback | Load test + cảnh báo tuổi dữ liệu |
| Cache che dữ liệu mới | App nhanh nhưng chưa thấy record mới | invalidation sau ghi, pending UI | Đo freshness và test race condition |
| Formula/lookup cập nhật trễ | Record có nhưng tên/bàn/status chưa hiện | polling và mapping fallback | Ghi thời gian hội tụ trong test |
| Field Lark đổi tên/kiểu | Bỏ qua field hoặc sai map | `/fields` và schema cache | Checklist schema trước event |
| `Loại` roster DP để trống | Vai trò phụ thuộc tiền tố mã bàn | Worker suy role từ `DP...` | Giữ mapping và kiểm tra prefix khi audit |
| Upload ảnh trong mạng yếu | Submit chậm/thất bại từng ảnh | upload tuần tự, báo ảnh lỗi | Test Wi-Fi/4G và retry UX |
| Timer trình duyệt mất khi reload | Brower Leadtime thiếu/sai | Proxy Leadtime từ Base | Dùng Proxy Leadtime làm chuẩn |
| Route legacy còn tồn tại | Nhầm endpoint, HTTP 200 nhưng mất dữ liệu | route trực tiếp là chuẩn | Tài liệu hóa/giới hạn legacy |
| Source và production lệch branch | Deploy mất AIO | main hiện đã chứa AIO | Ghi deployment checklist và commit |
| Tài liệu cũ không còn đúng | Vận hành theo schema/nhịp poll cũ | master plan mới | Đánh dấu deprecated và cập nhật |

## 13. Bộ tài liệu đầu ra

```text
docs/project-master/
├── 00-PROJECT-MASTER-PLAN.md
├── 01-SYSTEM-OVERVIEW.md
├── 02-USER-ROLES-AND-FLOWS.md
├── 03-ARCHITECTURE-AND-CONNECTIONS.md
├── 04-LARK-DATA-MAPPING.md
├── 05-API-AND-WORKER-ROUTES.md
├── 06-AUTHENTICATION-AND-SECURITY.md
├── 07-DEVICE-UI-GUIDE.md
├── 08-LOAD-CAPACITY-REPORT.md
├── 09-DEPLOYMENT-RUNBOOK.md
├── 10-EVENT-OPERATIONS-RUNBOOK.md
├── 11-TROUBLESHOOTING.md
├── 12-TEST-CASES.md
├── 13-CHANGELOG-AND-DECISIONS.md
├── diagrams/
├── screenshots/
├── mockups/
└── test-results/
```

Không tạo DOCX/PDF trước khi các file Markdown kỹ thuật được review; Markdown trong Git là nguồn chính, PDF là bản phát hành đóng gói.

## 14. Kế hoạch thực hiện

### Giai đoạn 1 — Audit và Master Plan

**Trạng thái: hoàn tất, quyết định mục 16 đã chốt**

- [x] Đối chiếu `main` và production Vercel.
- [x] Kiểm kê route AIO, route cũ và direct `/app`.
- [x] Kiểm tra Worker `/health`.
- [x] Kiểm tra `/fields` Master và Điều phối.
- [x] Kiểm tra roster theo số lượng/vai trò, không lưu credentials.
- [x] Kiểm tra snapshot năm bảng.
- [x] Ghi kiến trúc, mapping trọng yếu và rủi ro hiện tại.
- [x] Review master plan với chủ dự án.
- [ ] Đánh dấu tài liệu cũ deprecated hoặc cần cập nhật.

### Giai đoạn 2 — Tài liệu kỹ thuật

**Trạng thái: hoàn tất bản Markdown lần 1**

- [x] System Overview.
- [x] Architecture & Connections.
- [x] Lark Data Mapping.
- [x] API/Worker Routes.
- [x] Authentication & Security.
- [x] Deployment Runbook.

### Giai đoạn 3 — Tài liệu nghiệp vụ/vận hành

**Trạng thái: hoàn tất bản Markdown lần 1**

- [x] User Roles & Flows.
- [x] Event Operations Runbook.
- [x] Troubleshooting.
- [x] Test Case Matrix.
- [x] Changelog & Decision Log.

### Giai đoạn 4 — Screenshot và mockup thiết bị

**Trạng thái: hoàn tất bộ ảnh public/pre-login; màn sau đăng nhập chờ phiên vận hành an toàn**

- [x] Audit viewport iPad 1366×1024, iPad 1180×820, iPhone 393×852 và 375×667.
- [x] Chụp giao diện production với dữ liệu không chứa credentials/khách hàng.
- [x] Dựng mockup iPad Điều phối.
- [x] Dựng mockup iPad Kho.
- [x] Dựng mockup iPhone nhân sự ở cổng AIO.
- [x] Kiểm tra readability và safe area cơ bản.
- [ ] Chụp màn sau đăng nhập cho Tư vấn, Thu cũ, Backup và Kho bằng phiên do chủ dự án đăng nhập trực tiếp.

### Giai đoạn 5 — Khả năng chịu tải

- Baseline read-only.
- Test upload/media.
- Smoke test ghi thật có run ID.
- Test 40 người/10 phút sau xác nhận phạm vi dữ liệu production.
- Đối chiếu Base.
- Viết Load Capacity Report và biểu đồ.

### Giai đoạn 6 — Đóng gói lưu trữ

- Review chéo nội dung.
- Xuất PDF tổng hợp.
- Lưu screenshot/mockup gốc.
- Lưu test artifacts.
- Gắn version tài liệu với Git commit, deployment ID và Worker version.
- Tạo ZIP lưu trữ nếu cần; không đưa credentials vào ZIP.

## 15. Tiêu chuẩn hoàn thành toàn bộ bộ hồ sơ

- Tên nghiệp vụ nhất quán: Tư vấn, Thu cũ, Backup, Bàn giao kho.
- Mọi route và field mapping quan trọng được đối chiếu với source/schema live.
- Không có secret, password, access token, app token hoặc table ID nhạy cảm trong tài liệu phát hành.
- Mọi tuyên bố tải có artifact và thời điểm đo.
- Mockup dùng đúng thiết bị mục tiêu và screenshot giao diện thật.
- Có runbook triển khai, rollback và xử lý sự cố tại event.
- Một người mới có thể triển khai và vận hành theo tài liệu mà không cần đọc lịch sử chat.
- Tài liệu ghi rõ version source, Vercel deployment và Worker tương ứng.

## 16. Quyết định đã chốt sau Giai đoạn 1

1. **Không chuẩn hóa `Loại` của các dòng DP:** giữ dữ liệu `Master_DS` hiện tại; Worker tiếp tục suy vai trò Điều phối từ tiền tố `DP` khi `Loại` trống.
2. **Không giữ tên “Kỹ thuật”:** không có khâu này. Tài liệu và giao diện người dùng chỉ dùng `Tư vấn`, `Thu cũ`, `Backup`. Alias kỹ thuật trong code/route cũ sẽ được loại bỏ dần, không được đưa vào tài liệu vận hành.
3. **Đối tượng PDF cuối:** đội vận hành và nhân viên sử dụng App. Chi tiết kỹ thuật sâu vẫn lưu trong Markdown để bảo trì hệ thống.
4. **Môi trường load test:** dùng production thật.
5. **Dữ liệu sau test:** chủ dự án tự clear trong Lark Base; nhóm test phải cung cấp run ID, thời gian và danh sách record dự kiến để việc clear có thể kiểm soát.

---

### Nguồn audit chính

- Source `main@fa71b61`.
- `src/App.tsx`, `src/pages/AppPage.tsx`, `src/pages/KhoAppPage.tsx`.
- `src/config/larkConfig.ts`, `src/config/larkSettings.ts`.
- `src/services/*`, `src/hooks/*`.
- `cloudflare-worker.js`, `wrangler.jsonc`, `vercel.json`.
- Production `apple.vhws.online`.
- Worker production endpoints `/health`, `/fields`, `/fields?table=dispatch`, `/roster-check`, `/dashboard/snapshot`.
