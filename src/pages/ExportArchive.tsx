import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { StepIndicator } from '@/components/StepIndicator';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { useAppStore } from '@/store/useAppStore';
import { exportReconciliation, exportDiffRecords } from '@/utils/exporter';
import { formatAmount } from '@/utils/fileParser';
import {
  CheckRecord,
  DIFF_TYPE_LABELS,
  DIFF_TYPE_COLORS,
  DIFF_STATUS_LABELS,
  DIFF_STATUS_COLORS,
  CHECK_RECORD_STATUS_LABELS,
  CHECK_RECORD_STATUS_COLORS,
} from '@/types';

const steps = ['文件导入', '规则设置', '差异核对', '结果复核', '导出归档'];

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
  } = useAppStore();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<CheckRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'diffs' | 'waybills' | 'carriers'>('overview');
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiveRemark, setArchiveRemark] = useState('');

  useEffect(() => {
    loadHistoryFromDB();
  }, []);

  const summary = getCheckSummary();
  const carrierSummaries = getCarrierSummaries();

  const filteredRecords = checkRecords.filter(
    (r) =>
      r.checkBatchNo.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      r.operator.includes(searchKeyword)
  );

  const handleExportAll = () => {
    const filename = `对账报表_${new Date().toISOString().slice(0, 10)}`;
    const ws = getWaybillSummaries();
    const cs = getCarrierSummaries();
    const s = getCheckSummary();
    exportReconciliation(waybills, diffRecords, s, cs, filename, ws);
  };

  const handleExportDiffs = () => {
    const filename = `差异明细_${new Date().toISOString().slice(0, 10)}`;
    exportDiffRecords(diffRecords, filename);
  };

  const handleViewRecord = (record: CheckRecord) => {
    setSelectedRecord(record);
    setShowDetail(true);
    setActiveDetailTab('overview');
    loadCheckRecord(record.id);
  };

  const handleExportRecord = (record: CheckRecord, e: React.MouseEvent) => {
    e.stopPropagation();
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
    const recCarrierSummaries = record.carrierSummaries || [];
    const recWaybillSummaries = record.waybillSummaries || [];
    const recDiffs = record.diffs || [];
    const recWaybills = record.waybills || [];
    exportReconciliation(recWaybills, recDiffs, recSummary, recCarrierSummaries, filename, recWaybillSummaries);
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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">导出归档</h1>
        <p className="text-gray-500 mt-1">导出对账报表，查看历史核对记录，完成最终归档</p>
      </div>

      <div className="mb-8 bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <StepIndicator steps={steps} currentStep={4} />
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="col-span-1">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg shadow-blue-600/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">对账总表</h3>
                <p className="text-blue-100 text-sm">完整对账报表</p>
              </div>
            </div>
            <p className="text-blue-100 text-sm mb-4">
              包含运单明细、差异明细、按运单汇总、按承运商汇总的完整Excel报表
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
                <p className="text-amber-100 text-sm">仅差异数据</p>
              </div>
            </div>
            <p className="text-amber-100 text-sm mb-4">
              导出所有差异记录，包含问题类型、金额、状态等信息
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
      </div>

      <div id="history-section" className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">历史核对记录</h2>
            <p className="text-sm text-gray-500 mt-0.5">所有核对记录永久保存，支持追溯查询与归档操作</p>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索批次号、操作人..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
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
            <p className="text-gray-500">暂无历史记录</p>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-start">
        <Button variant="outline" icon={ChevronLeft} onClick={() => window.history.back()}>
          返回上一步
        </Button>
      </div>

      {showDetail && selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
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
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 pt-4 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
              {(['overview', 'diffs', 'waybills', 'carriers'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveDetailTab(tab)}
                  className={`px-4 py-2 text-sm rounded-t-lg font-medium transition-colors ${
                    activeDetailTab === tab
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {tab === 'overview' && '概览'}
                  {tab === 'diffs' && `差异明细 (${selectedRecord.diffs?.length || 0})`}
                  {tab === 'waybills' && `按运单 (${selectedRecord.waybillSummaries?.length || 0})`}
                  {tab === 'carriers' && `按承运商 (${selectedRecord.carrierSummaries?.length || 0})`}
                </button>
              ))}
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {activeDetailTab === 'overview' && (
                <div>
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
                    <thead>
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
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">运单号</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">车牌号</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">承运商</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">运费</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">差异数</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">问题类型</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">应付金额</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedRecord.waybillSummaries.map((ws) => (
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
                          <td className="px-3 py-2 text-right font-semibold text-blue-600">
                            ¥{formatAmount(ws.payableAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeDetailTab === 'carriers' && selectedRecord.carrierSummaries && selectedRecord.carrierSummaries.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
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
                  onClick={() => {
                    const filename = `对账报表_${selectedRecord.checkBatchNo}`;
                    const recSummary = {
                      totalWaybills: selectedRecord.totalWaybills,
                      matchedCount: selectedRecord.matchedCount,
                      diffCount: selectedRecord.diffCount,
                      affectedWaybillCount: selectedRecord.affectedWaybillCount || 0,
                      diffByType: {} as any,
                      totalAmount: selectedRecord.totalAmount,
                      diffAmount: selectedRecord.diffAmount,
                      payableAmount: selectedRecord.payableAmount,
                    };
                    const recCarrierSummaries = selectedRecord.carrierSummaries || [];
                    const recWaybillSummaries = selectedRecord.waybillSummaries || [];
                    const recDiffs = selectedRecord.diffs || [];
                    const recWaybills = selectedRecord.waybills || [];
                    exportReconciliation(recWaybills, recDiffs, recSummary, recCarrierSummaries, filename, recWaybillSummaries);
                  }}
                >
                  导出报表
                </Button>
              </div>
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
