import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  DollarSign,
  AlertTriangle,
  Check,
  X,
  Edit3,
  TrendingDown,
  Building2,
  Truck,
  Archive,
  FileCheck,
} from 'lucide-react';
import { StepIndicator } from '@/components/StepIndicator';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { StatCard } from '@/components/StatCard';
import { useAppStore } from '@/store/useAppStore';
import {
  DIFF_TYPE_LABELS,
  DIFF_TYPE_COLORS,
  DIFF_STATUS_LABELS,
  DIFF_STATUS_COLORS,
  DiffRecord,
  DiffStatus,
} from '@/types';
import { formatAmount } from '@/utils/fileParser';

const steps = ['文件导入', '规则设置', '差异核对', '结果复核', '导出归档'];

export const ResultReview = () => {
  const navigate = useNavigate();
  const [selectedDiff, setSelectedDiff] = useState<DiffRecord | null>(null);
  const [remarkInput, setRemarkInput] = useState('');
  const [adjustedAmount, setAdjustedAmount] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'diffs' | 'waybills' | 'carriers'>('diffs');
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [finishRemark, setFinishRemark] = useState('');

  const {
    diffRecords,
    getCheckSummary,
    getWaybillSummaries,
    getCarrierSummaries,
    setDiffStatus,
    setBatchDiffStatus,
    selectedDiffIds,
    setDiffRemark,
    setCurrentStep,
    saveCheckRecord,
    markRecordReviewed,
    currentCheckId,
  } = useAppStore();

  const summary = getCheckSummary();
  const waybillSummaries = getWaybillSummaries();
  const carrierSummaries = getCarrierSummaries();
  const pendingDiffs = diffRecords.filter((d) => d.status === 'pending');

  const handleSelectDiff = (diff: DiffRecord) => {
    setSelectedDiff(diff);
    setRemarkInput(diff.remark);
    setAdjustedAmount(null);
  };

  const handleConfirm = (id: string) => {
    setDiffStatus(id, 'confirmed', remarkInput);
    if (selectedDiff?.id === id) {
      setSelectedDiff({ ...selectedDiff, status: 'confirmed', remark: remarkInput, handler: '当前用户' });
    }
  };

  const handleReject = (id: string) => {
    setDiffStatus(id, 'rejected', remarkInput);
    if (selectedDiff?.id === id) {
      setSelectedDiff({ ...selectedDiff, status: 'rejected', remark: remarkInput, handler: '当前用户' });
    }
  };

  const handleAdjust = (id: string) => {
    if (adjustedAmount === null) return;
    setDiffStatus(id, 'adjusted', remarkInput, adjustedAmount);
    if (selectedDiff?.id === id) {
      setSelectedDiff({
        ...selectedDiff,
        status: 'adjusted',
        remark: remarkInput,
        diffAmount: adjustedAmount,
        handler: '当前用户',
      });
    }
  };

  const handleBatchConfirm = () => {
    if (selectedDiffIds.length === 0) return;
    setBatchDiffStatus(selectedDiffIds, 'confirmed', '批量确认');
  };

  const handleBatchReject = () => {
    if (selectedDiffIds.length === 0) return;
    setBatchDiffStatus(selectedDiffIds, 'rejected', '批量驳回');
  };

  const handleFinishReview = () => {
    saveCheckRecord();
    if (currentCheckId) {
      markRecordReviewed(currentCheckId, finishRemark);
    }
    setShowFinishDialog(false);
    setFinishRemark('');
    setCurrentStep(4);
    navigate('/export');
  };

  const handleNext = () => {
    if (pendingDiffs.length > 0) {
      setShowFinishDialog(true);
      return;
    }
    handleFinishReview();
  };

  const pendingCount = diffRecords.filter((d) => d.status === 'pending').length;
  const confirmedCount = diffRecords.filter((d) => d.status === 'confirmed').length;
  const rejectedCount = diffRecords.filter((d) => d.status === 'rejected').length;
  const adjustedCount = diffRecords.filter((d) => d.status === 'adjusted').length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">结果复核</h1>
        <p className="text-gray-500 mt-1">人工复核差异，确认或调整应付金额</p>
      </div>

      <div className="mb-8 bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <StepIndicator steps={steps} currentStep={3} />
      </div>

      <div className="grid grid-cols-4 gap-6 mb-6">
        <StatCard
          title="待处理"
          value={pendingCount}
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          title="已确认"
          value={confirmedCount}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="已驳回"
          value={rejectedCount}
          icon={X}
          color="red"
        />
        <StatCard
          title="已调整"
          value={adjustedCount}
          icon={Edit3}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">差异清单</h2>
                <p className="text-sm text-gray-500 mt-0.5">共 {diffRecords.length} 条差异，{pendingCount} 条待处理</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={Check}
                  onClick={handleBatchConfirm}
                  disabled={selectedDiffIds.length === 0}
                >
                  批量确认
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={X}
                  onClick={handleBatchReject}
                  disabled={selectedDiffIds.length === 0}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  批量驳回
                </Button>
              </div>
            </div>

            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {diffRecords.map((diff) => (
                <div
                  key={diff.id}
                  onClick={() => handleSelectDiff(diff)}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedDiff?.id === diff.id
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : 'hover:bg-gray-50 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium text-gray-900">{diff.waybillNo}</span>
                        <Badge className={DIFF_TYPE_COLORS[diff.diffType]} size="sm">
                          {DIFF_TYPE_LABELS[diff.diffType]}
                        </Badge>
                        <Badge className={DIFF_STATUS_COLORS[diff.status]} size="sm">
                          {DIFF_STATUS_LABELS[diff.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-1">{diff.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>{diff.plateNo}</span>
                        <span>{diff.carrier}</span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-red-600">¥{formatAmount(diff.diffAmount)}</p>
                      <p className="text-xs text-gray-400 mt-1">差异金额</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">差异详情</h2>
            </div>

            {selectedDiff ? (
              <div className="p-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">运单号</span>
                    <span className="font-medium text-gray-900">{selectedDiff.waybillNo}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">车牌号</span>
                    <span className="text-gray-700">{selectedDiff.plateNo}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">承运商</span>
                    <span className="text-gray-700">{selectedDiff.carrier}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">问题类型</span>
                    <Badge className={DIFF_TYPE_COLORS[selectedDiff.diffType]} size="sm">
                      {DIFF_TYPE_LABELS[selectedDiff.diffType]}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">状态</span>
                    <Badge className={DIFF_STATUS_COLORS[selectedDiff.status]} size="sm">
                      {DIFF_STATUS_LABELS[selectedDiff.status]}
                    </Badge>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-2">问题描述</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {selectedDiff.description}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">预期金额</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      ¥{formatAmount(selectedDiff.expectedAmount)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">实际金额</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      ¥{formatAmount(selectedDiff.actualAmount)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">差异金额</p>
                    <p className="text-sm font-semibold text-red-600 mt-1">
                      ¥{formatAmount(selectedDiff.diffAmount)}
                    </p>
                  </div>
                </div>

                {selectedDiff.status === 'pending' && (
                  <>
                    <div className="pt-4 border-t border-gray-100">
                      <label className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        备注说明
                      </label>
                      <textarea
                        value={remarkInput}
                        onChange={(e) => setRemarkInput(e.target.value)}
                        placeholder="请输入备注原因..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                        rows={3}
                      />
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                      <label className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                        <Edit3 className="w-4 h-4" />
                        调整差异金额（可选）
                      </label>
                      <input
                        type="number"
                        value={adjustedAmount ?? ''}
                        onChange={(e) => setAdjustedAmount(e.target.value ? Number(e.target.value) : null)}
                        placeholder="输入调整后的差异金额"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-4">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Check}
                        onClick={() => handleConfirm(selectedDiff.id)}
                        className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                      >
                        确认
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={X}
                        onClick={() => handleReject(selectedDiff.id)}
                        className="text-red-600 bg-red-50 hover:bg-red-100"
                      >
                        驳回
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Edit3}
                        onClick={() => handleAdjust(selectedDiff.id)}
                        className="text-blue-600 bg-blue-50 hover:bg-blue-100"
                        disabled={adjustedAmount === null}
                      >
                        调整
                      </Button>
                    </div>
                  </>
                )}

                {selectedDiff.handler && (
                  <div className="pt-4 border-t border-gray-100 text-xs text-gray-500">
                    <p>处理人：{selectedDiff.handler}</p>
                    {selectedDiff.handleTime && <p>处理时间：{selectedDiff.handleTime}</p>}
                    {selectedDiff.remark && (
                      <p className="mt-2 text-gray-600 bg-gray-50 p-2 rounded">
                        备注：{selectedDiff.remark}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center">
                <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400">选择一条差异查看详情</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">应付汇总</h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">运费总额</span>
                <span className="font-medium">¥{formatAmount(summary.totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-red-600">
                <span className="flex items-center gap-1">
                  <TrendingDown className="w-4 h-4" />
                  差异扣减
                </span>
                <span className="font-medium">-¥{formatAmount(summary.diffAmount)}</span>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 font-semibold">应付金额</span>
                  <span className="text-xl font-bold text-blue-600">
                    ¥{formatAmount(summary.payableAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('diffs')}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                activeTab === 'diffs' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              差异明细
            </button>
            <button
              onClick={() => setActiveTab('waybills')}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                activeTab === 'waybills' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Truck className="w-4 h-4 inline mr-1" />
              按运单汇总
            </button>
            <button
              onClick={() => setActiveTab('carriers')}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                activeTab === 'carriers' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Building2 className="w-4 h-4 inline mr-1" />
              按承运商汇总
            </button>
          </div>
          <Button
            icon={FileCheck}
            onClick={() => setShowFinishDialog(true)}
          >
            复核完成
          </Button>
        </div>

        {activeTab === 'diffs' && (
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">运单号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">车牌号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">承运商</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">问题类型</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">差异金额</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">备注</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {diffRecords.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{d.waybillNo}</td>
                    <td className="px-4 py-3 text-gray-600">{d.plateNo}</td>
                    <td className="px-4 py-3 text-gray-600">{d.carrier}</td>
                    <td className="px-4 py-3">
                      <Badge className={DIFF_TYPE_COLORS[d.diffType]} size="sm">{DIFF_TYPE_LABELS[d.diffType]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">¥{formatAmount(d.diffAmount)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={DIFF_STATUS_COLORS[d.status]} size="sm">{DIFF_STATUS_LABELS[d.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{d.remark || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'waybills' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">运单号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">车牌号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">承运商</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">运费</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">差异数量</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">问题类型</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">差异金额</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">应付金额</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {waybillSummaries.map((ws) => (
                  <tr key={ws.waybillNo} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{ws.waybillNo}</td>
                    <td className="px-4 py-3 text-gray-600">{ws.plateNo}</td>
                    <td className="px-4 py-3 text-gray-600">{ws.carrier}</td>
                    <td className="px-4 py-3 text-right text-gray-900">¥{formatAmount(ws.freight)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={`${ws.diffCount > 0 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`} size="sm">
                        {ws.diffCount > 0 ? `${ws.diffCount} 条` : '无'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {ws.diffTypes.map((t) => (
                          <Badge key={t} className={DIFF_TYPE_COLORS[t]} size="sm">{DIFF_TYPE_LABELS[t]}</Badge>
                        ))}
                        {ws.diffTypes.length === 0 && <span className="text-gray-400 text-xs">-</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={ws.diffAmount > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                        {ws.diffAmount > 0 ? `¥${formatAmount(ws.diffAmount)}` : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-600">¥{formatAmount(ws.payableAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'carriers' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">承运商</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">运单数量</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">受影响运单</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">差异数量</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">总金额</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">差异金额</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">应付金额</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {carrierSummaries.map((cs) => (
                  <tr key={cs.carrier} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{cs.carrier}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{cs.waybillCount}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge className={cs.affectedWaybillCount > 0 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'} size="sm">
                        {cs.affectedWaybillCount}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{cs.diffCount}</td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">¥{formatAmount(cs.totalAmount)}</td>
                    <td className="px-4 py-3 text-right text-red-600">-¥{formatAmount(cs.diffAmount)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-600">¥{formatAmount(cs.payableAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="outline" icon={ChevronLeft} onClick={() => navigate('/check')}>
          上一步：差异核对
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="outline" icon={FileCheck} onClick={() => setShowFinishDialog(true)}>
            复核完成
          </Button>
          <Button variant="primary" icon={ChevronRight} iconPosition="right" onClick={handleNext}>
            下一步：导出归档
          </Button>
        </div>
      </div>

      {showFinishDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">确认复核完成</h3>
                <p className="text-sm text-gray-500">完成后状态将标记为"复核完成"，并自动保存为历史记录</p>
              </div>
            </div>

            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">待处理差异</span>
                <span className={`font-medium ${pendingCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {pendingCount} 条
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">应付金额</span>
                <span className="font-semibold text-blue-600">¥{formatAmount(summary.payableAmount)}</span>
              </div>
              {pendingCount > 0 && (
                <div className="flex items-start gap-2 mt-2 p-2 bg-amber-50 rounded text-amber-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="text-xs">仍有 {pendingCount} 条差异未处理，确认后将以当前状态归档。</span>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="text-sm text-gray-500 mb-1 block">复核备注（可选）</label>
              <textarea
                value={finishRemark}
                onChange={(e) => setFinishRemark(e.target.value)}
                rows={2}
                placeholder="可添加本次复核的备注说明..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowFinishDialog(false)}>
                取消
              </Button>
              <Button variant="primary" icon={Check} onClick={handleFinishReview}>
                确认完成
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
