# Bảng kiểm soát lỗi VHWS

Tài liệu này tổng hợp các lỗi có thể xảy ra giữa Lark Base, Worker/API và App.
Mục tiêu là tìm đúng lớp gây lỗi trước khi sửa.

> Quy tắc: HTTP 200 hoặc `code=0` chỉ chứng minh route phản hồi. Phải kiểm tra
> record đã lưu trong Base, snapshot đã đọc lại và App đã hiển thị đúng.

## 1. Quy trình xử lý chung

1. Ghi thời điểm, hostname, workspace, STT và thao tác vừa thực hiện.
2. Xác định lỗi thuộc thiết bị/mạng, App, Worker/API, Base record hay Formula/Lookup.
3. Kiểm tra dữ liệu đọc trước khi ghi thêm record.
4. Không retry liên tục nếu chưa biết lần trước đã ghi thành công hay chưa.
5. Sau khi xử lý, đọc lại Base và chờ App polling/realtime xác nhận.
6. Ghi lại record ID, response đã che thông tin nhạy cảm và kết quả hậu kiểm.

## 2. Lỗi kết nối, snapshot và cấu hình

| ID | Dấu hiệu | Vị trí tìm vấn đề | Kiểm tra | Hướng xử lý | Mức độ |
| --- | --- | --- | --- | --- | --- |
| CON-01 | App báo không đọc được dữ liệu vận hành | App: `src/services/larkClient.ts`; Worker: `/dashboard/snapshot` | Network, HTTP status, `body.code`, `msg` | Kiểm tra API URL theo vùng, Worker, Lark token và thử từng endpoint bảng | P0 |
| CON-02 | Snapshot chậm, partial hoặc stale | `cloudflare-worker.js`: `DashboardSnapshotCoordinator`; App: `src/hooks/useDashboardData.ts` | `warnings`, `cache`, tuổi `updatedAt`, thời gian từng bảng | Xác định bảng chậm; không tăng polling ngay; kiểm tra timeout/rate limit Lark | P1 |
| CON-03 | Một bảng luôn rỗng | Worker: `TABLE_ENV`, `readTableRecords`; Base table ID | Gọi riêng `/checkin`, `/orders`, `/master`, `/dispatch`, `/dsMaster` | Sửa secret/table ID đúng vùng; kiểm tra quyền app Lark và tên key | P0 |
| CON-04 | App không nhận snapshot đầu tiên | `src/services/larkClient.ts`; route `/dashboard/snapshot` | `apiUrl`, `lastUpdated`, response có đủ 5 bảng | Sửa API URL hoặc binding; kiểm tra route `/health` chỉ để xác nhận Worker sống | P0 |
| CON-05 | App gọi sai vùng HN/HCM | `src/config/larkSettings.ts`; hostname; Vercel env | Hostname, `DEFAULT_API_URL`, API URL thực tế | Dùng đúng Worker theo vùng; không kết luận vùng chỉ từ màu/branding giao diện | P0 |
| CON-06 | Đổi cấu hình nhưng máy khác chưa cập nhật | `src/services/appConfigApi.ts`; KV `CONFIG` | GET config, thời điểm cập nhật, cache trình duyệt | Kiểm tra PUT có Bearer admin, KV binding và hard refresh đúng lúc | P1 |
| CON-07 | Refresh liên tục làm dữ liệu chậm hơn | `src/hooks/serializedPolling.ts`, `useDashboardData.ts` | Có request chồng nhau không; p50/p95 | Giữ polling serialized; chờ request hiện tại; không bấm lặp | P1 |
| CON-08 | `/app` vào Dashboard hoặc 404 | `src/App.tsx`; `vercel.json`; deployment bundle | HTTP `/app`, pathname router, deployment commit | Kiểm tra route `/app`, rewrite và frontend deployment có chứa `AppPage` | P0 |

## 3. Lỗi cấu hình schema và field trong Lark Base

| ID | Dấu hiệu | Bảng/field cần kiểm tra | Vị trí code | Hướng xử lý | Mức độ |
| --- | --- | --- | --- | --- | --- |
| BASE-01 | Dữ liệu đọc được nhưng tên/bàn bị rỗng | `Master.Họ và tên`, `Master.TV_MãNV` | `src/services/larkMapper.ts`; formula/Lookup trong Base | Kiểm tra formula/Lookup và record nguồn; không ép Worker ghi vào field read-only | P0 |
| BASE-02 | App không biết khách thuộc khâu nào | `Master.Loại 2`; `Master_Check in.Done in Flow` | `larkMapper.ts`, `smsJourneyMapper.ts` | Chỉ dùng `Tư vấn`, `Thu cũ`, `Backup`; kiểm tra option và chính tả | P0 |
| BASE-03 | Dòng Master không xuất hiện trên sơ đồ | `Master.TV_MãNV`, `Submit by`, `Master Điều phối` | `mapDeskStates()`; `unresolvedDeskNames` | Bổ sung mã bàn/MSNV hoặc bản ghi điều phối; không xóa dòng để che lỗi | P1 |
| BASE-04 | STT khách bị sai hoặc không nối được | `Master_Check in.STT`, `Master.STT Input`, `Master_Điều phối.STT input` | `larkMapper.ts`, `queueMapper.ts` | Giữ STT dạng text/barcode thống nhất; kiểm tra khoảng trắng và giá trị trùng | P0 |
| BASE-05 | Dữ liệu Formula/Lookup không cập nhật | Formula, Lookup và bản ghi liên kết | Lark Base formula/lookup; `larkMapper.ts` | Kiểm tra record nguồn, khóa liên kết và thời điểm recalculation; chờ snapshot mới | P1 |
| BASE-06 | Ghi SingleSelect thất bại hoặc bị bỏ qua | `Master.Trạng thái`, `Master.Loại 2`, Dispatch `Phân loại` | Worker `getRecordFieldMeta()`, `buildRecordFields()` | Kiểm tra `/fields`; dùng đúng option hiển thị; xem `written`/`skipped` | P0 |
| BASE-07 | Person field không có tên nhân sự | `Master.Người` | Worker `buildRecordFields()`; Lark Person field | Dùng open_id đúng dạng; không ghi tên text vào Person field | P1 |
| BASE-08 | Thời gian/leadtime sai | `Master.Thời gian`, `Brower Leadtime`, `Proxy Leadtime` | Worker `tinhLeadtimeTuBase()`; mapper | Kiểm tra timezone, dòng `Tiếp nhận` và `Hoàn tất` cùng STT/khâu; ưu tiên Proxy Leadtime | P1 |
| BASE-09 | Ảnh có upload nhưng record không có attachment | `Master.Hình nghiệm thu máy cũ` | Worker `/upload`, `/record`, App `src/services/larkUpload.ts` | Kiểm tra `file_token` array, field type Attachment và `skipped` | P0 |
| BASE-10 | Field option hiển thị thành mã `opt...` | SingleSelect có option tĩnh | Worker `getFieldOptionMaps()`, `resolveOptionRefs()` | Kiểm tra quyền đọc `/fields`; xoá cache option khi schema đổi | P2 |
| BASE-11 | `Master_DS` không tạo được workspace | `STT bàn`, `Loại`, `NV Tư vấn`, `MSNV` | Worker `readRoster()`; App `adminSession.ts` | Sửa đúng dòng roster; DP có thể để trống `Loại` nhưng mã phải bắt đầu `DP` | P0 |
| BASE-12 | Đăng nhập sai sau đổi mật khẩu | `NPI_AIO_User`, `NPI_AIO_Pass` | Worker `/admin/login`; roster cache 60 giây | Chờ cache hết hạn; kiểm tra các dòng trùng username có password nhất quán | P0 |

## 4. Lỗi luồng Check-in và Điều phối

| ID | Dấu hiệu | Vị trí tìm vấn đề | Kiểm tra | Hướng xử lý | Mức độ |
| --- | --- | --- | --- | --- | --- |
| FLOW-01 | Check-in trùng số điện thoại | `Master_Check in.Số điện thoại` | Response duplicate và record cũ | Không tạo lại; tìm record cũ, xác nhận đúng khách rồi tiếp tục luồng | P1 |
| FLOW-02 | Check-in trùng mã đơn hàng | `Danh sách đơn hàng.MĐH_Selection`, `Master_Check in.Mã đơn hàng` | Worker `/checkin-record`, record hiện có | Không retry mù; xác nhận record đã ghi và xử lý duplicate | P1 |
| FLOW-03 | STT bị hai máy cùng chiếm | Worker Durable Object check-in queue | Log request, STT và response | Không clear Base; dùng queue/transaction hiện có, cấp STT khác nếu bị từ chối | P0 |
| FLOW-04 | Khách không vào hàng chờ bàn | `Master_Điều phối.DS Tư vấn/DS Thu cũ/DS Backup` | `written`, `skipped`, `recordId`; snapshot sau submit | Kiểm tra `Phân loại`, mã bàn và option; đọc lại Dispatch trước khi gửi lại | P0 |
| FLOW-05 | Điều phối sai khâu | `Master_Điều phối.Phân loại` và ba field DS | `src/components/DispatchFormModal.tsx`; Worker `/dispatch-record` | Chỉ chọn một khâu; đối chiếu đúng cột DS tương ứng | P0 |
| FLOW-06 | `Submit by` bị ghi nhầm nhân sự bàn | `Master_Điều phối.Submit by` | Payload từ form và session admin | `Submit by` phải là MSNV điều phối; không dùng MSNV bàn nhận | P1 |
| FLOW-07 | Gửi nhiều lần tạo record trùng | Form Điều phối, `/dispatch-record` | `clientActionId`, record ID và timestamp | Chờ response; tìm record trước khi retry; duy trì idempotency key | P0 |
| FLOW-08 | Khách xuất hiện hai bàn | `Master`, `Master_Điều phối`, trạng thái mới nhất | Các dòng cùng STT, bàn và thời gian | Xác định dòng mới nhất; không xóa lịch sử trước khi chốt record sai | P0 |
| FLOW-09 | Khách đã xong nhưng vẫn hiện đang xử lý | `Master.Trạng thái`, `Master_Check in.End flow` | Dòng `Hoàn tất` mới nhất và End flow | Sửa record nguồn/formula; không sửa riêng màu giao diện | P1 |
| FLOW-10 | Bàn có khách chờ nhưng không có STT tiếp theo | `Master_DS.STT tiếp theo`, `Sl khách chờ` | Kiểm tra queue và snapshot | Kiểm tra Dispatch chưa nhận, STT Input và mapper next waiting | P1 |

## 5. Lỗi luồng nhân viên, Thu cũ, Backup và Kho

| ID | Dấu hiệu | Vị trí tìm vấn đề | Kiểm tra | Hướng xử lý | Mức độ |
| --- | --- | --- | --- | --- | --- |
| STAFF-01 | Nhân viên vào nhầm bàn/khu vực | `Master_DS.STT bàn`, workspace session | `src/config/adminSession.ts`, `StaffDeskPicker.tsx` | Thoát phiên, đăng nhập lại, chọn đúng workspace; không sửa localStorage thủ công | P0 |
| STAFF-02 | Bấm Tiếp nhận nhưng không thấy Master | Worker `/record`; `Master` | token, payload, `recordId`, `written/skipped` | Kiểm tra quyền route và schema trước khi gửi lại | P0 |
| STAFF-03 | Hoàn tất nhưng status sai | `Master.Trạng thái`, `Loại 2` | `StaffDeskScreen.tsx`, `staffActionWebhook.ts` | Đối chiếu action với đúng khâu; không thay `Bàn giao kho` bằng `Hoàn tất` | P0 |
| STAFF-04 | Thu cũ thiếu QR/IMEI/ảnh | `Master.Scan QR máy cũ`, `Scan IMEI`, attachment | `ThuMayModal.tsx`, `PhotoSlotPicker.tsx` | Kiểm tra preview, token upload và attachment raw; không chỉ nhìn HTTP 200 | P1 |
| STAFF-05 | Thu máy nhanh bị tính thành khâu mới | `Master.Trạng thái = Thu máy nhanh` | `smsJourneyMapper.ts`, Worker leadtime | Giữ action Thu máy nhanh; không tạo dòng Hoàn tất mới | P1 |
| STAFF-06 | Backup bị dùng thay cho Thu cũ/Tư vấn | `Master_Điều phối.Phân loại`, `Master.Loại 2` | lịch sử điều phối và trạng thái khách | Điều phối lại đúng khâu; không sửa nhãn sau khi đã ghi sai nếu mất lịch sử | P0 |
| STAFF-07 | QR Kho báo bàn không tồn tại | `Master_DS.STT bàn` | `KhoHandoverForm.tsx`, route QR/roster-check | QR phải là `TV` + số; kiểm tra roster mới nhất và đúng vùng | P0 |
| STAFF-08 | Bàn giao Kho hiện sai STT hoặc sai trạng thái | `Master.Trạng thái`, `Loại 2`, `STT Input` | payload `action=ban_giao` và record raw | Kho để STT/Loại 2 rỗng; trạng thái phải là `Bàn giao kho`; QR là bàn TV nhận máy | P0 |
| STAFF-09 | Nhân viên không nhận được cảnh báo hỗ trợ | WebSocket `/realtime`, Durable Object `desk-alerts` | kết nối socket, `acknowledgedAt`, status pending | Kiểm tra replay pending và log sau delivery; không chỉ kiểm tra localStorage | P1 |

## 6. Lỗi quyền, Worker và bảo mật

| ID | Dấu hiệu | Vị trí tìm vấn đề | Kiểm tra | Hướng xử lý | Mức độ |
| --- | --- | --- | --- | --- | --- |
| SEC-01 | Admin không lưu được cấu hình | `/config/app`, `/config/coordinators` | Bearer token, role, KV binding | Đăng nhập lại admin; kiểm tra `CONFIG` KV và response thật | P0 |
| SEC-02 | Login đọc được nhưng role/workspace sai | `/admin/login`, `Master_DS` | username, MSNV, mã workspace, cache | Sửa roster; không cấp quyền bằng cách hardcode frontend | P0 |
| SEC-03 | Route ghi trả 200 nhưng không có record | `/record`, `/dispatch-record`, `/upload` | `code`, `recordId`, `written`, `skipped`; record raw | Kiểm tra persisted Base; sửa schema hoặc token trước retry | P0 |
| SEC-04 | Worker thiếu secret table | `cloudflare-worker.js` `TABLE_ENV`/`TB_*` | Worker env theo vùng | Bổ sung secret đúng tên; không ghi secret vào Git, App hoặc log | P0 |
| SEC-05 | Worker thiếu Durable Object binding | `DASHBOARD_SNAPSHOT`, `WAREHOUSE_ORDER_*` | `wrangler.jsonc`, deployment Worker | Sửa binding và deploy Worker; xác minh route sau deploy | P0 |
| SEC-06 | App đọc lộ field nhạy cảm | `Master_DS` response | `stripSecretFields()`, response raw | Không trả `NPI_AIO_Pass`; kiểm tra public snapshot và roster response | P0 |
| SEC-07 | Người không đủ quyền gọi route ghi | `/record`, `/dispatch-record`, `/upload` | Authorization matrix hiện tại và `verifyToken` | Bổ sung/enforce auth ở Worker trước khi coi là lỗi frontend | P0 |
| SEC-08 | CORS hoặc preflight lỗi | Worker `OPTIONS`, CORS headers | status OPTIONS, `Access-Control-Allow-*` | Sửa CORS Worker; không dùng `no-cors` để che lỗi | P1 |
| SEC-09 | Token hết hạn giữa phiên | `src/config/adminSession.ts`, Worker `verifyToken()` | `expiresAt`, response 401/403 | Đăng nhập lại; không kéo dài TTL bằng frontend | P1 |

## 7. Lỗi báo cáo và Nhật ký vận hành

| ID | Dấu hiệu | Vị trí tìm vấn đề | Kiểm tra | Hướng xử lý | Mức độ |
| --- | --- | --- | --- | --- | --- |
| REPORT-01 | Leadtime báo 0 hoặc sai khâu | `Master.Thời gian`, `Loại 2`, dòng Hoàn tất | `src/components/OperationsLogPanel.tsx`, `smsJourneyMapper.ts` | Đối chiếu cặp Tiếp nhận/Hoàn tất cùng STT; ưu tiên `Proxy Leadtime` | P1 |
| REPORT-02 | Bộ lọc vị trí không thấy bàn | mã `TV/TC/BK/KHO`, mapper stage | `OperationsLogPanel.tsx` positions | Kiểm tra tiền tố và field deskCode; không đổi nhãn hiển thị để chữa dữ liệu nguồn | P2 |
| REPORT-03 | Kho có log nhưng không có STT | Đây là hành vi đúng của `Bàn giao kho` | `warehouseEventsFromMaster()` | Kiểm tra mã bàn, QR và người thao tác; không ép thêm STT khách | P2 |
| REPORT-04 | Nhật ký thiếu sự kiện vừa ghi | snapshot cache/polling | `lastUpdated`, cache age, record raw | Làm mới một lần; kiểm tra cache invalidation Worker; không tạo lại record ngay | P1 |
| REPORT-05 | Export khác dữ liệu đang xem | filter state và `exportRows` | query, stage, position, date range | Giữ nguyên bộ lọc trước export; kiểm tra row count và header | P2 |
| REPORT-06 | Kiểm soát hệ thống báo bình thường nhưng vận hành sai | phạm vi kiểm tra hiện tại | Base raw, formulas, Worker logs, route write | Xem tab chỉ là cảnh báo tự động; chạy checklist smoke test và đối chiếu Base | P1 |

## 8. Bảng vị trí kiểm tra nhanh

| Câu hỏi | Mở trước | Sau đó kiểm tra |
| --- | --- | --- |
| App không có dữ liệu? | `src/hooks/useDashboardData.ts` | `/dashboard/snapshot`, `DashboardSnapshotCoordinator`, từng bảng Lark |
| Sai bàn hoặc sai khách? | `src/services/larkMapper.ts` | `Master.TV_MãNV`, `Submit by`, `Master_Điều phối`, formula/Lookup |
| Không ghi được record? | `src/services/staffActionWebhook.ts`, `dispatchWebhook.ts` | Worker `/record` hoặc `/dispatch-record`, `/fields`, record raw |
| Login/workspace sai? | `src/config/adminSession.ts`, `src/components/AppLogin.tsx` | Worker `/admin/login`, `Master_DS` và cache roster |
| Sai Check-in? | `src/hooks/useCheckinData.ts`, `CheckinPage.tsx` | `Master_Check in`, duplicate phone/order, queue STT |
| Sai Thu cũ/ảnh? | `ThuMayModal.tsx`, `larkUpload.ts` | `/upload`, `/media/:token`, attachment field Master |
| Sai Kho? | `KhoHandoverForm.tsx`, `khoMapper.ts` | QR `TV...`, `Master_DS`, record `Bàn giao kho` |
| Cảnh báo không hiện? | `dashboardRealtime.ts`, `deskAlerts.ts` | WebSocket `/realtime`, Durable Object `desk-alerts`, `acknowledgedAt` |
| Vừa deploy nhưng vẫn lỗi? | `src/App.tsx`, Vercel deployment | remote SHA, alias, Worker deployment và API URL theo vùng |

## 9. Evidence tối thiểu khi báo lỗi

- Thời điểm và timezone.
- Hostname: HN, HCM, Dashboard hoặc preview.
- Route và thao tác vừa thực hiện.
- Workspace, mã bàn và STT; không gửi mật khẩu/token.
- HTTP status, `code`, `msg`, `recordId`, `written`, `skipped` đã che dữ liệu nhạy cảm.
- Tên bảng/field liên quan và ảnh chụp màn hình.
- Snapshot `lastUpdated`, `warnings`, trạng thái cache nếu có.
- Commit frontend, deployment Vercel và phiên bản Worker.

## 10. Không được làm khi chưa xác định record

- Không xoá hàng loạt trong Base.
- Không tạo lại record liên tục vì thấy App chưa cập nhật.
- Không sửa formula/Lookup bằng cách đổi sang text.
- Không dùng tài khoản admin thay nhân viên để che lỗi phân quyền.
- Không đưa token, mật khẩu, app secret hoặc dữ liệu khách vào log/screenshot.
