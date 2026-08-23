# Lark Data Mapping

> Tài liệu mapping logic; không chứa Table ID, token, username hoặc mật khẩu thật.

## 1. Nguyên tắc

- Tên cột phải khớp đúng Lark, kể cả chính tả hiện có như `Brower Leadtime`.
- Formula, Lookup, AutoNumber và Person không được ghi như text thường.
- `/fields` là nguồn audit schema Master; `/fields?table=dispatch` là nguồn audit Điều phối.
- Field rỗng được Worker bỏ qua; không dùng chuỗi rỗng để ghi đè dữ liệu.
- Kết quả mapping của Worker có `written` và `skipped`; test phải lưu cả hai.

## 2. Master_Check in

| Logic App | Cột mặc định | Mục đích |
| --- | --- | --- |
| `stt` | `STT` | STT khách |
| `name` | `Họ và tên` | Khóa nhận diện khách |
| `product` | `SP 1` | Sản phẩm chính |
| `note` | `Check UD Thanh toán` | Ghi chú thanh toán |
| `deviceAccepted` | `Check nghiệm thu` | Trạng thái nghiệm thu máy cũ |
| `oldDeviceCheck` | `Thu cũ check` | Giữ nguyên raw option Lark |
| `backupCheck` | `Backup check` | Nhánh Backup |
| `dispatchHyperlink` | `Hyperlink Điều phối` | Link legacy/dự phòng |
| `receiveHyperlink` | `Hyperlink Tiếp nhận` | Link legacy/dự phòng |
| `doneInFlow` | `Done in Flow` | Khâu vừa hoàn tất |
| `endFlow` | `End flow` | In flow/End flow |
| `time` | `Thời gian` | Sắp thứ tự Check-in |

Không rút `Thu cũ check` về boolean; giá trị có thể có nhiều option và phải giữ nguyên văn.

## 3. Master/SS_Master — đọc

| Logic App | Cột mặc định | Ghi chú |
| --- | --- | --- |
| `deskCode` | `TV_MãNV` | Lookup mã bàn; read-only trong schema live |
| `status` | `Trạng thái` | Tiếp nhận/Hoàn tất/Thu máy nhanh/Bàn giao kho |
| `name` | `Họ và tên` | Formula; read-only |
| `staff` | `Người` | Person; dùng automation/hiển thị khi có open_id |
| `submitBy` | `Submit by` | MSNV người gửi |
| `stage` | `Loại 2` | Tư vấn/Thu cũ/Backup |
| `hyperlink` | `Hyperlink Master` | Legacy/dự phòng |
| `time` | `Thời gian` | Mốc server |
| `sttInput` | `STT Input` | Khóa text/barcode |
| `thuLaiMay` | `Thu lại máy` | Thu máy ngay/sau |
| `scanQr` | `Scan QR máy cũ` | QR máy hoặc bàn nhận Kho |
| `imei` | `Scan IMEI` | IMEI máy cũ |
| `hinhNghiemThu` | `Hình nghiệm thu máy cũ` | Attachment |

## 4. Payload `/record` → Master

| Payload | Cột | Live type | Ghi được | Quy tắc |
| --- | --- | --- | --- | --- |
| `stt` | `STT Input` | Barcode/Text | Có | Kho để trống |
| `hoTen` | `Họ và tên` | Formula | Không | Lark tự suy |
| `maBan` | `TV_MãNV` | Lookup | Không | Không ép ghi lookup |
| `trangThai` | `Trạng thái` | SingleSelect | Có | Giá trị nghiệp vụ chuẩn |
| `msnv` | `Submit by` | Text | Có | Người thao tác |
| `nhanSu` | `Người` | Person | Không bằng text | Cần open_id |
| `phanLoai` | `Loại 2` | SingleSelect | Có | Ba khâu; Kho rỗng |
| `thoiGian` | `Thời gian` | DateTime | Có | ISO → timestamp |
| `checkBackup` | `Back up` | SingleSelect | Có | Chỉ khi áp dụng |
| `thuLaiMay` | `Thu lại máy` | SingleSelect | Có | Thu máy ngay/sau |
| `scanQr` | `Scan QR máy cũ` | Barcode | Có | Không tự đổi format |
| `imei` | `Scan IMEI` | Barcode | Có | Giữ chuỗi để không mất số 0 |
| `hinhNghiemThu` | `Hình nghiệm thu máy cũ` | Attachment | Có | `[{file_token}]` |
| `leadtimeGiay` | `Brower Leadtime` | Number | Có | App tính |
| Worker | `Proxy Leadtime` | Number | Có | Worker tính từ record Base |

## 5. Trạng thái và action

| `action` | `Trạng thái` | `Loại 2` | Ý nghĩa |
| --- | --- | --- | --- |
| `tiep_nhan` | `Tiếp nhận` | Tư vấn/Thu cũ/Backup | Bắt đầu phục vụ |
| `hoan_tat` | `Hoàn tất` | Tư vấn/Thu cũ/Backup | Hoàn tất một khâu |
| `thu_may` | `Thu máy nhanh` | Theo bàn thao tác | Chỉ thu máy, không tạo leadtime khâu |
| `ban_giao` | `Bàn giao kho` | Rỗng | Kho giao máy cho bàn TV |

Không thay `Thu máy nhanh` hoặc `Bàn giao kho` bằng `Hoàn tất`; formula flow sẽ đọc sai.

## 6. Master_Điều phối

### Đọc

| Logic | Cột |
| --- | --- |
| Tên khách | `Họ và tên` |
| Bàn Tư vấn | `DS Tư vấn` |
| Bàn Thu cũ | `DS Thu cũ` |
| Bàn Backup | `DS Backup` |

### Ghi qua `/dispatch-record`

| Payload | Cột | Live type |
| --- | --- | --- |
| `stt` | `STT input` | Text |
| `phanLoai` | `Phân loại` | SingleSelect |
| `submitBy` | `Submit by` | Text |
| `maBan` khi Tư vấn | `DS Tư vấn` | SingleSelect |
| `maBan` khi Thu cũ | `DS Thu cũ` | SingleSelect |
| `maBan` khi Backup | `DS Backup` | SingleSelect |

## 7. Master_DS

| Cột | Vai trò |
| --- | --- |
| `STT bàn` | Mã workspace: TV/TC/BK/KHO/DP |
| `Loại` | Nhãn workspace; có thể trống ở DP theo quyết định hiện tại |
| `NV Tư vấn` | Tên nhân sự tại đúng dòng workspace |
| `MSNV` | Danh tính ghi `Submit by` |
| `NPI_AIO_User` | Username AIO |
| `NPI_AIO_Pass` | Mật khẩu AIO, không xuất khỏi Worker |
| `STT tiếp theo` | Dữ liệu hỗ trợ hàng chờ |
| `Sl khách chờ` | Số khách chờ tại bàn |
| `Hyperlink Tiếp nhận` | Dự phòng legacy |
| `Hyperlink Hoàn tất` | Dự phòng legacy |

Quyết định hiện hành: không bắt buộc điền `Loại = Điều phối`; Worker suy role từ tiền tố `DP`.

## 8. Media mapping

1. App chọn tối đa ba file.
2. Mỗi file POST `/upload` tuần tự.
3. Worker upload Lark Drive và trả `fileToken`.
4. App gom token vào `hinhNghiemThu`.
5. `/record` chuyển thành attachment array.
6. `/media/:token` dùng để kiểm tra/xem lại.

Test đạt khi token tải lại được và attachment xuất hiện trong record đúng, không chỉ khi `/upload` trả 200.

## 9. Leadtime

- `Brower Leadtime`: UI hiển thị từ mốc `Master."Thời gian"` của dòng Tiếp nhận;
  chỉ có thể thiếu trong vài giây đầu khi record mới chưa đọc về.
- `Proxy Leadtime`: Worker tìm dòng Tiếp nhận cùng STT + cùng `Loại 2`, lấy mốc phù hợp trước Hoàn tất và tính trên Base.
- Báo cáo hiệu suất ưu tiên `Proxy Leadtime`.
- Nếu đổi tên/kiểu hai cột này phải sửa Worker và audit `/fields`.

## 10. Checklist trước event

- `/fields`: các cột ghi chính `ok=true`.
- `/fields?table=dispatch`: đủ ba cột DS.
- Roster có `STT bàn`, MSNV, username và mật khẩu.
- SingleSelect có đủ option nghiệp vụ.
- Attachment field còn type Attachment.
- Leadtime field còn type Number.
- Smoke test một flow và đối chiếu record thật.
