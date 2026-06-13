import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  ArrowRight,
  Clock,
  FileCheck,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { useAppStore } from '@/store/useAppStore';
import { formatAmount } from '@/utils/fileParser';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  CHECK_RECORD_STATUS_LABELS,
  CHECK_RECORD_STATUS_COLORS,
} from '@/types';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { waybills, checkRecords, getCheckSummary, diffRecords, loadHistoryFromDB } = useAppStore();

  useEffect(() => {
    loadHistoryFromDB();
  }, []);

  const summary = getCheckSummary();

  const recentChecks = checkRecords.slice(0, 5);

  const chartData = checkRecords.slice(0, 7).reverse().map((r) => ({
    name: r.checkDate.slice(5),
    运单数: r.totalWaybills,
    差异数: r.diffCount,
  }));

  const quickActions = [
    { title: '文件导入', desc: '上传运单、回单等数据', icon: FileText, path: '/import', color: 'blue' as const },
    { title: '规则设置', desc: '配置计费和核对规则', icon: BarChart3, path: '/rules', color: 'purple' as const },
    { title: '开始核对', desc: '执行自动差异核对', icon: FileCheck, path: '/check', color: 'emerald' as const },
    { title: '导出对账', desc: '生成对账报表', icon: DollarSign, path: '/export', color: 'amber' as const },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">工作台</h1>
        <p className="text-gray-500 mt-1">欢迎回来，这是您的运费核对概览</p>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        {quickActions.map((action) => (
          <button
            key={action.title}
            onClick={() => navigate(action.path)}
            className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 text-left group"
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                action.color === 'blue'
                  ? 'bg-blue-100 text-blue-600'
                  : action.color === 'purple'
                  ? 'bg-purple-100 text-purple-600'
                  : action.color === 'emerald'
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-amber-100 text-amber-600'
              }`}
            >
              <action.icon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {action.title}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{action.desc}</p>
            <div className="mt-4 flex items-center text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              立即前往 <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard
          title="运单总数"
          value={waybills.length}
          icon={FileText}
          color="blue"
          trend="较上周 +12%"
          trendUp
        />
        <StatCard
          title="差异数量"
          value={diffRecords.length || summary.diffCount}
          icon={AlertTriangle}
          color="amber"
          trend="较上周 -8%"
          trendUp={false}
        />
        <StatCard
          title="核对通过"
          value={summary.matchedCount}
          icon={CheckCircle}
          color="green"
          trend="通过率 84%"
          trendUp
        />
        <StatCard
          title="应付金额"
          value={`¥${formatAmount(summary.payableAmount)}`}
          icon={DollarSign}
          color="purple"
          trend="本月合计"
          trendUp
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">核对趋势</h2>
            <span className="text-sm text-gray-500">近7次核对</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar dataKey="运单数" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="差异数" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">最近核对</h2>
            <button
              onClick={() => navigate('/export')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              查看全部
            </button>
          </div>
          <div className="space-y-4">
            {recentChecks.map((record) => (
              <div
                key={record.id}
                className="p-4 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer"
                onClick={() => navigate('/export')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{record.checkBatchNo}</p>
                    <p className="text-xs text-gray-500 mt-1">{record.checkDate}</p>
                  </div>
                  <Badge className={CHECK_RECORD_STATUS_COLORS[record.status] || 'bg-gray-100 text-gray-600'} size="sm">
                    {CHECK_RECORD_STATUS_LABELS[record.status] || record.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {record.totalWaybills} 单
                  </span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="w-3 h-3" />
                    {record.diffCount} 差异
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    ¥{formatAmount(record.payableAmount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">开始新的运费核对</h2>
            <p className="text-blue-100 mt-2">上传您的运单和相关数据，自动完成对账核对</p>
          </div>
          <Button
            variant="secondary"
            size="lg"
            icon={TrendingUp}
            iconPosition="right"
            onClick={() => navigate('/import')}
            className="bg-white text-blue-600 hover:bg-blue-50"
          >
            立即开始
          </Button>
        </div>
      </div>
    </div>
  );
};
