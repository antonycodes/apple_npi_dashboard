# User Roles & Flows

## 1. Quy tắc chung

- Mọi người dùng AIO mở `/app`.
- Đăng nhập bằng tài khoản được cấp trong `Master_DS`.
- Nếu có nhiều workspace, chọn khu vực đang trực.
- Không chọn workspace của người khác.
- Dùng nút đổi khu vực khi chuyển vị trí; dùng Thoát khi giao máy cho người khác.

## 2. Điều phối

### Thiết bị mục tiêu

iPad ngang.

### Luồng chuẩn

1. Đăng nhập AIO.
2. Chọn workspace `DP...`.
3. Kiểm tra Dashboard đã có dữ liệu và thời gian cập nhật.
4. Chọn khách trong khu Check-in hoặc Chờ Điều phối.
5. Mở form Điều phối.
6. Chọn đúng một khâu: Tư vấn, Thu cũ hoặc Backup.
7. Chọn bàn đang có nhân sự.
8. Kiểm tra STT, mã bàn và `Submit by`.
9. Submit.
10. Xác nhận khách xuất hiện trong hàng chờ bàn tương ứng.

### Không được làm

- Không dùng tên khâu ngoài ba giá trị chuẩn.
- Không gửi liên tục khi chưa xác định lần đầu đã tạo record hay chưa.
- Không thay `Submit by` bằng MSNV nhân viên bàn.
- Không clear Base trong lúc event nếu chưa xác định record mục tiêu.

## 3. Tư vấn

### Thiết bị mục tiêu

iPhone dọc.

### Luồng chuẩn

1. Đăng nhập và chọn `TV...`.
2. Kiểm tra đúng tên nhân sự/bàn.
3. Khi có khách chờ, mở thông tin kiểm tra lại.
4. Bấm Tiếp nhận.
5. Phục vụ khách; timer chỉ mang tính hỗ trợ.
6. Bấm Hoàn tất.
7. Chọn có/không Backup theo form.
8. Submit và chờ App xác nhận qua polling.

Nếu khách có nghiệp vụ máy cũ ở khâu khác, không tự nhập QR/IMEI vào Hoàn tất Tư vấn trừ khi UI/flow được thiết kế rõ cho trường hợp đó.

## 4. Thu cũ

### Luồng chuẩn

1. Đăng nhập và chọn `TC...`.
2. Tiếp nhận khách được Điều phối.
3. Khi Hoàn tất, chọn Thu máy ngay hoặc Thu máy sau.
4. Quét QR máy cũ.
5. Quét/nhập IMEI.
6. Chụp hoặc chọn tối đa ba ảnh nghiệm thu.
7. Kiểm tra preview.
8. Submit Hoàn tất.

### Thu máy nhanh

Khi chỉ thu lại máy đã hẹn trước:

1. Chọn đúng khách.
2. Mở luồng Thu máy.
3. Kiểm tra QR, IMEI và ảnh cũ nếu có.
4. Bổ sung/chụp lại tối đa ba ảnh tổng cộng theo UI.
5. Submit trạng thái `Thu máy nhanh`.

Thu máy nhanh không tạo một khâu Hoàn tất mới.

## 5. Backup

1. Đăng nhập và chọn `BK...`.
2. Tiếp nhận khách được Điều phối vào Backup.
3. Kiểm tra thông tin từ khâu trước.
4. Nếu có nghiệp vụ máy cũ, kiểm tra Thu máy ngay/sau, QR, IMEI và ảnh.
5. Hoàn tất Backup.

Không dùng Backup để thay cho Tư vấn hoặc Thu cũ nếu khách chưa được Điều phối đúng khâu.

## 6. Kho

### Thiết bị mục tiêu

iPad; có thể dùng dọc cho thao tác camera.

### Luồng chuẩn

1. Đăng nhập và chọn `KHO...`.
2. Mở tab Bàn giao.
3. Quét QR của nhân viên/bàn Tư vấn nhận máy.
4. App phải đọc mã `TV...` tồn tại trong roster.
5. Kiểm tra tên người nhận.
6. Chụp tối đa ba ảnh bàn giao.
7. Submit.
8. Xác nhận thông báo `Đã bàn giao`.

### Quy tắc bắt buộc

- Không nhập STT khách.
- Không dùng trạng thái `Hoàn tất`.
- Trạng thái là `Bàn giao kho`.
- `Loại 2` để trống.
- `Submit by` là MSNV Kho đang đăng nhập.
- QR là mã bàn Tư vấn nhận máy, không phải mã KHO.

## 7. Admin

- Quản lý cấu hình dùng chung.
- Quản lý danh sách Điều phối.
- Xem các module để hỗ trợ sự cố.
- Không dùng tài khoản admin thay cho tài khoản nhân sự trong vận hành thường ngày.

## 8. Chuyển ca/đổi máy

1. Nhân sự cũ bấm Thoát.
2. Nhân sự mới đăng nhập tài khoản của mình.
3. Chọn đúng workspace.
4. Kiểm tra khách đang hoạt động trước khi thao tác.
5. Timer trình duyệt có thể bị suy ra; dùng Proxy Leadtime trong báo cáo.

## 9. Dấu hiệu cần báo Điều phối/kỹ thuật vận hành

- Sai tên hoặc sai bàn sau đăng nhập.
- QR hợp lệ nhưng App báo không tồn tại.
- Submit thành công nhưng quá 15 giây chưa thấy polling xác nhận.
- Ảnh upload một phần.
- Snapshot báo partial/stale kéo dài.
- Khách xuất hiện đồng thời ở hai bàn.
- End Flow không khớp record thực tế.
