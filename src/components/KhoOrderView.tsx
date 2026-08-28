import { useEffect, useMemo, useState } from 'react';
import type { DeskKhoState, KhoCustomer } from '@/services/khoMapper';
import type { WarehouseInboxOrder, WarehouseOrderClaim, WarehouseOrderClaims } from '@/types/warehouse';

function claimKey(orderCode: string) {
  return orderCode.trim().toUpperCase();
}

type OrderPreview = WarehouseInboxOrder & {
  productLabel: string;
  product: string;
};

function CustomerOrders({
  customer,
  claims,
  inboxOrders,
  onInspect,
}: {
  customer: KhoCustomer;
  claims: WarehouseOrderClaims;
  inboxOrders: WarehouseInboxOrder[];
  onInspect: (orders: OrderPreview[], selectedId: string) => void;
}) {
  const products = customer.productOrders?.length
    ? customer.productOrders
    : customer.productName
      ? [{ label: 'SP1', product: customer.productName, orderCode: null }]
      : [];
  const sentOrders = inboxOrders.filter((order) => order.stt === customer.stt);
  const productOrders = products.filter((item) => item.orderCode).map((item) => ({
    id: `product-${item.orderCode}`,
    orderCode: item.orderCode!,
    rawText: item.product,
    deskId: '',
    stt: customer.stt,
    customerName: customer.name,
    sentBy: '',
    createdAt: 0,
    productLabel: item.label,
    product: item.product,
  } satisfies OrderPreview));
  const previews: OrderPreview[] = [
    ...productOrders,
    ...sentOrders.map((order) => ({ ...order, productLabel: 'ORDER', product: order.rawText })),
  ];
  if (!products.length && !sentOrders.length) return <p className="px-3 py-2 text-xs text-neutral-400">Chưa có sản phẩm.</p>;

  return (
    <div className="space-y-1 px-2 pb-2">
      {previews.map((item) => {
        const current = claims[claimKey(item.orderCode)];
        return (
          <button key={item.id} type="button" onClick={() => onInspect(previews, item.id)} className={['flex w-full items-center gap-2 rounded-lg border px-2 py-2 text-left', current ? 'border-red-300 bg-red-50' : 'border-emerald-300 bg-emerald-50'].join(' ')}>
            {item.productLabel === 'ORDER' ? <span className="shrink-0 text-base" aria-label="Có order">📦</span> : <span className={['shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black', current ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'].join(' ')}>{item.productLabel}</span>}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-neutral-800">{item.productLabel === 'ORDER' ? 'Nội dung Order' : item.product || '—'}</p>
              <p className="truncate text-[10px] text-neutral-500">Mã đơn: {item.orderCode}</p>
            </div>
            {current && <span className="shrink-0 rounded-lg bg-red-100 px-2 py-1.5 text-[10px] font-bold text-red-700">Đã nhận</span>}
          </button>
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
  claimedDesk,
  claimedName,
  claimedMsnv,
  inboxOrders,
}: {
  desks: DeskKhoState[];
  claims: WarehouseOrderClaims;
  onClaim: (claim: Omit<WarehouseOrderClaim, 'claimedAt'>) => Promise<boolean>;
  onClaimAll: (claims: Array<Omit<WarehouseOrderClaim, 'claimedAt'>>) => Promise<boolean>;
  claimedBy: string;
  claimedDesk?: string;
  claimedName?: string;
  claimedMsnv?: string;
  inboxOrders: WarehouseInboxOrder[];
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [completedCollapsed, setCompletedCollapsed] = useState<Record<string, boolean>>({});
  const [claiming, setClaiming] = useState<string | null>(null);
  const [inspectOrders, setInspectOrders] = useState<{ orders: OrderPreview[]; selectedId: string } | null>(null);
  const occupied = useMemo(() => desks.filter((desk) => desk.customers.length > 0), [desks]);

  useEffect(() => {
    setCollapsed((current) => Object.fromEntries(occupied.map((desk) => [
      desk.id,
      current[desk.id] ?? !desk.customers.some((customer) => customer.status === 'received'),
    ])));
  }, [occupied]);

  useEffect(() => {
    setCompletedCollapsed((current) => Object.fromEntries(occupied.map((desk) => [
      desk.id,
      current[desk.id] ?? true,
    ])));
  }, [occupied]);

  if (!occupied.length) return <div className="p-6 text-center text-sm text-neutral-500">Chưa có bàn nào đang có khách.</div>;

  return (
    <div className="space-y-2 p-2">
      {occupied.map((desk) => {
        const active = desk.customers.filter((customer) => customer.status === 'received');
        const completed = desk.customers.filter((customer) => customer.status === 'completed');
        const isCollapsed = collapsed[desk.id] ?? false;
        const isCompletedCollapsed = completedCollapsed[desk.id] ?? true;
        return (
          <section key={desk.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 shadow-sm">
            <button type="button" onClick={() => setCollapsed((current) => ({ ...current, [desk.id]: !isCollapsed }))} className="flex min-h-14 w-full items-center gap-2 px-3 text-left">
              <span className="text-base font-black text-neutral-900">{desk.label}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-neutral-500">{desk.staffName || 'Chưa có tên NV'}</span>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-neutral-600">{active.length} đang phục vụ</span>
              <span className="text-lg text-neutral-400" aria-hidden="true">{isCollapsed ? '+' : '−'}</span>
            </button>
            {!isCollapsed && active.map((customer) => (
              <div key={`${desk.id}-${customer.stt}-active`} className="border-t border-neutral-200 px-2 pt-2">
                <div className="flex items-center gap-2 px-1 pb-1">
                  <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-black text-orange-700">STT {customer.stt || '—'}</span>
                  <span className="truncate text-xs font-semibold text-neutral-700">{customer.name || 'Khách'}</span>
                </div>
                <CustomerOrders
                  customer={customer}
                  claims={claims}
                  inboxOrders={inboxOrders.filter((order) => order.deskId === desk.id)}
                  onInspect={(orders, selectedId) => setInspectOrders({ orders, selectedId })}
                />
              </div>
            ))}
            {!isCollapsed && completed.length > 0 && (
              <div className="border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setCompletedCollapsed((current) => ({ ...current, [desk.id]: !isCompletedCollapsed }))}
                  aria-expanded={!isCompletedCollapsed}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-neutral-500"
                >
                  <span>Đã hoàn tất · {completed.length}</span>
                  <span aria-hidden="true">{isCompletedCollapsed ? '+' : '−'}</span>
                </button>
                {!isCompletedCollapsed && completed.map((customer) => (
                  <div key={`${desk.id}-${customer.stt}-completed`} className="border-t border-neutral-100 px-2 pt-2 opacity-75">
                    <div className="flex items-center gap-2 px-1 pb-1">
                      <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-black text-neutral-500">STT {customer.stt || '—'}</span>
                      <span className="truncate text-xs font-semibold text-neutral-500">{customer.name || 'Khách'}</span>
                    </div>
                    <CustomerOrders
                      customer={customer}
                      claims={claims}
                      inboxOrders={inboxOrders.filter((order) => order.deskId === desk.id)}
                      onInspect={(orders, selectedId) => setInspectOrders({ orders, selectedId })}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
      {inspectOrders && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setInspectOrders(null)}>
          <div className="w-full max-w-[430px] rounded-2xl bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-black text-neutral-900">📦 {new Set(inspectOrders.orders.filter((item) => item.productLabel !== 'ORDER').map((item) => item.orderCode)).size ? `${new Set(inspectOrders.orders.filter((item) => item.productLabel !== 'ORDER').map((item) => item.orderCode)).size} Đơn hàng` : 'Nội dung Order'}</h2>
              <button type="button" onClick={() => setInspectOrders(null)} className="text-2xl text-neutral-400" aria-label="Đóng">×</button>
            </div>
            <div className="mt-3 max-h-72 space-y-2 overflow-auto">
              {inspectOrders.orders.map((order) => (
                <div key={order.id} className="rounded-xl bg-neutral-50 p-3">
                  {order.productLabel === 'ORDER' ? (
                    <>
                      <p className="text-sm font-bold text-neutral-900">Nội dung Order</p>
                      <p className="mt-1 text-xs font-semibold text-neutral-500">Mã đơn: {order.orderCode}</p>
                      <pre className="mt-2 whitespace-pre-wrap text-xs text-neutral-800">{order.rawText}</pre>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-neutral-900">{order.orderCode}</p>
                      <p className="mt-2 whitespace-pre-wrap text-xs text-neutral-800">{order.product}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
            {(() => {
              const productItems = inspectOrders.orders.filter((item) => item.productLabel !== 'ORDER');
              const inboxItems = inspectOrders.orders.filter((item) => item.productLabel === 'ORDER');
              const selected = inspectOrders.orders.find((item) => item.id === inspectOrders.selectedId) ?? inspectOrders.orders[0];
              const productClaims = Array.from(new Map(productItems.map((item) => [claimKey(item.orderCode), item])).values()).map((item) => ({ orderCode: item.orderCode, stt: item.stt, productLabel: item.productLabel, product: item.product, claimedBy, claimedDesk, claimedName, claimedMsnv }));
              const productKey = `popup-products-${productClaims.map((item) => item.orderCode).join('|')}`;
              const productBusy = claiming === productKey;
              const inboxUnclaimed = inboxItems.filter((item) => !claims[claimKey(item.orderCode)]);
              const selectedClaim = selected && claims[claimKey(selected.orderCode)];
              const selectedKey = selected
                ? selected.productLabel === 'ORDER'
                  ? `popup-inbox-${selected.orderCode}`
                  : `popup-selected-${selected.id}`
                : null;
              const selectedBusy = selectedKey !== null && claiming === selectedKey;
              const claimSelected = async () => {
                if (!selected || selectedClaim) return;
                setClaiming(selectedKey);
                try {
                  await onClaim({ orderCode: selected.orderCode, stt: selected.stt, productLabel: selected.productLabel, product: selected.product, claimedBy, claimedDesk, claimedName, claimedMsnv });
                } finally {
                  setClaiming(null);
                }
              };
              const claimInbox = async (item: OrderPreview) => {
                const inboxKey = `popup-inbox-${item.orderCode}`;
                setClaiming(inboxKey);
                try {
                  const won = await onClaim({ orderCode: item.orderCode, stt: item.stt, productLabel: 'ORDER', product: 'Order từ Tư vấn', claimedBy, claimedDesk, claimedName, claimedMsnv });
                  if (won) setInspectOrders(null);
                } finally {
                  setClaiming(null);
                }
              };
              const allUnclaimed = [
                ...productClaims.filter((item) => !claims[claimKey(item.orderCode)]),
                ...inboxUnclaimed.map((item) => ({ orderCode: item.orderCode, stt: item.stt, productLabel: 'ORDER', product: 'Order từ Tư vấn', claimedBy, claimedDesk, claimedName, claimedMsnv })),
              ];
              if (!allUnclaimed.length) return <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">Đã khóa toàn bộ mã đơn.</p>;
              const claimAll = async () => {
                setClaiming(productKey);
                try {
                  await onClaimAll(allUnclaimed);
                } finally {
                  setClaiming(null);
                }
              };
              const selectedButton = selected && !selectedClaim ? (
                <button
                  type="button"
                  disabled={selectedBusy}
                  onClick={() => void (selected.productLabel === 'ORDER' ? claimInbox(selected) : claimSelected())}
                  className="mt-3 min-h-12 w-full rounded-xl bg-brand px-3 py-2 text-sm font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-500"
                >
                  {selectedBusy ? 'Đang tiếp nhận…' : `Tiếp nhận ${selected.productLabel === 'ORDER' ? 'Order' : selected.productLabel}`}
                </button>
              ) : null;
              const allButton = allUnclaimed.length > 1 ? (
                <button
                  type="button"
                  disabled={productBusy}
                  onClick={() => void claimAll()}
                  className="mt-3 min-h-12 w-full rounded-xl bg-brand px-3 py-2 text-sm font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-500"
                >
                  {productBusy ? 'Đang tiếp nhận…' : `Tiếp nhận tất cả (${allUnclaimed.length} đơn)`}
                </button>
              ) : null;
              return <>{selectedButton}{allButton}</>;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
