# HANDOFF — NPI Event popup placement và bảo toàn nội dung

## 1. Mục tiêu tổng thể và scope

Repository: `/Users/antonynguyen/Downloads/npievent-main`

Mục tiêu của phiên này là sửa toàn bộ popup trên dashboard để:

1. Bấm vào ô bàn/nhân viên, chấm STT trên bàn, hoặc chấm STT ở vùng chờ thì popup được đặt ngoài đúng node đã bấm.
2. Không popup nào che chính ô bàn, badge `STT tiếp theo`, hoặc hàng chấm STT liên quan.
3. Popup có thể đóng khi bấm vào bất kỳ vùng nào của card; vẫn giữ được các nút thao tác bên trong.
4. Không làm mất dòng dữ liệu, padding dưới, hoặc nội dung popup khi xử lý viewport nhỏ.
5. Giữ nguyên mapping dữ liệu Lark và layout floor map hiện tại; phạm vi thay đổi là hành vi popup/định vị và các marker DOM cần để đo hình học.

## 2. Trạng thái hiện tại

- Branch/HEAD khi ghi handoff: `codex/infra-k6-optimization`, commit `72f2474 Improve evidence capture form`.
- `git status --short` gần nhất không trả dòng nào; không có thay đổi chưa commit sau khi kiểm tra.
- `HANDOFF.md` hiện đang được thay bằng tài liệu này theo yêu cầu tiếp quản.
- Dev server Vite đã được dừng ở cuối phiên trước bằng `pkill -f "vite --port 5199"`; nếu cần browser preview, chạy lại `npm run dev -- --port 5199`.
- Lệnh kiểm tra TypeScript gần nhất: `npx tsc -b --pretty false`; kết quả exit `0`.
- Không có kiểm chứng live Lark, deploy frontend, GitHub push, hoặc thiết bị thật trong phiên này. Các kết quả browser dưới đây chỉ là mock data trên localhost.

## 3. Những gì đã làm xong

### 3.1. Logic định vị dùng chung

File: `/Users/antonynguyen/Downloads/npievent-main/src/components/popoverPlacement.ts`

Các thành phần chính:

- `unionRect(elements)` — lấy hình bao từ `getBoundingClientRect()` của nhiều phần tử; bỏ qua phần tử không tồn tại hoặc có kích thước 0.
- `placeOutside(anchor, size, align, gap)` — thử vị trí theo thứ tự dưới → trên → phải → trái; kẹp vào viewport hiện tại và trả `{ left, top, maxHeight? }`.
- `useAnchoredPlacement(popoverRef, resolveAnchor, align, deps)` — đo card/node bằng layout effect, theo dõi `ResizeObserver`, resize và scroll capture để popup bám lại khi layout đổi.
- `deskAnchorRect(board, deskId)` — bảo vệ union của ô bàn `[data-desk-id]`, badge `[data-desk-badge]`, và hàng chấm `[data-customer-dot-row]`.

Quyết định quan trọng trong `useAnchoredPlacement`:

- Trước khi đo chiều cao, tạm đặt `cardElement.style.maxHeight = 'none'`, đo `getBoundingClientRect().height`, rồi trả style cũ. Không dùng `scrollHeight` làm chiều cao tự nhiên vì Chrome có thể bỏ qua phần padding dưới, làm card bị cắt.
- Chỉ trả `maxHeight` khi không còn cạnh nào đủ chỗ. Khi đủ chỗ, `maxHeight` là `undefined` để card hiện nguyên vẹn.
- Khi viewport thấp, ưu tiên vị trí bên phải/bên trái; nếu vẫn bất khả thi thì giới hạn card vào vùng nhìn thấy và cho cuộn nội bộ. Không được hy sinh điều kiện “không đè node”.
- `VIEWPORT_INSET = 16`, `ANCHOR_GAP = 12`, `TIGHT_INSET = 8`.

### 3.2. Popup bàn/nhân viên

File: `/Users/antonynguyen/Downloads/npievent-main/src/components/DeskPopover.tsx`

- `DeskPopover` dùng `useAnchoredPlacement(..., deskAnchorRect, 'center', ...)` thay cho vị trí `%` và transform cố định.
- Card có `onClick={onClose}`, nên bấm vùng bất kỳ trong popup sẽ đóng.
- Nút đổi `Khách đang chờ` ↔ `STT tiếp theo` trong `DeskPopover` gọi `e.stopPropagation()` để không đóng popup khi chỉ muốn đổi thông tin.
- `style={{ maxHeight: placement?.maxHeight }}` chỉ giới hạn khi thuật toán thực sự không tìm được vị trí đủ chiều cao.
- Nút `×` và phím Escape vẫn đóng như trước.

### 3.3. Popup khách đã tiếp nhận

File: `/Users/antonynguyen/Downloads/npievent-main/src/components/CustomerPopover.tsx`

- `CustomerPopover` dùng `deskAnchorRect(board, desk.id)` thay vì chỉ neo vào hàng chấm STT. Điều này ngăn card khi lật lên che lại ô bàn.
- Card có `onClick={onClose}` và vẫn có nút `×`/Escape.
- Nội dung Lark giữ nguyên: `Tên sản phẩm`, `Ghi chú thanh toán`, `Hyperlink Master`, `Check thu máy cũ`, raw `Thu cũ check`, raw `Backup check`, và dòng `Nhân sự` dạng `(${dsTuVan})(${dsThuCu})(${dsBackup})`.
- `oldDeviceCheckTone()` vẫn tô màu theo từ khóa, không biến `Thu cũ check` thành boolean.

### 3.4. Popup khách đang chờ

File: `/Users/antonynguyen/Downloads/npievent-main/src/components/WaitingPopover.tsx`

- Thêm prop `index` để xác định chính xác `[data-waiting-dot="${index}"]` trong thẻ vùng chờ.
- `WaitingPopover` dùng `unionRect` + `useAnchoredPlacement` để neo trực tiếp vào chấm STT đã bấm.
- Card có thể đóng bằng click toàn card, `×`, hoặc Escape.
- Nút `DP` gọi `e.stopPropagation()` rồi `onDispatch()` để không bị hành vi click card nuốt mất.
- Các field và semantics raw của Lark vẫn giữ nguyên, gồm `Nhân sự`, `Thu cũ check`, `Backup check`, hyperlink và trạng thái vùng chờ.

### 3.5. Marker và Sidebar

Files:

- `/Users/antonynguyen/Downloads/npievent-main/src/components/Desk.tsx`
- `/Users/antonynguyen/Downloads/npievent-main/src/components/LayoutDashboard.tsx`
- `/Users/antonynguyen/Downloads/npievent-main/src/components/Sidebar.tsx`

Chi tiết:

- `Desk` có `data-desk-id={id}` trên button và `data-desk-badge` trên badge `nextWaitingStt` để `deskAnchorRect()` đo được.
- `LayoutDashboard` vẫn render overlay popup trong board; không đổi dữ liệu/layout floor map.
- `Sidebar` bỏ cách tự tính `top/right` cũ; `WaitingZoneCard` đặt `data-waiting-dot={index}` trên từng button và truyền `index` vào `WaitingPopover`.
- `DashboardPage.tsx` vẫn điều phối state `selectedId`, `selectedCustomer`, `selectedWaiting`, `showDispatchForm`, và truyền callback đóng/mở như cũ.

## 4. Kết quả kiểm chứng đã có

Đã chạy `npx tsc -b --pretty false` thành công, exit `0`.

Browser mock data đã kiểm tra 50 case:

- 36 popup bàn.
- 9 popup chấm STT trên board.
- 5 popup chấm STT vùng chờ.

Ở các viewport đã kiểm tra gồm `1440×900`, `1280×720`, `1180×820`, `1024×600`, `900×520`, `820×1180`, `768×1024`, các test chính kiểm tra:

- Popup không giao với union node trigger.
- Popup không tràn viewport.
- Không có `scrollHeight > clientHeight` khi viewport đủ chỗ.
- Popup vẫn hiện sau khi resize/scroll.

Test hành vi bổ sung với TV4 đã xác nhận:

- Đổi `Khách đang chờ 3` sang `STT tiếp theo 7` không đóng popup.
- Bấm vào card sau đó đóng popup đúng yêu cầu.

`900×520` là viewport cực thấp: một số `CustomerPopover` dài không thể vừa trên/dưới/hai bên mà vẫn né node; khi đó code cố ý cho cuộn nội bộ. Không được tuyên bố “không bao giờ cuộn” ở viewport này.

## 5. Những cách đã thử nhưng thất bại

1. **Vị trí cũ bằng phần trăm + transform cố định trong `DeskPopover`**
   - Dùng `left: x%`, `top: y%`, `translate(...)` với gap 16px.
   - Thất bại vì x/y là tâm node; card có thể phủ lên chính ô bàn, badge và hàng STT, đặc biệt ở TV4.

2. **Chỉ neo `CustomerPopover` theo hàng chấm STT**
   - Trước đó popup chỉ đo `[data-customer-dot-row="desk.id"]`.
   - Khi card lật lên trên, nó vẫn che ô bàn; vì vậy phải dùng `deskAnchorRect()` gồm cả bàn, badge và hàng chấm.

3. **`Sidebar` tự truyền `top/right` cho `WaitingPopover`**
   - Tọa độ bị stale khi layout/viewport/scroll thay đổi và không phản ánh rect thật của chấm.
   - Đã thay bằng marker `data-waiting-dot` và đo trực tiếp trong `WaitingPopover`.

4. **Luôn gắn `overflow-y-auto` và max-height lấy từ `scrollHeight`**
   - Là nguyên nhân người dùng thấy “mất thông tin”: `scrollHeight` có thể thiếu padding dưới, nên max-height bị đặt hụt và card bị cắt.
   - Cách hiện tại: tạm gỡ max-height, đo `getBoundingClientRect().height`, chỉ cap khi thật sự không có vị trí nào đủ chỗ.

5. **Chỉ test overlap/offscreen, không test clipping**
   - Bộ test cũ có thể báo popup không đè node nhưng không phát hiện nội dung bị cắt.
   - Bộ test phải luôn kiểm tra thêm `scrollHeight > clientHeight`; nếu có clipping thì phân biệt clipping bắt buộc ở viewport quá nhỏ với clipping do thuật toán.

## 6. Việc tiếp theo cần làm, theo thứ tự

1. Chạy lại kiểm tra source/build từ repo root:

   ```bash
   cd /Users/antonynguyen/Downloads/npievent-main
   npm run lint
   npm run build
   ```

2. Khởi động preview để kiểm tra trực quan các case người dùng đã báo:

   ```bash
   npm run dev -- --port 5199
   ```

   Bấm lần lượt TV4, một chấm STT của TV4, một chấm vùng chờ, rồi xác nhận đủ các dòng cuối card và padding dưới còn nguyên.

3. Nếu cần sửa tiếp geometry, chỉ sửa `/Users/antonynguyen/Downloads/npievent-main/src/components/popoverPlacement.ts` trước; không quay lại thêm transform cứng trong từng popup.

4. Kiểm tra đủ ba điều kiện sau ở từng viewport: không overlap trigger union, không offscreen, không clipping ngoài trường hợp `900×520` bắt buộc phải cuộn.

5. Review `git diff -- HANDOFF.md src/components/popoverPlacement.ts src/components/DeskPopover.tsx src/components/CustomerPopover.tsx src/components/WaitingPopover.tsx src/components/Sidebar.tsx src/components/Desk.tsx` trước khi commit. Không reset hoặc checkout các thay đổi khác trong worktree.

6. Chỉ sau khi người dùng xác nhận trực quan trên viewport/thiết bị mục tiêu mới cân nhắc commit/push/deploy. Phiên này chưa xác nhận deploy frontend hoặc dữ liệu Lark live.

