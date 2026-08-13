# k6 stress test

## Read-only baseline

```bash
k6 run \
  --env BASE_URL=https://vhws-lark-proxy.eventnpi2026.workers.dev \
  --env STAFF_ENDPOINT=record \
  --env MODE=read \
  --env VUS=30 \
  --env DURATION=10m \
  k6/stress-test.js
```

Mỗi VU gọi đồng thời 5 bảng (`checkin`, `orders`, `master`, `dispatch`,
`dsMaster`) theo chu kỳ 5 giây.

## Write test

```bash
k6 run \
  --env BASE_URL=https://vhws-lark-proxy.eventnpi2026.workers.dev \
  --env MODE=write \
  --env VUS=32 \
  --env DURATION=10m \
  --env ALLOW_LIVE_WRITES=true \
  k6/stress-test.js
```

Write test tạo record synthetic trong `/webhook` và `/webhook2`. Chỉ chạy với
Base/workflow test hoặc sau khi đã thống nhất cách xoá dữ liệu `TEST ONLY`.

## Mixed test

```bash
k6 run \
  --env MODE=mixed \
  --env READ_VUS=21 \
  --env WRITE_VUS=9 \
  --env DURATION=10m \
  --env ALLOW_LIVE_WRITES=true \
  k6/stress-test.js
```

Threshold mặc định: HTTP/application error < 1%, p95 < 15 giây. Có thể đổi
ngưỡng bằng `MAX_P95_MS`. Kết quả cần đối chiếu thêm Workers Logs, Lark
Automation run history và số record thực tế.

## 10 hành trình live: Check-in → End flow

`live-customer-journeys.js` chạy đồng thời 10 case. Mỗi case cần một khách đã
có sẵn trong `Master_Check in`; k6 chỉ ghi các dòng điều phối và Tiếp nhận/Hoàn
tất vào các route thật, để dashboard quan sát được luồng cập nhật.

```bash
TEST_CUSTOMERS='[
  {"stt":"101","hoTen":"Nguyen A"},
  {"stt":"102","hoTen":"Nguyen B"},
  {"stt":"103","hoTen":"Nguyen C"},
  {"stt":"104","hoTen":"Nguyen D"},
  {"stt":"105","hoTen":"Nguyen E"},
  {"stt":"106","hoTen":"Nguyen F"},
  {"stt":"107","hoTen":"Nguyen G"},
  {"stt":"108","hoTen":"Nguyen H"},
  {"stt":"109","hoTen":"Nguyen I"},
  {"stt":"110","hoTen":"Nguyen J"}
]' \
npm run k6:journeys -- \
  --env BASE_URL=https://vhws-lark-proxy.eventnpi2026.workers.dev \
  --env RUN_ID=VHWS-JOURNEY-001 \
  --env ALLOW_LIVE_WRITES=true \
  --env STAGE_DELAY_SEC=8 \
  --env DISPATCH_DELAY_SEC=5 \
  --env VERIFY_END_FLOW=false
```

Case C01–C10 được gắn vào k6 tags và tên `journey`, nên có thể lọc trong k6
output/InfluxDB/Grafana. Dashboard app tự polling 5 giây; mở dashboard trước
khi chạy và giữ `STAGE_DELAY_SEC` đủ lớn để quan sát từng bước. Chỉ bật
`VERIFY_END_FLOW=true` sau khi xác nhận endpoint `/checkin` trả ra công thức
`End flow` của Base; nếu không, test vẫn ghi live nhưng không kết luận End flow.

## Peak live: 36 bàn + 4 DP

`peak-live-40vu.js` mô phỏng 40 thiết bị hoạt động liên tục: 36 VU bàn ghi qua
`/record`, 4 VU DP ghi điều phối qua `/webhook`; cả 40 VU vẫn đọc 5 bảng mỗi 5
giây. Chỉ dùng với 40 khách đã Check-in riêng biệt.

```bash
TEST_CUSTOMERS="$(jq -c '[.data.items[0:40][] | {stt:(.fields["STT Input"]|tostring),hoTen:(.fields["Họ và tên"]|if type=="array" then .[0].text else tostring end)}]' /tmp/npievent-checkin.json)" \
k6 run k6/peak-live-40vu.js \
  --env BASE_URL=https://vhws-lark-proxy.eventnpi2026.workers.dev \
  --env STAFF_ENDPOINT=record \
  --env ALLOW_LIVE_WRITES=true \
  --env DURATION_SEC=300 \
  --env POLL_SEC=5 \
  --env ACTION_DELAY_SEC=8
```
