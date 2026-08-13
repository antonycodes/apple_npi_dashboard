# End-flow scenario

Kịch bản này mô phỏng 4 khách đã check-in:

1. 3 điều phối viên (`DP1`, `DP2`, `DP3`) phân phối khách vào 2 bàn TV.
2. `TV1` và `TV2` đồng thời Tiếp nhận rồi Hoàn tất khâu Tư vấn.
3. 3 điều phối viên phân phối tiếp vào 2 bàn TC.
4. `TC1` và `TC2` đồng thời Tiếp nhận rồi Hoàn tất khâu Thu cũ.
5. Payload hoàn tất Tư vấn gửi `checkBackup: Không`, nên flow kỳ vọng đi thẳng
   tới hoàn tất sau Thu cũ, không phát sinh khâu Backup.

Mặc định script kiểm tra 4 STT đã tồn tại trong `Master_Check in` trước khi gửi
bất kỳ request ghi nào. Dùng `TEST_CUSTOMERS` để truyền 4 khách thật đã seed:

```bash
k6 run \
  --env BASE_URL=https://vhws-lark-proxy.eventnpi2026.workers.dev \
  --env MODE=write \
  --env TEST_CUSTOMERS='[{"stt":"101","hoTen":"KH test 1"},{"stt":"102","hoTen":"KH test 2"},{"stt":"103","hoTen":"KH test 3"},{"stt":"104","hoTen":"KH test 4"}]' \
  --env ALLOW_LIVE_WRITES=true \
  --env RUN_ID=FLOWTEST-20260813-01 \
  k6/end-flow-scenario.js
```

Nếu check-in table của môi trường test chưa được seed, script sẽ dừng ở
precondition; chỉ dùng `VERIFY_CHECKIN=false` khi đã kiểm tra precondition bằng
cách khác. Đây là flow test tuần tự theo từng khách, nhưng 4 khách chạy song
song để tạo đúng 2 TV và 2 TC active cùng lúc.
