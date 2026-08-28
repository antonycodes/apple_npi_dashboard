/**
 * KhoBoard — bảng kanban cho màn hình Kho (`/khoview`).
 *
 * Mỗi CỘT = 1 bàn; mỗi THẺ = 1 khách với STT · trạng thái · sản phẩm.
 *
 * Khách đang "Tiếp nhận" luôn hiện dạng thẻ đầy đủ. Khách đã "Hoàn tất" (lịch
 * sử phục vụ tại bàn đó trong ngày) hiện dạng DÒNG RÚT GỌN (STT · IMEI hoặc
 * sản phẩm · ảnh nhỏ), bấm vào mới bung chi tiết ngay tại chỗ — cột chứa được
 * nhiều khách mà không thành ống cuộn. Cột chỉ giữ `MAX_COMPLETED_INLINE` dòng
 * gần nhất; dư ra thì có nút "Xem tất cả (n)" mở popup đầy đủ.
 *
 * Bố cục VỪA 1 MÀN, không cuộn ngang: lưới `columns` cột × n dòng (16 bàn Tư
 * vấn = 8 cột × 2 dòng), các cột chia đều chiều cao khung; cột nào dài quá thì
 * tự cuộn DỌC bên trong cột đó.
 *
 * Không có "STT tiếp theo" — kho không cần. Tách riêng khỏi `QueueBoard`
 * (màn hình STT của Tư vấn/Thu cũ/Backup) để 2 màn hình không ràng buộc nhau.
 */
import { useEffect, useRef, useState } from 'react';
import { workerBaseUrl } from '@/services/adminApi';
import { guestMediaUrl } from '@/services/guestMedia';
import type { DeskKhoState, KhoCustomer } from '@/services/khoMapper';
import type { WarehouseInboxOrder, WarehouseOrderClaims } from '@/types/warehouse';
import { warehouseClaimantFull } from '@/utils/warehouseClaimant';
import ProductList from './ProductList';

/** `file_token` không phải URL — ảnh Bitable phải đi qua `/media/<token>` của worker. */
/** Số khách đã hoàn tất hiện thẳng trong cột; dư ra xem trong popup. */
const MAX_COMPLETED_INLINE = 3;

function mediaUrl(fileToken: string): string {
  const guestUrl = guestMediaUrl(fileToken);
  if (guestUrl) return guestUrl;
  return `${workerBaseUrl()}/media/${encodeURIComponent(fileToken)}`;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1 text-[11px] leading-tight">
      <span className="shrink-0 text-neutral-400">{label}</span>
      <span className="min-w-0 break-all font-semibold text-neutral-700" title={value}>
        {value}
      </span>
    </div>
  );
}

function OrderStatusBlock({ orders, compact = false, onInspect }: { orders: WarehouseInboxOrder[]; compact?: boolean; onInspect?: (order: WarehouseInboxOrder) => void }) {
  if (!orders.length) return null;
  if (compact) {
    return <div className="mt-1.5 border-t border-neutral-200 pt-1.5 text-[10px] font-bold text-amber-700">📦 Có order</div>;
  }
  return (
    <div className="mt-1.5 space-y-0.5 border-t border-neutral-200 pt-1.5">
      {orders.map((order) => {
        const content = (
          <>
            <span className="shrink-0" aria-hidden="true">📦</span>
            <span className="min-w-0 flex-1 truncate font-semibold text-neutral-700" title={order.rawText}>Nội dung Order · {order.orderCode}</span>
            <span className="shrink-0 font-semibold text-amber-700">Có order</span>
          </>
        );
        const rowClass = ['flex w-full items-center gap-1.5 rounded border border-emerald-300 bg-emerald-50 px-1.5 py-1 text-left text-[10px] leading-tight', 'hover:bg-white'];
        return onInspect ? <button key={order.id} type="button" onClick={() => onInspect(order)} className={rowClass.join(' ')}>{content}</button> : <div key={order.id} className={rowClass.join(' ')}>{content}</div>;
      })}
    </div>
  );
}

/**
 * Khối thu cũ — CHỈ hiện ở bàn Thu cũ / Backup: trạng thái thu máy, check
 * nghiệm thu, IMEI, QR máy cũ và ảnh nghiệm thu (bấm ảnh để xem cỡ lớn).
 */
function TradeInBlock({ customer, onZoom }: { customer: KhoCustomer; onZoom: (url: string) => void }) {
  const d = customer.device;
  const nghiemThu = customer.deviceAcceptedText?.trim() || null;
  const thuCuCheck = customer.oldDeviceCheck?.trim() || null;
  const images = d?.images ?? [];
  const hasAny = d?.thuLaiMay || d?.imei || d?.scanQr || images.length > 0 || nghiemThu || thuCuCheck;
  if (!hasAny) return null;

  return (
    <div className="mt-1.5 space-y-0.5 border-t border-neutral-200 pt-1.5">
      {d?.thuLaiMay && (
        <span
          className={[
            'inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
            d.thuLaiMay === 'Thu máy sau' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700',
          ].join(' ')}
        >
          {d.thuLaiMay}
        </span>
      )}
      {thuCuCheck && <Field label="Thu cũ" value={thuCuCheck} />}
      {nghiemThu && <Field label="Nghiệm thu" value={nghiemThu} />}
      {d?.imei && <Field label="IMEI" value={d.imei} />}
      {d?.scanQr && <Field label="QR" value={d.scanQr} />}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {images.map((img) => (
            <button
              key={img.fileToken}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onZoom(mediaUrl(img.fileToken));
              }}
              className="rounded border border-neutral-300"
              title="Xem ảnh cỡ lớn"
            >
              <img
                src={mediaUrl(img.fileToken)}
                alt={img.name ?? 'Ảnh nghiệm thu máy cũ'}
                loading="lazy"
                className="h-11 w-11 rounded object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Ruột 1 thẻ khách — dùng chung cho thẻ trong cột, dòng hoàn tất đã bung và popup. */
function CustomerCardBody({
  customer,
  showTradeIn,
  onZoom,
  orders = [],
}: {
  customer: KhoCustomer;
  showTradeIn: boolean;
  onZoom: (url: string) => void;
  orders?: WarehouseInboxOrder[];
}) {
  const received = customer.status === 'received';
  return (
    <>
      <div className="flex items-center gap-1.5">
        <span
          className={[
            'text-xl font-black leading-none',
            received ? 'text-occupied' : 'text-neutral-400',
          ].join(' ')}
        >
          {customer.stt ?? '—'}
        </span>
        <span
          className={[
            'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
            received ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700',
          ].join(' ')}
        >
          {received ? 'Tiếp nhận' : 'Hoàn tất'}
        </span>
      </div>

      {customer.name && (
        <div className="truncate text-[11px] leading-tight text-neutral-500" title={customer.name}>
          {customer.name}
        </div>
      )}

      <div
        className={[
          'mt-0.5 whitespace-pre-line break-words text-[13px] font-semibold leading-tight',
          received ? 'text-neutral-800' : 'text-neutral-600',
        ].join(' ')}
        title={customer.productName ?? undefined}
      >
        {customer.productName ? <ProductList value={customer.productName} /> : <span className="font-normal text-neutral-400">Chưa có sản phẩm</span>}
      </div>

      {showTradeIn && <TradeInBlock customer={customer} onZoom={onZoom} />}
      <OrderStatusBlock orders={orders} compact />
    </>
  );
}

/** Thẻ khách đang tiếp nhận trong cột. */
function CustomerCard({
  customer,
  showTradeIn,
  onZoom,
  onDetails,
  orders,
  claims,
}: {
  customer: KhoCustomer;
  showTradeIn: boolean;
  onZoom: (url: string) => void;
  onDetails: (customer: KhoCustomer) => void;
  orders: WarehouseInboxOrder[];
  claims: WarehouseOrderClaims;
}) {
  const hasOrder = orders.length > 0;
  const hasClaim = customer.productOrders?.some((item) => item.orderCode && claims[item.orderCode.trim().toUpperCase()]) ?? false;
  return (
    <li
      role="button"
      tabIndex={0}
      onClick={() => onDetails(customer)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onDetails(customer);
        }
      }}
      title="Bấm để xem chi tiết khách"
      className={[
        'cursor-pointer rounded-lg border bg-white px-2 py-1.5 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        hasClaim ? 'border-red-400' : hasOrder ? 'border-emerald-400' : 'border-neutral-200',
      ].join(' ')}
    >
      <CustomerCardBody customer={customer} showTradeIn={showTradeIn} onZoom={onZoom} orders={orders} />
    </li>
  );
}

function CustomerDetailsModal({ customer, desk, orders, claims, onInspectOrder, onClose }: { customer: KhoCustomer; desk: DeskKhoState; orders: WarehouseInboxOrder[]; claims: WarehouseOrderClaims; onInspectOrder: (order: WarehouseInboxOrder) => void; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Chi tiết STT ${customer.stt ?? 'khách'}`}
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
    >
      <div onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-neutral-200 pb-3">
          <div>
            <h2 className="text-base font-black text-neutral-900">Chi tiết khách · STT {customer.stt ?? '—'}</h2>
            <p className="mt-0.5 text-xs text-neutral-500">{desk.label} · Đang tiếp nhận</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg px-2 text-2xl leading-none text-neutral-400 hover:bg-neutral-100">×</button>
        </header>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-2">
            <dt className="text-neutral-500">Họ và tên</dt>
            <dd className="text-right font-semibold text-neutral-800">{customer.name || '—'}</dd>
          </div>
          <div>
            <dt className="mb-1 text-neutral-500">Sản phẩm · Mã đơn hàng</dt>
            <dd className="space-y-1 rounded-lg bg-neutral-50 p-2 font-semibold text-neutral-800">
              {customer.productOrders?.length ? customer.productOrders.map((item) => {
                const claim = item.orderCode ? claims[item.orderCode.trim().toUpperCase()] : undefined;
                return item.orderCode ? (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => onInspectOrder({
                      id: `product-${item.orderCode}`,
                      orderCode: item.orderCode!,
                      rawText: item.product,
                      deskId: desk.id,
                      stt: customer.stt,
                      customerName: customer.name,
                      sentBy: 'Lark Base',
                      createdAt: 0,
                    })}
                    className="flex w-full items-start justify-between gap-3 border-b border-neutral-200 pb-1 text-left last:border-0 last:pb-0 hover:bg-white"
                  >
                    <span className="min-w-0"><span className="mr-1.5 text-brand">{item.label}</span>{item.product}</span>
                    <span className="shrink-0 text-right">
                      <span className="block text-neutral-500">{item.orderCode}</span>
                      {claim && <span className="mt-0.5 block text-[11px] font-bold text-red-700">Đã nhận · {warehouseClaimantFull(claim)}</span>}
                    </span>
                  </button>
                ) : (
                  <div key={item.label} className="flex items-start justify-between gap-3 border-b border-neutral-200 last:border-0 last:pb-0">
                    <span className="min-w-0"><span className="mr-1.5 text-brand">{item.label}</span>{item.product}</span>
                    <span className="shrink-0 text-right text-neutral-500">—</span>
                  </div>
                );
              }) : (customer.productName ? <ProductList value={customer.productName} /> : '—')}
            </dd>
          </div>
          <OrderStatusBlock orders={orders} onInspect={onInspectOrder} />
        </dl>
      </div>
    </div>
  );
}

function OrderDetailsModal({ order, onClose }: { order: WarehouseInboxOrder; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Chi tiết order" onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-neutral-200 pb-3">
          <div>
            <h2 className="text-base font-black text-neutral-900">Nội dung Order</h2>
            <p className="mt-1 text-xs font-semibold text-neutral-500">Mã đơn: {order.orderCode}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg px-2 text-2xl leading-none text-neutral-400 hover:bg-neutral-100">×</button>
        </header>
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-neutral-50 p-3 text-sm text-neutral-800">{order.rawText}</pre>
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">Order chỉ để xem thông tin.</p>
      </div>
    </div>
  );
}

/**
 * 1 khách đã hoàn tất, dạng DÒNG RÚT GỌN: STT · TÊN KHÁCH · ảnh nhỏ.
 * Bấm để bung nguyên thẻ đầy đủ (sản phẩm, IMEI, QR, ảnh) ngay tại chỗ.
 */
function CompletedRow({
  customer,
  showTradeIn,
  onZoom,
  orders,
}: {
  customer: KhoCustomer;
  showTradeIn: boolean;
  onZoom: (url: string) => void;
  orders: WarehouseInboxOrder[];
}) {
  const [open, setOpen] = useState(false);
  const thumb = customer.device?.images?.[0] ?? null;

  if (open) {
    return (
      <li>
        <button type="button" onClick={() => setOpen(false)} className="w-full text-left">
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5">
            <CustomerCardBody customer={customer} showTradeIn={showTradeIn} onZoom={onZoom} orders={orders} />
          </div>
        </button>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`${customer.stt ?? ''} · ${customer.name ?? ''} · ${customer.productName ?? ''}`}
        className="flex w-full items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-1.5 py-1 text-left hover:bg-white"
      >
        <span className="w-6 shrink-0 text-sm font-black leading-none text-neutral-500">
          {customer.stt ?? '—'}
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] text-neutral-600">
          {customer.name || customer.productName || '—'}
        </span>
        {thumb && (
          <img
            src={mediaUrl(thumb.fileToken)}
            alt=""
            loading="lazy"
            className="h-5 w-5 shrink-0 rounded object-cover"
          />
        )}
      </button>
    </li>
  );
}

/** Popup xem TOÀN BỘ khách đã hoàn tất của 1 bàn, thẻ đầy đủ. */
function CompletedModal({
  desk,
  customers,
  showTradeIn,
  onZoom,
  onClose,
  inboxOrders,
}: {
  desk: DeskKhoState;
  customers: KhoCustomer[];
  showTradeIn: boolean;
  onZoom: (url: string) => void;
  onClose: () => void;
  inboxOrders: WarehouseInboxOrder[];
}) {
  return (
    <div
      role="dialog"
      aria-label={`Khách đã hoàn tất tại ${desk.label}`}
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-full max-w-md flex-col rounded-2xl bg-white p-3 shadow-xl"
      >
        <header className="flex items-center justify-between gap-2 pb-2">
          <span className="text-sm font-bold text-neutral-800">
            {desk.label} · Đã hoàn tất ({customers.length})
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
          >
            Đóng
          </button>
        </header>
        <ul className="flex min-h-0 flex-col gap-1.5 overflow-y-auto">
          {customers.map((c, i) => (
            <li
              key={`m-${c.stt ?? i}-${c.name ?? i}`}
              className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5"
            >
              <CustomerCardBody
                customer={c}
                showTradeIn={showTradeIn}
                onZoom={onZoom}
                orders={inboxOrders.filter((order) => order.stt === c.stt)}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DeskColumn({
  desk,
  showCompleted,
  onZoom,
  onResizeStart,
  columnIndex,
  resizing,
  onDetails,
  inboxOrders,
  claims,
}: {
  desk: DeskKhoState;
  showCompleted: boolean;
  onZoom: (url: string) => void;
  onResizeStart: (event: React.PointerEvent<HTMLButtonElement>, columnIndex: number) => void;
  columnIndex: number;
  resizing: boolean;
  onDetails: (desk: DeskKhoState, customer: KhoCustomer) => void;
  inboxOrders: WarehouseInboxOrder[];
  claims: WarehouseOrderClaims;
}) {
  // Tư vấn không thu máy nên không có gì để hiện — xem `staffMapper`.
  const showTradeIn = desk.cluster !== 'consult';
  const active = desk.customers.filter((c) => c.status === 'received');
  const completed = desk.customers.filter((c) => c.status === 'completed');
  const deskOrders = inboxOrders.filter((order) => desk.customers.some((customer) => customer.stt === order.stt));
  const hasOrder = deskOrders.length > 0;
  const hasClaim = active.some((customer) => customer.productOrders?.some((item) => item.orderCode && claims[item.orderCode.trim().toUpperCase()]) ?? false);
  const deskTone = active.length === 0 ? 'neutral' : hasClaim ? 'red' : hasOrder ? 'green' : 'neutral';
  // Bàn Thu cũ / Backup MỞ SẴN danh sách đã hoàn tất: máy cũ đã thu nằm hết ở
  // đó, kho phải đối chiếu IMEI/QR/ảnh nên không bắt bấm mở từng cột. Tư vấn
  // thì gấp lại như cũ. Công tắc chung ở header vẫn mở được tất cả, và mỗi cột
  // vẫn tự mở/đóng riêng được.
  const defaultOpen = showCompleted || showTradeIn;
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => setOpen(defaultOpen), [defaultOpen]);
  const [modal, setModal] = useState(false);

  return (
    <section
      className={[
        'relative flex min-h-0 min-w-0 flex-col overflow-y-auto rounded-xl border-2 bg-neutral-50/80 p-2',
        deskTone === 'red' ? 'border-red-400' : deskTone === 'green' ? 'border-emerald-400' : 'border-neutral-200',
      ].join(' ')}
    >
      <button
        type="button"
        aria-label={`Kéo để chỉnh độ rộng ${desk.label}`}
        title="Kéo để chỉnh độ rộng cột"
        onPointerDown={(event) => onResizeStart(event, columnIndex)}
        className={[
          'group absolute right-0 top-0 bottom-0 z-20 flex w-6 cursor-col-resize touch-none items-center justify-center rounded-none opacity-0 transition-[opacity,box-shadow,background-color]',
          deskTone === 'red'
            ? 'hover:opacity-100 hover:bg-red-400/10 hover:shadow-[0_0_10px_rgba(248,113,113,0.28)]'
            : deskTone === 'green'
              ? 'hover:opacity-100 hover:bg-emerald-400/10 hover:shadow-[0_0_10px_rgba(52,211,153,0.28)]'
              : 'hover:opacity-100 hover:bg-neutral-400/10 hover:shadow-[0_0_10px_rgba(163,163,163,0.24)]',
          resizing
            ? deskTone === 'red'
              ? 'bg-red-400/20 opacity-100'
              : deskTone === 'green'
                ? 'bg-emerald-400/20 opacity-100'
                : 'bg-neutral-400/20 opacity-100'
            : 'bg-transparent',
        ].join(' ')}
      >
        <svg
          viewBox="0 0 8 32"
          className={[
            'absolute right-0 h-8 w-2 translate-x-1/2 text-neutral-300 transition-colors',
            deskTone === 'red' ? 'group-hover:text-red-400' : deskTone === 'green' ? 'group-hover:text-emerald-400' : 'group-hover:text-neutral-400',
          ].join(' ')}
          aria-hidden="true"
        >
          <path d="M1 1v30M7 1v30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <header className="flex items-baseline justify-between gap-1">
        <span className="text-base font-extrabold leading-none text-neutral-700">{desk.label}</span>
        <span className="shrink-0 text-[11px] font-semibold text-neutral-400">{active.length}</span>
      </header>
      {desk.staffName && (
        <span className="truncate text-[10px] leading-tight text-neutral-400" title={desk.staffName}>
          {desk.staffName}
        </span>
      )}

      {active.length === 0 ? (
        <p className="py-1 text-[11px] text-neutral-300">Không có khách</p>
      ) : (
        <ul className="mt-1.5 flex flex-col gap-1.5">
          {active.map((c, i) => (
            <CustomerCard
              key={`a-${c.stt ?? i}-${c.name ?? i}`}
              customer={c}
              showTradeIn={showTradeIn}
              onZoom={onZoom}
              orders={inboxOrders.filter((order) => order.stt === c.stt)}
              claims={claims}
              onDetails={(customer) => onDetails(desk, customer)}
            />
          ))}
        </ul>
      )}

      {completed.length > 0 && (
        <div
          className={[
            // Đóng thì neo xuống đáy cột cho các cột thẳng hàng; mở thì bám
            // ngay dưới danh sách đang tiếp nhận, khỏi chừa khoảng trống giữa.
            open ? 'mt-2' : 'mt-auto',
            'border-t border-dashed border-neutral-200 pt-1.5',
          ].join(' ')}
        >
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex w-full items-center justify-between gap-1 rounded px-0.5 py-0.5 text-[11px] font-semibold text-neutral-500 hover:bg-white hover:text-neutral-800"
          >
            <span className="truncate">Đã hoàn tất · {completed.length}</span>
            <span aria-hidden className="text-[9px]">{open ? '▲' : '▼'}</span>
          </button>
          {open && (
            <>
              <ul className="mt-1.5 flex flex-col gap-1">
                {completed.slice(0, MAX_COMPLETED_INLINE).map((c, i) => (
                  <CompletedRow
                    key={`c-${c.stt ?? i}-${c.name ?? i}`}
                    customer={c}
                    showTradeIn={showTradeIn}
                    onZoom={onZoom}
                    orders={inboxOrders.filter((order) => order.stt === c.stt)}
                  />
                ))}
              </ul>
              {completed.length > MAX_COMPLETED_INLINE && (
                <button
                  type="button"
                  onClick={() => setModal(true)}
                  className="mt-1 w-full rounded border border-neutral-300 bg-white px-1 py-0.5 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  Xem tất cả ({completed.length})
                </button>
              )}
            </>
          )}
        </div>
      )}

      {modal && (
        <CompletedModal
          desk={desk}
          customers={completed}
          showTradeIn={showTradeIn}
          onZoom={onZoom}
          inboxOrders={inboxOrders.filter((order) => order.stt && completed.some((customer) => customer.stt === order.stt))}
          onClose={() => setModal(false)}
        />
      )}
    </section>
  );
}

export default function KhoBoard({
  desks,
  showCompleted = false,
  columns = 8,
  columnWidths = {},
  onColumnResize,
  inboxOrders = [],
  claims = {},
}: {
  desks: DeskKhoState[];
  showCompleted?: boolean;
  /** Số cột của lưới — chọn theo cụm để mọi bàn nằm gọn trong 1 màn. */
  columns?: number;
  columnWidths?: Record<string, number>;
  onColumnResize?: (columnIndex: number, width: number) => void;
  inboxOrders?: WarehouseInboxOrder[];
  claims?: WarehouseOrderClaims;
}) {
  const [zoom, setZoom] = useState<string | null>(null);
  const [details, setDetails] = useState<{ desk: DeskKhoState; customer: KhoCustomer } | null>(null);
  const [orderDetails, setOrderDetails] = useState<WarehouseInboxOrder | null>(null);
  const [resizingIndex, setResizingIndex] = useState<number | null>(null);
  const resizeRef = useRef<{
    columnIndex: number;
    pointerId: number;
    startX: number;
    startWidth: number;
  } | null>(null);

  useEffect(() => {
    if (!onColumnResize) return;
    const handlePointerMove = (event: PointerEvent) => {
      const resize = resizeRef.current;
      if (!resize || event.pointerId !== resize.pointerId) return;
      onColumnResize(resize.columnIndex, resize.startWidth + event.clientX - resize.startX);
    };
    const handlePointerEnd = (event: PointerEvent) => {
      if (resizeRef.current && event.pointerId !== resizeRef.current.pointerId) return;
      resizeRef.current = null;
      setResizingIndex(null);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [onColumnResize]);

  const handleResizeStart = (event: React.PointerEvent<HTMLButtonElement>, columnIndex: number) => {
    if (!onColumnResize) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const column = event.currentTarget.parentElement;
    resizeRef.current = {
      columnIndex,
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: column?.getBoundingClientRect().width ?? columnWidths[String(columnIndex)] ?? 240,
    };
    setResizingIndex(columnIndex);
  };

  const gridTemplateColumns = Array.from({ length: columns }, (_, index) => (
    columnWidths[String(index)] === undefined ? 'minmax(0, 1fr)' : `${columnWidths[String(index)]}px`
  )).join(' ');

  return (
    <>
      <div
        className="grid h-full auto-rows-fr gap-2"
        style={{ gridTemplateColumns }}
      >
        {desks.map((d) => (
          <DeskColumn
            key={d.id}
            desk={d}
            showCompleted={showCompleted}
            onZoom={setZoom}
            onResizeStart={handleResizeStart}
          onDetails={(desk, customer) => setDetails({ desk, customer })}
            inboxOrders={inboxOrders.filter((order) => order.deskId === d.id)}
            claims={claims}
            columnIndex={desks.indexOf(d) % columns}
            resizing={resizingIndex === desks.indexOf(d) % columns}
          />
        ))}
      </div>

      {zoom && (
        <div
          role="dialog"
          aria-label="Ảnh nghiệm thu máy cũ"
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <img src={zoom} alt="Ảnh nghiệm thu máy cũ" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
      {details && (
        <CustomerDetailsModal
          desk={details.desk}
          customer={details.customer}
          orders={inboxOrders.filter((order) => order.deskId === details.desk.id && order.stt === details.customer.stt)}
          claims={claims}
          onInspectOrder={(order) => setOrderDetails(order)}
          onClose={() => setDetails(null)}
        />
      )}
      {orderDetails && <OrderDetailsModal
        order={orderDetails}
        onClose={() => setOrderDetails(null)}
      />}
    </>
  );
}
