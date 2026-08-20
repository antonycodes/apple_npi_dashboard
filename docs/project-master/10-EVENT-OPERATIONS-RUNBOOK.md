# Event Operations Runbook

## 1. Mục tiêu

Giữ App usable xuyên suốt event, phát hiện sớm lỗi đồng bộ và có quy trình phản ứng thống nhất.

## 2. Vai trò trực hệ thống

| Vai trò | Trách nhiệm |
| --- | --- |
| Chủ hệ thống | Quyết định deploy, test production và clear data |
| Hỗ trợ hệ thống | Vercel, Worker, log, rollback |
| Quản trị Lark | Schema, formula, option, dữ liệu Base |
| Điều phối trưởng | Xác nhận luồng khách ngoài thực tế |
| Nhân sự bàn/Kho | Báo lỗi kèm bàn, STT, thời gian và ảnh màn hình |

## 3. T-24 giờ

- Chốt commit/deployment, hạn chế thay đổi ngoài P0.
- Kiểm tra `/app`, Worker health, fields và snapshot.
- Kiểm tra 38 workspace, tài khoản nhiều khu vực và password.
- Test một tài khoản DP, Kho, TV, TC, BK.
- Test camera QR/IMEI trên iPhone/iPad thật.
- Test một upload ảnh và đọc lại media.
- Kiểm tra Wi-Fi và 4G dự phòng.
- Ghi Vercel deployment ID, Worker version và rollback target.

## 4. T-2 giờ

- Mở Dashboard Điều phối trên iPad.
- Đăng nhập thử AIO trên thiết bị mẫu.
- Kiểm tra thời gian cập nhật và trạng thái live.
- Xác nhận Check-in/Orders/Master/Dispatch/DS Master đọc được.
- Xóa session test trên thiết bị dùng chung.
- Không chạy load test ghi production sát giờ mở cửa nếu chưa đủ thời gian kiểm tra/clear.

## 5. Trong event

### Giám sát định kỳ

Mỗi 15–30 phút hoặc khi có phản ánh:

- mở `/health`;
- kiểm tra snapshot warnings/cache;
- kiểm tra latency quan sát trên App;
- đối chiếu một khách vừa thao tác với Base;
- kiểm tra upload media nếu Kho/Thu cũ báo chậm.

### Thông tin bắt buộc khi báo lỗi

- thời gian chính xác;
- thiết bị và mạng;
- tài khoản/workspace;
- STT khách nếu có;
- thao tác vừa bấm;
- thông báo lỗi nguyên văn;
- ảnh màn hình;
- đã bấm lại hay chưa.

## 6. Xử lý sự cố nhanh

### App không mở

1. Kiểm tra mạng.
2. Mở `/app` trực tiếp.
3. Kiểm tra Vercel domain.
4. Nếu 404/Dashboard, kiểm tra deployment và rewrite.

### Login lỗi hàng loạt

1. Không đổi password hàng loạt.
2. Kiểm tra `/roster-check` summary.
3. Kiểm tra Worker/Lark token và roster cache.
4. Thử lại sau tối đa 60 giây nếu password vừa đổi.

### Snapshot chậm

1. Không yêu cầu 40 máy refresh liên tục.
2. Kiểm tra cache state/warnings.
3. Kiểm tra endpoint từng bảng.
4. Giữ vận hành bằng dữ liệu gần nhất nếu stale còn trong giới hạn.

### Submit chưa hiện

1. Không bấm lặp ngay.
2. Kiểm tra response/record ID nếu có.
3. Đọc `/master` hoặc `/dispatch`.
4. Kiểm tra Base raw record trước formula.
5. Chỉ retry khi chắc chắn record chưa tồn tại.

### Upload lỗi

1. Ghi ảnh thứ mấy thất bại.
2. Chuyển 4G nếu Wi-Fi yếu.
3. Giảm số ảnh nhưng vẫn đáp ứng yêu cầu nghiệm thu.
4. Không submit record với token thiếu mà không báo người dùng.

## 7. Quy tắc deploy trong event

- Chỉ deploy P0 có bằng chứng và rollback target.
- Build → blue/green → verify → promote.
- Worker deploy phải smoke test schema/snapshot.
- Không sửa đồng thời frontend, Worker và formula nếu không có cách cô lập lỗi.
- Ghi lại mọi thay đổi trong decision log.

## 8. Load test production

- Phải có run ID và cửa sổ test.
- Chủ dự án đã phê duyệt dùng production thật.
- Chủ dự án tự clear dữ liệu sau test.
- Nhóm test bàn giao danh sách record dự kiến/thực tế, thời gian và artifact.
- Sau test kiểm tra recovery của App/Worker trước khi kết luận.

## 9. Sau event

- Xuất/backup dữ liệu cần giữ.
- Ghi kết quả leadtime từ Proxy Leadtime.
- Tổng hợp sự cố theo route/bàn/thời gian.
- Rotate password tạm nếu áp dụng.
- Xóa session trên thiết bị mượn/dùng chung.
- Chốt deployment cuối và archive tài liệu/test artifacts.

## 10. Checklist kết thúc ca

- Không còn khách pending ngoài thực tế.
- Record cuối đã hội tụ formula.
- Kho đã bàn giao đủ máy.
- Ảnh nghiệm thu xem lại được.
- Thiết bị đã logout hoặc khóa.
- Sự cố chưa xử lý có owner và evidence.
