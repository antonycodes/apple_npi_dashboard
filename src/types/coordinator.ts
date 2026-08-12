/**
 * Điều phối viên — danh sách DÙNG CHUNG giữa mọi máy, lưu ở Cloudflare KV qua
 * worker (`/config/coordinators`), KHÔNG phải localStorage từng máy.
 *
 * Admin gán sẵn ID/tên/vị trí ở trang `#/admin`; mỗi máy điều phối chỉ chọn
 * "máy này là ai" (xem `config/deviceIdentity.ts`) rồi mọi bản ghi gửi lên
 * Lark đều kèm danh tính đó.
 */
export interface Coordinator {
  /** Mã NV điều phối, vd "DP01" — khoá định danh, phải là duy nhất. */
  id: string;
  /** MSNV của điều phối viên, dùng để hiển thị và gửi kèm dữ liệu. */
  msnv: string;
  name: string;
  /** Vị trí đứng/khu vực phụ trách, vd "Cổng", "Khu Tư vấn". */
  position: string;
}

/** Nguyên văn payload worker trả về ở `/config/coordinators`. */
export interface CoordinatorConfig {
  coordinators: Coordinator[];
  /** ISO 8601 lần lưu gần nhất — hiện trên trang admin để biết máy đã nhận bản mới chưa. */
  updatedAt: string | null;
}
