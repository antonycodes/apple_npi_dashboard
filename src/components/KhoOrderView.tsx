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
  onInspect: (orders: OrderPreview[]) => void;
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
          <button key={item.id} type="button" onClick={() => onInspect(previews)} className={['flex w-full items-center gap-2 rounded-lg border px-2 py-2 text-left', current ? 'border-red-300 bg-red-50' : 'border-emerald-300 bg-emerald-50'].join(' ')}>
            {item.productLabel === 'ORDER' ? <span className="shrink-0 text-base" aria-label="Có order">📦</span> : <span className={['shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black', current ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'].join(' ')}>{item.productLabel}</span>}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-neutral-800">{item.productLabel === 'ORDER' ? 'Nội dung Order' : item.product || '—'}</p>
              <p className="truncate text-[10px] text-neutral-500">Mã đơn: {item.orderCode}</p>
            </div>
            {current && <span className="shrink-0 rounded-lg bg-red-100 px-2 py-1.5 text-[10px] font-bold text-red-700">Đã khóa</span>}
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
  const [inspectOrders, setInspectOrders] = useState<OrderPreview[] | null>(null);
  const occupied = useMemo(() => desks.filter((desk) => desk.customers.length > 0), [desks]);

  useEffect(() => {
    setCollapsed((current) => Object.fromEntries(occupied.map((desk) => [
      desk.id,
      current[desk.id] ?? !desk.customers.some((customer) => customer.status === 'received'),
    ])));
  }, [occupied]);

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
                <CustomerOrders customer={customer} claims={claims} inboxOrders={inboxOrders.filter((order) => order.deskId === desk.id)} onInspect={setInspectOrders} />
              </div>
            ))}
          </section>
        );
      })}
      {inspectOrders && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setInspectOrders(null)}>
          <div className="w-full max-w-[430px] rounded-2xl bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-black text-neutral-900">📦 {new Set(inspectOrders.filter((item) => item.productLabel !== 'ORDER').map((item) => item.orderCode)).size ? `${new Set(inspectOrders.filter((item) => item.productLabel !== 'ORDER').map((item) => item.orderCode)).size} Đơn hàng` : 'Nội dung Order'}</h2>
              <button type="button" onClick={() => setInspectOrders(null)} className="text-2xl text-neutral-400" aria-label="Đóng">×</button>
            </div>
            <div className="mt-3 max-h-72 space-y-2 overflow-auto">
              {inspectOrders.map((order) => (
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
              const productItems = inspectOrders.filter((item) => item.productLabel !== 'ORDER');
              const inboxItems = inspectOrders.filter((item) => item.productLabel === 'ORDER');
              const productClaims = Array.from(new Map(productItems.map((item) => [claimKey(item.orderCode), item])).values()).map((item) => ({ orderCode: item.orderCode, stt: item.stt, productLabel: item.productLabel, product: item.product, claimedBy }));
              const allProductsClaimed = productClaims.length > 1 && productClaims.every((item) => claims[claimKey(item.orderCode)]);
              const productKey = `popup-products-${productClaims.map((item) => item.orderCode).join('|')}`;
              const productBusy = claiming === productKey;
              const inboxUnclaimed = inboxItems.filter((item) => !claims[claimKey(item.orderCode)]);
              const productClaimed = productClaims.length === 1 && Boolean(claims[claimKey(productClaims[0].orderCode)]);
              const claimInbox = async (item: OrderPreview) => {
                const inboxKey = `popup-inbox-${item.orderCode}`;
                setClaiming(inboxKey);
                try {
                  const won = await onClaim({ orderCode: item.orderCode, stt: item.stt, productLabel: 'ORDER', product: 'Order từ Tư vấn', claimedBy });
                  if (won && inboxUnclaimed.length === 1 && !productClaims.some((product) => !claims[claimKey(product.orderCode)])) setInspectOrders(null);
                } finally {
                  setClaiming(null);
                }
              };
              if (!productClaims.length && !inboxUnclaimed.length) return <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">Đã khóa toàn bộ mã đơn.</p>;
              const claimProducts = async () => {
                setClaiming(productKey);
                try {
                  const won = productClaims.length > 1
                    ? await onClaimAll(productClaims)
                    : productClaims[0]
                      ? await onClaim(productClaims[0])
                      : false;
                  if (won && !inboxUnclaimed.length) setInspectOrders(null);
                } finally {
                  setClaiming(null);
                }
              };
              const productButton = productClaims.length ? (
                <button
                  type="button"
                  disabled={productBusy || allProductsClaimed || productClaimed}
                  onClick={() => void claimProducts()}
                  className="mt-3 min-h-12 w-full rounded-xl bg-brand px-3 py-2 text-sm font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-500"
                >
                  {allProductsClaimed || productClaimed ? '✓ Đã khóa mã đơn' : productBusy ? 'Đang tiếp nhận…' : productClaims.length > 1 ? `Tiếp nhận tất cả (${productClaims.length} đơn)` : 'Tiếp nhận'}
                </button>
              ) : null;
              const inboxButtons = inboxUnclaimed.map((item) => {
                const inboxKey = `popup-inbox-${item.orderCode}`;
                const inboxBusy = claiming === inboxKey;
                return <button key={item.id} type="button" disabled={inboxBusy} onClick={() => void claimInbox(item)} className="mt-3 min-h-12 w-full rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800 disabled:opacity-50">{inboxBusy ? 'Đang tiếp nhận…' : 'Tiếp nhận Order'}</button>;
              });
              return <>{productButton}{inboxButtons}</>;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
