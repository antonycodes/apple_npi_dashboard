import { useEffect, useMemo, useState } from 'react';
import type { DeskKhoState, KhoCustomer } from '@/services/khoMapper';
import type { WarehouseInboxOrder, WarehouseOrderClaim, WarehouseOrderClaims } from '@/types/warehouse';

function claimKey(orderCode: string) {
  return orderCode.trim().toUpperCase();
}

function CustomerOrders({
  customer,
  claims,
  onClaim,
  onClaimAll,
  claiming,
  claimedBy,
  inboxOrders,
  onInspect,
}: {
  customer: KhoCustomer;
  claims: WarehouseOrderClaims;
  onClaim: (claim: Omit<WarehouseOrderClaim, 'claimedAt'>) => Promise<boolean>;
  onClaimAll: (claims: Array<Omit<WarehouseOrderClaim, 'claimedAt'>>) => Promise<boolean>;
  claiming: string | null;
  claimedBy: string;
  inboxOrders: WarehouseInboxOrder[];
  onInspect: (order: WarehouseInboxOrder) => void;
}) {
  const products = customer.productOrders?.length
    ? customer.productOrders
    : customer.productName
      ? [{ label: 'SP1', product: customer.productName, orderCode: null }]
      : [];
  if (!products.length) return <p className="px-3 py-2 text-xs text-neutral-400">Chưa có sản phẩm.</p>;
  const sentOrders = inboxOrders.filter((order) => order.stt === customer.stt);
  const orders = [
    ...products.filter((item) => item.orderCode).map((item) => ({
      orderCode: item.orderCode!, stt: customer.stt, productLabel: item.label, product: item.product, claimedBy,
    })),
    ...sentOrders.map((order) => ({
      orderCode: order.orderCode, stt: customer.stt, productLabel: 'ORDER', product: 'Order từ Tư vấn', claimedBy,
    })),
  ];
  const allKey = `all-${customer.stt || 'customer'}`;
  const allClaimed = orders.length > 2 && orders.every((item) => claims[claimKey(item.orderCode!)]);

  return (
    <div className="space-y-1 px-2 pb-2">
      {orders.length > 2 && (
        <button
          type="button"
          disabled={claiming === allKey || allClaimed}
          onClick={() => void onClaimAll(orders)}
          className="mb-1 w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-xs font-black text-red-700 disabled:opacity-60"
        >{allClaimed ? '✓ Đã tiếp nhận tất cả' : claiming === allKey ? 'Đang tiếp nhận tất cả…' : `Tiếp nhận tất cả (${orders.length} đơn)`}</button>
      )}
      {products.map((item) => {
        const key = item.orderCode ? claimKey(item.orderCode) : '';
        const current = key ? claims[key] : undefined;
        const busy = claiming === key;
        return (
          <div key={`${item.label}-${item.orderCode || item.product}`} className={['flex items-center gap-2 rounded-lg border px-2 py-2', current ? 'border-red-300 bg-red-50' : 'border-neutral-200 bg-white'].join(' ')}>
            <span className={['shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black', current ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'].join(' ')}>{item.label}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-neutral-800">{item.product || '—'}</p>
              <p className="truncate text-[10px] text-neutral-500">Mã đơn: {item.orderCode || 'Chưa có mã'}</p>
            </div>
            {key && (
              current ? (
                <span className="shrink-0 rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold text-red-700" title={`Đã khóa bởi ${current.claimedBy}`}>
                  Đã nhận · {current.claimedBy}
                </span>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onClaim({ orderCode: item.orderCode!, stt: customer.stt, productLabel: item.label, product: item.product, claimedBy })}
                  className="shrink-0 rounded-lg bg-brand px-2 py-1.5 text-[10px] font-bold text-white disabled:opacity-50"
                >{busy ? 'Đang nhận…' : 'Tiếp nhận'}</button>
              )
            )}
          </div>
        );
      })}
      {sentOrders.map((order) => {
        const key = claimKey(order.orderCode);
        const current = claims[key];
        const busy = claiming === key;
        return (
          <div key={order.id} className={['flex items-center gap-2 rounded-lg border px-2 py-2', current ? 'border-red-300 bg-red-50' : 'border-amber-200 bg-amber-50'].join(' ')}>
            <span className="shrink-0 text-base" aria-label="Có order">📦</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-neutral-800">Order từ Tư vấn · {order.orderCode}</p>
              <p className="text-[10px] text-neutral-500">Gửi bởi {order.sentBy}</p>
            </div>
            <button type="button" onClick={() => onInspect(order)} className="shrink-0 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-[10px] font-bold text-neutral-700">Xem</button>
            {current ? (
              <span className="shrink-0 rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold text-red-700">Đã khóa</span>
            ) : (
              <button type="button" disabled={busy} onClick={() => void onClaim({ orderCode: order.orderCode, stt: customer.stt, productLabel: 'ORDER', product: 'Order từ Tư vấn', claimedBy })} className="shrink-0 rounded-lg bg-brand px-2 py-1.5 text-[10px] font-bold text-white disabled:opacity-50">{busy ? 'Đang nhận…' : 'Tiếp nhận'}</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function KhoOrderView({
  desks,
  claims,
  onClaim,
  onClaimAll,
  claimedBy,
  inboxOrders,
}: {
  desks: DeskKhoState[];
  claims: WarehouseOrderClaims;
  onClaim: (claim: Omit<WarehouseOrderClaim, 'claimedAt'>) => Promise<boolean>;
  onClaimAll: (claims: Array<Omit<WarehouseOrderClaim, 'claimedAt'>>) => Promise<boolean>;
  claimedBy: string;
  inboxOrders: WarehouseInboxOrder[];
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [claiming, setClaiming] = useState<string | null>(null);
  const [inspectOrder, setInspectOrder] = useState<WarehouseInboxOrder | null>(null);
  const occupied = useMemo(() => desks.filter((desk) => desk.customers.length > 0), [desks]);

  useEffect(() => {
    setCollapsed((current) => Object.fromEntries(occupied.map((desk) => [
      desk.id,
      current[desk.id] ?? !desk.customers.some((customer) => customer.status === 'received'),
    ])));
  }, [occupied]);

  const handleClaim = async (claim: Omit<WarehouseOrderClaim, 'claimedAt'>) => {
    const key = claimKey(claim.orderCode);
    setClaiming(key);
    try { return await onClaim(claim); } finally { setClaiming(null); }
  };
  const handleClaimAll = async (claimsToClaim: Array<Omit<WarehouseOrderClaim, 'claimedAt'>>) => {
    const key = `all-${claimsToClaim[0]?.stt || 'customer'}`;
    setClaiming(key);
    try { return await onClaimAll(claimsToClaim); } finally { setClaiming(null); }
  };

  if (!occupied.length) return <div className="p-6 text-center text-sm text-neutral-500">Chưa có bàn nào đang có khách.</div>;

  return (
    <div className="space-y-2 p-2">
      {occupied.map((desk) => {
        const active = desk.customers.filter((customer) => customer.status === 'received');
        const isCollapsed = collapsed[desk.id] ?? false;
        return (
          <section key={desk.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 shadow-sm">
            <button type="button" onClick={() => setCollapsed((current) => ({ ...current, [desk.id]: !isCollapsed }))} className="flex min-h-14 w-full items-center gap-2 px-3 text-left">
              <span className="text-base font-black text-neutral-900">{desk.label}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-neutral-500">{desk.staffName || 'Chưa có tên NV'}</span>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-neutral-600">{active.length} đang phục vụ</span>
              <span className="text-lg text-neutral-400" aria-hidden="true">{isCollapsed ? '+' : '−'}</span>
            </button>
            {!isCollapsed && desk.customers.map((customer) => (
              <div key={`${desk.id}-${customer.stt}-${customer.status}`} className="border-t border-neutral-200 px-2 pt-2">
                <div className="flex items-center gap-2 px-1 pb-1">
                  <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-black text-orange-700">STT {customer.stt || '—'}</span>
                  <span className="truncate text-xs font-semibold text-neutral-700">{customer.name || 'Khách'}</span>
                  {customer.status === 'completed' && <span className="ml-auto text-[10px] font-semibold text-neutral-400">Đã hoàn tất</span>}
                </div>
                <CustomerOrders customer={customer} claims={claims} onClaim={handleClaim} onClaimAll={handleClaimAll} claiming={claiming} claimedBy={claimedBy} inboxOrders={inboxOrders.filter((order) => order.deskId === desk.id)} onInspect={setInspectOrder} />
              </div>
            ))}
          </section>
        );
      })}
      {inspectOrder && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setInspectOrder(null)}>
          <div className="w-full max-w-[430px] rounded-2xl bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-black text-neutral-900">📦 {inspectOrder.orderCode}</h2>
              <button type="button" onClick={() => setInspectOrder(null)} className="text-2xl text-neutral-400" aria-label="Đóng">×</button>
            </div>
            <p className="mt-1 text-xs text-neutral-500">STT {inspectOrder.stt || '—'} · {inspectOrder.customerName || 'Khách'} · Gửi bởi {inspectOrder.sentBy}</p>
            <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-neutral-50 p-3 text-sm text-neutral-800">{inspectOrder.rawText}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
