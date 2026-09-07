import type { LarkTables } from '@/services/larkTypes';

const base = Date.now() - 2 * 60 * 60 * 1000;
const at = (minutes: number) => base + minutes * 60_000;

export const operationsLogMockTables: LarkTables = {
  checkin: [
    { record_id: 'log_ci_101', fields: { STT: 101, 'Họ và tên': 'Nguyễn Minh Long', 'Số điện thoại': '0900000101', 'SP 1': 'iPhone 17 Pro 256GB', 'Thu cũ check': '✅ CÓ THU CŨ ✅', 'Backup check': '✅ CÓ BACKUP ✅', 'End flow': 'End flow', 'Thời gian': at(0) } },
    { record_id: 'log_ci_102', fields: { STT: 102, 'Họ và tên': 'Trần Ngọc Anh', 'Số điện thoại': '0900000102', 'SP 1': 'iPhone 17 Air', 'Thu cũ check': '❌ KHÔNG THU CŨ ❌', 'Backup check': '❌ KHÔNG BACKUP ❌', 'End flow': 'In flow', 'Thời gian': at(4) } },
    { record_id: 'log_ci_103', fields: { STT: 103, 'Họ và tên': 'Lê Hoàng Nam', 'Số điện thoại': '0900000103', 'SP 1': 'MacBook Air', 'Thu cũ check': '✅ CÓ THU CŨ ✅', 'Backup check': '❌ KHÔNG BACKUP ❌', 'End flow': 'In flow', 'Thời gian': at(8) } },
    { record_id: 'log_ci_104', fields: { STT: 104, 'Họ và tên': 'Phạm Gia Hân', 'Số điện thoại': '0900000104', 'SP 1': 'iPhone 17 Pro Max', 'Thu cũ check': '✅ CÓ THU CŨ ✅', 'Backup check': '✅ CÓ BACKUP ✅', 'End flow': 'In flow', 'Thời gian': at(12) } },
  ],
  orders: [],
  master: [
    { record_id: 'log_m_101_tv_in', fields: { 'TV_MãNV': 'TV1', 'Trạng thái': 'Tiếp nhận', 'Loại 2': 'Tư vấn', 'Họ và tên': 'Nguyễn Minh Long', 'Submit by': 'TV001', 'Thời gian': at(1) } },
    { record_id: 'log_m_101_tv_done', fields: { 'TV_MãNV': 'TV1', 'Trạng thái': 'Hoàn tất', 'Loại 2': 'Tư vấn', 'Họ và tên': 'Nguyễn Minh Long', 'Submit by': 'TV001', 'Thời gian': at(16) } },
    { record_id: 'log_m_101_tc_in', fields: { 'TV_MãNV': 'TC1', 'Trạng thái': 'Tiếp nhận', 'Loại 2': 'Thu cũ', 'Họ và tên': 'Nguyễn Minh Long', 'STT Input': '101', 'Submit by': 'TC001', 'Thời gian': at(20) } },
    { record_id: 'log_m_101_tc_done', fields: { 'TV_MãNV': 'TC1', 'Trạng thái': 'Hoàn tất', 'Loại 2': 'Thu cũ', 'Họ và tên': 'Nguyễn Minh Long', 'STT Input': '101', 'Khách không đồng ý giá thu cũ': true, 'Submit by': 'TC001', 'Thời gian': at(39) } },
    { record_id: 'log_m_101_bk_in', fields: { 'TV_MãNV': 'BK1', 'Trạng thái': 'Tiếp nhận', 'Loại 2': 'Backup', 'Họ và tên': 'Nguyễn Minh Long', 'STT Input': '101', 'Submit by': 'BK001', 'Thời gian': at(45) } },
    { record_id: 'log_m_101_bk_done', fields: { 'TV_MãNV': 'BK1', 'Trạng thái': 'Hoàn tất', 'Loại 2': 'Backup', 'Họ và tên': 'Nguyễn Minh Long', 'STT Input': '101', 'Submit by': 'BK001', 'Thời gian': at(58) } },
    { record_id: 'log_m_102_tv_in', fields: { 'TV_MãNV': 'TV2', 'Trạng thái': 'Tiếp nhận', 'Loại 2': 'Tư vấn', 'Họ và tên': 'Trần Ngọc Anh', 'Submit by': 'TV002', 'Thời gian': at(5) } },
    { record_id: 'log_m_102_tv_done', fields: { 'TV_MãNV': 'TV2', 'Trạng thái': 'Hoàn tất', 'Loại 2': 'Tư vấn', 'Họ và tên': 'Trần Ngọc Anh', 'Submit by': 'TV002', 'Thời gian': at(27) } },
    { record_id: 'log_m_103_tv_in', fields: { 'TV_MãNV': 'TV3', 'Trạng thái': 'Tiếp nhận', 'Loại 2': 'Tư vấn', 'Họ và tên': 'Lê Hoàng Nam', 'Submit by': 'TV003', 'Thời gian': at(10) } },
    { record_id: 'log_m_104_tc_in', fields: { 'TV_MãNV': 'TC2', 'Trạng thái': 'Tiếp nhận', 'Loại 2': 'Thu cũ', 'Họ và tên': 'Phạm Gia Hân', 'Submit by': 'TC002', 'Thời gian': at(13) } },
    { record_id: 'log_m_104_tc_done', fields: { 'TV_MãNV': 'TC2', 'Trạng thái': 'Hoàn tất', 'Loại 2': 'Thu cũ', 'Họ và tên': 'Phạm Gia Hân', 'Submit by': 'TC002', 'Thời gian': at(34) } },
    { record_id: 'log_m_104_bk_in', fields: { 'TV_MãNV': 'BK2', 'Trạng thái': 'Tiếp nhận', 'Loại 2': 'Backup', 'Họ và tên': 'Phạm Gia Hân', 'Submit by': 'BK002', 'Thời gian': at(38) } },
    { record_id: 'log_m_104_bk_done', fields: { 'TV_MãNV': 'BK2', 'Trạng thái': 'Hoàn tất', 'Loại 2': 'Backup', 'Họ và tên': 'Phạm Gia Hân', 'Submit by': 'BK002', 'Thời gian': at(51) } },
    { record_id: 'log_m_kho_1', fields: { 'TV_MãNV': 'TV1', 'Trạng thái': 'Bàn giao kho', 'Họ và tên': '', 'Scan QR máy cũ': 'MOCK-QR-101', 'Submit by': 'KHO001', 'Thời gian': at(62) } },
    { record_id: 'log_m_kho_2', fields: { 'TV_MãNV': 'TC2', 'Trạng thái': 'Bàn giao kho', 'Họ và tên': '', 'Scan QR máy cũ': 'MOCK-QR-104', 'Submit by': 'KHO001', 'Thời gian': at(64) } },
  ],
  dispatch: [],
  dsMaster: [],
};
