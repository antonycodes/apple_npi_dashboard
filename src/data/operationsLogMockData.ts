import type { LarkRecord, LarkTables } from '@/services/larkTypes';

const base = Date.now() - 4 * 60 * 60 * 1000;
const at = (minutes: number) => base + minutes * 60_000;
const names = [
  'Nguyễn Minh Long', 'Trần Ngọc Anh', 'Lê Hoàng Nam', 'Phạm Gia Hân',
  'Võ Thanh Bình', 'Đặng Khánh Linh', 'Hoàng Đức Anh', 'Bùi Ngọc Mai',
  'Lý Gia Bảo', 'Dương Xuân Long', 'Huỳnh Ngọc Linh', 'Trịnh Bảo Châu',
  'Ngô Gia Huy', 'Vũ Thanh Hà', 'Lâm Bảo Ngọc', 'Phan Nhật Minh',
];
const products = ['iPhone 17 Pro', 'iPhone 17 Air', 'MacBook Air', 'iPad Pro'];
const positions = [
  ...Array.from({ length: 16 }, (_, index) => ({ code: `TV${index + 1}`, stage: 'Tư vấn' })),
  ...Array.from({ length: 10 }, (_, index) => ({ code: `TC${index + 1}`, stage: 'Thu cũ' })),
  ...Array.from({ length: 10 }, (_, index) => ({ code: `BK${index + 1}`, stage: 'Backup' })),
];

const checkin: LarkRecord[] = names.map((name, index) => ({
  record_id: `log_ci_${index + 1}`,
  fields: {
    STT: index + 101,
    'Họ và tên': name,
    'Số điện thoại': `0900000${String(index + 101).padStart(3, '0')}`,
    'SP 1': `${products[index % products.length]} · Demo`,
    'Thu cũ check': '✅ CÓ THU CŨ ✅',
    'Backup check': '✅ CÓ BACKUP ✅',
    'End flow': index % 3 === 0 ? 'End flow' : 'In flow',
    'Thời gian': at(index * 3),
  },
}));

const master: LarkRecord[] = [];
names.forEach((name, index) => {
  const stt = String(index + 101);
  const consultDesk = `TV${index + 1}`;
  const tradeinDesk = `TC${(index % 10) + 1}`;
  const backupDesk = `BK${(index % 10) + 1}`;
  const start = index * 3 + 2;
  const addStage = (desk: string, stage: string, offset: number, duration: number, extra: Record<string, unknown> = {}) => {
    master.push(
      { record_id: `log_m_${stt}_${desk}_in`, fields: { 'TV_MãNV': desk, 'Trạng thái': 'Tiếp nhận', 'Loại 2': stage, 'Họ và tên': name, 'STT Input': stt, 'Submit by': `${desk}001`, 'Thời gian': at(start + offset), ...extra } },
      { record_id: `log_m_${stt}_${desk}_done`, fields: { 'TV_MãNV': desk, 'Trạng thái': 'Hoàn tất', 'Loại 2': stage, 'Họ và tên': name, 'STT Input': stt, 'Submit by': `${desk}001`, 'Thời gian': at(start + offset + duration), ...extra } },
    );
  };
  addStage(consultDesk, 'Tư vấn', 0, 10 + (index % 8));
  addStage(tradeinDesk, 'Thu cũ', 15, 14 + (index % 10), index % 4 === 0 ? { 'Khách không đồng ý giá thu cũ': true } : {});
  addStage(backupDesk, 'Backup', 34, 9 + (index % 7));
  if (index % 5 === 0) {
    master.push({ record_id: `log_m_${stt}_quick`, fields: { 'TV_MãNV': tradeinDesk, 'Trạng thái': 'Thu máy nhanh', 'Loại 2': 'Thu cũ', 'Họ và tên': name, 'STT Input': stt, 'Submit by': `${tradeinDesk}001`, 'Thời gian': at(start + 31) } });
  }
});

['TV1', 'TV4', 'TV8', 'TV12', 'TC2', 'TC6', 'BK3', 'BK9', 'KHO1', 'KHO2'].forEach((desk, index) => {
  master.push({
    record_id: `log_m_kho_${index + 1}`,
    fields: {
      'TV_MãNV': desk,
      'Trạng thái': 'Bàn giao kho',
      'Họ và tên': '',
      'Scan QR máy cũ': `MOCK-QR-${String(index + 1).padStart(3, '0')}`,
      'Submit by': `KHO${String((index % 3) + 1).padStart(3, '0')}`,
      'Thời gian': at(90 + index * 2),
    },
  });
});

export const operationsLogMockTables: LarkTables = {
  checkin,
  orders: [],
  master,
  dispatch: [],
  dsMaster: positions.map(({ code, stage }, index) => ({
    record_id: `log_dsm_${index + 1}`,
    fields: { 'STT bàn': code, 'NV Tư vấn': `${stage} Demo ${index + 1}`, 'Loại': stage },
  })),
};
