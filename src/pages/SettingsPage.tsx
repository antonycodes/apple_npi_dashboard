function SharedSettingsPush({ settings, dirty }: { settings: LarkSettings; dirty: boolean }) {
  const session = useAdminInfo();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const push = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await pushSharedSettings(toSharedSettings(settings));
      setMessage('Đã đồng bộ cấu hình toàn thiết bị. Máy NV sẽ áp dụng tối đa trong 5 giây.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (session?.role !== 'admin') {
    return (
      <div className="space-y-3">
        <AdminLoginForm fixedUsername="admin" submitLabel="Đăng nhập admin để đồng bộ cấu hình" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={push}
        disabled={busy || dirty || !settings.apiUrl.trim()}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40"
      >
        {busy ? 'Đang đồng bộ…' : 'Đồng bộ cấu hình toàn thiết bị'}
      </button>
      {message && <p className="text-sm text-emerald-700">✓ {message}</p>}
      {error && <p className="text-sm text-red-600">✗ {error}</p>}
    </div>
  );
}

function SleepModePush({ settings }: { settings: LarkSettings }) {
  const session = useAdminInfo();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (session?.role !== 'admin') return null;

  const push = async (desired: boolean) => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const next = { ...settings, sleepMode: desired };
      await pushSharedSettings(toSharedSettings(next));
      larkSettingsStore.save(next);
      setMessage(desired ? 'Đã Lock các máy nhân viên.' : 'Đã chuyển máy nhân viên sang Hoạt động.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void push(true)}
          disabled={busy || settings.sleepMode}
          className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-40"
        >
          {busy ? 'Đang cập nhật…' : 'Lock'}
        </button>
        <button
          type="button"
          onClick={() => void push(false)}
          disabled={busy || !settings.sleepMode}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40"
        >
          Hoạt động
        </button>
      </div>
      {message && <p className="text-sm text-emerald-700">✓ {message}</p>}
      {error && <p className="text-sm text-red-600">✗ {error}</p>}
    </div>
  );
}

function GuestModeSettings({ settings }: { settings: LarkSettings }) {
  const session = useAdminInfo();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState(() => Object.entries(settings.guestUsers).map(([code, username]) => ({ code, username })));
  const [pastedText, setPastedText] = useState('');

  useEffect(() => {
    setRows(Object.entries(settings.guestUsers).map(([code, username]) => ({ code, username })));
  }, [settings.guestUsers]);

  if (session?.role !== 'admin') return null;

  const save = async (guestLock = settings.guestLock) => {
    setBusy(true);
    setError(null);
    const guestUsers = Object.fromEntries(rows
      .map((row) => [row.code.trim().toUpperCase(), row.username.trim()] as const)
      .filter(([code, username]) => code && username));
    const next = { ...settings, guestLock, guestUsers };
    try {
      await pushSharedSettings(toSharedSettings(next));
      larkSettingsStore.save(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const importCsv = async (file: File) => {
    const text = (await file.text()).replace(/^\uFEFF/, '');
    setPastedText(text);
    setRows(parseGuestUsers(text));
  };

  const importPasted = () => setRows(parseGuestUsers(pastedText));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => void save(!settings.guestLock)} disabled={busy} className={settings.guestLock ? 'rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40' : 'rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-40'}>
          {busy ? 'Đang cập nhật…' : settings.guestLock ? 'Active Guest' : 'Lock Guest'}
        </button>
        <label className="cursor-pointer rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-bold text-neutral-700 hover:bg-neutral-50">
          Upload CSV
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importCsv(file); event.currentTarget.value = ''; }} />
        </label>
      </div>
      <div className="space-y-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-3">
        <label className="block text-sm font-bold text-neutral-700" htmlFor="guest-users-paste">Dán dữ liệu từ Excel</label>
        <textarea
          id="guest-users-paste"
          value={pastedText}
          onChange={(event) => setPastedText(event.target.value)}
          placeholder={'TV1\tLong Nhân\nTC1\tNguyễn A'}
          rows={3}
          className="w-full rounded border border-neutral-200 bg-white px-2 py-1.5 font-mono text-sm"
        />
        <button type="button" onClick={importPasted} disabled={!pastedText.trim()} className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-40">
          Cập nhật từ dữ liệu đã dán
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[32rem] text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500"><tr><th className="px-3 py-2">Mã bàn</th><th className="px-3 py-2">Username</th><th className="w-16 px-3 py-2" /></tr></thead>
          <tbody>
            {rows.map((row, index) => <tr key={`${index}-${row.code}`} className="border-t border-neutral-100">
              <td className="px-3 py-2"><input value={row.code} onChange={(event) => setRows((current) => current.map((item, i) => i === index ? { ...item, code: event.target.value } : item))} className="w-full rounded border border-neutral-200 px-2 py-1.5 uppercase" placeholder="TV1" /></td>
              <td className="px-3 py-2"><input value={row.username} onChange={(event) => setRows((current) => current.map((item, i) => i === index ? { ...item, username: event.target.value } : item))} className="w-full rounded border border-neutral-200 px-2 py-1.5" placeholder="Long Nhân" /></td>
              <td className="px-3 py-2"><button type="button" onClick={() => setRows((current) => current.filter((_, i) => i !== index))} className="font-bold text-red-600">Xóa</button></td>
            </tr>)}
            {!rows.length && <tr><td colSpan={3} className="px-3 py-6 text-center text-neutral-400">Chưa có Username Guest</td></tr>}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={() => void save()} disabled={busy} className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-40">Lưu cấu hình Guest</button>
      {error && <p className="text-sm text-red-600">✗ {error}</p>}
    </div>
  );
}

function parseGuestUsers(text: string): Array<{ code: string; username: string }> {
  return text.replace(/^\uFEFF/, '').split(/\r?\n/)
    .map((line) => (line.includes('\t') ? line.split('\t') : line.split(','))
      .map((cell) => cell.trim().replace(/^"|"$/g, '')))
    .filter(([code, username]) => code && username && !/^mã bàn$/i.test(code) && !/^username$/i.test(username))
    .map(([code, username]) => ({ code: code.toUpperCase(), username }));
}

/**
 * SettingsPage — connect the dashboard to a real Lark Base at runtime.
 *
 * Enter the proxy URL and map each Lark column name to the corresponding web field. Settings are
 * saved to localStorage and applied immediately (the dashboard re-syncs).
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  CHECKIN_LABELS,
  DISPATCH_BACKUP_FIELD_LABEL,
  DISPATCH_DESK_FIELD_LABELS,
  DISPATCH_FIELD_LABEL,
  DS_MASTER_FIELD_LABELS,
  MASTER_FIELD_LABELS,
  defaultSettings,
  larkSettingsStore,
  toFieldConfig,
  toRuntimeConfig,
  useLarkSettings,
  type LarkSettings,
} from '@/config/larkSettings';
import type { CheckinFieldMap, DsMasterFieldMap, MasterFieldMap } from '@/config/larkConfig';
import { LEADTIME_WARNING_MINUTES } from '@/config/larkSettings';
import AdminLoginForm from '@/components/AdminLoginForm';
import { useAdminInfo } from '@/config/adminSession';
import { fetchLarkData } from '@/services/larkService';
import { mapDeskStates } from '@/services/larkMapper';
import type { ClusterKey } from '@/types/desk';
import QrScanButton from '@/components/QrScanButton';
import { pushSharedSettings, toSharedSettings } from '@/services/appConfigApi';

const clone = (s: LarkSettings): LarkSettings => JSON.parse(JSON.stringify(s));

type TestResult = { ok: true; desks: number; checkIn: number; orders: number } | { ok: false; msg: string };

export default function SettingsPage() {
  const saved = useLarkSettings();
  const session = useAdminInfo();
  // Che 3 URL worker khi chưa đăng nhập admin. ĐÂY CHỈ LÀ CHE NHÌN LÉN, KHÔNG
  // PHẢI BẢO MẬT: URL vẫn nằm trong localStorage, vẫn hiện ở tab Network và
  // vẫn đi kèm mọi request — ai mở DevTools là thấy. Thứ thật sự chặn ghi bậy
  // vẫn là worker (xem `config/adminSession.ts`). Lý do vẫn làm: máy Cài đặt
  // hay để mở giữa chỗ đông người ở sự kiện.
  const locked = session?.role !== 'admin';
  const [draft, setDraft] = useState<LarkSettings>(() => clone(saved));
  const [savedTick, setSavedTick] = useState(false);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<TestResult | null>(null);

  // Cấu hình runtime có thể vừa được bootstrap từ Worker KV; form phải theo
  // bản trung tâm thay vì giữ bản mặc định/mock của lần render đầu.
  useEffect(() => {
    setDraft(clone(saved));
  }, [saved]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);

  const setTop = <K extends keyof LarkSettings>(k: K, v: LarkSettings[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const setCheckinField = (k: keyof CheckinFieldMap, v: string) =>
    setDraft((d) => ({ ...d, fields: { ...d.fields, checkin: { ...d.fields.checkin, [k]: v } } }));

  const setMasterField = (k: keyof MasterFieldMap, v: string) =>
    setDraft((d) => ({ ...d, fields: { ...d.fields, master: { ...d.fields.master, [k]: v } } }));

  const setDispatchDeskField = (cluster: ClusterKey, v: string) =>
    setDraft((d) => ({
      ...d,
      fields: { ...d.fields, dispatch: { ...d.fields.dispatch, deskField: { ...d.fields.dispatch.deskField, [cluster]: v } } },
    }));

  const setDispatchNameField = (v: string) =>
    setDraft((d) => ({ ...d, fields: { ...d.fields, dispatch: { ...d.fields.dispatch, name: v } } }));

  const setDispatchBackupField = (v: string) =>
    setDraft((d) => ({ ...d, fields: { ...d.fields, dispatch: { ...d.fields.dispatch, backupDeskField: v } } }));

  const setDsMasterField = (k: keyof DsMasterFieldMap, v: string) =>
    setDraft((d) => ({ ...d, fields: { ...d.fields, dsMaster: { ...d.fields.dsMaster, [k]: v } } }));

  const setLeadtime = (cluster: ClusterKey, value: string) =>
    setDraft((d) => ({
      ...d,
      leadtimeMinutes: {
        ...d.leadtimeMinutes,
        [cluster]: Math.max(1, Number(value) || 1),
      },
    }));

  const save = () => {
    larkSettingsStore.save(clone(draft));
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1500);
  };

  const resetDefaults = () => setDraft(defaultSettings());

  const runTest = async () => {
    setTesting(true);
    setTest(null);
    try {
      const cfg = toRuntimeConfig({ ...draft, useMock: false });
      const tables = await fetchLarkData(cfg);
      const mapped = mapDeskStates(tables, toFieldConfig(draft));
      setTest({
        ok: true,
        desks: Object.keys(mapped.statesById).length,
        checkIn: mapped.totalCheckIn,
        orders: mapped.totalRegistered,
      });
    } catch (e) {
      setTest({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setTesting(false);
    }
  };

  if (session?.role !== 'admin') {
    return <SettingsAccessGate />;
  }

  return (
    <div className="min-h-full bg-neutral-100 text-neutral-800">
      <header className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Cài đặt</h1>
          </div>
          <a
            href="#/"
            className="rounded border border-neutral-300 px-3 py-1 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
          >
            ← Về sơ đồ
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-6">
        {/* Kết nối */}
        <Section title="1 · Kết nối Lark">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Input
                label="API URL (proxy)"
                placeholder="https://proxy-cua-ban/api/lark"
                value={draft.apiUrl}
                onChange={(v) => setTop('apiUrl', v)}
                locked={locked}
              />
            </div>
            {/* Ẩn nút quét khi khoá: quét QR là một đường GHI đè URL, để lại thì
                lớp khoá thành vô nghĩa. */}
            {!locked && (
              <div className="mt-5">
                <QrScanButton onScan={(v) => setTop('apiUrl', v.trim())} />
              </div>
            )}
          </div>
        </Section>

        {/* Ánh xạ trường */}
        <SettingsLockContext.Provider value={locked}>
        <Section title="2 · Ánh xạ trường" disabled={locked}>
          <MapBlock title="Check in (bảng Master_Check in)">
            {(Object.keys(CHECKIN_LABELS) as Array<keyof CheckinFieldMap>).map((k) => (
              <Input
                key={k}
                label={CHECKIN_LABELS[k]}
                value={draft.fields.checkin[k]}
                onChange={(v) => setCheckinField(k, v)}
              />
            ))}
          </MapBlock>

          <MapBlock title='Master (NV tiếp nhận khách theo bàn — xác định khách đang ở bàn nào + màu bàn)'>
            {(Object.keys(MASTER_FIELD_LABELS) as Array<keyof MasterFieldMap>).map((k) => (
              <Input
                key={k}
                label={MASTER_FIELD_LABELS[k]}
                value={draft.fields.master[k]}
                onChange={(v) => setMasterField(k, v)}
              />
            ))}
          </MapBlock>

          <MapBlock title='Master Điều phối (khách đã gán bàn — thông tin phân công/nhân sự)'>
            <Input
              label={DISPATCH_FIELD_LABEL}
              value={draft.fields.dispatch.name}
              onChange={setDispatchNameField}
            />
            <Input
              label={DISPATCH_DESK_FIELD_LABELS.tradein}
              value={draft.fields.dispatch.deskField.tradein}
              onChange={(v) => setDispatchDeskField('tradein', v)}
            />
            <Input
              label={DISPATCH_DESK_FIELD_LABELS.consult}
              value={draft.fields.dispatch.deskField.consult}
              onChange={(v) => setDispatchDeskField('consult', v)}
            />
            <Input
              label={DISPATCH_BACKUP_FIELD_LABEL}
              value={draft.fields.dispatch.backupDeskField}
              onChange={setDispatchBackupField}
            />
          </MapBlock>

          <MapBlock title='DS Master (SL khách chờ + STT tiếp theo)'>
            {(Object.keys(DS_MASTER_FIELD_LABELS) as Array<keyof DsMasterFieldMap>).map((k) => (
              <Input
                key={k}
                label={DS_MASTER_FIELD_LABELS[k]}
                value={draft.fields.dsMaster[k] || (k === 'staffId' ? 'MSNV' : k === 'staffUsername' ? 'Username' : '')}
                onChange={(v) => setDsMasterField(k, v)}
              />
            ))}
          </MapBlock>
          </Section>
        </SettingsLockContext.Provider>

        <Section title="3 · Thiết lập leadtime theo khâu" disabled={locked}>
          <p className="text-sm text-neutral-500">
            Timer chuyển vàng trước leadtime {LEADTIME_WARNING_MINUTES} phút và chuyển đỏ khi chạm hoặc vượt leadtime.
            Giá trị áp dụng cho cả màn hình nhân viên và màn hình STT.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Thu cũ (phút)"
              type="number"
              value={String(draft.leadtimeMinutes.tradein)}
              onChange={(v) => setLeadtime('tradein', v)}
              locked={locked}
            />
            <Input
              label="Tư vấn (phút)"
              type="number"
              value={String(draft.leadtimeMinutes.consult)}
              onChange={(v) => setLeadtime('consult', v)}
              locked={locked}
            />
            <Input
              label="Backup (phút)"
              type="number"
              value={String(draft.leadtimeMinutes.backup)}
              onChange={(v) => setLeadtime('backup', v)}
              locked={locked}
            />
          </div>
        </Section>

        {/* Hai đường GHI ra Lark, tách hẳn khỏi phần đọc dữ liệu ở trên.
            Mô tả cố ý KHÔNG liệt kê từng field payload: bản cũ liệt kê rồi để
            lỗi thời khi payload thêm field, mà chú thích sai nằm ngay cạnh ô
            nhập thì người sau đọc vào sẽ tin. Danh sách field đầy đủ ở README. */}
        <Section title="4 · Webhook Điều phối">
          <Input
            label="Webhook URL"
            placeholder="https://<worker>.workers.dev/dispatch-record"
            value={draft.dispatchWebhookUrl}
            onChange={(v) => setTop('dispatchWebhookUrl', v)}
            locked={locked}
          />
          <Input
            label="Webhook Tiếp nhận / Hoàn tất (màn hình nhân viên)"
            placeholder="https://<worker>.workers.dev/record"
            value={draft.staffActionWebhookUrl}
            onChange={(v) => setTop('staffActionWebhookUrl', v)}
            locked={locked}
          />
        </Section>

        <Section title="5 · Chế độ màn hình nhân viên">
          <div>
            <SleepModePush settings={saved} />
          </div>
        </Section>

        <Section title="6 · Cài đặt Chế độ khách">
          <GuestModeSettings settings={saved} />
        </Section>

        {/* Đồng bộ cấu hình toàn thiết bị — thứ khiến máy nhân viên theo admin */}
        <Section title="7 · Đồng bộ cấu hình toàn thiết bị">
          <SharedSettingsPush settings={saved} dirty={dirty} />
        </Section>

        {/* Actions */}
        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white/95 p-3 shadow-sm backdrop-blur">
          <button
            type="button"
            onClick={save}
            disabled={!dirty}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-40"
          >
            Lưu &amp; đồng bộ
          </button>
          <button
            type="button"
            onClick={runTest}
            disabled={testing}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
          >
            {testing ? 'Đang kiểm tra…' : 'Kiểm tra kết nối'}
          </button>
          <button
            type="button"
            onClick={resetDefaults}
            disabled={locked}
            title={locked ? 'Cần đăng nhập admin' : undefined}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
          >
            Khôi phục mặc định
          </button>

          {savedTick && <span className="text-sm font-medium text-emerald-600">✓ Đã lưu</span>}
          {test?.ok && (
            <span className="text-sm text-emerald-700">
              ✓ OK — {test.desks} bàn · {test.checkIn} check-in · {test.orders} đơn
            </span>
          )}
          {test && !test.ok && (
            <span className="max-w-md truncate text-sm text-red-600" title={test.msg}>
              ✗ {test.msg}
            </span>
          )}
        </div>
      </main>
    </div>
  );
}

function SettingsAccessGate() {
  return (
    <div className="min-h-full bg-neutral-100 text-neutral-800">
      <header className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <h1 className="text-xl font-bold">Cài đặt</h1>
          <a
            href="#/"
            className="rounded border border-neutral-300 px-3 py-1 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
          >
            ← Về sơ đồ
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-md px-6 py-10">
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Cần đăng nhập admin</h2>
          <p className="mt-1 mb-4 text-sm text-neutral-500">Nhập mật khẩu admin để truy cập Cài đặt.</p>
          <AdminLoginForm fixedUsername="admin" submitLabel="Đăng nhập để truy cập Cài đặt" />
        </section>
      </main>
    </div>
  );
}

function Section({ title, disabled, children }: { title: string; disabled?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <section className={`rounded-xl border border-neutral-200 bg-white p-4 shadow-sm ${disabled ? 'opacity-50' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <h2 className="font-bold text-neutral-800">{title}</h2>
        <span className="flex items-center gap-1 text-xs font-medium text-neutral-500">
          {open ? 'Thu gọn' : 'Mở rộng'}
          <svg viewBox="0 0 20 20" aria-hidden="true" className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}>
            <path d="m5 7 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {open && (
        <fieldset disabled={disabled} className="mt-3 space-y-3">
          {children}
        </fieldset>
      )}
    </section>
  );
}

function MapBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

const SettingsLockContext = createContext(false);

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  locked = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  /** Che giá trị + cấm sửa khi chưa đăng nhập admin (chỉ chống nhìn lén). */
  locked?: boolean;
}) {
  const sectionLocked = useContext(SettingsLockContext);
  const isLocked = locked || sectionLocked;

  if (isLocked) {
    return (
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-neutral-500">
          {label} <span className="font-normal text-neutral-400">· cần admin</span>
        </span>
        {/* Dựng chuỗi dấu sao ĐỘ DÀI CỐ ĐỊNH, không theo value.length: độ dài
            thật cũng là manh mối (đoán được route dài/ngắn). Cũng không đưa
            `value` vào DOM ở nhánh này. */}
        <div className="select-none rounded border border-neutral-200 bg-neutral-100 px-2 py-1.5 text-sm tracking-widest text-neutral-400">
          {value.trim() ? '••••••••••••••••••••' : <span className="tracking-normal italic">chưa cấu hình</span>}
        </div>
      </label>
    );
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-neutral-500">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-neutral-300 px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
      />
    </label>
  );
}
