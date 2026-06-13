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

  setDiffStatus: (id: string, status: DiffStatus, remark?: string) => void;
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

  getFilteredDiffs: () => DiffRecord[];
}

export const useAppStore = create<AppState>((set, get) => ({
  waybills: mockData.waybills,
  receipts: mockData.receipts,
  fuelCardRecords: mockData.fuelCardRecords,
  tollFees: mockData.tollFees,
  quotations: mockData.quotations,
  billingRules: mockData.billingRules,
  diffRecords: [],
  checkRecords: mockData.checkRecords,
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
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const { waybills } = get();
    const checkId = mockData.generateId();
    const diffs = mockData.generateDiffRecords(checkId, waybills);

    set({
      diffRecords: diffs,
      currentCheckId: checkId,
      selectedDiffIds: [],
    });
  },

  getCheckSummary: () => {
    const { waybills, diffRecords } = get();

    const diffByType: Record<DiffType, number> = {
      missing_receipt: 0,
      duplicate_waybill: 0,
      exceed_quotation: 0,
      fee_unallocated: 0,
      mileage_mismatch: 0,
      weight_mismatch: 0,
      other: 0,
    };

    let totalDiffAmount = 0;
    diffRecords.forEach((d) => {
      diffByType[d.diffType]++;
      totalDiffAmount += d.diffAmount;
    });

    const totalAmount = waybills.reduce((sum, w) => sum + w.freight, 0);
    const matchedCount = waybills.length - diffRecords.length;

    return {
      totalWaybills: waybills.length,
      matchedCount,
      diffCount: diffRecords.length,
      diffByType,
      totalAmount,
      diffAmount: totalDiffAmount,
      payableAmount: totalAmount - totalDiffAmount,
    };
  },

  getCarrierSummaries: () => {
    const { waybills, diffRecords } = get();
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
        summary.diffAmount += d.diffAmount;
      }
    });

    carrierMap.forEach((s) => {
      s.payableAmount = s.totalAmount - s.diffAmount;
    });

    return Array.from(carrierMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  },

  setDiffStatus: (id, status, remark) =>
    set((state) => ({
      diffRecords: state.diffRecords.map((d) =>
        d.id === id
          ? {
              ...d,
              status,
              remark: remark ?? d.remark,
              handler: '当前用户',
              handleTime: new Date().toLocaleString('zh-CN'),
            }
          : d
      ),
    })),

  setBatchDiffStatus: (ids, status, remark) =>
    set((state) => ({
      diffRecords: state.diffRecords.map((d) =>
        ids.includes(d.id)
          ? {
              ...d,
              status,
              remark: remark ?? d.remark,
              handler: '当前用户',
              handleTime: new Date().toLocaleString('zh-CN'),
            }
          : d
      ),
      selectedDiffIds: [],
    })),

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
    const { getCheckSummary, currentCheckId, checkRecords } = get();
    const summary = getCheckSummary();
    const now = new Date().toISOString().split('T')[0];

    const record: CheckRecord = {
      id: currentCheckId || mockData.generateId(),
      checkBatchNo: `CHECK${now.replace(/-/g, '')}${String(checkRecords.length + 1).padStart(3, '0')}`,
      checkDate: now,
      totalWaybills: summary.totalWaybills,
      matchedCount: summary.matchedCount,
      diffCount: summary.diffCount,
      status: 'reviewing',
      operator: '当前用户',
      totalAmount: summary.totalAmount,
      diffAmount: summary.diffAmount,
      payableAmount: summary.payableAmount,
    };

    set((state) => ({
      checkRecords: [record, ...state.checkRecords],
    }));
  },

  loadCheckRecord: (id) => {
    const { waybills } = get();
    const diffs = mockData.generateDiffRecords(id, waybills);
    set({
      diffRecords: diffs,
      currentCheckId: id,
      selectedDiffIds: [],
    });
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
