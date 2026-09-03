import { workerBaseUrl } from '@/services/adminApi';
import { guestMediaUrl } from '@/services/guestMedia';
import type { KhoHandoverHistoryItem } from '@/hooks/useKhoHandoverHistory';
import { useState } from 'react';

function mediaUrl(image: { fileToken: string; sourceRecordId: string; sourceRevision?: number }) {
  const guestUrl = guestMediaUrl(image.fileToken);
  if (guestUrl) return guestUrl;
  const query = `?table=master&record_id=${encodeURIComponent(image.sourceRecordId)}&field=${encodeURIComponent('Hình nghiệm thu máy cũ')}${image.sourceRevision ? `&rev=${image.sourceRevision}` : ''}`;
  return `${workerBaseUrl()}/media/${encodeURIComponent(image.fileToken)}${query}`;
}

function formatTime(time: number) {
  return time ? new Date(time).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Chưa có thời gian';
}

export default function KhoHandoverHistory({ items, loading, error }: { items: KhoHandoverHistoryItem[]; loading: boolean; error: string | null }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  return (
    <section className="mx-auto w-full max-w-[430px] px-4 pb-5" aria-label="Danh sách đã bàn giao">
      <div className="mb-2 flex items-center justify-between border-b border-neutral-200 pb-2">
        <h2 className="text-base font-black text-neutral-900">Đã bàn giao</h2>
        {items.length > 0 && <span className="text-xs font-semibold text-neutral-500">{items.length} lượt</span>}
      </div>
      {loading && <p className="rounded-xl border border-neutral-200 bg-white px-3 py-4 text-sm text-neutral-500">Đang tải danh sách…</p>}
      {!loading && error && <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-sm font-semibold text-red-700">Không tải được danh sách bàn giao.</p>}
      {!loading && !error && items.length === 0 && <p className="rounded-xl border border-neutral-200 bg-white px-3 py-4 text-sm text-neutral-500">Chưa có lượt bàn giao nào.</p>}
      <div className="space-y-2">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-neutral-200 bg-white px-3 py-3">
            <button type="button" className="w-full text-left" aria-expanded={expandedId === item.id} onClick={() => setExpandedId((current) => current === item.id ? null : item.id)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-neutral-900">Bàn giao cho {item.deskCode}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{formatTime(item.time)} · Người ghi: {item.submittedBy || '—'}</p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">Đã giao</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-neutral-500">
                <span>{item.images.length ? 'Bấm để xem ảnh nghiệm thu' : 'Không có ảnh nghiệm thu'}</span>
                <span className="shrink-0">Ảnh: {item.images.length}/3</span>
              </div>
            </button>
            {expandedId === item.id && item.images.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2 border-t border-neutral-100 pt-3">{item.images.map((image) => <img key={image.fileToken} src={mediaUrl(image)} alt={image.name || 'Ảnh nghiệm thu'} className="max-h-64 w-full rounded-lg border border-neutral-200 object-contain" loading="lazy" />)}</div>}
          </article>
        ))}
      </div>
    </section>
  );
}
