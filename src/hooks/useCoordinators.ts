/**
 * useCoordinators — danh sách điều phối viên DÙNG CHUNG, đọc từ worker.
 *
 * Đọc công khai (không cần đăng nhập admin) vì máy điều phối cần biết mình là
 * ai ngay khi mở. Tải lại khi đổi "API URL" ở Cài đặt.
 */
import { useEffect, useState } from 'react';
import { useLarkSettings } from '@/config/larkSettings';
import { fetchCoordinators } from '@/services/adminApi';
import type { Coordinator } from '@/types/coordinator';

export interface UseCoordinatorsResult {
  coordinators: Coordinator[];
  loading: boolean;
  error: string | null;
}

export function useCoordinators(): UseCoordinatorsResult {
  const { apiUrl } = useLarkSettings();
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    let cancelled = false;
    setLoading(true);
    fetchCoordinators(ctrl.signal)
      .then((cfg) => {
        if (cancelled) return;
        setCoordinators(cfg.coordinators);
        setError(null);
      })
      .catch((err) => {
        if (cancelled || ctrl.signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [apiUrl]);

  return { coordinators, loading, error };
}
