import { useState, useEffect, useMemo } from 'react';
import {
  Download,
  Archive,
  ChevronLeft,
  Search,
  Eye,
  FileSpreadsheet,
  Calendar,
  Clock,
  TrendingDown,
  TrendingUp,
  FileText,
  AlertTriangle,
  CheckCircle,
  FileCheck,
  Truck,
  Building2,
  GitCompareArrows,
  Filter,
  X,
  BookmarkPlus,
  Bookmark,
  Trash2,
  ChevronDown,
  Award,
  BarChart3,
  AlertOctagon,
  Route,
} from 'lucide-react';
import { StepIndicator } from '@/components/StepIndicator';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { useAppStore } from '@/store/useAppStore';
import { exportReconciliation, exportDiffRecords } from '@/utils/exporter';
import { formatAmount } from '@/utils/fileParser';
import {
  CheckRecord,
  CheckRecordStatus,
  DIFF_TYPE_LABELS,
  DIFF_TYPE_COLORS,
  DIFF_STATUS_LABELS,
  DIFF_STATUS_COLORS,
  CHECK_RECORD_STATUS_LABELS,
  CHECK_RECORD_STATUS_COLORS,
  WaybillSummary,
  CarrierSummary,
  FilterScheme,
} from '@/types';

const steps = ['文件导入', '规则设置', '差异核对', '结果复核', '导出归档'];

type DetailTab =
  | 'overview'
  | 'diffs'
  | 'waybills'
  | 'carriers'
  | 'rawWaybills'
  | 'rawReceipts'
  | 'rawFuel'
  | 'rawToll'
  | 'rawQuotation';

type CompareDim = 'carrier' | 'line' | 'diffType';

const resolveWaybillFinalStatus = (statuses: string[]): string => {
  if (statuses.length === 0) return '正常';
  if (statuses.includes('adjusted')) return '已调整';
  if (statuses.includes('rejected')) return '已驳回';
  if (statuses.includes('confirmed')) return '已确认';
  if (statuses.includes('pending')) return '待处理';
  return '正常';
};

interface UnifiedCompareRow {
  key: string;
  label: string;
  waybillCountA: number;
  waybillCountB: number;
  diffAmountA: number;
  diffAmountB: number;
  payableAmountA: number;
  payableAmountB: number;
}

interface ReviewInsight {
  topCarrier: { carrier: string; diffAmount: number } | null;
  topLine: { line: string; payableAmount: number; waybillCount: number } | null;
  topDiffType: { diffType: string; count: number; diffAmount: number } | null;
  carrierRank: { carrier: string; diffAmount: number }[];
}

const buildReviewInsight = (record: CheckRecord): ReviewInsight => {
  const carrierRank = [...(record.carrierSummaries || [])]
    .sort((a, b) => b.diffAmount - a.diffAmount)
    .map((cs) => ({ carrier: cs.carrier, diffAmount: cs.diffAmount }));
  const topCarrier = carrierRank[0]?.diffAmount > 0 ? carrierRank[0] : null;

  const wbMap = new Map<string, WaybillSummary>();
  (record.waybillSummaries || []).forEach((ws) => wbMap.set(ws.waybillNo, ws));
  const lineMap = new Map<string, { line: string; payableAmount: number; waybillCount: number }>();
  (record.waybills || []).forEach((w) => {
    const key = w.line || '未填线路';
    const ws = wbMap.get(w.waybillNo);
    const prev = lineMap.get(key) || { line: key, payableAmount: 0, waybillCount: 0 };
    lineMap.set(key, {
      line: key,
      payableAmount: prev.payableAmount + (ws?.payableAmount ?? w.freight),
      waybillCount: prev.waybillCount + 1,
    });
  });
  const lineRank = Array.from(lineMap.values()).sort((a, b) => b.payableAmount - a.payableAmount);
  const topLine = lineRank[0] || null;

  const diffTypeMap = new Map<string, { diffType: string; count: number; diffAmount: number }>();
  (record.diffs || []).forEach((d) => {
    const prev = diffTypeMap.get(d.diffType) || { diffType: d.diffType, count: 0, diffAmount: 0 };
    diffTypeMap.set(d.diffType, {
      diffType: d.diffType,
      count: prev.count + 1,
      diffAmount: prev.diffAmount + d.diffAmount,
    });
  });
  const diffTypeRank = Array.from(diffTypeMap.values()).sort((a, b) => b.count - a.count);
  const topDiffType = diffTypeRank[0] || null;

  return { topCarrier, topLine, topDiffType, carrierRank };
};

export const ExportArchive = () => {
  const {
    waybills,
    diffRecords,
    checkRecords,
    getCheckSummary,
    getCarrierSummaries,
    getWaybillSummaries,
    loadCheckRecord,
    loadHistoryFromDB,
    markRecordArchived,
    filterSchemes,
    saveFilterScheme,
    loadFilterSchemes,
    deleteFilterScheme,
  } = useAppStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState<CheckRecordStatus | 'all'>('all');
  const [filterCarrier, setFilterCarrier] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  const [selectedRecord, setSelectedRecord] = useState<CheckRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>('overview');
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiveRemark, setArchiveRemark] = useState('');

  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [compareBatchA, setCompareBatchA] = useState<string>('');
  const [compareBatchB, setCompareBatchB] = useState<string>('');
  const [compareDim, setCompareDim] = useState<CompareDim>('carrier');

  const [showSchemeDialog, setShowSchemeDialog] = useState(false);
  const [schemeName, setSchemeName] = useState('');
  const [showSchemeMenu, setShowSchemeMenu] = useState(false);

  useEffect(() => {
    loadHistoryFromDB();
    loadFilterSchemes();
  }, []);

  const summary = getCheckSummary();
  const carrierSummaries = getCarrierSummaries();

  const allCarriers = useMemo(() => {
    const set = new Set<string>();
    checkRecords.forEach((r) => {
      r.carrierSummaries?.forEach((cs) => set.add(cs.carrier));
    });
    return Array.from(set).sort();
  }, [checkRecords]);

  const filteredRecords = useMemo(() => {
    return checkRecords.filter((r) => {
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        const matchKw =
          r.checkBatchNo.toLowerCase().includes(kw) ||
          r.operator.includes(kw);
        if (!matchKw) return false;
      }
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterCarrier !== 'all') {
        const hasCarrier = r.carrierSummaries?.some((cs) => cs.carrier === filterCarrier);
        if (!hasCarrier) return false;
      }
      if (filterStartDate) {
        if (r.checkDate < filterStartDate) return false;
      }
      if (filterEndDate) {
        if (r.checkDate > filterEndDate) return false;
      }
      return true;
    });
  }, [checkRecords, searchKeyword, filterStatus, filterCarrier, filterStartDate, filterEndDate]);

  const resetFilters = () => {
    setSearchKeyword('');
    setFilterStatus('all');
    setFilterCarrier('all');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const applyScheme = (s: FilterScheme) => {
    setSearchKeyword(s.keyword);
    setFilterStatus(s.status);
    setFilterCarrier(s.carrier);
    setFilterStartDate(s.startDate);
    setFilterEndDate(s.endDate);
    setShowSchemeMenu(false);
  };

  const handleSaveScheme = async () => {
    if (!schemeName.trim()) return;
    await saveFilterScheme(schemeName.trim(), {
      keyword: searchKeyword,
      status: filterStatus,
      carrier: filterCarrier,
      startDate: filterStartDate,
      endDate: filterEndDate,
    });
    setSchemeName('');
    setShowSchemeDialog(false);
  };

  const handleExportAll = () => {
    const filename = `对账报表_${new Date().toISOString().slice(0, 10)}`;
    const ws = getWaybillSummaries();
    const cs = getCarrierSummaries();
    const s = getCheckSummary();
    const st = useAppStore.getState();
    exportReconciliation(
      waybills,
      diffRecords,
      s,
      cs,
      filename,
      ws,
      st.receipts,
      st.fuelCardRecords,
      st.tollFees,
      st.quotations
    );
  };

  const handleExportDiffs = () => {
    const filename = `差异明细_${new Date().toISOString().slice(0, 10)}`;
    exportDiffRecords(diffRecords, filename);
  };

  const handleExportFiltered = () => {
    if (filteredRecords.length === 0) return;
    const mergedDiffs = filteredRecords.flatMap((r) => r.diffs || []);
    const mergedWaybills = filteredRecords.flatMap((r) => r.waybills || []);
    const mergedWaybillSummaries = filteredRecords.flatMap((r) => r.waybillSummaries || []);
    const mergedCarrierMap = new Map<string, CarrierSummary>();
    let totalWb = 0,
      totalDiff = 0,
      totalAmt = 0,
      totalPay = 0,
      totalAffected = 0,
      totalMatched = 0;
    filteredRecords.forEach((r) => {
      totalWb += r.totalWaybills;
      totalDiff += r.diffCount;
      totalAmt += r.totalAmount;
      totalPay += r.payableAmount;
      totalAffected += r.affectedWaybillCount || 0;
      (r.carrierSummaries || []).forEach((cs) => {
        const prev = mergedCarrierMap.get(cs.carrier) || {
          carrier: cs.carrier,
          waybillCount: 0,
          totalAmount: 0,
          diffCount: 0,
          affectedWaybillCount: 0,
          diffAmount: 0,
          payableAmount: 0,
        };
        mergedCarrierMap.set(cs.carrier, {
          carrier: cs.carrier,
          waybillCount: prev.waybillCount + cs.waybillCount,
          totalAmount: prev.totalAmount + cs.totalAmount,
          diffCount: prev.diffCount + cs.diffCount,
          affectedWaybillCount: prev.affectedWaybillCount + (cs.affectedWaybillCount || 0),
          diffAmount: prev.diffAmount + cs.diffAmount,
          payableAmount: prev.payableAmount + cs.payableAmount,
        });
      });
    });
    totalMatched = Math.max(0, totalWb - totalAffected);
    const mergedSummary = {
      totalWaybills: totalWb,
      matchedCount: totalMatched,
      diffCount: totalDiff,
      affectedWaybillCount: totalAffected,
      diffByType: {} as any,
      totalAmount: totalAmt,
      diffAmount: filteredRecords.reduce((s, r) => s + r.diffAmount, 0),
      payableAmount: totalPay,
    };
    const filename = `筛选结果_${new Date().toISOString().slice(0, 10)}_${filteredRecords.length}批次`;
    exportReconciliation(
      mergedWaybills,
      mergedDiffs,
      mergedSummary,
      Array.from(mergedCarrierMap.values()),
      filename,
      mergedWaybillSummaries
    );
  };

  const handleViewRecord = (record: CheckRecord) => {
    setSelectedRecord(record);
    setShowDetail(true);
    setActiveDetailTab('overview');
    loadCheckRecord(record.id);
  };

  const handleExportRecord = (record: CheckRecord, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const filename = `对账报表_${record.checkBatchNo}`;
    const recSummary = {
      totalWaybills: record.totalWaybills,
      matchedCount: record.matchedCount,
      diffCount: record.diffCount,
      affectedWaybillCount: record.affectedWaybillCount || 0,
      diffByType: {} as any,
      totalAmount: record.totalAmount,
      diffAmount: record.diffAmount,
      payableAmount: record.payableAmount,
    };
    exportReconciliation(
      record.waybills || [],
      record.diffs || [],
      recSummary,
      record.carrierSummaries || [],
      filename,
      record.waybillSummaries || [],
      record.receipts || [],
      record.fuelCardRecords || [],
      record.tollFees || [],
      record.quotations || []
    );
  };

  const handleConfirmArchive = () => {
    if (!selectedRecord) return;
    markRecordArchived(selectedRecord.id, archiveRemark);
    setSelectedRecord((prev) =>
      prev
        ? {
            ...prev,
            status: 'archived',
            archivedAt: new Date().toLocaleString('zh-CN'),
            remark: archiveRemark || prev.remark,
          }
        : null
    );
    setShowArchiveDialog(false);
    setArchiveRemark('');
  };

  const compareResult = useMemo((): { type: CompareDim; rows: UnifiedCompareRow[] } | null => {
    const recA = checkRecords.find((r) => r.id === compareBatchA);
    const recB = checkRecords.find((r) => r.id === compareBatchB);
    if (!recA || !recB) return null;

    const buildEmpty = (key: string, label: string): UnifiedCompareRow => ({
      key,
      label,
      waybillCountA: 0,
      waybillCountB: 0,
      diffAmountA: 0,
      diffAmountB: 0,
      payableAmountA: 0,
      payableAmountB: 0,
    });

    if (compareDim === 'carrier') {
      const carrierMap = new Map<string, UnifiedCompareRow>();
      const build = (r: CheckRecord, side: 'A' | 'B') => {
        (r.carrierSummaries || []).forEach((cs: CarrierSummary) => {
          if (!carrierMap.has(cs.carrier)) carrierMap.set(cs.carrier, buildEmpty(cs.carrier, cs.carrier));
          const row = carrierMap.get(cs.carrier)!;
          if (side === 'A') {
            row.waybillCountA = cs.waybillCount;
            row.diffAmountA = cs.diffAmount;
            row.payableAmountA = cs.payableAmount;
          } else {
            row.waybillCountB = cs.waybillCount;
            row.diffAmountB = cs.diffAmount;
            row.payableAmountB = cs.payableAmount;
          }
        });
      };
      build(recA, 'A');
      build(recB, 'B');
      return { type: 'carrier', rows: Array.from(carrierMap.values()) };
    }

    if (compareDim === 'line') {
      const lineMap = new Map<string, UnifiedCompareRow>();
      const build = (r: CheckRecord, side: 'A' | 'B') => {
        const wbMap = new Map<string, WaybillSummary>();
        const diffByLine = new Map<string, { diffAmount: number; waybillCount: number }>();
        (r.waybillSummaries || []).forEach((ws) => wbMap.set(ws.waybillNo, ws));
        (r.diffs || []).forEach((d) => {
          const wb = (r.waybills || []).find((w) => w.waybillNo === d.waybillNo);
          const key = wb?.line || '未填线路';
          const prev = diffByLine.get(key) || { diffAmount: 0, waybillCount: 0 };
          diffByLine.set(key, { diffAmount: prev.diffAmount + d.diffAmount, waybillCount: prev.waybillCount });
        });
        const waybillLineSet = new Map<string, number>();
        (r.waybills || []).forEach((w) => {
          const key = w.line || '未填线路';
          waybillLineSet.set(key, (waybillLineSet.get(key) || 0) + 1);
        });
        waybillLineSet.forEach((wbCount, key) => {
          if (!lineMap.has(key)) lineMap.set(key, buildEmpty(key, key));
          const row = lineMap.get(key)!;
          const ws = (r.waybills || []).filter((w) => (w.line || '未填线路') === key);
          const payable = ws.reduce(
            (s, w) => s + (wbMap.get(w.waybillNo)?.payableAmount ?? w.freight),
            0
          );
          const diffInfo = diffByLine.get(key);
          if (side === 'A') {
            row.waybillCountA = wbCount;
            row.diffAmountA = diffInfo?.diffAmount || 0;
            row.payableAmountA = payable;
          } else {
            row.waybillCountB = wbCount;
            row.diffAmountB = diffInfo?.diffAmount || 0;
            row.payableAmountB = payable;
          }
        });
      };
      build(recA, 'A');
      build(recB, 'B');
      return { type: 'line', rows: Array.from(lineMap.values()) };
    }

    const diffMap = new Map<string, UnifiedCompareRow>();
    const build = (r: CheckRecord, side: 'A' | 'B') => {
      const wbSetByType = new Map<string, Set<string>>();
      const diffAmtByType = new Map<string, number>();
      (r.diffs || []).forEach((d) => {
        if (!wbSetByType.has(d.diffType)) wbSetByType.set(d.diffType, new Set());
        wbSetByType.get(d.diffType)!.add(d.waybillNo);
        diffAmtByType.set(d.diffType, (diffAmtByType.get(d.diffType) || 0) + d.diffAmount);
      });
      wbSetByType.forEach((wbSet, key) => {
        const label = (DIFF_TYPE_LABELS as any)[key] || key;
        if (!diffMap.has(key)) diffMap.set(key, buildEmpty(key, label));
        const row = diffMap.get(key)!;
        const diffs = (r.diffs || []).filter((d) => d.diffType === key);
        const affectedNos = new Set(diffs.map((d) => d.waybillNo));
        const payable = (r.waybillSummaries || [])
          .filter((ws) => affectedNos.has(ws.waybillNo))
          .reduce((s, ws) => s + ws.payableAmount, 0);
        if (side === 'A') {
          row.waybillCountA = wbSet.size;
          row.diffAmountA = diffAmtByType.get(key) || 0;
          row.payableAmountA = payable;
        } else {
          row.waybillCountB = wbSet.size;
          row.diffAmountB = diffAmtByType.get(key) || 0;
          row.payableAmountB = payable;
        }
      });
    };
    build(recA, 'A');
    build(recB, 'B');
    return { type: 'diffType', rows: Array.from(diffMap.values()) };
  }, [compareBatchA, compareBatchB, compareDim, checkRecords]);

  const deltaPct = (a: number, b: number) => {
    if (a === 0) return b === 0 ? 0 : 100;
    return Math.round(((b - a) / a) * 1000) / 10;
  };

  const dimLabel = compareDim === 'carrier' ? '承运商' : compareDim === 'line' ? '线路' : '差异类型';

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">导出归档</h1>
        <p className="text-gray-500 mt-1">导出对账报表，查看历史核对记录，完成最终归档</p>
      </div>

      <div className="mb-8 bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <StepIndicator steps={steps} currentStep={4} />
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="col-span-1">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg shadow-blue-600/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">对账总表</h3>
                <p className="text-blue-100 text-sm">当前处理批次</p>
              </div>
            </div>
            <p className="text-blue-100 text-sm mb-4">
              按当前正在处理的批次数据导出，含原始五类数据、差异明细、两层汇总
            </p>
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={handleExportAll}
              className="w-full bg-white text-blue-600 hover:bg-blue-50"
            >
              导出对账总表
            </Button>
          </div>
        </div>

        <div className="col-span-1">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-6 text-white shadow-lg shadow-amber-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">差异明细</h3>
                <p className="text-amber-100 text-sm">当前处理批次</p>
              </div>
            </div>
            <p className="text-amber-100 text-sm mb-4">
              按当前正在处理的批次导出所有差异记录，含问题类型、金额、状态
            </p>
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={handleExportDiffs}
              className="w-full bg-white text-amber-600 hover:bg-amber-50"
            >
              导出差异明细
            </Button>
          </div>
        </div>

        <div className="col-span-1">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-lg shadow-emerald-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">历史记录</h3>
                <p className="text-emerald-100 text-sm">核对归档</p>
              </div>
            </div>
            <p className="text-emerald-100 text-sm mb-4">
              共 {checkRecords.length} 条历史核对记录，支持追溯查询
            </p>
            <Button
              variant="secondary"
              size="sm"
              icon={CheckCircle}
              className="w-full bg-white text-emerald-600 hover:bg-emerald-50"
              onClick={() => document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              查看历史记录
            </Button>
          </div>
        </div>

        <div className="col-span-1">
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg shadow-purple-500/20 cursor-pointer" onClick={() => setShowCompareDialog(true)}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <GitCompareArrows className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">批次对比</h3>
                <p className="text-purple-100 text-sm">双批次波动分析</p>
              </div>
            </div>
            <p className="text-purple-100 text-sm mb-4">
              选择两个批次，按承运商、线路、差异类型查看波动
            </p>
            <Button
              variant="secondary"
              size="sm"
              icon={GitCompareArrows}
              className="w-full bg-white text-purple-600 hover:bg-purple-50"
              onClick={(e) => { e.stopPropagation(); setShowCompareDialog(true); }}
            >
              开始对比
            </Button>
          </div>
        </div>
      </div>

      <div id="history-section" className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="font-semibold text-gray-900">历史核对记录</h2>
              <p className="text-sm text-gray-500 mt-0.5">所有核对记录永久保存，支持追溯查询与归档操作</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowSchemeMenu((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  <Bookmark className="w-4 h-4 text-gray-500" />
                  <span>筛选方案</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
                {showSchemeMenu && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-100 z-20 overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                      <button
                        onClick={() => { setShowSchemeMenu(false); setShowSchemeDialog(true); setSchemeName(''); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <BookmarkPlus className="w-4 h-4" />
                        保存当前筛选为方案
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filterSchemes.length === 0 && (
                        <div className="p-4 text-center text-sm text-gray-400">暂无保存的筛选方案</div>
                      )}
                      {filterSchemes.map((s) => (
                        <div key={s.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 group">
                          <button
                            onClick={() => applyScheme(s)}
                            className="flex-1 text-left"
                          >
                            <div className="text-sm font-medium text-gray-900">{s.name}</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {s.status !== 'all' && `${CHECK_RECORD_STATUS_LABELS[s.status]} · `}
                              {s.carrier !== 'all' && `${s.carrier} · `}
                              {(s.startDate || s.endDate) && `${s.startDate || '...'}~${s.endDate || '...'} · `}
                              {s.keyword && `关键词:${s.keyword}`}
                              {!s.keyword && s.status === 'all' && s.carrier === 'all' && !s.startDate && !s.endDate && '无筛选条件'}
                            </div>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteFilterScheme(s.id); }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                icon={Download}
                onClick={handleExportFiltered}
                disabled={filteredRecords.length === 0}
              >
                导出筛选结果 ({filteredRecords.length})
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索批次号、操作人..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-60 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as CheckRecordStatus | 'all')}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="all">全部状态</option>
                {(Object.keys(CHECK_RECORD_STATUS_LABELS) as CheckRecordStatus[]).map((s) => (
                  <option key={s} value={s}>{CHECK_RECORD_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>

            <select
              value={filterCarrier}
              onChange={(e) => setFilterCarrier(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="all">全部承运商</option>
              {allCarriers.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              />
              <span className="text-gray-400 text-sm">至</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              />
            </div>

            <Button variant="outline" size="sm" icon={X} onClick={resetFilters}>
              重置
            </Button>

            <span className="text-sm text-gray-400 ml-auto">
              共 {filteredRecords.length} 条记录
            </span>
          </div>
        </div>

        <div className="divide-y divide-gray-100 max-h-[550px] overflow-y-auto">
          {filteredRecords.map((record, index) => (
            <div
              key={record.id}
              className="p-5 hover:bg-gray-50 transition-colors cursor-pointer group"
              onClick={() => handleViewRecord(record)}
              style={{
                animation: `slideIn 0.3s ease-out ${index * 0.05}s both`,
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        {record.checkBatchNo}
                      </h3>
                      <Badge className={CHECK_RECORD_STATUS_COLORS[record.status]} size="sm">
                        {CHECK_RECORD_STATUS_LABELS[record.status]}
                      </Badge>
                      {(record.reviewedAt || record.archivedAt) && (
                        <span className="text-xs text-gray-400">
                          {record.archivedAt ? `归档于 ${record.archivedAt}` : `复核于 ${record.reviewedAt}`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {record.checkDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        操作人：{record.operator}
                      </span>
                      {record.carrierSummaries && record.carrierSummaries.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {record.carrierSummaries.length} 家承运商
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-6 mt-3">
                      <div>
                        <p className="text-xs text-gray-400">运单数</p>
                        <p className="text-sm font-medium text-gray-900">{record.totalWaybills}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">受影响运单</p>
                        <p className="text-sm font-medium text-amber-600">{record.affectedWaybillCount || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">差异数</p>
                        <p className="text-sm font-medium text-rose-600">{record.diffCount}</p>
                      </div>
                      <div className="border-l border-gray-200 pl-6">
                        <p className="text-xs text-gray-400">应付金额</p>
                        <p className="text-sm font-bold text-blue-600">¥{formatAmount(record.payableAmount)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-4">
                  <Button variant="outline" size="sm" icon={Eye}>
                    查看详情
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Download}
                    onClick={(e) => handleExportRecord(record, e)}
                  >
                    导出
                  </Button>
                  {record.status === 'reviewed' && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Archive}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRecord(record);
                        setShowArchiveDialog(true);
                      }}
                    >
                      归档
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredRecords.length === 0 && (
          <div className="text-center py-16">
            <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无符合条件的历史记录</p>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-start">
        <Button variant="outline" icon={ChevronLeft} onClick={() => window.history.back()}>
          返回上一步
        </Button>
      </div>

      {showDetail && selectedRecord && (() => {
        const insight = buildReviewInsight(selectedRecord);
        return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">{selectedRecord.checkBatchNo}</h3>
                  <Badge className={CHECK_RECORD_STATUS_COLORS[selectedRecord.status]}>
                    {CHECK_RECORD_STATUS_LABELS[selectedRecord.status]}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 mt-1">核对详情 · 操作人 {selectedRecord.operator}</p>
              </div>
              <button
                onClick={() => setShowDetail(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="px-6 pt-4 border-b border-gray-100 flex items-center gap-1 flex-shrink-0 flex-wrap">
              {([
                ['overview', '概览'],
                ['diffs', `差异明细 (${selectedRecord.diffs?.length || 0})`],
                ['waybills', `按运单 (${selectedRecord.waybillSummaries?.length || 0})`],
                ['carriers', `按承运商 (${selectedRecord.carrierSummaries?.length || 0})`],
                ['rawWaybills', `原始运单 (${selectedRecord.waybills?.length || 0})`],
                ['rawReceipts', `原始回单 (${selectedRecord.receipts?.length || 0})`],
                ['rawFuel', `原始油卡 (${selectedRecord.fuelCardRecords?.length || 0})`],
                ['rawToll', `原始过路费 (${selectedRecord.tollFees?.length || 0})`],
                ['rawQuotation', `原始报价 (${selectedRecord.quotations?.length || 0})`],
              ] as [DetailTab, string][]).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveDetailTab(tab)}
                  className={`px-3 py-2 text-sm rounded-t-lg font-medium transition-colors whitespace-nowrap ${
                    activeDetailTab === tab
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {activeDetailTab === 'overview' && (
                <div>
                  <div className="mb-6 p-5 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-gray-900">复盘结论</h4>
                      <span className="text-xs text-gray-400">自动归纳本批次核心指标</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg p-4 border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="w-4 h-4 text-amber-500" />
                          <span className="text-xs text-gray-500 font-medium">差异金额最高承运商</span>
                        </div>
                        {insight.topCarrier ? (
                          <>
                            <p className="text-base font-semibold text-gray-900">{insight.topCarrier.carrier}</p>
                            <p className="text-sm text-red-600 mt-1">差异金额 ¥{formatAmount(insight.topCarrier.diffAmount)}</p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-400">本批次无差异</p>
                        )}
                        {insight.carrierRank.length > 1 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-400 mb-1">承运商差异排行 TOP 3</p>
                            <div className="space-y-1">
                              {insight.carrierRank.slice(0, 3).map((c, i) => (
                                <div key={c.carrier} className="flex justify-between text-xs">
                                  <span className="text-gray-600">#{i + 1} {c.carrier}</span>
                                  <span className="text-red-500 font-medium">¥{formatAmount(c.diffAmount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Route className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs text-gray-500 font-medium">金额最大线路</span>
                        </div>
                        {insight.topLine ? (
                          <>
                            <p className="text-base font-semibold text-gray-900 truncate">{insight.topLine.line}</p>
                            <div className="flex items-center gap-3 mt-1 text-sm">
                              <span className="text-blue-600">应付 ¥{formatAmount(insight.topLine.payableAmount)}</span>
                              <span className="text-gray-400">{insight.topLine.waybillCount} 单</span>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-gray-400">暂无运单数据</p>
                        )}
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertOctagon className="w-4 h-4 text-rose-500" />
                          <span className="text-xs text-gray-500 font-medium">最集中问题类型</span>
                        </div>
                        {insight.topDiffType ? (
                          <>
                            <div className="flex items-center gap-2">
                              <Badge className={DIFF_TYPE_COLORS[insight.topDiffType.diffType as keyof typeof DIFF_TYPE_COLORS] || 'bg-gray-100 text-gray-600'} size="sm">
                                {(DIFF_TYPE_LABELS as any)[insight.topDiffType.diffType] || insight.topDiffType.diffType}
                              </Badge>
                              <span className="text-base font-semibold text-gray-900">{insight.topDiffType.count} 次</span>
                            </div>
                            <p className="text-sm text-red-600 mt-1">涉及差异 ¥{formatAmount(insight.topDiffType.diffAmount)}</p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-400">本批次无差异</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">核对日期</p>
                      <p className="font-semibold text-gray-900 mt-1">{selectedRecord.checkDate}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">操作人</p>
                      <p className="font-semibold text-gray-900 mt-1">{selectedRecord.operator}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">运单总数</p>
                      <p className="font-semibold text-gray-900 mt-1">{selectedRecord.totalWaybills} 单</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">受影响运单</p>
                      <p className="font-semibold text-amber-600 mt-1">
                        {selectedRecord.affectedWaybillCount || 0} 单
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <h4 className="font-medium text-gray-900">金额统计</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-gray-400" />
                          运费总额
                        </span>
                        <span className="font-medium">¥{formatAmount(selectedRecord.totalAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600 flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-red-400" />
                          差异金额
                        </span>
                        <span className="font-medium text-red-600">
                          -¥{formatAmount(selectedRecord.diffAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-gray-900 font-semibold">应付金额</span>
                        <span className="text-xl font-bold text-blue-600">
                          ¥{formatAmount(selectedRecord.payableAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">原始数据快照</p>
                      <div className="text-sm space-y-1">
                        <p>运单：{selectedRecord.waybills?.length || 0} 条</p>
                        <p>回单：{selectedRecord.receipts?.length || 0} 条</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">&nbsp;</p>
                      <div className="text-sm space-y-1">
                        <p>油卡：{selectedRecord.fuelCardRecords?.length || 0} 条</p>
                        <p>过路费：{selectedRecord.tollFees?.length || 0} 条</p>
                        <p>报价：{selectedRecord.quotations?.length || 0} 条</p>
                      </div>
                    </div>
                  </div>

                  {selectedRecord.remark && (
                    <div className="pt-4 border-t border-gray-100">
                      <h4 className="font-medium text-gray-900 mb-2">备注</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedRecord.remark}</p>
                    </div>
                  )}
                </div>
              )}

              {activeDetailTab === 'diffs' && selectedRecord.diffs && selectedRecord.diffs.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">运单号</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">问题类型</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">差异金额</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">状态</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">备注</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedRecord.diffs.map((d) => (
                        <tr key={d.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">{d.waybillNo}</td>
                          <td className="px-3 py-2">
                            <Badge className={DIFF_TYPE_COLORS[d.diffType]} size="sm">
                              {DIFF_TYPE_LABELS[d.diffType]}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right text-red-600 font-medium">¥{formatAmount(d.diffAmount)}</td>
                          <td className="px-3 py-2 text-center">
                            <Badge className={DIFF_STATUS_COLORS[d.status]} size="sm">
                              {DIFF_STATUS_LABELS[d.status]}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate">{d.remark || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeDetailTab === 'waybills' && selectedRecord.waybillSummaries && selectedRecord.waybillSummaries.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">运单号</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">车牌号</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">承运商</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">运费</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">差异数</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">问题类型</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">差异金额</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">应付金额</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">最终状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedRecord.waybillSummaries.map((ws) => {
                        const wbDiffs = (selectedRecord.diffs || []).filter((d) => d.waybillNo === ws.waybillNo);
                        const finalStatus = resolveWaybillFinalStatus(wbDiffs.map((d) => d.status));
                        const statusColor =
                          finalStatus === '已调整'
                            ? DIFF_STATUS_COLORS.adjusted
                            : finalStatus === '已驳回'
                            ? DIFF_STATUS_COLORS.rejected
                            : finalStatus === '已确认'
                            ? DIFF_STATUS_COLORS.confirmed
                            : finalStatus === '待处理'
                            ? DIFF_STATUS_COLORS.pending
                            : 'bg-emerald-50 text-emerald-600 border-emerald-200';
                        return (
                          <tr key={ws.waybillNo} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-900">{ws.waybillNo}</td>
                            <td className="px-3 py-2 text-gray-600">{ws.plateNo}</td>
                            <td className="px-3 py-2 text-gray-600">{ws.carrier}</td>
                            <td className="px-3 py-2 text-right text-gray-900">¥{formatAmount(ws.freight)}</td>
                            <td className="px-3 py-2 text-center">
                              <Badge
                                className={
                                  ws.diffCount > 0
                                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                                    : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                }
                                size="sm"
                              >
                                {ws.diffCount > 0 ? `${ws.diffCount} 条` : '无'}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {ws.diffTypes.map((t) => (
                                  <Badge key={t} className={DIFF_TYPE_COLORS[t]} size="sm">
                                    {DIFF_TYPE_LABELS[t]}
                                  </Badge>
                                ))}
                                {ws.diffTypes.length === 0 && <span className="text-gray-400 text-xs">-</span>}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right text-red-600">
                              {ws.diffAmount > 0 ? `-¥${formatAmount(ws.diffAmount)}` : '-'}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-blue-600">
                              ¥{formatAmount(ws.payableAmount)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Badge className={statusColor} size="sm">
                                {finalStatus}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {activeDetailTab === 'carriers' && selectedRecord.carrierSummaries && selectedRecord.carrierSummaries.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">承运商</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">运单数</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">受影响运单</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">差异数</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">总金额</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">差异金额</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">应付金额</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedRecord.carrierSummaries.map((cs) => (
                        <tr key={cs.carrier} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">{cs.carrier}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{cs.waybillCount}</td>
                          <td className="px-3 py-2 text-right">
                            <Badge
                              className={
                                (cs.affectedWaybillCount || 0) > 0
                                  ? 'bg-amber-100 text-amber-700 border-amber-200'
                                  : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              }
                              size="sm"
                            >
                              {cs.affectedWaybillCount || 0}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600">{cs.diffCount}</td>
                          <td className="px-3 py-2 text-right text-gray-900">¥{formatAmount(cs.totalAmount)}</td>
                          <td className="px-3 py-2 text-right text-red-600">-¥{formatAmount(cs.diffAmount)}</td>
                          <td className="px-3 py-2 text-right font-medium text-blue-600">
                            ¥{formatAmount(cs.payableAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeDetailTab === 'rawWaybills' && selectedRecord.waybills && selectedRecord.waybills.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[60vh]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">运单号</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">车牌号</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">线路</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">车型</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">重量</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">里程</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">运费</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">承运商</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">发运日期</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedRecord.waybills.map((w) => (
                        <tr key={w.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">{w.waybillNo}</td>
                          <td className="px-3 py-2 text-gray-600">{w.plateNo}</td>
                          <td className="px-3 py-2 text-gray-600">{w.line}</td>
                          <td className="px-3 py-2 text-gray-600">{w.vehicleType}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{w.weight}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{w.mileage}</td>
                          <td className="px-3 py-2 text-right text-gray-900">¥{formatAmount(w.freight)}</td>
                          <td className="px-3 py-2 text-gray-600">{w.carrier}</td>
                          <td className="px-3 py-2 text-gray-600">{w.sendDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeDetailTab === 'rawReceipts' && selectedRecord.receipts && selectedRecord.receipts.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[60vh]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">运单号</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">车牌号</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">回单日期</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">收货人</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedRecord.receipts.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">{r.waybillNo}</td>
                          <td className="px-3 py-2 text-gray-600">{r.plateNo}</td>
                          <td className="px-3 py-2 text-gray-600">{r.receiptDate}</td>
                          <td className="px-3 py-2 text-gray-600">{r.receiver}</td>
                          <td className="px-3 py-2 text-center">
                            <Badge
                              className={
                                r.status === 'confirmed'
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                  : 'bg-amber-50 text-amber-600 border-amber-200'
                              }
                              size="sm"
                            >
                              {r.status === 'confirmed' ? '已签收' : '待签收'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeDetailTab === 'rawFuel' && selectedRecord.fuelCardRecords && selectedRecord.fuelCardRecords.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[60vh]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">卡号</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">车牌号</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">充值日期</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">充值金额</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">余额</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedRecord.fuelCardRecords.map((f) => (
                        <tr key={f.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">{f.cardNo}</td>
                          <td className="px-3 py-2 text-gray-600">{f.plateNo}</td>
                          <td className="px-3 py-2 text-gray-600">{f.rechargeDate}</td>
                          <td className="px-3 py-2 text-right text-gray-900">¥{formatAmount(f.amount)}</td>
                          <td className="px-3 py-2 text-right text-blue-600">¥{formatAmount(f.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeDetailTab === 'rawToll' && selectedRecord.tollFees && selectedRecord.tollFees.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[60vh]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">运单号</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">车牌号</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">日期</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">金额</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">收费站</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedRecord.tollFees.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">{t.waybillNo}</td>
                          <td className="px-3 py-2 text-gray-600">{t.plateNo}</td>
                          <td className="px-3 py-2 text-gray-600">{t.tollDate}</td>
                          <td className="px-3 py-2 text-right text-gray-900">¥{formatAmount(t.amount)}</td>
                          <td className="px-3 py-2 text-gray-600">{t.station}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeDetailTab === 'rawQuotation' && selectedRecord.quotations && selectedRecord.quotations.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[60vh]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">承运商</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">线路</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">车型</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">最小重量</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">最大重量</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">单价</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">里程价</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">生效日期</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedRecord.quotations.map((q) => (
                        <tr key={q.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">{q.carrier}</td>
                          <td className="px-3 py-2 text-gray-600">{q.line}</td>
                          <td className="px-3 py-2 text-gray-600">{q.vehicleType}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{q.weightMin}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{q.weightMax}</td>
                          <td className="px-3 py-2 text-right text-gray-900">¥{formatAmount(q.unitPrice)}</td>
                          <td className="px-3 py-2 text-right text-gray-900">¥{formatAmount(q.mileagePrice)}</td>
                          <td className="px-3 py-2 text-gray-600">{q.effectiveDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Truck className="w-4 h-4" />
                {selectedRecord.waybills?.length || 0} 运单 ·
                <FileCheck className="w-4 h-4 ml-2" />
                {selectedRecord.diffs?.length || 0} 差异 ·
                <Building2 className="w-4 h-4 ml-2" />
                {selectedRecord.carrierSummaries?.length || 0} 承运商
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setShowDetail(false)}>
                  关闭
                </Button>
                {selectedRecord.status === 'reviewed' && (
                  <Button
                    variant="outline"
                    icon={Archive}
                    onClick={() => setShowArchiveDialog(true)}
                  >
                    归档
                  </Button>
                )}
                <Button
                  icon={Download}
                  onClick={() => handleExportRecord(selectedRecord)}
                >
                  导出报表
                </Button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {showCompareDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">历史批次对比分析台</h3>
                <p className="text-sm text-gray-500 mt-1">双批次横评：{dimLabel}维度下的单量、差异金额、应付金额波动</p>
              </div>
              <button
                onClick={() => setShowCompareDialog(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 flex-shrink-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">批次 A（基准）</label>
                  <select
                    value={compareBatchA}
                    onChange={(e) => setCompareBatchA(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="">请选择批次</option>
                    {checkRecords.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.checkBatchNo} · {r.checkDate} · {CHECK_RECORD_STATUS_LABELS[r.status]} · 应付¥{formatAmount(r.payableAmount)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">批次 B（对比）</label>
                  <select
                    value={compareBatchB}
                    onChange={(e) => setCompareBatchB(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="">请选择批次</option>
                    {checkRecords.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.checkBatchNo} · {r.checkDate} · {CHECK_RECORD_STATUS_LABELS[r.status]} · 应付¥{formatAmount(r.payableAmount)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(['carrier', 'line', 'diffType'] as CompareDim[]).map((dim) => (
                  <button
                    key={dim}
                    onClick={() => setCompareDim(dim)}
                    className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                      compareDim === dim
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {dim === 'carrier' && '按承运商'}
                    {dim === 'line' && '按线路'}
                    {dim === 'diffType' && '按差异类型'}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-6 pb-6 overflow-y-auto flex-1">
              {!compareBatchA || !compareBatchB ? (
                <div className="text-center py-16 bg-gray-50 rounded-lg">
                  <GitCompareArrows className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">请先选择两个批次进行对比</p>
                </div>
              ) : compareResult && compareResult.rows.length > 0 ? (
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm text-gray-500">
                    <BarChart3 className="w-4 h-4" />
                    <span>
                      共 {compareResult.rows.length} 个{dimLabel}，变化率
                      <span className="text-red-600 font-medium mx-1">上涨标红</span>
                      <span className="text-emerald-600 font-medium mr-1">下降标绿</span>
                    </span>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-slate-50 to-blue-50">
                        <tr>
                          <th
                            rowSpan={2}
                            className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-200 sticky left-0 bg-gradient-to-r from-slate-50 to-blue-50"
                          >
                            {dimLabel}
                          </th>
                          <th
                            colSpan={4}
                            className="px-3 py-2 text-center text-xs font-semibold text-gray-700 border-b border-r border-gray-200"
                          >
                            单量（运单数）
                          </th>
                          <th
                            colSpan={4}
                            className="px-3 py-2 text-center text-xs font-semibold text-gray-700 border-b border-r border-gray-200"
                          >
                            差异金额
                          </th>
                          <th
                            colSpan={4}
                            className="px-3 py-2 text-center text-xs font-semibold text-gray-700 border-b border-gray-200"
                          >
                            应付金额
                          </th>
                        </tr>
                        <tr className="bg-slate-50">
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">A</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">B</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Δ</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 border-r border-gray-200">Δ%</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">A</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">B</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Δ</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 border-r border-gray-200">Δ%</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">A</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">B</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Δ</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Δ%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {compareResult.rows.map((row) => {
                          const dWb = row.waybillCountB - row.waybillCountA;
                          const dWbPct = deltaPct(row.waybillCountA, row.waybillCountB);
                          const dDiff = row.diffAmountB - row.diffAmountA;
                          const dDiffPct = deltaPct(row.diffAmountA, row.diffAmountB);
                          const dPay = row.payableAmountB - row.payableAmountA;
                          const dPayPct = deltaPct(row.payableAmountA, row.payableAmountB);
                          const cellColor = (v: number) =>
                            v > 0 ? 'text-red-600' : v < 0 ? 'text-emerald-600' : 'text-gray-400';
                          return (
                            <tr key={row.key} className="hover:bg-blue-50/40">
                              <td className="px-3 py-2 font-medium text-gray-900 border-r border-gray-100 sticky left-0 bg-white">
                                {row.label}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-600">{row.waybillCountA}</td>
                              <td className="px-3 py-2 text-right text-gray-900 font-medium">{row.waybillCountB}</td>
                              <td className={`px-3 py-2 text-right font-medium ${cellColor(dWb)}`}>
                                {dWb > 0 ? `+${dWb}` : dWb}
                              </td>
                              <td className={`px-3 py-2 text-right font-medium border-r border-gray-100 ${cellColor(dWbPct)}`}>
                                {dWbPct > 0 ? '+' : ''}{dWbPct}%
                              </td>
                              <td className="px-3 py-2 text-right text-gray-600">¥{formatAmount(row.diffAmountA)}</td>
                              <td className="px-3 py-2 text-right text-gray-900 font-medium">¥{formatAmount(row.diffAmountB)}</td>
                              <td className={`px-3 py-2 text-right font-medium ${cellColor(dDiff)}`}>
                                {dDiff > 0 ? '+' : ''}¥{formatAmount(Math.abs(dDiff))}
                              </td>
                              <td className={`px-3 py-2 text-right font-medium border-r border-gray-100 ${cellColor(dDiffPct)}`}>
                                {dDiffPct > 0 ? '+' : ''}{dDiffPct}%
                              </td>
                              <td className="px-3 py-2 text-right text-gray-600">¥{formatAmount(row.payableAmountA)}</td>
                              <td className="px-3 py-2 text-right text-gray-900 font-medium">¥{formatAmount(row.payableAmountB)}</td>
                              <td className={`px-3 py-2 text-right font-medium ${cellColor(dPay)}`}>
                                {dPay > 0 ? '+' : ''}¥{formatAmount(Math.abs(dPay))}
                              </td>
                              <td className={`px-3 py-2 text-right font-medium ${cellColor(dPayPct)}`}>
                                {dPayPct > 0 ? '+' : ''}{dPayPct}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 bg-gray-50 rounded-lg">
                  <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">当前维度暂无可对比数据</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3 flex-shrink-0">
              <Button variant="outline" onClick={() => setShowCompareDialog(false)}>
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}

      {showArchiveDialog && selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Archive className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">确认归档</h3>
                <p className="text-sm text-gray-500">归档后记录将不可修改</p>
              </div>
            </div>

            <div className="space-y-2 mb-4 text-sm bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between">
                <span className="text-gray-500">批次号</span>
                <span className="font-medium">{selectedRecord.checkBatchNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">应付金额</span>
                <span className="font-semibold text-blue-600">¥{formatAmount(selectedRecord.payableAmount)}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm text-gray-500 mb-1 block">归档备注（可选）</label>
              <textarea
                value={archiveRemark}
                onChange={(e) => setArchiveRemark(e.target.value)}
                rows={2}
                placeholder="可添加归档备注..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>
                取消
              </Button>
              <Button variant="primary" icon={CheckCircle} onClick={handleConfirmArchive}>
                确认归档
              </Button>
            </div>
          </div>
        </div>
      )}

      {showSchemeDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <BookmarkPlus className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">保存筛选方案</h3>
                <p className="text-sm text-gray-500">保存后可在筛选方案下拉中快速复用</p>
              </div>
            </div>

            <div className="space-y-2 mb-4 text-sm bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">当前筛选条件</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">状态</span>
                  <span className="font-medium">
                    {filterStatus === 'all' ? '全部' : CHECK_RECORD_STATUS_LABELS[filterStatus]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">承运商</span>
                  <span className="font-medium">{filterCarrier === 'all' ? '全部' : filterCarrier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">日期范围</span>
                  <span className="font-medium">
                    {filterStartDate || '...'} ~ {filterEndDate || '...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">关键词</span>
                  <span className="font-medium">{searchKeyword || '无'}</span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm text-gray-500 mb-1 block">方案名称</label>
              <input
                type="text"
                value={schemeName}
                onChange={(e) => setSchemeName(e.target.value)}
                placeholder="例如：本月已归档批次"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowSchemeDialog(false); setSchemeName(''); }}>
                取消
              </Button>
              <Button variant="primary" icon={Bookmark} onClick={handleSaveScheme} disabled={!schemeName.trim()}>
                保存方案
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};
