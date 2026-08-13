# HANDOFF — NPI Event dashboard, Cloudflare Worker và k6 live test

## 1. Mục tiêu tổng thể và scope

Repository: `/Users/antonynguyen/Downloads/npievent-main`

Branch đang làm: `codex/infra-k6-optimization`

Mục tiêu phiên này:

1. Mô phỏng hành trình khách từ Check-in đến End Flow trên Lark Base production.
2. Test tải theo hành vi sự kiện thật, gồm 36 bàn + 4 điều phối, polling dashboard và nhiều thiết bị ghi đồng thời.
3. Giảm lỗi/chậm dashboard khi nhiều thiết bị cùng đọc dữ liệu.
4. Test đủ Tư vấn, Thu cũ, Backup, Tiếp nhận, Hoàn tất, ảnh nghiệm thu, QR sample và IMEI sample.
5. Chẩn đoán vì sao một số khách End Flow hiện `()()()` ở cột Nhân sự.

Hệ thống production đang dùng:

- Worker: `https://vhws-lark-proxy.eventnpi2026.workers.dev`
- Các bảng logic: `checkin`, `orders`, `master`, `dispatch`, `dsMaster`.
- `/record` ghi trực tiếp vào bảng `TB_MASTER`.
- `/webhook` chuyển tiếp sang Lark Automation để tạo record Điều phối.
- `/upload` upload ảnh vào Lark Drive/Bitable và trả `file_token`.
- `/dashboard/snapshot` gom năm bảng cho dashboard.

Không được nhầm hai loại deploy:

- Cloudflare Worker đã được deploy trong phiên này.
- Các thay đổi React/Vite phía frontend vẫn chỉ nằm local trên branch, chưa commit/push và chưa xác nhận đã lên Vercel.

## 2. Trạng thái Git hiện tại

HEAD hiện tại trước các thay đổi của phiên: `c43c3e3 Enable cross-platform QR and barcode scanning`.

Không có commit mới trong phiên. Không stage file nào.

`git status --short` gần nhất:

```text
 M README.md
 M cloudflare-worker.js
 M package.json
 M src/hooks/useDashboardData.ts
 M src/hooks/useQueueBoardData.ts
 M src/hooks/useStaffDeskData.ts
 M src/services/larkClient.ts
 M src/services/larkService.ts
?? k6/
?? scripts/
?? src/hooks/serializedPolling.ts
```

Lưu ý: worktree đã bẩn; không reset hoặc ghi đè thay đổi ngoài scope. Trước khi commit phải review toàn bộ `k6/` và `scripts/` vì cả thư mục đang untracked, không chỉ hai script mới nhất.

## 3. Những gì đã làm xong

### 3.1. Polling tuần tự ở frontend

File mới:

- `/Users/antonynguyen/Downloads/npievent-main/src/hooks/serializedPolling.ts`
  - Hàm `startSerializedPolling()` chỉ lên lịch request mới sau khi request cũ kết thúc.
  - Mục đích: một thiết bị không tự tạo nhiều vòng đọc chồng nhau khi Lark phản hồi chậm.
  - Không serialize các POST giữa các thiết bị; TV1 và TV2 vẫn có thể ghi đồng thời.

Các hook đã chuyển sang dùng `startSerializedPolling()`:

- `src/hooks/useDashboardData.ts`
- `src/hooks/useQueueBoardData.ts`
- `src/hooks/useStaffDeskData.ts`

### 3.2. Snapshot dashboard phía Worker

File: `/Users/antonynguyen/Downloads/npievent-main/cloudflare-worker.js`

Các phần đã thêm/sửa:

- `readTableRecords(env, host, key, token, appToken)`:
  - Đọc hết record theo pagination.
  - Resolve option reference sau khi đọc.
- `getDashboardSnapshot(env, host)`:
  - Đọc năm bảng `checkin`, `orders`, `master`, `dispatch`, `dsMaster`.
  - Cache snapshot 4 giây bằng `DASHBOARD_SNAPSHOT_TTL_MS`.
  - Coalesce request đang chạy bằng `dashboardSnapshotInFlight`.
  - Cache theo từng bảng bằng `dashboardTableCache`.
  - Nếu một bảng lỗi tạm thời, trả dữ liệu cache của riêng bảng đó hoặc `[]`, đồng thời đưa lỗi vào `data.warnings`; không làm cả endpoint trả 500.
  - Có whole-snapshot stale fallback tối đa 30 giây qua `DASHBOARD_SNAPSHOT_STALE_MS`.
- `invalidateDashboardSnapshot()`:
  - Được gọi sau POST `/record` thành công và sau `/webhook`/`/webhook2` thành công.
- Route mới `GET /dashboard/snapshot`.
- Route đọc bảng cũ dùng lại `readTableRecords()`.

Worker production hiện tại đã deploy thành công:

```text
Worker: vhws-lark-proxy
URL: https://vhws-lark-proxy.eventnpi2026.workers.dev
Current Version ID: 3aa94eae-6335-4dbe-aa92-8f91679f6df2
```

Version trước đó `782299e0-3dd4-4c4c-99d0-0194db0e96c6` chỉ có stale whole-snapshot fallback và không đủ hiệu quả; version hiện tại đã thay bằng per-table fallback.

Giới hạn còn tồn tại: cache là biến module trong warm Worker isolate, không chia sẻ toàn cầu giữa các edge isolate.

### 3.3. Frontend đọc snapshot

File: `src/services/larkClient.ts`

- Thêm `fetchDashboardSnapshot(cfg, signal)`.
- Gọi `${apiUrl}/dashboard/snapshot`.
- Trả đủ năm bảng, bảng thiếu được chuẩn hóa thành mảng rỗng.

File: `src/services/larkService.ts`

- `fetchLarkData()` dùng `fetchDashboardSnapshot()` khi có `cfg.apiUrl`.
- Mode mock và direct token vẫn giữ đường cũ.

Phần này chưa được deploy frontend/Vercel trong phiên.

### 3.4. Các bài k6

Các script hiện có trong `k6/`:

- `k6/stress-test.js`: read/write/mixed baseline.
- `k6/live-customer-journeys.js`: 10 case Check-in → End Flow.
- `k6/peak-live-40vu.js`: 40 VU, 36 bàn + 4 DP; hiện polling `/dashboard/snapshot`.
  - Có `WRITE_ENABLED=false` để chạy read-only.
  - Có log body lỗi snapshot tối đa hai lần trên mỗi VU.
- `k6/event-paced-live.js`: 20 lượt khách; 10 lượt đầu rải theo nhịp bình thường, 10 lượt sau burst đồng thời.
- `k6/event-10m-media-live.js`: bài test 10 phút, bốn wave 20/15/10/5 request đồng thời, có upload ảnh/QR/IMEI.
- `k6/end-flow-scenario.js` và `k6/END_FLOW_SCENARIO.md`.
- `k6/README.md`.

NPM scripts trong `package.json`:

```json
"k6:stress": "k6 run k6/stress-test.js",
"k6:journeys": "k6 run k6/live-customer-journeys.js",
"k6:peak-live": "k6 run k6/peak-live-40vu.js",
"k6:event-paced-live": "k6 run k6/event-paced-live.js",
"k6:event-10m-media-live": "k6 run k6/event-10m-media-live.js"
```

### 3.5. Test 10 hành trình live

Run ID: `VHWS-JOURNEY-20260813-001`.

Kết quả:

- 10/10 case hoàn thành.
- 69 write request.
- 0 lỗi.
- Write p95 khoảng 1,99 giây.

### 3.6. Test peak 40 VU

Baseline cũ đọc năm route riêng:

- 40 VU.
- 1.790 read.
- 0 HTTP error.
- Read p95 khoảng 10,75 giây.

Một run live 40 VU đã tạo:

- 170 write request, tất cả 2xx.
- 5.617 request tổng.
- Read p95 khoảng 11,52 giây.
- Kết quả đọc của run này không dùng để đánh giá snapshot vì script lúc đó vẫn gọi route đọc cũ.

Run snapshot read-only trước sửa Worker:

- Run ID `PEAK-SNAPSHOT-READ-40VU-20260813-001`.
- 2.027 request.
- 121 HTTP 500, tỷ lệ 5,96%.
- p95 10,45 giây.

Body lỗi được lấy bằng probe ngắn:

```text
Lark API error on master: Data not ready, please try again later (code 1254607)
Lark API error on dsMaster: Data not ready, please try again later (code 1254607)
```

Sau khi thêm whole-snapshot stale fallback, run 5 phút vẫn lỗi 5,36%; không đủ vì edge isolate lạnh chưa có snapshot cũ.

Sau khi chuyển sang per-table fallback và deploy version `3aa94eae-...`, probe 40 VU trong 60 giây:

- 312/312 check thành công.
- HTTP failed 0%.
- Application errors 0%.
- Read p95 10,56 giây.
- Max 15,69 giây.

Kết luận: đã loại được HTTP 500 trên snapshot, nhưng latency đọc Lark vẫn cao.

### 3.7. Test event-paced 20 lượt khách

Run ID: `EVENT-PACED-20260813-001`.

Luồng:

- 10 lượt đầu rải theo nhịp.
- 10 lượt sau cùng submit Điều phối, sau 5 giây cùng Tiếp nhận; các bàn tiếp tục song song.

Kết quả k6:

- 20/20 lượt hoàn thành.
- 138/138 write request thành công.
- HTTP failed 0%.
- Write p95 1,73 giây; max 2,6 giây.

Đối chiếu Base:

- `master`: đủ 92 record.
- `dispatch`: chỉ 45 record trong khi kỳ vọng 46.
- Một request `/webhook` trả thành công nhưng Lark Automation không tạo record.

### 3.8. Test 10 phút có ảnh, QR, IMEI

Ảnh sample:

`/Users/antonynguyen/Downloads/QR STT SAMSUNG/STT 01.jpeg`

Thông tin file:

- JPEG 2480×3508.
- 1.310.179 byte.

Preflight upload:

- `POST /upload` thành công.
- File token: `LAEZbVmPPo8ej1xhC1KlCfz5gfe`.
- Tải ngược qua `/media/<file_token>` trả HTTP 200, `image/jpeg`, đúng 1.310.179 byte.

Run ID: `EVENT-10M-MEDIA-20260813-001`.

Script: `k6/event-10m-media-live.js`.

Thiết kế:

- Wave W20 ở phút 0: 20 request đồng thời.
- Wave W15 ở phút 2:30: 15 request đồng thời.
- Wave W10 ở phút 5: 10 request đồng thời.
- Wave W05 ở phút 7:30: 5 request đồng thời.
- Mỗi wave upload ảnh rồi chạy tuần tự Điều phối → Tiếp nhận → Hoàn tất cho Tư vấn/Thu cũ/Backup.
- `http.batch()` tạo concurrency thật ở từng wave. Summary hiện `1 VU` vì một VU orchestration phát batch; không có nghĩa request chạy tuần tự.
- Nguồn chỉ có 42 khách Check-in, nên 50 lượt hành trình dùng 42 khách unique và tái sử dụng 8 STT.

Kết quả k6:

- Đúng 10 phút.
- 50 lượt khách hoàn thành.
- 114 stage hoàn thành.
- 342 write request hành trình.
- 50 upload ảnh.
- Tổng 395 HTTP request.
- HTTP failed 0%.
- `journey_write_errors` 0/342.
- Write p95 1,83 giây; max 4,26 giây.
- `media_upload_errors` 0/50.
- Upload p95 1,06 giây; max 1,54 giây.

Đối chiếu Base sau khi chờ Automation:

- `master`: 228/228 record.
  - 114 `Tiếp nhận`.
  - 114 `Hoàn tất`.
- 64/64 record Hoàn tất Thu cũ/Backup có đủ:
  - `Hình nghiệm thu máy cũ`.
  - `Scan QR máy cũ`.
  - `Scan IMEI`.
- `dispatch`: chỉ 68/114 record.
  - Thiếu 46 record, tỷ lệ mất 40,4%.
  - Sau khi chờ thêm 30 giây số lượng vẫn là 68.

Kết luận quan trọng: đường ghi trực tiếp `/record` và `/upload` chịu được burst 20; đường `/webhook` qua Lark Automation trả 200 nhưng làm mất record khi burst.

### 3.9. Chẩn đoán End Flow hiện `()()()`

Ảnh user báo STT 9 và STT 12 đã End Flow nhưng cột Nhân sự hiện `()()()`.

Nguyên nhân đã xác nhận:

1. `src/components/EndFlowTable.tsx`, hàm `dispatchSummary(c)` render:

   ```ts
   `(${c.dsTuVan ?? ''})(${c.dsThuCu ?? ''})(${c.dsBackup ?? ''})`
   ```

   Ba ngoặc là mã bàn từ ba cột Điều phối `DS Tư vấn`, `DS Thu cũ`, `DS Backup`; không phải trực tiếp tên Person.

2. `src/services/larkMapper.ts`, phần tạo `endFlow` trong `mapDeskStates()` lấy ba giá trị trên từ `personnelDetailByName`.

3. Query bảng Điều phối cho STT 9 và STT 12 trả `[]`; cả hai nằm trong nhóm record bị Lark Automation bỏ.

4. End Flow vẫn xuất hiện vì nó lấy độc lập từ công thức `Master_Check in.End flow`, và các record nhân viên trong `master` đã được `/record` ghi đầy đủ.

5. Không thể bù chắc chắn từ record `master` hiện tại:
   - `cloudflare-worker.js` map `maBan` → `TV_MãNV`, nhưng `/fields` production cho biết `TV_MãNV` là cột tính toán/hệ thống, không ghi được.
   - `nhanSu` → `Người`, nhưng `Người` là Person field và cần `open_id`; worker cố ý skip chuỗi tên trong handler `/record`.
   - `Submit by` có giá trị dạng `LOAD-TV9`, nhưng End Flow hiện không dùng trường này và đây cũng không phải tên nhân viên thật.

Do đó `()()()` là dữ liệu Điều phối bị thiếu, không phải lỗi CSS/render.

## 4. Trạng thái hiện tại và lệnh cuối

Không có process k6 đang chạy.

Lệnh kiểm tra cuối:

```bash
jq '[.data.items[] | select((.fields["STT input"]|tostring)=="9" or (.fields["STT input"]|tostring)=="12") | {stt:.fields["STT input"],name:.fields["Họ và tên"],type:.fields["Phân loại"],tv:.fields["DS Tư vấn"],tc:.fields["DS Thu cũ"],bk:.fields["DS Backup"],submitBy:.fields["Submit by"],order:.fields["Thứ tự bản ghi"]}]' /tmp/event-10m-dispatch-late.json
```

Kết quả:

```json
[]
```

Các artifact tạm còn hữu ích nếu chưa bị hệ thống xóa:

- `/tmp/event-10m-final.json`: snapshot cuối, `master=228`, `dispatch=68`, media đủ 64.
- `/tmp/event-10m-dispatch-late.json`: bảng dispatch sau khi chờ thêm.
- `/tmp/event-10m-w20.json`: snapshot giữa wave 20.
- `/tmp/media-preflight.json`: response upload sample.
- `/tmp/media-preflight-download.jpeg`: ảnh tải ngược từ Lark.
- `/tmp/event-paced-final-2.json`: snapshot của run event-paced.
- `/tmp/npievent-customers-40-optimized.json`: 40 khách dùng cho peak test.

Validation source đã chạy:

```bash
npm run lint
node --check cloudflare-worker.js
k6 inspect ... k6/event-paced-live.js
k6 inspect ... k6/event-10m-media-live.js
```

Các lệnh trên đều pass. Chưa chạy lại `npm run build` sau hai script k6 cuối, nhưng chúng không thuộc TypeScript bundle; `npm run lint` đã pass.

## 5. Các quyết định kỹ thuật đã chốt và lý do

### 5.1. Polling tuần tự chỉ áp dụng cho read loop của từng thiết bị

Không serialize POST toàn hệ thống. Lý do: TV1/TV2 và nhiều bàn phải có thể Tiếp nhận/Hoàn tất cùng lúc. `startSerializedPolling()` chỉ ngăn cùng một browser tạo request đọc chồng nhau.

### 5.2. Dashboard dùng một snapshot thay vì năm request từ mỗi thiết bị

Mục đích giảm fan-out từ client. Worker đọc năm bảng và trả một payload. Đây là tối ưu read path, không thay đổi business logic ghi dữ liệu.

### 5.3. Per-table fallback thay vì fail toàn snapshot

Lark thường trả `1254607 Data not ready`. Nếu dùng `Promise.all` và throw một lỗi, toàn dashboard nhận HTTP 500. Per-table fallback giữ dashboard hoạt động và đưa lỗi vào `data.warnings`.

### 5.4. `/record` là đường ghi chuẩn cho nhân viên

Lý do:

- Ghi trực tiếp Bitable API.
- Attachment phải là `[{file_token}]`, Automation text không xử lý đúng.
- Qua test burst 20, `/record` lưu đủ 228/228 record.

### 5.5. Điều phối hiện vẫn qua `/webhook`, nhưng quyết định tiếp theo phải là chuyển sang direct write

`/webhook` chỉ xác nhận Automation endpoint nhận request, không xác nhận Base đã tạo record. Hai test cho thấy mất 1/46 và 46/114 record. Không được tiếp tục coi HTTP 200 từ `/webhook` là delivery thành công.

### 5.6. `Submit by` là MSNV điều phối viên

Không dùng nhân viên bàn làm `Submit by` cho Điều phối. `DispatchFormModal` phải tiếp tục lookup `Master_DS.STT bàn = DPn`, lấy `MSNV` của điều phối viên.

### 5.7. Không ghi chuỗi vào Person field

`Người` cần Lark `open_id`. Worker đang skip đúng loại field này. Nếu cần tên người hiển thị ổn định, thêm cột text riêng hoặc resolve/open_id đúng schema; không ép chuỗi tên vào Person field.

### 5.8. End Flow và chi tiết nhân sự là hai nguồn độc lập

- End Flow: công thức bảng Check-in.
- `(DS Tư vấn)(DS Thu cũ)(DS Backup)`: bảng Điều phối.

Vì vậy End Flow có thể đúng nhưng ba ngoặc rỗng khi record Điều phối bị mất.

## 6. Những cách đã thử nhưng thất bại hoặc cho kết quả không hợp lệ

1. Gọi `/snapshot` trực tiếp:
   - Worker trả `Unknown table key "snapshot"`.
   - Route đúng là `/dashboard/snapshot`.

2. Dùng run peak đầu tiên để đánh giá snapshot:
   - Script lúc đó vẫn gọi năm endpoint cũ.
   - Kết quả read failure của run đó không được dùng làm kết luận tối ưu snapshot.

3. Chỉ cache whole snapshot + stale 30 giây:
   - Sau deploy vẫn có 5,36% HTTP 500.
   - Nguyên nhân: cold/isolate khác chưa có snapshot stale.
   - Đã thay bằng per-table fallback.

4. Chỉ dựa vào HTTP 2xx của `/webhook`:
   - Sai vì Lark Automation có thể nhận request nhưng không tạo Base record.
   - Phải poll/query bảng đích và đếm record thực tế.

5. Ghi `maBan` vào `TV_MãNV` trong `/record`:
   - Production schema báo đây là cột formula/lookup, worker skip.
   - Không dùng cách này để bù dữ liệu Điều phối.

6. Ghi `nhanSu` dạng text vào `Người`:
   - `Người` là Person field, cần `open_id`, worker skip.

7. Hiểu summary `1 VU` của bài media test là không concurrent:
   - Không đúng. Script dùng một VU orchestration và `http.batch()` phát burst HTTP 20/15/10/5 đồng thời.

8. Dùng 50 lượt hành trình như 50 khách unique:
   - Base chỉ có 42 khách Check-in; script tái sử dụng 8 STT.
   - Bài tiếp theo cần 50 Check-in unique nếu muốn kiểm tra dedupe/formula không bị ảnh hưởng bởi reuse.

## 7. Việc tiếp theo cần làm, theo thứ tự

### P0 — Thay Điều phối Automation bằng direct write

1. Đọc schema thật của `TB_DISPATCH` trước khi code.
   - Không giả định tên/type field.
   - Có thể thêm route chẩn đoán `/dispatch-fields` tương tự `/fields`.
2. Thêm route ví dụ `POST /dispatch-record` trong `cloudflare-worker.js`.
   - Ghi trực tiếp vào `TB_DISPATCH`.
   - Map ít nhất: STT, Họ tên, Phân loại, mã bàn tương ứng, Submit by, thời gian.
   - Bảo toàn quy tắc `Submit by = MSNV điều phối viên`.
   - Không cho client truyền URL webhook tùy ý.
3. Thêm idempotency/retry.
   - Payload cần `requestId` ổn định theo `STT + stage + action/run`.
   - Khi retry không được tạo duplicate im lặng.
   - Retry có backoff cho lỗi Lark tạm thời như `1254607`.
4. Sửa `src/services/dispatchWebhook.ts` hoặc config route để `DispatchFormModal` gọi direct route.
5. Deploy Worker rồi curl-test route production; build frontend không chứng minh Worker đã deploy.

### P0 — Xác minh direct dispatch dưới tải

1. Sửa `k6/event-10m-media-live.js` để Điều phối gọi `/dispatch-record`.
2. Sau mỗi wave, poll bảng dispatch đến timeout và so sánh expected count.
3. Chạy lại 20/15/10/5.
4. Acceptance:
   - 114/114 dispatch record.
   - 228/228 master record.
   - 64/64 media record đủ ba trường.
   - Không duplicate theo requestId.

### P1 — Sửa cột Nhân sự End Flow

1. Sau khi dispatch direct write đủ, kiểm tra `indexDispatchDetailByName()` và `mergeReceivedDetailByName()` trong `src/services/larkMapper.ts` đọc đúng ba mã bàn.
2. Quyết định UI với user:
   - Giữ mã bàn: `(TVx)(TCx)(BKx)`, hoặc
   - Hiển thị tên người thật bằng cách map mã bàn qua roster `Master_DS`.
3. Nếu giữ label `Nhân sự` thì nên hiển thị tên người; nếu chỉ hiển thị mã bàn, đổi label thành `Bàn đã phục vụ` để tránh hiểu nhầm.
4. Không dùng `Submit by=LOAD-TVx` làm tên người production.

### P1 — Hoàn thiện và deploy frontend snapshot

1. Review local diff của:
   - `src/hooks/serializedPolling.ts`
   - ba polling hooks
   - `src/services/larkClient.ts`
   - `src/services/larkService.ts`
2. Chạy:

   ```bash
   npm run lint
   npm run build
   ```

3. Test browser với dashboard production URL và viewport iPad.
4. Commit/push branch, để Vercel auto-deploy theo workflow của repo.
5. Xác nhận frontend production thực sự gọi `/dashboard/snapshot`, không chỉ source local.

### P2 — Tiếp tục giảm latency dashboard

Hiện HTTP 500 đã hết nhưng snapshot read p95 vẫn khoảng 10,5 giây dưới 40 VU.

Các hướng cần đánh giá:

1. Cache chia sẻ ngoài isolate bằng KV/Durable Object nếu cần consistency/coordination toàn cục.
2. Không gọi field metadata lặp lại khi cache miss.
3. Tách bảng thay đổi chậm (`dsMaster`) khỏi bảng thay đổi nhanh.
4. Giảm payload snapshot; run 40 VU từng nhận hàng trăm MB vì trả toàn bộ field/record.
5. Thêm ETag hoặc version để client không tải lại payload giống hệt.

### P2 — Quản lý dữ liệu test

Các run đã tạo nhiều record production và 51 file ảnh (50 trong run + 1 preflight). Không tự xóa. Trước khi cleanup phải:

1. Xác định record theo thời gian/`Submit by`/run marker hiện có.
2. Cho user duyệt chính xác scope xóa.
3. Dùng thao tác recoverable nếu có.

### P2 — Git handoff

1. Review untracked `k6/` và `scripts/`.
2. Không stage secret, file ảnh hoặc `/tmp` artifact.
3. Commit theo nhóm:
   - dashboard snapshot/polling;
   - k6 scenarios/docs;
   - direct dispatch fix sau khi hoàn tất.
4. Chưa merge cho tới khi direct dispatch pass 114/114 và frontend production được xác minh.

## 8. Lệnh chạy lại quan trọng

### Probe snapshot

```bash
curl -sS 'https://vhws-lark-proxy.eventnpi2026.workers.dev/dashboard/snapshot' | jq '{code,msg,cache,warnings:.data.warnings,counts:(.data.tables|with_entries(.value=(.value|length)))}'
```

### Chạy media test 10 phút

Phải truyền `TEST_CUSTOMERS` từ snapshot/checkin thật. Không hardcode tên giả.

```bash
k6 run k6/event-10m-media-live.js \
  --env BASE_URL=https://vhws-lark-proxy.eventnpi2026.workers.dev \
  --env RUN_ID=EVENT-10M-MEDIA-NEW \
  --env ALLOW_LIVE_WRITES=true \
  --env DURATION_SEC=600 \
  --env IMAGE_PATH='/Users/antonynguyen/Downloads/QR STT SAMSUNG/STT 01.jpeg' \
  --env TEST_CUSTOMERS='<JSON_ARRAY_FROM_LIVE_CHECKIN>'
```

Không chạy lại lệnh này trên production nếu user chưa xác nhận vì nó tạo hàng trăm record và upload 50 file.

## 9. Cảnh báo vận hành

- Production Base hiện chứa dữ liệu test từ nhiều run.
- `/upload`, `/record`, `/webhook` không yêu cầu phiên admin; ai biết Worker URL có thể gọi. Đây là đánh đổi đã biết nhưng là rủi ro cần xử lý sau.
- Snapshot `msg: "partial snapshot"` với `data.warnings` nghĩa là một bảng Lark tạm lỗi; endpoint vẫn trả 200 để dashboard không sập.
- Không tuyên bố dashboard/Vercel đã deploy chỉ vì `npm run build` pass.
- Không tuyên bố Điều phối thành công chỉ vì `/webhook` trả 200.
