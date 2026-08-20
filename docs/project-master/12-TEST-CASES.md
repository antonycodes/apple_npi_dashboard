# Test Case Matrix

## 1. Quy tắc ghi kết quả

Mỗi lần test lưu:

- Run ID;
- thời gian;
- environment/deployment;
- thiết bị/viewport;
- tài khoản role đã redact;
- input;
- expected;
- actual;
- record ID/file token đã lưu riêng an toàn;
- Pass/Fail/Blocked;
- evidence.

## 2. Authentication

| ID | Case | Kỳ vọng |
| --- | --- | --- |
| AUTH-01 | Login staff một workspace | Vào thẳng đúng bàn |
| AUTH-02 | Login nhiều workspace | Hiện Chọn khu vực |
| AUTH-03 | Login Kho | Vào KhoAppPage |
| AUTH-04 | Login DP có `Loại` trống | Suy role từ DP và vào Dashboard |
| AUTH-05 | Sai user/password | Một thông báo chung, không tạo session |
| AUTH-06 | Đổi password Base | Có hiệu lực sau cache, không deploy |
| AUTH-07 | Token hết hạn | 401, logout, yêu cầu login |
| AUTH-08 | Sign out | Xóa session và về login |

## 3. Điều phối

| ID | Case | Kỳ vọng |
| --- | --- | --- |
| DP-01 | Gán Tư vấn | Ghi `DS Tư vấn` |
| DP-02 | Gán Thu cũ | Ghi `DS Thu cũ` |
| DP-03 | Gán Backup | Ghi `DS Backup` |
| DP-04 | Submit by DP | Đúng MSNV DP, không phải nhân sự bàn |
| DP-05 | STT không tồn tại | UI/Worker báo lỗi phù hợp |
| DP-06 | Double click | Không tạo hai record ngoài ý muốn |
| DP-07 | Formula chậm | Record raw có trước, App hội tụ sau |

## 4. Tư vấn

| ID | Case | Kỳ vọng |
| --- | --- | --- |
| TV-01 | Tiếp nhận | Master `Tiếp nhận`, `Loại 2=Tư vấn` |
| TV-02 | Hoàn tất không Backup | Master Hoàn tất + Back up Không |
| TV-03 | Hoàn tất có Backup | Master Hoàn tất + Back up Có |
| TV-04 | Reload giữa ca | UI không nhân đôi; Browser leadtime có thể suy ra |
| TV-05 | Poll chưa xác nhận sau 15s | Hiện cảnh báo, không tự báo thành công giả |

## 5. Thu cũ

| ID | Case | Kỳ vọng |
| --- | --- | --- |
| TC-01 | Tiếp nhận | `Loại 2=Thu cũ` |
| TC-02 | Thu máy ngay | QR, IMEI, ảnh và option đúng |
| TC-03 | Thu máy sau | Lưu option, dữ liệu dùng lại ở lần sau |
| TC-04 | 1/2/3 ảnh | Đủ token và attachment |
| TC-05 | Ảnh thứ 2 lỗi | Báo đúng vị trí, không im lặng |
| TC-06 | Thu máy nhanh | `Trạng thái=Thu máy nhanh`, không Hoàn tất khâu |

## 6. Backup

| ID | Case | Kỳ vọng |
| --- | --- | --- |
| BK-01 | Tiếp nhận/Hoàn tất | `Loại 2=Backup` |
| BK-02 | Có dữ liệu máy cũ | Prefill/giữ ảnh đúng |
| BK-03 | Hoàn tất Backup | Done in Flow đúng Backup |

## 7. Kho

| ID | Case | Kỳ vọng |
| --- | --- | --- |
| KHO-01 | QR TV hợp lệ | Hiện đúng bàn/người nhận |
| KHO-02 | Nhập `TV1` thủ công | Match `Master_DS.STT bàn` |
| KHO-03 | QR không tồn tại | Không cho submit |
| KHO-04 | Submit 1–3 ảnh | Attachment tải lại được |
| KHO-05 | Record Kho | `Bàn giao kho`, STT rỗng, Loại 2 rỗng |
| KHO-06 | Submit by Kho | Đúng MSNV Kho đang login |
| KHO-07 | Không scan STT khách | UI không có field STT khách |

## 8. Sync/cache

| ID | Case | Kỳ vọng |
| --- | --- | --- |
| SYNC-01 | Snapshot full | Năm bảng, không warning |
| SYNC-02 | Một bảng timeout | Partial/stale rõ ràng, App vẫn usable |
| SYNC-03 | Write invalidation | Dữ liệu mới xuất hiện sau polling |
| SYNC-04 | 40 máy poll cùng lúc | Edge cache hấp thụ, không cascade timeout |
| SYNC-05 | Recovery | Worker/App trở lại bình thường sau tải |

## 9. Media

| ID | Case | Kỳ vọng |
| --- | --- | --- |
| MEDIA-01 | JPEG | Upload/read/attachment đạt |
| MEDIA-02 | PNG | Upload/read/attachment đạt |
| MEDIA-03 | WebP | Upload/read/attachment đạt |
| MEDIA-04 | Ba ảnh tuần tự | Không mất token |
| MEDIA-05 | Token lỗi | `/media` báo lỗi rõ |

## 10. Load production

| ID | Case | Kỳ vọng |
| --- | --- | --- |
| LOAD-01 | Baseline read-only | Ghi p50/p90/p95/p99/error |
| LOAD-02 | 40 user/10 phút | Đủ 30 staff + 4 DP + 6 Kho |
| LOAD-03 | Full journey writes | 0 record mất/sai mapping |
| LOAD-04 | Media under load | 0 token/attachment mất |
| LOAD-05 | End Flow | Đúng persisted transitions |
| LOAD-06 | Post-load recovery | Snapshot/latency trở lại baseline |

Production thật đã được phê duyệt. Chủ dự án tự clear Lark sau test; nhóm test phải giao run ID và record inventory.

## 11. Device/viewport

| ID | Thiết bị | Kỳ vọng |
| --- | --- | --- |
| UI-01 | iPad 1366×1024 | Dashboard không che popup/form |
| UI-02 | iPad 1180×820 | Điều phối usable, không tràn quan trọng |
| UI-03 | iPhone 393×852 | Staff form một tay, safe area đúng |
| UI-04 | iPhone 375×667 | Có thể scroll, nút chính truy cập được |
| UI-05 | Camera thật | QR/IMEI đọc được trong ánh sáng event |
