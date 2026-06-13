import { create } from 'zustand';
import {
  Waybill,
  Receipt,
  FuelCardRecord,
  TollFee,
  Quotation,
  BillingRule,
  DiffRecord,
  CheckRecord,
  CheckSummary,
  CarrierSummary,
  WaybillSummary,
  ImportFile,
  FileType,
  DiffType,
  DiffStatus,
  CheckRecordStatus,
  InvalidRowDetail,
  FilterScheme,
} from '@/types';
import { mockData } from '@/data/mockData';
import { parseExcelFile } from '@/utils/fileParser';

const generateId = () => Math.random().toString(36).substring(2, 11);

export const REQUIRED_FIELDS_BY_TYPE: Record<FileType, string[]> = {
  waybill: ['运单号', '车牌号', '运费', '承运商'],
  receipt: ['运单号', '车牌号'],
  fuelCard: ['卡号', '车牌号', '金额'],
  tollFee: ['车牌号', '金额'],
  quotation: ['承运商', '线路', '单价'],
};

function mapRowByType(type: FileType, row: any): any {
  switch (type) {
    case 'waybill':
      return {
        id: generateId(),
        waybillNo: String(row.运单号 || row.waybillNo || '').trim(),
        plateNo: String(row.车牌号 || row.plateNo || '').trim(),
        line: String(row.线路 || row.line || '').trim(),
        vehicleType: String(row.车型 || row.vehicleType || '').trim(),
        weight: Number(row.重量 || row.weight || 0),
        mileage: Number(row.里程 || row.mileage || 0),
        freight: Number(row.运费 || row.freight || 0),
        carrier: String(row.承运商 || row.carrier || '').trim(),
        sendDate: String(row.发货日期 || row.sendDate || '').trim(),
        status: (String(row.状态 || row.status || 'completed') as any),
      };
    case 'receipt':
      return {
        id: generateId(),
        waybillNo: String(row.运单号 || row.waybillNo || '').trim(),
        plateNo: String(row.车牌号 || row.plateNo || '').trim(),
        receiptDate: String(row.签收日期 || row.receiptDate || '').trim(),
        receiver: String(row.签收人 || row.receiver || '').trim(),
        status: (String(row.状态 || row.status || 'confirmed') as any),
      };
    case 'fuelCard':
      return {
        id: generateId(),
        cardNo: String(row.卡号 || row.cardNo || '').trim(),
        plateNo: String(row.车牌号 || row.plateNo || '').trim(),
        rechargeDate: String(row.充值日期 || row.rechargeDate || '').trim(),
        amount: Number(row.金额 || row.amount || 0),
        balance: Number(row.余额 || row.balance || 0),
      };
    case 'tollFee':
      return {
        id: generateId(),
        waybillNo: String(row.运单号 || row.waybillNo || '').trim(),
        plateNo: String(row.车牌号 || row.plateNo || '').trim(),
        tollDate: String(row.过路费日期 || row.tollDate || '').trim(),
        amount: Number(row.金额 || row.amount || 0),
        station: String(row.收费站 || row.station || '').trim(),
      };
    case 'quotation':
      return {
        id: generateId(),
        carrier: String(row.承运商 || row.carrier || '').trim(),
        line: String(row.线路 || row.line || '').trim(),
        vehicleType: String(row.车型 || row.vehicleType || '通用').trim(),
        weightMin: Number(row.最小重量 || row.weightMin || 0),
        weightMax: Number(row.最大重量 || row.weightMax || 9999),
        unitPrice: Number(row.单价 || row.unitPrice || 0),
        mileagePrice: Number(row.里程单价 || row.mileagePrice || 0),
        effectiveDate: String(row.生效日期 || row.effectiveDate || '').trim(),
      };
    default:
      return row;
  }
}

function validateRow(type: FileType, mapped: any): { valid: boolean; reason?: string } {
  switch (type) {
    case 'waybill':
      if (!mapped.waybillNo) return { valid: false, reason: '缺少运单号' };
      if (!mapped.plateNo) return { valid: false, reason: '缺少车牌号' };
      if (!mapped.freight || mapped.freight <= 0) return { valid: false, reason: '运费无效' };
      if (!mapped.carrier) return { valid: false, reason: '缺少承运商' };
      return { valid: true };
    case 'receipt':
      if (!mapped.waybillNo) return { valid: false, reason: '缺少运单号' };
      if (!mapped.plateNo) return { valid: false, reason: '缺少车牌号' };
      return { valid: true };
    case 'fuelCard':
      if (!mapped.cardNo) return { valid: false, reason: '缺少卡号' };
      if (!mapped.plateNo) return { valid: false, reason: '缺少车牌号' };
      if (!mapped.amount || mapped.amount <= 0) return { valid: false, reason: '金额无效' };
      return { valid: true };
    case 'tollFee':
      if (!mapped.plateNo) return { valid: false, reason: '缺少车牌号' };
      if (!mapped.amount || mapped.amount <= 0) return { valid: false, reason: '金额无效' };
      return { valid: true };
    case 'quotation':
      if (!mapped.carrier) return { valid: false, reason: '缺少承运商' };
      if (!mapped.line) return { valid: false, reason: '缺少线路' };
      if (!mapped.unitPrice || mapped.unitPrice < 0) return { valid: false, reason: '单价无效' };
      return { valid: true };
    default:
      return { valid: true };
  }
}

async function preprocessImportFile(
  file: File,
  type: FileType
): Promise<{
  headers: string[];
  validRows: number;
  invalidRows: number;
  invalidDetails: InvalidRowDetail[];
  parsedData: any[];
  error?: string;
}> {
  try {
    const { headers, rows } = await parseExcelFile(file);
    const requiredFields = REQUIRED_FIELDS_BY_TYPE[type];
    const missingRequired = requiredFields.filter((f) => !headers.some((h) => h === f || h.toLowerCase() === f.toLowerCase()));

    if (missingRequired.length > 0) {
      return {
        headers,
        validRows: 0,
        invalidRows: rows.length,
        invalidDetails: [],
        parsedData: [],
        error: `缺少关键字段：${missingRequired.join('、')}`,
      };
    }

    const validData: any[] = [];
    const invalidDetails: InvalidRowDetail[] = [];

    rows.forEach((row, idx) => {
      const mapped = mapRowByType(type, row);
      const check = validateRow(type, mapped);
      if (check.valid) {
        validData.push(mapped);
      } else {
        invalidDetails.push({
          rowNo: idx + 2,
          reason: check.reason || '数据校验失败',
          fields: row,
        });
      }
    });

    return {
      headers,
      validRows: validData.length,
      invalidRows: invalidDetails.length,
      invalidDetails,
      parsedData: validData,
    };
  } catch (err: any) {
    return {
      headers: [],
      validRows: 0,
      invalidRows: 0,
      invalidDetails: [],
      parsedData: [],
      error: `文件解析失败：${err?.message || '格式不支持或文件损坏'}`,
    };
  }
}

interface AppState {
  waybills: Waybill[];
  receipts: Receipt[];
  fuelCardRecords: FuelCardRecord[];
  tollFees: TollFee[];
  quotations: Quotation[];
  billingRules: BillingRule[];
  diffRecords: DiffRecord[];
  checkRecords: CheckRecord[];
  importFiles: ImportFile[];
  currentCheckId: string | null;
  currentStep: number;
  selectedDiffIds: string[];
  filterDiffType: DiffType | 'all';
  filterDiffStatus: DiffStatus | 'all';
  searchKeyword: string;

  setCurrentStep: (step: number) => void;
  addImportFile: (file: ImportFile) => void;
  updateImportFile: (id: string, updates: Partial<ImportFile>) => void;
  removeImportFile: (id: string) => void;
  clearImportFiles: () => void;
  processFileToPreview: (fileId: string, file: File, type: FileType) => Promise<void>;
  confirmImportPreview: (fileId: string) => void;

  setWaybills: (waybills: Waybill[]) => void;
  setReceipts: (receipts: Receipt[]) => void;
  setFuelCardRecords: (records: FuelCardRecord[]) => void;
  setTollFees: (fees: TollFee[]) => void;
  setQuotations: (quotations: Quotation[]) => void;

  addBillingRule: (rule: BillingRule) => void;
  updateBillingRule: (id: string, updates: Partial<BillingRule>) => void;
  deleteBillingRule: (id: string) => void;
  toggleBillingRule: (id: string) => void;

  runCheck: () => Promise<void>;
  getCheckSummary: () => CheckSummary;
  getCarrierSummaries: () => CarrierSummary[];
  getWaybillSummaries: () => WaybillSummary[];

  setDiffStatus: (id: string, status: DiffStatus, remark?: string, adjustedDiffAmount?: number) => void;
  setBatchDiffStatus: (ids: string[], status: DiffStatus, remark?: string) => void;
  setDiffRemark: (id: string, remark: string) => void;

  toggleSelectDiff: (id: string) => void;
  selectAllDiffs: () => void;
  clearSelection: () => void;

  setFilterDiffType: (type: DiffType | 'all') => void;
  setFilterDiffStatus: (status: DiffStatus | 'all') => void;
  setSearchKeyword: (keyword: string) => void;

  saveCheckRecord: () => void;
  loadCheckRecord: (id: string) => void;
  loadHistoryFromDB: () => Promise<void>;
  markRecordReviewed: (id: string, remark?: string) => void;
  markRecordArchived: (id: string, remark?: string) => void;

  filterSchemes: FilterScheme[];
  saveFilterScheme: (name: string, data: Omit<FilterScheme, 'id' | 'name' | 'createdAt'>) => Promise<void>;
  loadFilterSchemes: () => Promise<void>;
  deleteFilterScheme: (id: string) => Promise<void>;

  getFilteredDiffs: () => DiffRecord[];
}

function runCheckEngine(
  waybills: Waybill[],
  receipts: Receipt[],
  fuelCardRecords: FuelCardRecord[],
  tollFees: TollFee[],
  quotations: Quotation[],
  billingRules: BillingRule[],
  checkId: string
): DiffRecord[] {
  const diffs: DiffRecord[] = [];
  const receiptWaybillNos = new Set(receipts.map((r) => r.waybillNo));
  const waybillNoCount = new Map<string, number>();
  waybills.forEach((wb) => {
    waybillNoCount.set(wb.waybillNo, (waybillNoCount.get(wb.waybillNo) || 0) + 1);
  });

  const tollFeeByPlate = new Map<string, TollFee[]>();
  tollFees.forEach((tf) => {
    const list = tollFeeByPlate.get(tf.plateNo) || [];
    list.push(tf);
    tollFeeByPlate.set(tf.plateNo, list);
  });

  const fuelByPlate = new Map<string, FuelCardRecord[]>();
  fuelCardRecords.forEach((fc) => {
    const list = fuelByPlate.get(fc.plateNo) || [];
    list.push(fc);
    fuelByPlate.set(fc.plateNo, list);
  });

  const seenWaybillNos = new Set<string>();

  waybills.forEach((wb) => {
    if (!receiptWaybillNos.has(wb.waybillNo)) {
      diffs.push({
        id: generateId(),
        checkId,
        waybillNo: wb.waybillNo,
        plateNo: wb.plateNo,
        carrier: wb.carrier,
        diffType: 'missing_receipt',
        description: `运单 ${wb.waybillNo}（车牌 ${wb.plateNo}）未找到对应回单记录`,
        expectedAmount: wb.freight,
        actualAmount: wb.freight,
        diffAmount: 0,
        status: 'pending',
        remark: '',
        waybill: wb,
      });
    }

    if ((waybillNoCount.get(wb.waybillNo) || 0) > 1 && !seenWaybillNos.has(wb.waybillNo)) {
      seenWaybillNos.add(wb.waybillNo);
      diffs.push({
        id: generateId(),
        checkId,
        waybillNo: wb.waybillNo,
        plateNo: wb.plateNo,
        carrier: wb.carrier,
        diffType: 'duplicate_waybill',
        description: `运单号 ${wb.waybillNo} 存在 ${waybillNoCount.get(wb.waybillNo)} 条重复记录`,
        expectedAmount: wb.freight,
        actualAmount: wb.freight * (waybillNoCount.get(wb.waybillNo) || 1),
        diffAmount: wb.freight * ((waybillNoCount.get(wb.waybillNo) || 1) - 1),
        status: 'pending',
        remark: '',
        waybill: wb,
      });
    }

    const matchingQuotation = quotations.find(
      (q) =>
        q.carrier === wb.carrier &&
        q.line === wb.line &&
        (q.vehicleType === wb.vehicleType || q.vehicleType === '通用') &&
        wb.weight >= q.weightMin &&
        wb.weight <= q.weightMax
    );

    if (matchingQuotation) {
      const expectedFreight =
        matchingQuotation.unitPrice + wb.weight * matchingQuotation.mileagePrice + wb.mileage * matchingQuotation.mileagePrice;
      const activeRule = billingRules.find((r) => r.enabled && (r.line === wb.line || r.line === '通用'));
      const tolerance = activeRule ? activeRule.tolerance : 5;

      if (wb.freight > expectedFreight * (1 + tolerance / 100)) {
        const diffAmount = Math.round(wb.freight - expectedFreight);
        diffs.push({
          id: generateId(),
          checkId,
          waybillNo: wb.waybillNo,
          plateNo: wb.plateNo,
          carrier: wb.carrier,
          diffType: 'exceed_quotation',
          description: `运费 ¥${wb.freight} 超出报价 ¥${Math.round(expectedFreight)}，超出 ${((diffAmount / expectedFreight) * 100).toFixed(1)}%（容差 ±${tolerance}%）`,
          expectedAmount: Math.round(expectedFreight),
          actualAmount: wb.freight,
          diffAmount,
          status: 'pending',
          remark: '',
          waybill: wb,
        });
      }
    }

    const plateTollFees = tollFeeByPlate.get(wb.plateNo) || [];
    const plateFuelCards = fuelByPlate.get(wb.plateNo) || [];
    const unallocatedToll = plateTollFees.filter((tf) => !tf.waybillNo || tf.waybillNo.trim() === '');
    const unallocatedFuel = plateFuelCards.filter((fc) => fc.amount > 0);

    if (unallocatedToll.length > 0 || unallocatedFuel.length > 0) {
      const tollTotal = unallocatedToll.reduce((s, tf) => s + tf.amount, 0);
      const fuelTotal = unallocatedFuel.reduce((s, fc) => s + fc.amount, 0);
      const totalUnallocated = tollTotal + fuelTotal;

      const alreadyHasFeeUnallocated = diffs.some(
        (d) => d.waybillNo === wb.waybillNo && d.diffType === 'fee_unallocated'
      );

      if (!alreadyHasFeeUnallocated && totalUnallocated > 0) {
        diffs.push({
          id: generateId(),
          checkId,
          waybillNo: wb.waybillNo,
          plateNo: wb.plateNo,
          carrier: wb.carrier,
          diffType: 'fee_unallocated',
          description: `车牌 ${wb.plateNo} 存在未分摊费用：过路费 ¥${tollTotal}${fuelTotal > 0 ? `，油卡 ¥${fuelTotal}` : ''}，合计 ¥${totalUnallocated}`,
          expectedAmount: wb.freight,
          actualAmount: wb.freight + totalUnallocated,
          diffAmount: totalUnallocated,
          status: 'pending',
          remark: '',
          waybill: wb,
        });
      }
    }
  });

  return diffs;
}

function computeWaybillSummaries(waybills: Waybill[], diffRecords: DiffRecord[]): WaybillSummary[] {
  const byWaybill = new Map<string, WaybillSummary>();

  waybills.forEach((wb) => {
    byWaybill.set(wb.waybillNo, {
      waybillNo: wb.waybillNo,
      plateNo: wb.plateNo,
      carrier: wb.carrier,
      freight: wb.freight,
      diffCount: 0,
      diffTypes: [],
      diffAmount: 0,
      payableAmount: wb.freight,
    });
  });

  diffRecords.forEach((d) => {
    if (!byWaybill.has(d.waybillNo)) {
      byWaybill.set(d.waybillNo, {
        waybillNo: d.waybillNo,
        plateNo: d.plateNo,
        carrier: d.carrier,
        freight: d.waybill?.freight || 0,
        diffCount: 0,
        diffTypes: [],
        diffAmount: 0,
        payableAmount: d.waybill?.freight || 0,
      });
    }
    const s = byWaybill.get(d.waybillNo)!;
    s.diffCount++;
    if (!s.diffTypes.includes(d.diffType)) s.diffTypes.push(d.diffType);
    if (d.status !== 'rejected') {
      s.diffAmount += d.diffAmount;
    }
  });

  byWaybill.forEach((s) => {
    s.payableAmount = s.freight - s.diffAmount;
  });

  return Array.from(byWaybill.values()).sort((a, b) => b.diffCount - a.diffCount || b.diffAmount - a.diffAmount);
}

function computeSummary(waybills: Waybill[], diffRecords: DiffRecord[], waybillSummaries: WaybillSummary[]): CheckSummary {
  const diffByType: Record<DiffType, number> = {
    missing_receipt: 0,
    duplicate_waybill: 0,
    exceed_quotation: 0,
    fee_unallocated: 0,
    mileage_mismatch: 0,
    weight_mismatch: 0,
    other: 0,
  };

  diffRecords.forEach((d) => {
    diffByType[d.diffType]++;
  });

  const totalAmount = waybillSummaries.reduce((s, w) => s + w.freight, 0);
  const diffAmount = waybillSummaries.reduce((s, w) => s + w.diffAmount, 0);
  const affectedWaybillCount = waybillSummaries.filter((w) => w.diffCount > 0).length;
  const matchedCount = waybillSummaries.length - affectedWaybillCount;

  return {
    totalWaybills: waybillSummaries.length,
    matchedCount,
    diffCount: diffRecords.length,
    affectedWaybillCount,
    diffByType,
    totalAmount,
    diffAmount,
    payableAmount: totalAmount - diffAmount,
  };
}

function computeCarrierSummaries(waybillSummaries: WaybillSummary[]): CarrierSummary[] {
  const carrierMap = new Map<string, CarrierSummary>();

  waybillSummaries.forEach((ws) => {
    if (!carrierMap.has(ws.carrier)) {
      carrierMap.set(ws.carrier, {
        carrier: ws.carrier,
        waybillCount: 0,
        totalAmount: 0,
        diffCount: 0,
        affectedWaybillCount: 0,
        diffAmount: 0,
        payableAmount: 0,
      });
    }
    const s = carrierMap.get(ws.carrier)!;
    s.waybillCount++;
    s.totalAmount += ws.freight;
    s.diffAmount += ws.diffAmount;
    s.payableAmount += ws.payableAmount;
    if (ws.diffCount > 0) {
      s.affectedWaybillCount++;
      s.diffCount += ws.diffCount;
    }
  });

  return Array.from(carrierMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
}

const DB_NAME = 'FreightCheckDB';
const DB_VERSION = 2;
const STORE_NAME = 'checkRecords';
const STORE_FILTER_SCHEMES = 'filterSchemes';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_FILTER_SCHEMES)) {
        db.createObjectStore(STORE_FILTER_SCHEMES, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveToIndexedDB(record: CheckRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadAllFromIndexedDB(): Promise<CheckRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      const records = request.result as CheckRecord[];
      records.sort((a, b) => (b.archivedAt || b.reviewedAt || b.checkDate).localeCompare(a.archivedAt || a.reviewedAt || a.checkDate));
      resolve(records);
    };
    request.onerror = () => reject(request.error);
  });
}

async function loadOneFromIndexedDB(id: string): Promise<CheckRecord | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result as CheckRecord | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function saveFilterSchemeToDB(scheme: FilterScheme): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILTER_SCHEMES, 'readwrite');
    tx.objectStore(STORE_FILTER_SCHEMES).put(scheme);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadFilterSchemesFromDB(): Promise<FilterScheme[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILTER_SCHEMES, 'readonly');
    const request = tx.objectStore(STORE_FILTER_SCHEMES).getAll();
    request.onsuccess = () => {
      const list = request.result as FilterScheme[];
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      resolve(list);
    };
    request.onerror = () => reject(request.error);
  });
}

async function deleteFilterSchemeFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILTER_SCHEMES, 'readwrite');
    tx.objectStore(STORE_FILTER_SCHEMES).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export const useAppStore = create<AppState>((set, get) => ({
  waybills: [],
  receipts: [],
  fuelCardRecords: [],
  tollFees: [],
  quotations: mockData.quotations,
  billingRules: mockData.billingRules,
  diffRecords: [],
  checkRecords: [],
  importFiles: [],
  currentCheckId: null,
  currentStep: 0,
  selectedDiffIds: [],
  filterDiffType: 'all',
  filterDiffStatus: 'all',
  searchKeyword: '',
  filterSchemes: [],

  setCurrentStep: (step) => set({ currentStep: step }),

  addImportFile: (file) => set((state) => ({ importFiles: [...state.importFiles, file] })),

  updateImportFile: (id, updates) =>
    set((state) => ({
      importFiles: state.importFiles.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    })),

  removeImportFile: (id) =>
    set((state) => ({
      importFiles: state.importFiles.filter((f) => f.id !== id),
    })),

  clearImportFiles: () => set({ importFiles: [] }),

  processFileToPreview: async (fileId, file, type) => {
    const result = await preprocessImportFile(file, type);

    if (result.error) {
      get().updateImportFile(fileId, {
        status: 'error',
        errorMessage: result.error,
        headers: result.headers,
      });
      return;
    }

    get().updateImportFile(fileId, {
      status: 'preview',
      headers: result.headers,
      validRows: result.validRows,
      invalidRows: result.invalidRows,
      invalidDetails: result.invalidDetails,
      parsedData: result.parsedData,
      progress: 100,
      rows: result.validRows + result.invalidRows,
    });
  },

  confirmImportPreview: (fileId) => {
    const file = get().importFiles.find((f) => f.id === fileId);
    if (!file || file.status !== 'preview' || !file.parsedData) return;

    switch (file.type) {
      case 'waybill':
        get().setWaybills([...get().waybills, ...file.parsedData]);
        break;
      case 'receipt':
        get().setReceipts([...get().receipts, ...file.parsedData]);
        break;
      case 'fuelCard':
        get().setFuelCardRecords([...get().fuelCardRecords, ...file.parsedData]);
        break;
      case 'tollFee':
        get().setTollFees([...get().tollFees, ...file.parsedData]);
        break;
      case 'quotation':
        get().setQuotations([...get().quotations, ...file.parsedData]);
        break;
    }

    get().updateImportFile(fileId, { status: 'success', parsedData: undefined });
  },

  setWaybills: (waybills) => set({ waybills }),
  setReceipts: (receipts) => set({ receipts }),
  setFuelCardRecords: (fuelCardRecords) => set({ fuelCardRecords }),
  setTollFees: (tollFees) => set({ tollFees }),
  setQuotations: (quotations) => set({ quotations }),

  addBillingRule: (rule) => set((state) => ({ billingRules: [...state.billingRules, rule] })),

  updateBillingRule: (id, updates) =>
    set((state) => ({
      billingRules: state.billingRules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    })),

  deleteBillingRule: (id) =>
    set((state) => ({
      billingRules: state.billingRules.filter((r) => r.id !== id),
    })),

  toggleBillingRule: (id) =>
    set((state) => ({
      billingRules: state.billingRules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    })),

  runCheck: async () => {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const { waybills, receipts, fuelCardRecords, tollFees, quotations, billingRules } = get();
    const checkId = generateId();
    const diffs = runCheckEngine(waybills, receipts, fuelCardRecords, tollFees, quotations, billingRules, checkId);

    set({
      diffRecords: diffs,
      currentCheckId: checkId,
      selectedDiffIds: [],
      currentStep: 2,
    });
  },

  getCheckSummary: () => {
    const { waybills, diffRecords } = get();
    const waybillSummaries = computeWaybillSummaries(waybills, diffRecords);
    return computeSummary(waybills, diffRecords, waybillSummaries);
  },

  getCarrierSummaries: () => {
    const { waybills, diffRecords } = get();
    const waybillSummaries = computeWaybillSummaries(waybills, diffRecords);
    return computeCarrierSummaries(waybillSummaries);
  },

  getWaybillSummaries: () => {
    const { waybills, diffRecords } = get();
    return computeWaybillSummaries(waybills, diffRecords);
  },

  setDiffStatus: (id, status, remark, adjustedDiffAmount) =>
    set((state) => {
      const newDiffs = state.diffRecords.map((d) =>
        d.id === id
          ? {
              ...d,
              status,
              remark: remark ?? d.remark,
              diffAmount: adjustedDiffAmount !== undefined ? adjustedDiffAmount : d.diffAmount,
              handler: '当前用户',
              handleTime: new Date().toLocaleString('zh-CN'),
            }
          : d
      );
      return { diffRecords: newDiffs };
    }),

  setBatchDiffStatus: (ids, status, remark) =>
    set((state) => {
      const newDiffs = state.diffRecords.map((d) =>
        ids.includes(d.id)
          ? {
              ...d,
              status,
              remark: remark ?? d.remark,
              handler: '当前用户',
              handleTime: new Date().toLocaleString('zh-CN'),
            }
          : d
      );
      return { diffRecords: newDiffs, selectedDiffIds: [] };
    }),

  setDiffRemark: (id, remark) =>
    set((state) => ({
      diffRecords: state.diffRecords.map((d) => (d.id === id ? { ...d, remark } : d)),
    })),

  toggleSelectDiff: (id) =>
    set((state) => ({
      selectedDiffIds: state.selectedDiffIds.includes(id)
        ? state.selectedDiffIds.filter((i) => i !== id)
        : [...state.selectedDiffIds, id],
    })),

  selectAllDiffs: () =>
    set((state) => ({
      selectedDiffIds: state.getFilteredDiffs().map((d) => d.id),
    })),

  clearSelection: () => set({ selectedDiffIds: [] }),

  setFilterDiffType: (type) => set({ filterDiffType: type, selectedDiffIds: [] }),
  setFilterDiffStatus: (status) => set({ filterDiffStatus: status, selectedDiffIds: [] }),
  setSearchKeyword: (keyword) => set({ searchKeyword: keyword, selectedDiffIds: [] }),

  saveCheckRecord: () => {
    const {
      getCheckSummary,
      getWaybillSummaries,
      getCarrierSummaries,
      currentCheckId,
      diffRecords,
      waybills,
      receipts,
      fuelCardRecords,
      tollFees,
      quotations,
    } = get();
    const summary = getCheckSummary();
    const waybillSummaries = getWaybillSummaries();
    const carrierSummaries = getCarrierSummaries();
    const now = new Date().toISOString().split('T')[0];

    const record: CheckRecord = {
      id: currentCheckId || generateId(),
      checkBatchNo: `CHECK${now.replace(/-/g, '')}${String(Date.now()).slice(-3)}`,
      checkDate: now,
      totalWaybills: summary.totalWaybills,
      matchedCount: summary.matchedCount,
      diffCount: summary.diffCount,
      affectedWaybillCount: summary.affectedWaybillCount,
      status: 'reviewing',
      operator: '当前用户',
      totalAmount: summary.totalAmount,
      diffAmount: summary.diffAmount,
      payableAmount: summary.payableAmount,
      diffs: diffRecords,
      waybillSummaries,
      carrierSummaries,
      waybills,
      receipts,
      fuelCardRecords,
      tollFees,
      quotations,
    };

    saveToIndexedDB(record);

    set((state) => ({
      checkRecords: [record, ...state.checkRecords.filter((r) => r.id !== record.id)],
      currentStep: 3,
    }));
  },

  loadCheckRecord: (id) => {
    const applyRecord = (rec: CheckRecord) => {
      if (!rec) return;
      set({
        diffRecords: rec.diffs || [],
        currentCheckId: rec.id,
        selectedDiffIds: [],
        waybills: rec.waybills || [],
        receipts: rec.receipts || [],
        fuelCardRecords: rec.fuelCardRecords || [],
        tollFees: rec.tollFees || [],
        quotations: rec.quotations || [],
        currentStep: 3,
      });
    };

    const inMem = get().checkRecords.find((r) => r.id === id);
    if (inMem && inMem.diffs) {
      applyRecord(inMem);
    } else {
      loadOneFromIndexedDB(id).then(applyRecord);
    }
  },

  loadHistoryFromDB: async () => {
    const records = await loadAllFromIndexedDB();
    set({ checkRecords: records });
  },

  markRecordReviewed: (id, remark) =>
    set((state) => {
      const now = new Date().toLocaleString('zh-CN');
      const updated = state.checkRecords.map((r) =>
        r.id === id
          ? ({ ...r, status: 'reviewed' as CheckRecordStatus, reviewedAt: now, remark: remark || r.remark } as CheckRecord)
          : r
      );
      updated.forEach((rec) => {
        if (rec.id === id) saveToIndexedDB(rec);
      });
      return { checkRecords: updated };
    }),

  markRecordArchived: (id, remark) =>
    set((state) => {
      const now = new Date().toLocaleString('zh-CN');
      const updated = state.checkRecords.map((r) =>
        r.id === id
          ? ({ ...r, status: 'archived' as CheckRecordStatus, archivedAt: now, remark: remark || r.remark } as CheckRecord)
          : r
      );
      updated.forEach((rec) => {
        if (rec.id === id) saveToIndexedDB(rec);
      });
      return { checkRecords: updated };
    }),

  getFilteredDiffs: () => {
    const { diffRecords, filterDiffType, filterDiffStatus, searchKeyword } = get();

    return diffRecords.filter((d) => {
      if (filterDiffType !== 'all' && d.diffType !== filterDiffType) return false;
      if (filterDiffStatus !== 'all' && d.status !== filterDiffStatus) return false;
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        if (
          !d.waybillNo.toLowerCase().includes(kw) &&
          !d.plateNo.toLowerCase().includes(kw) &&
          !d.carrier.toLowerCase().includes(kw)
        )
          return false;
      }
      return true;
    });
  },

  saveFilterScheme: async (name, data) => {
    const scheme: FilterScheme = {
      id: generateId(),
      name,
      ...data,
      createdAt: new Date().toLocaleString('zh-CN'),
    };
    await saveFilterSchemeToDB(scheme);
    set((state) => ({ filterSchemes: [scheme, ...state.filterSchemes] }));
  },

  loadFilterSchemes: async () => {
    const list = await loadFilterSchemesFromDB();
    set({ filterSchemes: list });
  },

  deleteFilterScheme: async (id) => {
    await deleteFilterSchemeFromDB(id);
    set((state) => ({ filterSchemes: state.filterSchemes.filter((s) => s.id !== id) }));
  },
}));
