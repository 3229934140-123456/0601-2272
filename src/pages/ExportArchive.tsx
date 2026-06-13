import { useState } from 'react';
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
} from 'lucide-react';
import { StepIndicator } from '@/components/StepIndicator';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { useAppStore } from '@/store/useAppStore';
import { exportReconciliation, exportDiffRecords } from '@/utils/exporter';
import { formatAmount } from '@/utils/fileParser';
import { CheckRecord } from '@/types';

const steps = ['文件导入', '规则设置', '差异核对', '结果复核', '导出归档'];

export const ExportArchive = () => {
  const { waybills, diffRecords, checkRecords, getCheckSummary, getCarrierSummaries, loadCheckRecord } = useAppStore();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<CheckRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const summary = getCheckSummary();
  const carrierSummaries = getCarrierSummaries();

  const filteredRecords = checkRecords.filter(
    (r) =>
      r.checkBatchNo.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      r.operator.includes(searchKeyword)
  );

  const handleExportAll = () => {
    const filename = `对账报表_${new Date().toISOString().slice(0, 10)}`;
    exportReconciliation(waybills, diffRecords, summary, carrierSummaries, filename);
  };

  const handleExportDiffs = () => {
    const filename = `差异明细_${new Date().toISOString().slice(0, 10)}`;
    exportDiffRecords(diffRecords, filename);
  };

  const handleViewRecord = (record: CheckRecord) => {
    setSelectedRecord(record);
    setShowDetail(true);
    loadCheckRecord(record.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-600';
      case 'reviewing':
        return 'bg-amber-100 text-amber-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'reviewing':
        return '复核中';
      case 'pending':
        return '待处理';
      default:
        return status;
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">导出归档</h1>
        <p className="text-gray-500 mt-1">导出对账报表，查看历史核对记录</p>
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
              包含运单明细、差异明细、汇总统计的完整Excel报表
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
            <p className="text-sm text-gray-500 mt-0.5">所有核对记录永久保存，支持追溯查询</p>
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

        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
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
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {record.checkBatchNo}
                      </h3>
                      <Badge className={getStatusColor(record.status)} size="sm">
                        {getStatusLabel(record.status)}
                      </Badge>
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
                        <p className="text-xs text-gray-400">匹配正常</p>
                        <p className="text-sm font-medium text-emerald-600">{record.matchedCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">差异数</p>
                        <p className="text-sm font-medium text-amber-600">{record.diffCount}</p>
                      </div>
                      <div className="border-l border-gray-200 pl-6">
                        <p className="text-xs text-gray-400">应付金额</p>
                        <p className="text-sm font-bold text-blue-600">¥{formatAmount(record.payableAmount)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" icon={Eye}>
                    查看详情
                  </Button>
                  <Button variant="outline" size="sm" icon={Download}>
                    导出
                  </Button>
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
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedRecord.checkBatchNo}</h3>
                <p className="text-sm text-gray-500 mt-1">核对详情</p>
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

            <div className="p-6 overflow-y-auto max-h-[60vh]">
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
                  <p className="text-sm text-gray-500">状态</p>
                  <p className="mt-1">
                    <Badge className={getStatusColor(selectedRecord.status)}>
                      {getStatusLabel(selectedRecord.status)}
                    </Badge>
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">运单总数</p>
                  <p className="font-semibold text-gray-900 mt-1">{selectedRecord.totalWaybills} 单</p>
                </div>
              </div>

              <div className="space-y-4">
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

              {selectedRecord.remark && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="font-medium text-gray-900 mb-2">备注</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {selectedRecord.remark}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDetail(false)}>
                关闭
              </Button>
              <Button
                icon={Download}
                onClick={() => {
                  const filename = `对账报表_${selectedRecord.checkBatchNo}`;
                  exportReconciliation(waybills, diffRecords, summary, carrierSummaries, filename);
                }}
              >
                导出报表
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
