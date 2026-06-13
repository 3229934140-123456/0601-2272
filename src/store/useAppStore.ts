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
  ImportFile,
  FileType,
  DiffType,
  DiffStatus,
} from '@/types';
import { mockData } from '@/data/mockData';

const generateId = () => Math.random().toString(36).substring(2, 11);

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
      const expectedFreight = matchingQuotation.unitPrice + wb.weight * matchingQuotation.mileagePrice + wb.mileage * matchingQuotation.mileagePrice;
      const activeRule = billingRules.find(
        (r) => r.enabled && (r.line === wb.line || r.line === '通用')
      );
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
    const unallocatedToll = plateTollFees.filter(
      (tf) => !tf.waybillNo || tf.waybillNo.trim() === ''
    );
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

function computeSummary(waybills: Waybill[], diffRecords: DiffRecord[]): CheckSummary {
  const diffByType: Record<DiffType, number> = {
    missing_receipt: 0,
    duplicate_waybill: 0,
    exceed_quotation: 0,
    fee_unallocated: 0,
    mileage_mismatch: 0,
    weight_mismatch: 0,
    other: 0,
  };

  let effectiveDiffAmount = 0;
  diffRecords.forEach((d) => {
    diffByType[d.diffType]++;
    if (d.status !== 'rejected') {
      effectiveDiffAmount += d.diffAmount;
    }
  });

  const totalAmount = waybills.reduce((sum, w) => sum + w.freight, 0);
  const matchedCount = waybills.length - diffRecords.length;

  return {
    totalWaybills: waybills.length,
    matchedCount,
    diffCount: diffRecords.length,
    diffByType,
    totalAmount,
    diffAmount: effectiveDiffAmount,
    payableAmount: totalAmount - effectiveDiffAmount,
  };
}

function computeCarrierSummaries(waybills: Waybill[], diffRecords: DiffRecord[]): CarrierSummary[] {
  const carrierMap = new Map<string, CarrierSummary>();

  waybills.forEach((wb) => {
    if (!carrierMap.has(wb.carrier)) {
      carrierMap.set(wb.carrier, {
        carrier: wb.carrier,
        waybillCount: 0,
        totalAmount: 0,
        diffCount: 0,
        diffAmount: 0,
        payableAmount: 0,
      });
    }
    const summary = carrierMap.get(wb.carrier)!;
    summary.waybillCount++;
    summary.totalAmount += wb.freight;
  });

  diffRecords.forEach((d) => {
    if (carrierMap.has(d.carrier)) {
      const summary = carrierMap.get(d.carrier)!;
      summary.diffCount++;
      if (d.status !== 'rejected') {
        summary.diffAmount += d.diffAmount;
      }
    }
  });

  carrierMap.forEach((s) => {
    s.payableAmount = s.totalAmount - s.diffAmount;
  });

  return Array.from(carrierMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
}

const DB_NAME = 'FreightCheckDB';
const DB_VERSION = 1;
const STORE_NAME = 'checkRecords';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
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
      records.sort((a, b) => b.checkDate.localeCompare(a.checkDate));
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
      billingRules: state.billingRules.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
      ),
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
    });
  },

  getCheckSummary: () => {
    const { waybills, diffRecords } = get();
    return computeSummary(waybills, diffRecords);
  },

  getCarrierSummaries: () => {
    const { waybills, diffRecords } = get();
    return computeCarrierSummaries(waybills, diffRecords);
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
    const { getCheckSummary, currentCheckId, diffRecords, waybills } = get();
    const summary = getCheckSummary();
    const carrierSummaries = computeCarrierSummaries(waybills, diffRecords);
    const now = new Date().toISOString().split('T')[0];

    const record: CheckRecord = {
      id: currentCheckId || generateId(),
      checkBatchNo: `CHECK${now.replace(/-/g, '')}${String(Date.now()).slice(-3)}`,
      checkDate: now,
      totalWaybills: summary.totalWaybills,
      matchedCount: summary.matchedCount,
      diffCount: summary.diffCount,
      status: 'reviewing',
      operator: '当前用户',
      totalAmount: summary.totalAmount,
      diffAmount: summary.diffAmount,
      payableAmount: summary.payableAmount,
      diffs: diffRecords,
      carrierSummaries,
    };

    saveToIndexedDB(record);

    set((state) => ({
      checkRecords: [record, ...state.checkRecords],
    }));
  },

  loadCheckRecord: (id) => {
    const record = get().checkRecords.find((r) => r.id === id);
    if (record && record.diffs) {
      set({
        diffRecords: record.diffs,
        currentCheckId: record.id,
        selectedDiffIds: [],
      });
    } else {
      loadOneFromIndexedDB(id).then((rec) => {
        if (rec && rec.diffs) {
          set({
            diffRecords: rec.diffs,
            currentCheckId: rec.id,
            selectedDiffIds: [],
          });
        }
      });
    }
  },

  loadHistoryFromDB: async () => {
    const records = await loadAllFromIndexedDB();
    set({ checkRecords: records });
  },

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
}));
