import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSearch,
  Play,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  CheckSquare,
  Square,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
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
  DiffType,
  DiffStatus,
} from '@/types';
import { formatAmount } from '@/utils/fileParser';

const steps = ['文件导入', '规则设置', '差异核对', '结果复核', '导出归档'];

export const DiffCheck = () => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const {
    waybills,
    diffRecords,
    runCheck,
    getCheckSummary,
    selectedDiffIds,
    toggleSelectDiff,
    selectAllDiffs,
    clearSelection,
    filterDiffType,
    filterDiffStatus,
    searchKeyword,
    setFilterDiffType,
    setFilterDiffStatus,
    setSearchKeyword,
    setCurrentStep,
    getFilteredDiffs,
  } = useAppStore();

  const summary = getCheckSummary();
  const filteredDiffs = getFilteredDiffs();
  const allSelected = filteredDiffs.length > 0 && filteredDiffs.every((d) => selectedDiffIds.includes(d.id));

  const handleRunCheck = async () => {
    setIsChecking(true);
    await runCheck();
    setIsChecking(false);
    setHasChecked(true);
  };

  const handleNext = () => {
    setCurrentStep(3);
    navigate('/review');
  };

  const diffTypes = Object.keys(DIFF_TYPE_LABELS) as DiffType[];
  const diffStatuses = ['pending', 'confirmed', 'rejected', 'adjusted'] as DiffStatus[];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">差异核对</h1>
        <p className="text-gray-500 mt-1">自动匹配运单，识别差异问题</p>
      </div>

      <div className="mb-8 bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <StepIndicator steps={steps} currentStep={2} />
      </div>

      <div className="grid grid-cols-4 gap-6 mb-6">
        <StatCard
          title="运单总数"
          value={summary.totalWaybills}
          icon={FileSearch}
          color="blue"
        />
        <StatCard
          title="正常匹配"
          value={summary.matchedCount}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="差异数量"
          value={summary.diffCount}
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          title="差异金额"
          value={`¥${formatAmount(summary.diffAmount)}`}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {!hasChecked ? (
        <div className="bg-white rounded-xl p-12 border border-gray-100 shadow-sm text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileSearch className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">开始差异核对</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            系统将根据配置的规则，自动匹配运单、回单、油卡、过路费等数据，识别各类差异问题
          </p>
          <Button size="lg" icon={Play} onClick={handleRunCheck} loading={isChecking} disabled={waybills.length === 0}>
            {isChecking ? '正在核对...' : waybills.length === 0 ? '请先导入运单数据' : '开始核对'}
          </Button>

          <div className="mt-10 grid grid-cols-4 gap-4 max-w-2xl mx-auto">
            {[
              { label: '缺少回单检测', icon: Clock },
              { label: '重复运单检测', icon: AlertTriangle },
              { label: '超报价检测', icon: XCircle },
              { label: '费用分摊校验', icon: CheckCircle },
            ].map((item) => (
              <div key={item.label} className="p-4 bg-gray-50 rounded-lg">
                <item.icon className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索运单号、车牌号、承运商..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-72 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={filterDiffType}
                  onChange={(e) => setFilterDiffType(e.target.value as DiffType | 'all')}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="all">全部问题类型</option>
                  {diffTypes.map((type) => (
                    <option key={type} value={type}>
                      {DIFF_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>

                <select
                  value={filterDiffStatus}
                  onChange={(e) => setFilterDiffStatus(e.target.value as DiffStatus | 'all')}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="all">全部状态</option>
                  {diffStatuses.map((status) => (
                    <option key={status} value={status}>
                      {DIFF_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {selectedDiffIds.length > 0 && (
                <span className="text-sm text-gray-500">
                  已选 <span className="font-medium text-blue-600">{selectedDiffIds.length}</span> 条
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                icon={RefreshCw}
                onClick={handleRunCheck}
                loading={isChecking}
              >
                重新核对
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 w-10">
                    <button onClick={allSelected ? clearSelection : selectAllDiffs}>
                      {allSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-300" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    运单号
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    车牌号
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    承运商
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    问题类型
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    预期金额
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    实际金额
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    差异金额
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDiffs.map((diff, index) => (
                  <tr
                    key={diff.id}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                    style={{
                      animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`,
                    }}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleSelectDiff(diff.id)}>
                        {selectedDiffIds.includes(diff.id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-300 hover:text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{diff.waybillNo}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{diff.plateNo}</td>
                    <td className="px-4 py-3 text-gray-600">{diff.carrier}</td>
                    <td className="px-4 py-3">
                      <Badge className={DIFF_TYPE_COLORS[diff.diffType]} variant="default">
                        {DIFF_TYPE_LABELS[diff.diffType]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      ¥{formatAmount(diff.expectedAmount)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      ¥{formatAmount(diff.actualAmount)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">
                      ¥{formatAmount(diff.diffAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={DIFF_STATUS_COLORS[diff.status]} variant="default">
                        {DIFF_STATUS_LABELS[diff.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredDiffs.length === 0 && (
            <div className="text-center py-16">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <p className="text-gray-500">暂无差异记录</p>
            </div>
          )}

          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              共 {filteredDiffs.length} 条差异记录
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">第 1 页 / 共 1 页</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <Button variant="outline" icon={ChevronLeft} onClick={() => navigate('/rules')}>
          上一步：规则设置
        </Button>
        <Button
          variant="primary"
          icon={ChevronRight}
          iconPosition="right"
          onClick={handleNext}
          disabled={!hasChecked}
        >
          下一步：结果复核
        </Button>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
