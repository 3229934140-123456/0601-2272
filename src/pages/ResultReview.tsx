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

  const {
    diffRecords,
    getCheckSummary,
    getCarrierSummaries,
    setDiffStatus,
    setBatchDiffStatus,
    selectedDiffIds,
    setDiffRemark,
    setCurrentStep,
    saveCheckRecord,
  } = useAppStore();

  const summary = getCheckSummary();
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
    setDiffStatus(id, 'adjusted', remarkInput);
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

  const handleNext = () => {
    saveCheckRecord();
    setCurrentStep(4);
    navigate('/export');
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
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-400" />
            按承运商汇总
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  承运商
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  运单数量
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  总金额
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  差异数量
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  差异金额
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  应付金额
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {carrierSummaries.map((cs) => (
                <tr key={cs.carrier} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{cs.carrier}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{cs.waybillCount}</td>
                  <td className="px-4 py-3 text-right text-gray-900 font-medium">
                    ¥{formatAmount(cs.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge variant="warning" size="sm">
                      {cs.diffCount} 条
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-red-600">
                    -¥{formatAmount(cs.diffAmount)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-600">
                    ¥{formatAmount(cs.payableAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="outline" icon={ChevronLeft} onClick={() => navigate('/check')}>
          上一步：差异核对
        </Button>
        <Button variant="primary" icon={ChevronRight} iconPosition="right" onClick={handleNext}>
          下一步：导出归档
        </Button>
      </div>
    </div>
  );
};
