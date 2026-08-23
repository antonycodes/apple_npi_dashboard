/**
 * useKhoHandoverData — nguồn dữ liệu cho màn BÀN GIAO của kho (`#/app`, vai
 * trò `kho`).
 *
 * Cùng vòng đời fetch/poll/mock với `useKhoBoardData`, nhưng map ra ĐÚNG một
 * bảng tra: mã bàn (`Master_DS."STT bàn"`) → nhân sự đứng bàn đó. Chuỗi riêng
 * (hook + mapper) đúng quy ước repo — bảng kanban của kho và màn bàn giao không
 * ràng buộc nhau, sửa bên này không có cơ hội làm hỏng bên kia.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_FIELD_CONFIG, toFieldConfig, toRuntimeConfig, useLarkSettings } from '@/config/larkSettings';
import { mockLarkTables } from '@/data/mockLarkData';
import { fetchTableRecords } from '@/services/larkClient';
import { indexStaffByDesk, type KhoStaffInfo } from '@/services/khoMapper';
import { TIMEOUT_MESSAGE, withRequestTimeout } from './requestTimeout';
import { startSerializedPolling } from './serializedPolling';

export interface UseKhoHandoverDataResult {
  /** Mã bàn (vd "TV4") → nhân sự đang đứng bàn đó. */
  staffByDesk: Map<string, KhoStaffInfo>;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isMock: boolean;
  refresh: () => void;
}

const EMPTY_STAFF = new Map<string, KhoStaffInfo>();

/**
 * Dữ liệu kèm NGUỒN sinh ra nó.
 *
 * Bắt buộc phải nhớ nguồn (2026-08-19): máy mới mở app chạy dữ liệu mẫu vài
 * trăm ms đầu — cấu hình dùng chung (`useSharedSettingsSync`) phải tải từ
 * worker mới biết là chạy Lark thật. Trong khoảng đó state đã đầy roster MẪU
 * (đúng 7 bàn), rồi khi chuyển sang live thì bảng mẫu ĐÓ VẪN NẰM NGUYÊN trên
 * màn cho tới lúc fetch đầu tiên trả về — nhãn ghi "Lark (live)" mà dữ liệu là
 * mock. Hậu quả ở màn kho: quét mã bàn thật (TV12…) bị báo "không có bàn này
 * trong Master_DS", còn TV1 thì ra tên của nhân vật trong dữ liệu mẫu.
 */
interface StaffSnapshot {
  map: Map<string, KhoStaffInfo>;
  fromMock: boolean;
}

export function useKhoHandoverData(guestMode = false): UseKhoHandoverDataResult {
  const settings = useLarkSettings();
  const cfg = useMemo(() => toRuntimeConfig(settings), [settings]);
  const isMock = guestMode || cfg.useMock;
  const sig = useMemo(() => JSON.stringify(settings), [settings]);

  const [snapshot, setSnapshot] = useState<StaffSnapshot>({ map: EMPTY_STAFF, fromMock: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    if (isMock) {
      setSnapshot({
        map: indexStaffByDesk(mockLarkTables.dsMaster, DEFAULT_FIELD_CONFIG.dsMaster),
        fromMock: true,
      });
      setError(null);
      setLoading(false);
      setLastUpdated(new Date());
      return () => {
        cancelled = true;
      };
    }

    async function load(initial: boolean) {
      if (initial) setLoading(true);

      // Hết giờ thì BỎ lượt đọc này để vòng poll đi tiếp — xem `requestTimeout.ts`.
      const req = withRequestTimeout(controller.signal);
      try {
        // CHỈ đọc `Master_DS` chứ không lấy cả snapshot 5 bảng: màn bàn giao
        // chỉ cần danh sách bàn, mà đường snapshot gộp đang là chỗ chậm nhất
        // (đo 2026-08-19: bảng lẻ ~3 giây, snapshot gộp có lúc quá 40 giây).
        const rows = await fetchTableRecords(cfg, 'dsMaster', req.signal);
        if (cancelled) return;
        setSnapshot({ map: indexStaffByDesk(rows, toFieldConfig().dsMaster), fromMock: false });
        setError(null);
        setLastUpdated(new Date());
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        setError(req.timedOut() ? TIMEOUT_MESSAGE : err instanceof Error ? err.message : String(err));
      } finally {
        req.done();
        if (!cancelled && initial) setLoading(false);
      }
    }

    const stopPolling = startSerializedPolling(load, cfg.pollMs, () => cancelled);
    return () => {
      cancelled = true;
      controller.abort();
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMock, sig, nonce]);

  // Dữ liệu sinh ra ở chế độ khác chế độ hiện tại thì coi như CHƯA CÓ, kèm
  // `loading` để UI nói "đang tải" thay vì kết luận sai là bàn không tồn tại.
  const khopCheDo = snapshot.fromMock === isMock;
  return {
    staffByDesk: khopCheDo ? snapshot.map : EMPTY_STAFF,
    loading: loading || !khopCheDo,
    error,
    lastUpdated,
    isMock,
    refresh,
  };
}
