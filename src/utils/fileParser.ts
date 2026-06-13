import * as XLSX from 'xlsx';
import { Waybill, Receipt, FuelCardRecord, TollFee, Quotation, FileType } from '@/types';

const generateId = () => Math.random().toString(36).substring(2, 11);

export const parseExcelFile = async (
  file: File
): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const headers: string[] = [];
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        for (let c = range.s.c; c <= range.e.c; c += 1) {
          const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c })];
          headers.push(cell ? String(cell.v).trim() : '');
        }

        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
        resolve({ headers: headers.filter(Boolean), rows: jsonData });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const parseExcelFileWithType = async <T>(file: File, type: FileType): Promise<T[]> => {
  const { rows } = await parseExcelFile(file);
  const parsedData = rows.map((row) => mapRowToType(row, type) as unknown as T);
  return parsedData.filter((item) => item !== null) as T[];
};

const mapRowToType = (row: Record<string, unknown>, type: FileType): unknown => {
  const getValue = (keys: string[]): string => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null) {
        return String(row[key]);
      }
    }
    return '';
  };

  const getNumber = (keys: string[]): number => {
    const val = getValue(keys);
    return val ? parseFloat(val) || 0 : 0;
  };

  switch (type) {
    case 'waybill':
      return {
        id: generateId(),
        waybillNo: getValue(['运单号', 'waybillNo', 'waybill_no', '单号']),
        plateNo: getValue(['车牌号', 'plateNo', 'plate_no', '车牌']),
        line: getValue(['线路', 'line', '路线']),
        vehicleType: getValue(['车型', 'vehicleType', 'vehicle_type']),
        weight: getNumber(['重量', 'weight', '货物重量']),
        mileage: getNumber(['里程', 'mileage', '公里数']),
        freight: getNumber(['运费', 'freight', '金额', '费用']),
        carrier: getValue(['承运商', 'carrier', '物流公司']),
        sendDate: getValue(['发运日期', 'sendDate', '日期', '时间']),
        status: 'completed',
      } as Waybill;

    case 'receipt':
      return {
        id: generateId(),
        waybillNo: getValue(['运单号', 'waybillNo', 'waybill_no', '单号']),
        plateNo: getValue(['车牌号', 'plateNo', 'plate_no', '车牌']),
        receiptDate: getValue(['回单日期', 'receiptDate', '日期', '签收日期']),
        receiver: getValue(['收货人', 'receiver', '签收人']),
        status: 'confirmed',
      } as Receipt;

    case 'fuelCard':
      return {
        id: generateId(),
        cardNo: getValue(['卡号', 'cardNo', 'card_no', '油卡号']),
        plateNo: getValue(['车牌号', 'plateNo', 'plate_no', '车牌']),
        rechargeDate: getValue(['充值日期', 'rechargeDate', '日期']),
        amount: getNumber(['金额', 'amount', '充值金额']),
        balance: getNumber(['余额', 'balance', '剩余金额']),
      } as FuelCardRecord;

    case 'tollFee':
      return {
        id: generateId(),
        waybillNo: getValue(['运单号', 'waybillNo', 'waybill_no', '单号']),
        plateNo: getValue(['车牌号', 'plateNo', 'plate_no', '车牌']),
        tollDate: getValue(['日期', 'tollDate', '通行日期']),
        amount: getNumber(['金额', 'amount', '费用']),
        station: getValue(['收费站', 'station', '站点']),
      } as TollFee;

    case 'quotation':
      return {
        id: generateId(),
        carrier: getValue(['承运商', 'carrier', '物流公司']),
        line: getValue(['线路', 'line', '路线']),
        vehicleType: getValue(['车型', 'vehicleType', 'vehicle_type']),
        weightMin: getNumber(['最小重量', 'weightMin', '起始重量']),
        weightMax: getNumber(['最大重量', 'weightMax', '截止重量']),
        unitPrice: getNumber(['单价', 'unitPrice', '价格']),
        mileagePrice: getNumber(['里程价', 'mileagePrice', '公里单价']),
        effectiveDate: getValue(['生效日期', 'effectiveDate', '日期']),
      } as Quotation;

    default:
      return null;
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatAmount = (amount: number): string => {
  return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const generateBatchNo = (): string => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `CHECK${dateStr}${random}`;
};
