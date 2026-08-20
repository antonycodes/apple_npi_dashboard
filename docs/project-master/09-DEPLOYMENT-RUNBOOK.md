# Deployment Runbook

> Dành cho người triển khai kỹ thuật. PDF vận hành cuối sẽ rút gọn phần này.

## 1. Phạm vi deployment

| Lớp | Công cụ | Artifact |
| --- | --- | --- |
| Frontend | npm + Vercel CLI | Vite bundle |
| Worker | Wrangler | `cloudflare-worker.js` |
| Cấu hình chung | App/Admin → KV | `app-settings`, coordinators |
| Lark schema | Lark Base | Field/option/formula |

## 2. Điều kiện trước khi deploy

- Đang ở đúng repository và branch `main`.
- Worktree không có thay đổi ngoài phạm vi.
- Đã đọc diff và không có credential.
- `npm ci` hoàn tất.
- Vercel CLI/Wrangler đăng nhập đúng account/project.
- `.vercel/repo.json` trỏ đúng project `apple-npi`.
- `wrangler.jsonc` trỏ đúng Worker `vhws-lark-proxy`.
- Có kế hoạch rollback.

## 3. Frontend — build

```bash
npm ci
npm run build
git diff --check
git status --short
```

Build đạt chỉ chứng minh typecheck/bundle. Cần kiểm tra route và production riêng.

## 4. Commit và push

```bash
git add <file-in-scope>
git commit -m "<message>"
git fetch origin
git rebase origin/main
git push origin main
git ls-remote origin refs/heads/main
```

- Không dùng force-push.
- Không stage `.vercel/`, `.env`, kết quả test chứa dữ liệu khách hoặc ảnh tạm.
- Nếu local main chậm hơn remote, rebase commit lên remote trước deploy.

## 5. Vercel blue/green

### Tạo deployment chưa chuyển custom domain

```bash
vercel --prod --skip-domain --yes
```

### Kiểm tra deployment protection

```bash
vercel curl /app --deployment https://<deployment>.vercel.app
vercel curl / --deployment https://<deployment>.vercel.app
```

Kiểm tra:

- `/app` trả `index.html`;
- bundle có AppLogin/AppPage/Kho;
- route hash cũ vẫn hoạt động;
- static assets và WASM QR tải được;
- không có lỗi console/network nghiêm trọng.

### Promote

```bash
vercel promote https://<deployment>.vercel.app --yes
```

### Hậu kiểm domain

```bash
curl -I https://apple.vhws.online/app
curl -I https://apple.vhws.online/
```

Kỳ vọng `/app` HTTP 200 và cùng SPA entry với root.

## 6. Deploy Cloudflare Worker

### Tiền kiểm

```bash
npx wrangler whoami
npx wrangler deploy --dry-run
```

Kiểm tra `wrangler.jsonc`:

- name đúng `vhws-lark-proxy`;
- compatibility date phù hợp;
- KV binding đúng;
- required secrets đã tồn tại;
- không đưa giá trị secret vào file.

### Deploy

```bash
npx wrangler deploy
```

Không đổi tên Worker hoặc deploy vào Worker cũ chỉ vì CLI đang trỏ account khác.

## 7. Worker smoke test không ghi

```bash
curl -fsS https://<worker>/health
curl -fsS https://<worker>/fields
curl -fsS 'https://<worker>/fields?table=dispatch'
curl -fsS https://<worker>/dashboard/snapshot
```

Kiểm tra:

- `code=0`;
- mapping ghi chính `ok=true`;
- snapshot có đủ năm bảng;
- warnings/cache state;
- roster count hợp lý.

## 8. Smoke test ghi production

Chỉ chạy khi được phê duyệt ghi thật.

1. Chọn khách Check-in chưa chạy flow hoặc record test được chỉ định.
2. Gắn run ID/thời gian trong artifact test.
3. Ghi một Dispatch.
4. Ghi Tiếp nhận và Hoàn tất.
5. Nếu có ảnh: upload, kiểm tra media, rồi ghi token.
6. Đọc lại `/dispatch` và `/master`.
7. Đối chiếu trực tiếp Base/formula/End Flow.
8. Ghi record ID để chủ dự án clear sau test.

## 9. Kiểm tra AIO theo vai trò

### Điều phối trên iPad

- Login → Chọn khu vực DP → Dashboard.
- Form Điều phối có đúng `Submit by`.
- Sign out hoạt động.

### Kho trên iPad

- Login Kho.
- Không có STT khách.
- Scan TV code.
- Ảnh tối đa ba.
- `Bàn giao kho` không thành `Hoàn tất`.

### Nhân sự trên iPhone

- Login và workspace.
- Tiếp nhận/Hoàn tất.
- Thu cũ/Backup scan và ảnh.
- Pending state, refresh và logout.

## 10. Rollback

### Vercel

```bash
vercel rollback
```

Hoặc promote deployment tốt trước đó. Sau rollback phải kiểm tra domain, `/app` và bundle.

### Worker

- Dùng Wrangler versions/rollback theo version đã ghi nhận.
- Không rollback Worker độc lập nếu frontend mới phụ thuộc route mới; đánh giá compatibility trước.

### Lark

- Không tự động rollback field/formula.
- Ghi lại tên/kiểu/option trước khi sửa.
- Khôi phục schema cần được kiểm tra với `/fields` và smoke test.

## 11. Evidence cần lưu mỗi deployment

- Git commit SHA.
- Vercel deployment ID và URL.
- Worker version/deployment time.
- Kết quả build.
- Kết quả route smoke test.
- Snapshot/schema summary.
- Người deploy và thời gian.
- Các thay đổi Lark/KV liên quan.
- Rollback target.

## 12. Điều không được tuyên bố từ một bằng chứng duy nhất

- Build đạt ≠ production đã cập nhật.
- Vercel READY ≠ AIO route đúng.
- Worker health 200 ≠ Lark đủ năm bảng.
- POST 200 ≠ record đúng field/End Flow.
- k6 0% HTTP error ≠ không mất dữ liệu Lark.
