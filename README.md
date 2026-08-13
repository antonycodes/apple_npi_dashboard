# NPI Event · Coordinator Dashboard

Bảng điều khiển sơ đồ **tương tác thời gian thực** cho điều phối viên sự kiện ra
mắt iPhone (cellphoneS). Mô phỏng layout sự kiện thành lưới tọa độ, đồng bộ trạng
thái bàn từ **Lark Base (Bitable)** qua HTTPS, tự cập nhật mỗi 30 giây.

## Tính năng

- **38 bàn tương tác**: 10 Thu cũ (TC1–TC10) · 18 Tư vấn (TV1–TV18) · 10 Backup (BK1–BK10).
- **Màu trạng thái**: `Sl … tiếp nhận > 0` → **Đỏ** (đang tiếp nhận), ngược lại →
  **Xanh** (trống); **Xám** = chưa có dữ liệu. Badge cam = số khách đang chờ.
- **Click bàn → popover chi tiết**: Tên NV · STT Khách · Tên sản phẩm (SP 1) ·
  Ghi chú thanh toán · Khách đang chờ.
- **Sidebar**: Tổng khách đã Check-in + breakdown Tiếp nhận/Trống/Chờ mỗi cụm.
- **Bộ lọc nhanh**: "Chỉ hiện bàn trống", "Chỉ hiện bàn Thu cũ".
- **Auto-refresh 30s** (polling) + thanh trạng thái đồng bộ.
- **Trang Cài đặt Lark** (`#/settings`): nhập key kết nối và ánh xạ tên cột Lark
  ↔ trường web ngay trong web (không cần sửa code/env) — xem mục dưới.

## Màn hình nhân viên trên điện thoại (`#/tv4`, `#/nv`)

Giao diện riêng cho **từng nhân viên TV / TC / BK**, thiết kế theo iPhone 17
(402 × 874 pt, có chừa Dynamic Island + thanh home). Nội dung: khách đang tiếp
nhận (STT · tên · sản phẩm · ghi chú thanh toán · các cột check · **đồng hồ phục
vụ**), **STT khách tiếp theo** + số khách đang chờ, danh sách **sổ xuống**
"Khách đã tiếp nhận · hoàn tất" (lịch sử phục vụ trong ngày của đúng bàn đó,
đóng theo mặc định, ẩn hẳn khi bàn chưa hoàn tất khách nào), và 2 nút cố định
ở đáy — **Tiếp nhận** / **Hoàn tất**. Tự làm mới **5 giây/lần** qua proxy.

| Link | Dành cho | Khác biệt |
| --- | --- | --- |
| `#/tv4` · `#/tc1` · `#/kt1` · `#/bk2` | **Nhân viên** — mỗi bàn 1 link | Khoá đúng bàn đó, **không có** chọn/đổi bàn |
| `#/nv` | **Admin / điều phối tổng** | Xem bàn bất kỳ, đổi bàn, và **copy link riêng** của bàn đang xem để gửi cho NV |

- **Đăng nhập**: `#/nv` (admin/điều phối tổng) đăng nhập bằng tài khoản `admin`
  + **mật khẩu** `ADMIN_PASSWORD`. Link riêng từng bàn (`#/tv4`…) đăng nhập bằng
  đúng mã bàn + **mật khẩu dùng chung** `STAFF_PASSWORD`. Cả hai secret đều đặt
  trên worker, không có trong bundle web. Cả hai đều bị bỏ qua khi đang chạy dữ
  liệu mẫu hoặc chưa cấu hình API URL.
- **Link copy ở `#/nv` có kèm `?api=…`**: máy nhân viên mở lần đầu là tự lưu
  API URL của proxy và chuyển sang dữ liệu thật, không phải vào `#/settings`
  khai tay. Tham số tự bị xoá khỏi thanh địa chỉ ngay sau đó.
- **Mock data**: mọi trang (kể cả `#/tv4`) tự đọc cấu hình dùng chung từ KV
  của worker mỗi 5 giây (`useSharedSettingsSync`), nên `npm run dev` mở
  `#/tv1` **không** tự vào kịch bản mock nữa nếu worker đã có cấu hình Live —
  thêm `?mock=1` vào hash (`#/tv1?mock=1`) hoặc bật Mock ở `#/settings` để
  xem kịch bản mẫu: TV1 đang tiếp khách **STT 02**, **STT tiếp theo là 04**.
- **Đồng hồ phục vụ**: chạy từ lúc bấm **Tiếp nhận** đến lúc bấm **Hoàn tất**,
  mốc chỉ lưu trong bộ nhớ của tab (không phải `localStorage`) — khoá màn
  hình/chuyển app rồi quay lại không mất, nhưng **reload trang thì mất**, đồng
  hồ quay về suy đoán. Vàng ≥ 10 phút, đỏ ≥ 20 phút. Mở màn hình lên mà thấy
  sẵn khách (được tiếp nhận từ máy khác, hoặc sau khi reload) thì đồng hồ hiện
  `~` — mốc suy ra từ lúc màn hình nhìn thấy, không phải số đo thật.

### 2 nút Tiếp nhận / Hoàn tất — cùng 1 đường: form recheck → webhook

Cả 2 nút đều mở **form recheck** (sửa được STT / họ tên; mã bàn / phân loại /
nhân sự / MSNV chỉ để đối chiếu, không sửa) → POST webhook → automation Lark
tạo record `SS_Master`. **Bắt buộc phải cấu hình webhook** — không còn đường
dự phòng mở hyperlink trực tiếp: thiếu webhook thì cả 2 nút xám, không bấm
được.

Điền ô "Webhook Tiếp nhận / Hoàn tất" ở `#/settings` bằng
`https://<worker>.workers.dev/webhook2`.

```jsonc
// POST /webhook2 → worker chuyển tiếp tới secret LARK_WEBHOOK_URL2
{
  "action": "tiep_nhan",        // hoặc "hoan_tat" — dùng để rẽ nhánh trong automation
  "trangThai": "Tiếp nhận",     // → cột "Trạng thái"
  "stt": "7",
  "hoTen": "Lê Thanh My",       // → cột "Họ và tên"
  "maBan": "TV4",               // → cột "TV_MãNV"
  "msnv": "NV0007",             // MSNV từ Master_DS, không sửa được trên form
  "phanLoai": "Tư vấn",         // → cột "Loại 2"
  "nhanSu": "M Thành_CV_VHWS&AM",
  "submitBy": "NV0007",         // = msnv, cùng quy ước với webhook Điều phối
  "thoiGian": "2026-08-12T11:24:03.000Z", // → cột "Thời gian"

  // ── Chỉ có khi HOÀN TẤT (mọi khâu) ────────────────────────────────────
  "checkBackup": "Có",          // "Có" | "Không" — bắt buộc chọn

  // ── Chỉ có khi HOÀN TẤT ở khâu THU CŨ / BACKUP, sau khi chọn "Thu lại
  //    máy". Cả 4 field dưới đều KHÔNG bắt buộc: field nào NV bỏ trống thì
  //    KHÔNG xuất hiện trong JSON. ─────────────────────────────────────────
  "thuLaiMay": "Thu máy ngay",  // "Thu máy ngay" | "Thu máy sau"
  "hinhNghiemThu": ["TZsybpKIUo…", "Qlc5bkK5Ko…"], // MẢNG file_token (chọn nhiều ảnh)
  "scanQr": "QR-TEST-12345",    // nội dung QR máy thu cũ
  "imei": "356938035643809"
}
```

Cột **"Người"** là *person field* nên automation không điền được từ text — cứ để
trống, mapper vẫn xác định đúng bàn qua `TV_MãNV` và tên NV lấy từ roster
`Master_DS`. Muốn lưu tên NV thì tạo thêm 1 cột text và map `nhanSu` vào đó.

**Field nào xuất hiện lúc nào** — form chỉ hiện đúng thứ cần cho khâu đó, và
payload KHÔNG chứa key của field không áp dụng (để automation phân biệt "không
áp dụng" khỏi "có áp dụng nhưng để trống"):

| Field | Tiếp nhận | Hoàn tất · Tư vấn | Hoàn tất · Thu cũ | Hoàn tất · Backup |
| --- | --- | --- | --- | --- |
| `checkBackup` | — | ✅ bắt buộc | ✅ bắt buộc | — |
| `thuLaiMay` | — | — | ✅ tuỳ chọn | ✅ tuỳ chọn |
| `hinhNghiemThu` · `scanQr` · `imei` | — | — | ✅ tuỳ chọn, chỉ hiện sau khi chọn `thuLaiMay` | ✅ như bên trái |

Bàn **Backup không hỏi `checkBackup`** — khách đã ngồi ở bàn Backup thì hỏi "có
dùng Backup không" là thừa.

- **`checkBackup`**: NV tự xác nhận khách có dùng Backup không — độc lập với
  cột "Backup check" ở Check-in (do khâu khác ghi từ trước, form chỉ hiện nó
  ở phần đối chiếu read-only). Bắt buộc chọn 1 trong 2 mới bấm Gửi được.
- **`thuLaiMay`** mở ra 3 field máy thu cũ (ảnh / QR / IMEI). Chọn option nào
  cũng mở, kể cả "Thu máy sau". Cả 3 để trống vẫn gửi được.
- **Điền sẵn khi khách quay lại với trạng thái "Thu máy sau"**: app tra ngược
  bảng `Master` theo `STT Input`, lấy dòng mới nhất có cột `Thu lại máy`. Nếu
  dòng đó là **"Thu máy sau"** (máy chưa thu), form Hoàn tất ở khâu sau sẽ điền
  sẵn `thuLaiMay`, `scanQr`, `imei` và hiện lại ảnh cũ dạng thumbnail — NV bỏ
  được ảnh chụp hỏng (nút ×), chụp bù ảnh mới, sửa QR/IMEI nếu sai. Dòng cũ là
  **"Thu máy ngay"** thì máy đã thu xong, form để trắng như ca mới.
  - **Riêng bàn Backup**: nếu dữ liệu cũ đã đủ **cả 3** (ảnh + QR + IMEI) thì
    `thuLaiMay` mặc định sang **"Thu máy ngay"**, và nút **"Thu máy sau" bị khoá
    xám** để NV không bấm nhầm — đủ 3 thứ nghĩa là máy đã cầm trên tay. Thiếu 1
    trong 3 thì không khoá. Bàn Thu cũ không áp quy tắc này, vẫn bê nguyên giá
    trị cũ và chọn được cả hai.
  - Mỗi lần Gửi tạo **record mới**, không sửa đè dòng cũ (Master là bảng log).
    Ảnh NV giữ lại được gửi kèm token cũ nên record mới có đủ ảnh; dòng cũ vẫn
    giữ nguyên ảnh của nó. Báo cáo nên lọc dòng mới nhất theo STT.
  - Thumbnail ảnh cũ tải qua `GET /media/<file_token>` của worker — **route này
    phải được deploy** thì ảnh mới hiện, vì `file_token` không phải URL và link
    Lark trả về thì đòi Bearer.
- **`hinhNghiemThu` là MẢNG `file_token`, không phải ảnh**: cột đính kèm Bitable
  chỉ nhận token do Lark cấp. NV chọn/chụp được **nhiều ảnh một lần**; app
  upload TUẦN TỰ từng ảnh qua `POST /upload` của worker (worker ký bằng
  `tenant_access_token`, xem mục Worker), gom token rồi mới gửi JSON này. Upload
  hỏng ảnh nào thì app DỪNG HẲN và báo đứt ở ảnh thứ mấy, không gửi webhook —
  không tạo record báo thành công mà thiếu ảnh.
- **Ô Scan QR và IMEI đều quét được bằng camera**, hoặc chụp/chọn ảnh có mã.
  IMEI mở thêm mã vạch 1D (`code_128`, `code_39`, `ean_13`, `itf`) vì tem IMEI
  trên máy là mã vạch, không phải QR.
  - Giải mã: dùng `BarcodeDetector` khi có (Android — chạy native, nhanh hơn),
    còn lại rơi sang **zxing-wasm**. Bắt buộc phải có đường WASM vì
    `BarcodeDetector` **không tồn tại trên iOS** — mọi trình duyệt ở đó đều chạy
    WebKit, nên nếu chỉ dựa vào API đó thì iPhone không quét được mã vạch nào.
  - Module WASM (~1MB, gzip ~448KB) `import()` động, **chỉ tải khi NV mở máy
    quét** — bundle chính không phình. File `.wasm` tự host qua `?url` của Vite
    chứ không lấy từ CDN mặc định của thư viện, để hội trường chặn CDN vẫn chạy.

> Cần tự thêm cột trong `SS_Master` + map 5 field mới (`checkBackup`,
> `thuLaiMay`, `hinhNghiemThu`, `scanQr`, `imei`) trong automation Lark thì giá
> trị mới được lưu. Riêng `hinhNghiemThu` phải map vào **cột đính kèm**.

Chống ghi trùng: nút khoá trong lúc đang gửi; gửi hỏng thì hoàn tác trạng thái
trên máy (không để màn hình báo "đã tiếp nhận" trong khi Lark chẳng có record);
gửi xong 15 giây mà polling vẫn chưa thấy record thì hiện cảnh báo vàng.

Nút **Hoàn tất** chỉ hiện khi bàn đang có khách — bấm Tiếp nhận là nó hiện ra
ngay (kèm nhãn "đang chờ Lark cập nhật") chứ không phải đợi hết 5 giây polling.

> Cột hyperlink (`Master."Hyperlink Master"`, `Master_Check in."Hyperlink
> Tiếp nhận"`, và cặp cột dự phòng cấp bàn ở `Master_DS`) vẫn được đọc và tính
> sẵn trong `staffMapper.ts` nhưng **hiện không nút nào dùng tới** — mã còn
> lại từ bản trước khi chuyển hẳn sang webhook, giữ lại phòng khi cần quay
> lại kiểu mở hyperlink trực tiếp.

## Trang Cài đặt Lark (`#/settings`)

Mở link **"Cài đặt Lark"** ở header. Cho phép cấu hình **runtime** (lưu vào
`localStorage`, áp dụng ngay, dashboard tự đồng bộ lại):

1. **Nguồn dữ liệu**: Mock (mẫu) hoặc Lark Base (thật).
2. **Kết nối**: chọn **Proxy/Webhook** (nhập API URL) hoặc **Direct API** (Host,
   App Token, Access Token + 5 Table ID) + chu kỳ làm mới.
3. **Ánh xạ trường**: điền tên cột Lark cho từng trường web (3 bảng DS + khối
   Status + Check in). Để trống = dùng mặc định.
4. **Kiểm tra kết nối** (thử fetch, báo số bàn/check-in/đơn), **Lưu & đồng bộ**,
   **Khôi phục mặc định**.

> Cấu hình `.env` chỉ là **giá trị khởi tạo**; trang Cài đặt ghi đè lúc chạy.
> Chi tiết lấy token/table id + dựng proxy: xem `docs/LARK_SETUP.md`.

## Công nghệ

Vite 6 · React 18 · TypeScript · TailwindCSS 3.

## Chạy dự án

```bash
npm install
npm run dev      # dev server — mặc định chạy mock data (từ file NPI_Testing_2)
npm run build    # typecheck + build production
npm run preview  # xem bản build
```

## Stress test hạ tầng

Branch tối ưu hạ tầng/test: `codex/infra-k6-optimization`. Các màn hình đọc
Lark dùng polling tuần tự để tránh chồng vòng đọc khi Lark phản hồi chậm. Các
POST Tiếp nhận/Hoàn tất vẫn độc lập và có thể chạy đồng thời giữa TV1/TV2.

Runner chỉ đọc mặc định, kiểm tra `/health` rồi tạo tải đồng thời lên 5 route
bảng mà dashboard đọc. Ví dụ 30 worker trong 5 phút:

```bash
npm run stress-test -- --mode read --duration 300 --concurrency 30
```

Muốn mô phỏng cả điều phối, Tiếp nhận và Hoàn tất thì phải bật ghi live một cách
tường minh. Các payload đều mang mã synthetic `LOADTEST-...`/STT test và có thể
tạo record thật trong Lark; nên chạy trên Base/test workflow hoặc có kế hoạch dọn
dữ liệu sau đó:

```bash
npm run stress-test -- --mode write --duration 600 --concurrency 32 --allow-live-writes
```

Có thể đổi `--base-url`, `--dispatch-url`, `--staff-url`, `--interval-ms` và
`--timeout-ms`. Kết quả cuối gồm tổng request, lỗi/timeout, throughput và p50/p95/p99.
Runner không tự kết luận sức chịu tải của Lark hay workflow nếu chưa chạy vào môi
trường live; cần đối chiếu thêm Workers Logs, Lark automation run history và số
record thực tế sau bài test.

## Kiến trúc dữ liệu

Ứng dụng đọc **7 bảng** Lark (xem `memory.md §4` để biết chi tiết schema thật):

| Vai trò            | Bảng                                   | Dùng cho                         |
| ------------------ | -------------------------------------- | -------------------------------- |
| Danh sách bàn (DS) | `DS thu cũ` · `DS Tư vấn` · `DS backup`| Mã bàn, nhân viên, số liệu live  |
| Giao dịch          | `Thu cũ` · `Tư vấn` · `Back-up`        | Chi tiết khách (Trạng thái, SP 1)|
| Check-in           | `Check in`                             | Tổng khách + ghi chú thanh toán  |

- **Màu bàn** lấy từ DS `Sl … tiếp nhận`.
- **Chi tiết khách** join best-effort từ bảng giao dịch (Tư vấn qua `TV_MãNV`).

## Cấu hình Lark Base

> 📖 Hướng dẫn liên kết chi tiết (lấy token, table id, dựng proxy, xử lý CORS):
> xem **[`docs/LARK_SETUP.md`](docs/LARK_SETUP.md)**.

Copy `.env.example` → `.env.local`:

- **Mode 1 (khuyến nghị):** `VITE_LARK_API_URL` = proxy/webhook HTTPS do bạn kiểm
  soát. Client gọi `${VITE_LARK_API_URL}/<tableKey>` với `tableKey` ∈
  `dsTradein dsConsult dsBackup txTradein txConsult txBackup checkin`, mỗi
  endpoint trả JSON list-records của Lark. (Giữ secret server-side, tránh CORS.)
- **Mode 2 (trực tiếp):** `VITE_LARK_APP_TOKEN` + `VITE_LARK_ACCESS_TOKEN` + 7
  biến `VITE_LARK_TABLE_*` (mỗi Table_ID).
- Không cấu hình gì → chạy mock data đi kèm. `VITE_LARK_POLL_MS` mặc định 30000.

Tên cột mặc định khớp workbook `NPI_Testing_2` và nằm trong
`src/config/larkConfig.ts` (`DS_FIELDS` / `TX_FIELDS` / `CHECKIN_FIELDS`) — sửa ở
đó nếu base của bạn đặt tên cột khác.

## Cấu trúc

Xem `memory.md` để biết kiến trúc đầy đủ, schema dữ liệu thật, tọa độ layout và
tiến độ từng bước.

## Cloudflare Worker proxy

Worker nằm tại `cloudflare-worker.js`, cấu hình tại `wrangler.jsonc`.
Worker cung cấp các route `/checkin`, `/orders`, `/master`,
`/dispatch` và `/dsMaster` theo schema trong PROJECT_SPEC_LARK_REUSE.md.

**`GET /dashboard/snapshot`** (2026-08-13) — gom **cả 5 bảng vào 1 request**.
Mọi màn hình đọc Lark đều đi đường này; trước đây mỗi máy bắn 5 request song
song mỗi 5 giây, nhân với ~38 máy là ~38 request/giây liên tục lên Lark.

Chịu lỗi tạm thời của Lark (`1254607 Data not ready`) theo **từng bảng**: bảng
nào lỗi thì trả cache riêng của bảng đó (hoặc `[]`) và ghi vào `data.warnings`,
`msg` thành `"partial snapshot"` — endpoint vẫn **HTTP 200** để dashboard không
sập vì một bảng chớp nháy. Cache 4 giây, có stale fallback 30 giây, và bị xoá
ngay sau mỗi `/record`, `/webhook`, `/webhook2` thành công.

> Route đọc bảng lẻ (`/checkin`, `/master`…) **không có** lớp chịu lỗi này —
> Lark trả `1254607` là nó trả thẳng HTTP 500. Đó chính là nguyên nhân "lỗi đồng
> bộ" thỉnh thoảng hiện trên dashboard trước khi chuyển sang snapshot.

Cache là biến trong isolate của Worker, **không dùng chung giữa các edge
isolate** — nên máy ở khu vực khác có thể vẫn phải đọc Lark thật.

**`POST /upload`** (2026-08-12) — nhận ảnh nghiệm thu (multipart, field `file`,
tối đa 10MB) từ form Hoàn tất khâu Thu cũ/Backup, upload lên Lark bằng
`tenant_access_token` rồi trả `{ data: { fileToken } }`. Không cần secret mới
(dùng lại `LARK_APP_ID`/`LARK_APP_SECRET`/`LARK_APP_TOKEN`), nhưng **phải
`npx wrangler deploy` lại** thì route mới có hiệu lực.

**`GET /fields`** (2026-08-12) — soi schema bảng `TB_MASTER`: tên + kiểu từng
cột, kèm kết quả đối chiếu với `RECORD_FIELD_MAP` (cột nào khớp, cột nào sai
tên, cột nào không ghi được). Mở bằng trình duyệt để kiểm tra map **trước khi**
bấm thử ca thật, khỏi tốn record rác mới biết lệch tên.

**`GET /media/<file_token>`** (2026-08-12) — mở ảnh từ token bằng trình duyệt.
`file_token` không phải URL; muốn ra ảnh phải gọi API tải của Lark kèm
`tenant_access_token`, nên worker ký hộ rồi stream ảnh về. Dùng để **soi lỗi**
("token này có ra ảnh thật không?") — đường chính để ảnh hiện trong Base vẫn là
ghi token vào cột đính kèm qua `/record`.

> Route này **không đòi đăng nhập**: ai có URL worker + 1 token hợp lệ đều tải
> được file đó (token là chuỗi ngẫu nhiên không đoán được, và route chỉ ĐỌC).
> Không cần nữa thì xoá khối `route.startsWith('media/')` rồi deploy lại.

### `POST /record` — ghi thẳng record, thay cho automation

Ô **đính kèm** bên Bitable chỉ nhận giá trị dạng `[{"file_token": "..."}]`
(mảng object), trong khi automation "Add record" chỉ kéo được **một tham số
text** vào ô đó — nên ảnh nghiệm thu gần như chắc chắn không vào được nếu đi
đường automation. Route này gọi thẳng Bitable API, nơi định dạng trên là chính
thức.

**Cách đổi sang đường này — không cần sửa code app**: route nhận đúng payload
app đang gửi và trả cùng khuôn `{code, msg}`. Chỉ cần vào `#/settings` → ô
"Webhook Tiếp nhận / Hoàn tất", đổi `…/webhook2` thành `…/record`. Dán lại URL
cũ là quay về automation ngay, không phải deploy lại.

| | `/webhook2` (automation) | `/record` (ghi thẳng) |
| --- | --- | --- |
| Ảnh nghiệm thu | ❌ gần như không vào được ô đính kèm | ✅ đúng định dạng Lark quy định |
| Tên cột | map trong automation | map trong `RECORD_FIELD_MAP` ở worker |
| Việc khác của automation (thông báo, cập nhật bảng khác…) | ✅ giữ nguyên | ❌ mất — phải tự làm lại |

Route **tự dò schema** trước khi ghi: đọc field metadata của bảng `TB_MASTER`,
chỉ ghi cột nào có thật và ghi được; cột sai tên / là formula-lookup-hệ thống /
là person field đều bị bỏ qua và liệt kê trong `data.skipped` của phản hồi —
sai tên cột lộ ra ngay thay vì làm hỏng cả record. Phản hồi thành công:

```jsonc
{
  "code": 0,
  "data": {
    "recordId": "recXXXXXXXX",
    "written": ["STT Input", "Họ và tên", "TV_MãNV", "Trạng thái", "…"],
    "skipped": ["Người — cột người dùng, cần open_id"]
  }
}
```

Muốn sửa tên cột thì sửa `RECORD_FIELD_MAP` trong `cloudflare-worker.js` rồi
deploy lại.

Secrets cần cấu hình: `LARK_APP_ID`, `LARK_APP_SECRET`,
`LARK_APP_TOKEN`, `TB_CHECKIN`, `TB_ORDERS`, `TB_MASTER`,
`TB_DISPATCH`, `TB_DS_MASTER`, `ADMIN_SESSION_SECRET`, `ADMIN_PASSWORD`,
`STAFF_PASSWORD`; `LARK_HOST` là tuỳ chọn.

> `ADMIN_PASSWORD` là **bắt buộc**: thiếu nó thì mọi lần đăng nhập admin trả
> 500 kèm thông báo rõ, KHÔNG rơi về chế độ không mật khẩu như trước.

```bash
npx wrangler login
npx wrangler secret put LARK_APP_ID
npx wrangler secret put LARK_APP_SECRET
npx wrangler secret put LARK_APP_TOKEN
npx wrangler secret put TB_CHECKIN
npx wrangler secret put TB_ORDERS
npx wrangler secret put TB_MASTER
npx wrangler secret put TB_DISPATCH
npx wrangler secret put TB_DS_MASTER
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put STAFF_PASSWORD
npx wrangler deploy
```

Mapping hiện tại: `TB_MASTER` dùng table `Master_Staff` (logic Master /
SS_Master); `TB_DS_MASTER` dùng table `Master_DS` (logic DS Master).
