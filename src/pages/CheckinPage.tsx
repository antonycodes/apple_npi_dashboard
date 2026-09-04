import { useEffect, useMemo, useState } from 'react';
import AppLogin from '@/components/AppLogin';
import { adminSessionStore, useAdminInfo } from '@/config/adminSession';
import { SITE_BRAND } from '@/config/siteBrand';
import { cellToString } from '@/services/larkMapper';
import type { LarkRecord } from '@/services/larkTypes';
import { submitCheckinRecord } from '@/services/checkinApi';
import { useCheckinData } from '@/hooks/useCheckinData';
import ViewSwitcher from '@/components/ViewSwitcher';

const TOTAL_STTS = 160;
const PAGE_SIZE = 80;
const ORDER_SELECTION_FIELD = 'MĐH_Selection';

function fieldText(record: LarkRecord, ...names: string[]): string {
  for (const name of names) {
    const value = cellToString(record.fields[name]);
    if (value) return value;
  }
  return '';
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

function sttFromRecord(record: LarkRecord): string {
  const value = fieldText(record, 'STT', 'STT_APP', 'STT Input', 'STT_Selection');
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= TOTAL_STTS ? String(number) : '';
}

function formatTime(record: LarkRecord): string {
  const raw = record.fields['Thời gian'];
  const value = typeof raw === 'number' ? raw : Number(cellToString(raw) ?? '');
  if (!Number.isFinite(value) || value <= 0) return '—';
  return new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

function productList(record: LarkRecord): string[] {
  return ['SP 1', 'SP 2', 'SP 3', 'SP 4']
    .map((field) => fieldText(record, field))
    .filter(Boolean);
}

interface OrderPreview {
  name: string;
  products: string[];
  paymentNote: string;
}

function getOrderCode(record: LarkRecord): string {
  return fieldText(record, ORDER_SELECTION_FIELD, 'Mã đơn hàng');
}

function getOrderPhone(record: LarkRecord): string {
  return fieldText(record, 'Số điện thoại_ĐH', 'Số điện thoại_DH', 'SDT');
}

function getCheckinPhone(record: LarkRecord): string {
  return normalizePhone(fieldText(record, 'Số điện thoại', 'SDT', 'Số điện thoại_ĐH'));
}

function getCheckinOrderCode(record: LarkRecord): string {
  return fieldText(record, 'Mã đơn hàng', ORDER_SELECTION_FIELD).trim();
}

function orderPreview(rows: LarkRecord[]): OrderPreview {
  const products = [...new Set(rows.map((row) => fieldText(row, 'Tên sản phẩm')).filter(Boolean))];
  return {
    name: rows.map((row) => fieldText(row, 'Họ và tên khách hàng')).find(Boolean) ?? '',
    products,
    paymentNote: rows.map((row) => fieldText(row, 'Note UDTT')).find(Boolean) ?? '',
  };
}

function ModalFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[94dvh] w-full max-w-[560px] flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <h2 className="text-lg font-black text-neutral-950">{title}</h2>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl text-2xl text-neutral-400 hover:bg-neutral-100" aria-label="Đóng">×</button>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function ReadonlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 px-3 py-2">
      <dt className="text-xs font-bold uppercase tracking-wide text-neutral-400">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-neutral-800">{value || '—'}</dd>
    </div>
  );
}

function CheckinForm({
  stt,
  orders,
  checkin,
  onClose,
  onSubmitted,
}: {
  stt: string;
  orders: LarkRecord[];
  checkin: LarkRecord[];
  onClose: () => void;
  onSubmitted: (stt: string) => void;
}) {
  const [phone, setPhone] = useState('');
  const [orderPhonePreview, setOrderPhonePreview] = useState('');
  const [orderCode, setOrderCode] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderMenuOpen, setOrderMenuOpen] = useState(false);
  const [paymentConfirmation, setPaymentConfirmation] = useState('');
  const [oldDeviceQuantity, setOldDeviceQuantity] = useState('0');
  const [status, setStatus] = useState<'idle' | 'sending'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [serverDuplicateField, setServerDuplicateField] = useState<'phone' | 'orderCode' | null>(null);

  const orderOptions = useMemo(
    () => [...new Set(orders.map(getOrderCode).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi')),
    [orders],
  );
  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    return orderOptions.filter((value) => !query || value.toLowerCase().includes(query)).slice(0, 24);
  }, [orderOptions, orderSearch]);
  const matchingRows = useMemo(() => {
    if (orderCode) return orders.filter((row) => getOrderCode(row) === orderCode);
    const normalized = normalizePhone(phone);
    return normalized ? orders.filter((row) => normalizePhone(fieldText(row, 'SDT')) === normalized) : [];
  }, [orderCode, orders, phone]);
  const preview = useMemo(() => orderPreview(matchingRows), [matchingRows]);
  const hasIdentifier = Boolean(phone.trim() || orderCode);
  const validQuantity = /^\d+$/.test(oldDeviceQuantity.trim());
  const duplicatePhoneFromData = useMemo(() => {
    const normalized = normalizePhone(phone);
    return Boolean(normalized) && checkin.some((record) => getCheckinPhone(record) === normalized);
  }, [checkin, phone]);
  const duplicateOrderFromData = useMemo(() => {
    const candidate = (orderCode || orderSearch).trim();
    return Boolean(candidate) && checkin.some((record) => getCheckinOrderCode(record) === candidate);
  }, [checkin, orderCode, orderSearch]);
  const duplicatePhone = duplicatePhoneFromData || serverDuplicateField === 'phone';
  const duplicateOrder = duplicateOrderFromData || serverDuplicateField === 'orderCode';
  const duplicateIdentifier = duplicatePhone || duplicateOrder;
  const canSubmit = hasIdentifier && validQuantity && !duplicateIdentifier && status !== 'sending';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setStatus('sending');
    setError(null);
    try {
      await submitCheckinRecord({
        stt,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(orderCode ? { orderCode } : {}),
        ...(paymentConfirmation.trim() ? { paymentConfirmation: paymentConfirmation.trim() } : {}),
        oldDeviceQuantity: Number(oldDeviceQuantity),
      });
      onSubmitted(stt);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      setServerDuplicateField(message.includes('Số điện thoại') ? 'phone' : message.includes('Mã đơn hàng') ? 'orderCode' : null);
      setError(message);
      setStatus('idle');
    }
  };

  return (
    <ModalFrame title={`Check-in STT ${stt.padStart(2, '0')}`} onClose={status === 'sending' ? () => undefined : onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
          <span className="text-sm font-bold text-emerald-800">STT khách</span>
          <span className="text-2xl font-black text-emerald-700">{stt.padStart(2, '0')}</span>
        </div>

        <label className="block">
          <span className="text-sm font-bold text-neutral-700">Số điện thoại</span>
          <input
            value={orderCode ? orderPhonePreview : phone}
            onChange={(event) => { setPhone(event.target.value); setOrderPhonePreview(''); setServerDuplicateField(null); setOrderCode(''); setOrderSearch(''); }}
            onFocus={() => setOrderMenuOpen(false)}
            readOnly={Boolean(orderCode)}
            inputMode="tel"
            autoComplete="tel"
            placeholder="Ưu tiên nhập SĐT"
            aria-invalid={duplicatePhone}
            aria-readonly={Boolean(orderCode)}
            className={`mt-1 min-h-12 w-full rounded-xl border px-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 ${orderCode ? 'cursor-default bg-neutral-50 text-neutral-400' : ''} ${duplicatePhone ? 'border-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.18),0_0_18px_rgba(239,68,68,0.3)]' : 'border-neutral-300'}`}
          />
          {orderCode && <span className="mt-1 block text-xs text-neutral-400">SĐT từ mã đơn — chỉ để đối chiếu</span>}
        </label>

        <div className="relative">
          <label className="block">
            <span className="text-sm font-bold text-neutral-700">Mã đơn hàng <span className="font-normal text-neutral-400">(nếu không có SĐT)</span></span>
            <input
              value={orderSearch}
              onChange={(event) => { setOrderSearch(event.target.value); setServerDuplicateField(null); setOrderCode(''); setPhone(''); setOrderMenuOpen(true); }}
              onFocus={() => setOrderMenuOpen(true)}
              role="combobox"
              aria-expanded={orderMenuOpen}
              aria-controls="checkin-order-options"
              aria-invalid={duplicateOrder}
              placeholder="Tìm trong MĐH_Selection…"
              className={`mt-1 min-h-12 w-full rounded-xl border px-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 ${duplicateOrder ? 'border-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.18),0_0_18px_rgba(239,68,68,0.3)]' : 'border-neutral-300'}`}
            />
          </label>
          {orderMenuOpen && (
            <div id="checkin-order-options" className="absolute left-0 right-0 top-full z-10 mt-1 max-h-52 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1 shadow-xl" role="listbox">
              {filteredOrders.length ? filteredOrders.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    const orderPhone = orders
                      .filter((row) => getOrderCode(row) === value)
                      .map(getOrderPhone)
                      .find(Boolean) ?? '';
                    setOrderCode(value);
                    setOrderSearch(value);
                    setServerDuplicateField(null);
                    setPhone('');
                    setOrderPhonePreview(orderPhone);
                    setOrderMenuOpen(false);
                  }}
                  className="block min-h-11 w-full rounded-lg px-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
                  role="option"
                >
                  {value}
                </button>
              )) : <p className="px-3 py-3 text-sm text-neutral-500">Không tìm thấy mã đơn hàng.</p>}
            </div>
          )}
        </div>

        {duplicateIdentifier && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-black text-red-700 shadow-[0_0_18px_rgba(239,68,68,0.18)]">
            ⚠ Đã check-in — {duplicatePhone ? 'Số điện thoại này' : 'Mã đơn hàng này'} đã có trong hệ thống.
          </p>
        )}

        {(phone.trim() || orderCode) && (
          <dl className="grid gap-2 sm:grid-cols-2">
            <ReadonlyValue label="Họ và tên" value={preview.name} />
            <ReadonlyValue label="Ghi chú ưu đãi" value={preview.paymentNote} />
            <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
              {[0, 1, 2, 3].map((index) => (
                <ReadonlyValue key={index} label={`Sản phẩm ${String(index + 1).padStart(2, '0')}`} value={preview.products[index] ?? '—'} />
              ))}
            </div>
          </dl>
        )}

        <label className="block">
          <span className="text-sm font-bold text-neutral-700">Xác nhận ưu đãi thanh toán</span>
          <span className="mt-1 block text-xs text-neutral-500">Nhập ghi chú số đuôi thẻ hoặc tên ngân hàng nếu có.</span>
          <input value={paymentConfirmation} onChange={(event) => setPaymentConfirmation(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-neutral-300 px-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-neutral-700">Số lượng thu cũ</span>
          <span className="mt-1 block text-xs text-neutral-500">Không thu cũ thì nhập 0.</span>
          <input value={oldDeviceQuantity} onChange={(event) => setOldDeviceQuantity(event.target.value.replace(/\D/g, ''))} inputMode="numeric" min="0" step="1" className="mt-2 min-h-12 w-full rounded-xl border border-neutral-300 px-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
        </label>

        {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
        <button type="submit" disabled={!canSubmit} className="min-h-12 w-full rounded-xl bg-brand text-base font-bold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40">
          {status === 'sending' ? 'Đang ghi vào Lark…' : 'Xác nhận Check-in'}
        </button>
      </form>
    </ModalFrame>
  );
}

function CheckinDetail({ record, stt, onClose }: { record: LarkRecord; stt: string; onClose: () => void }) {
  const products = productList(record);
  return (
    <ModalFrame title={`Đã check-in STT ${stt.padStart(2, '0')}`} onClose={onClose}>
      <dl className="grid gap-2 sm:grid-cols-2">
        <ReadonlyValue label="STT khách" value={stt.padStart(2, '0')} />
        <ReadonlyValue label="Thời gian" value={formatTime(record)} />
        <ReadonlyValue label="Họ và tên" value={fieldText(record, 'Họ và tên', 'Họ và tên khách lẻ')} />
        <ReadonlyValue label="Số điện thoại" value={fieldText(record, 'Số điện thoại', 'SDT')} />
        <ReadonlyValue label="Mã đơn hàng" value={fieldText(record, 'Mã đơn hàng', ORDER_SELECTION_FIELD)} />
        <ReadonlyValue label="Số lượng thu cũ" value={fieldText(record, 'Số lượng thu cũ')} />
        <ReadonlyValue label="Ưu đãi thanh toán" value={fieldText(record, 'Check UD Thanh toán', 'Note UDTT')} />
        <div className="rounded-xl bg-neutral-50 px-3 py-2 sm:col-span-2">
          <dt className="text-xs font-bold uppercase tracking-wide text-neutral-400">Sản phẩm</dt>
          <dd className="mt-1 space-y-1 text-sm font-semibold text-neutral-800">{products.length ? products.map((product) => <div key={product}>{product}</div>) : '—'}</dd>
        </div>
      </dl>
    </ModalFrame>
  );
}

function AccessDenied() {
  return (
    <div className="flex min-h-full items-center justify-center bg-[#f5f5f7] p-5">
      <div className="w-full max-w-[430px] rounded-2xl bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-black text-neutral-950">Không có quyền Check-in</h1>
        <p className="mt-2 text-sm text-neutral-500">Hãy đăng xuất và dùng tài khoản checkin.</p>
        <button type="button" onClick={() => adminSessionStore.clear()} className="mt-5 min-h-11 rounded-xl bg-neutral-950 px-5 text-sm font-bold text-white">Đăng xuất</button>
      </div>
    </div>
  );
}

function CheckinBoard() {
  const { checkin, orders, loading, error, lastUpdated, refresh } = useCheckinData();
  const [page, setPage] = useState(0);
  const [formStt, setFormStt] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ stt: string; record: LarkRecord } | null>(null);
  const [confirmedStts, setConfirmedStts] = useState<Set<string>>(() => new Set());

  const recordsByStt = useMemo(() => {
    const map = new Map<string, LarkRecord>();
    for (const record of checkin) {
      const stt = sttFromRecord(record);
      if (stt) map.set(stt, record);
    }
    return map;
  }, [checkin]);
  const checkedStts = useMemo(() => new Set([...recordsByStt.keys(), ...confirmedStts]), [confirmedStts, recordsByStt]);
  const numbers = useMemo(
    () => Array.from({ length: PAGE_SIZE }, (_, index) => page * PAGE_SIZE + index + 1),
    [page],
  );

  const handleClick = (stt: string) => {
    if (checkedStts.has(stt)) {
      const record = recordsByStt.get(stt);
      if (record) setDetail({ stt, record });
      return;
    }
    setFormStt(stt);
  };

  return (
    <div className="min-h-full bg-[#f5f5f7] text-neutral-800">
      <header className="border-b border-neutral-200 bg-white px-4 py-3 md:px-6 md:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/cellphones-logo.png" alt="CellphoneS" className="h-7 w-auto md:h-8" />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black md:text-xl">{SITE_BRAND} · Check-in</h1>
              <p className="text-xs font-semibold text-neutral-500">Chọn STT để mở form khách hàng</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <ViewSwitcher active="checkin" />
            <button type="button" onClick={() => adminSessionStore.clear()} className="min-h-9 rounded-lg border border-red-200 px-3 py-2 font-bold text-red-600 hover:bg-red-50">Đăng xuất</button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] px-4 py-4 md:px-6 md:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-neutral-950">Danh sách STT</h2>
            <p className="mt-1 text-sm text-neutral-500">Trang {page + 1}/2 · {checkedStts.size}/{TOTAL_STTS} STT đã check-in</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="rounded-full bg-emerald-100 px-3 py-2 text-emerald-700">● Chưa check-in</span>
            <span className="rounded-full bg-red-100 px-3 py-2 text-red-700">● Đã check-in</span>
            <button type="button" onClick={refresh} className="min-h-9 rounded-lg border border-neutral-300 bg-white px-3 text-neutral-600 hover:bg-neutral-50">Làm mới</button>
          </div>
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm">
          <span className="text-neutral-500">{loading ? 'Đang tải dữ liệu…' : lastUpdated ? `Cập nhật ${lastUpdated.toLocaleTimeString('vi-VN')}` : 'Chưa có dữ liệu'}</span>
          <div className="flex gap-1 rounded-lg bg-neutral-100 p-1" role="tablist" aria-label="Trang STT">
            {[0, 1].map((value) => (
              <button key={value} type="button" role="tab" aria-selected={page === value} onClick={() => setPage(value)} className={`min-h-9 rounded-md px-4 text-xs font-black ${page === value ? 'bg-white text-brand shadow-sm' : 'text-neutral-500'}`}>
                {value === 0 ? '01–80' : '81–160'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8 lg:grid-cols-10 xl:grid-cols-[repeat(16,minmax(0,1fr))]">
          {numbers.map((number) => {
            const stt = String(number);
            const checked = checkedStts.has(stt);
            return (
              <button
                key={stt}
                type="button"
                aria-label={`STT ${stt.padStart(2, '0')} — ${checked ? 'đã check-in' : 'chưa check-in'}`}
                aria-pressed={checked}
                onClick={() => handleClick(stt)}
                className={`aspect-square min-h-12 rounded-xl text-lg font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 sm:min-h-14 sm:text-xl ${checked ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
              >
                {stt.padStart(2, '0')}
              </button>
            );
          })}
        </div>
      </main>

      {formStt && <CheckinForm stt={formStt} orders={orders} checkin={checkin} onClose={() => setFormStt(null)} onSubmitted={(stt) => { setConfirmedStts((current) => new Set(current).add(stt)); setFormStt(null); refresh(); }} />}
      {detail && <CheckinDetail stt={detail.stt} record={detail.record} onClose={() => setDetail(null)} />}
    </div>
  );
}

export default function CheckinPage() {
  const session = useAdminInfo();
  if (!session) return <AppLogin fixedUsername="checkin" title={`${SITE_BRAND} · Check-in`} subtitle="Đăng nhập khu vực tiếp nhận khách" />;
  if (session.role !== 'checkin' && session.role !== 'admin') return <AccessDenied />;
  return <CheckinBoard />;
}
