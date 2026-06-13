import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  ChevronRight,
  Truck,
  Ruler,
  MapPin,
  Calculator,
} from 'lucide-react';
import { StepIndicator } from '@/components/StepIndicator';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { useAppStore } from '@/store/useAppStore';
import { BillingRule, LINES, VEHICLE_TYPES } from '@/types';
import { mockData } from '@/data/mockData';

const steps = ['文件导入', '规则设置', '差异核对', '结果复核', '导出归档'];

type TabType = 'billing' | 'check';

export const RulesSettings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('billing');
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<BillingRule | null>(null);
  const [formData, setFormData] = useState<Partial<BillingRule>>({
    ruleName: '',
    line: '',
    vehicleType: '',
    basePrice: 0,
    weightPrice: 0,
    mileagePrice: 0,
    tolerance: 5,
    enabled: true,
  });

  const { billingRules, addBillingRule, updateBillingRule, deleteBillingRule, toggleBillingRule, setCurrentStep } =
    useAppStore();

  const handleAddRule = () => {
    setEditingRule(null);
    setFormData({
      ruleName: '',
      line: '',
      vehicleType: '',
      basePrice: 0,
      weightPrice: 0,
      mileagePrice: 0,
      tolerance: 5,
      enabled: true,
    });
    setShowModal(true);
  };

  const handleEditRule = (rule: BillingRule) => {
    setEditingRule(rule);
    setFormData(rule);
    setShowModal(true);
  };

  const handleSaveRule = () => {
    if (!formData.ruleName || !formData.line) return;

    if (editingRule) {
      updateBillingRule(editingRule.id, formData);
    } else {
      addBillingRule({
        ...formData,
        id: mockData.generateId(),
        createdAt: new Date().toISOString().split('T')[0],
      } as BillingRule);
    }
    setShowModal(false);
  };

  const handleDeleteRule = (id: string) => {
    if (confirm('确定要删除此规则吗？')) {
      deleteBillingRule(id);
    }
  };

  const handleNext = () => {
    setCurrentStep(2);
    navigate('/check');
  };

  const checkRules = [
    { key: 'tolerance', name: '金额容差', value: '±5%', desc: '运费差异在容差范围内不记为异常' },
    { key: 'matchPriority', name: '匹配优先级', value: '运单号 > 车牌号', desc: '运单匹配时的关键字段优先级' },
    { key: 'weightDiff', name: '重量差异阈值', value: '±100kg', desc: '超过阈值判定为重量不符' },
    { key: 'mileageDiff', name: '里程差异阈值', value: '±50km', desc: '超过阈值判定为里程不符' },
    { key: 'receiptTimeout', name: '回单超期天数', value: '3天', desc: '发运后N天无回单记为异常' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">规则设置</h1>
        <p className="text-gray-500 mt-1">配置计费规则和核对规则参数</p>
      </div>

      <div className="mb-8 bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <StepIndicator steps={steps} currentStep={1} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100">
          <div className="flex">
            <button
              onClick={() => setActiveTab('billing')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'billing'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              计费规则
            </button>
            <button
              onClick={() => setActiveTab('check')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'check'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calculator className="w-4 h-4 inline mr-2" />
              核对规则
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'billing' && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">计费规则列表</h2>
                  <p className="text-sm text-gray-500 mt-1">按线路、车型、重量、里程设置计费标准</p>
                </div>
                <Button icon={Plus} onClick={handleAddRule}>
                  新增规则
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        规则名称
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        线路
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        车型
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        基础价
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        重量单价
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        里程单价
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        容差
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {billingRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <span className="font-medium text-gray-900">{rule.ruleName}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700">{rule.line}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700">{rule.vehicleType}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right font-medium text-gray-900">
                          ¥{rule.basePrice.toFixed(0)}
                        </td>
                        <td className="px-4 py-4 text-right text-gray-700">¥{rule.weightPrice}/吨</td>
                        <td className="px-4 py-4 text-right text-gray-700">¥{rule.mileagePrice}/km</td>
                        <td className="px-4 py-4 text-center">
                          <Badge variant="info" size="sm">
                            ±{rule.tolerance}%
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button onClick={() => toggleBillingRule(rule.id)} className="focus:outline-none">
                            {rule.enabled ? (
                              <ToggleRight className="w-6 h-6 text-blue-600" />
                            ) : (
                              <ToggleLeft className="w-6 h-6 text-gray-300" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditRule(rule)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {billingRules.length === 0 && (
                <div className="text-center py-12">
                  <Ruler className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">暂无计费规则</p>
                  <p className="text-sm text-gray-400 mt-1">点击上方按钮添加第一条规则</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'check' && (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">核对规则配置</h2>
                <p className="text-sm text-gray-500 mt-1">设置异常判定的阈值和条件</p>
              </div>

              <div className="space-y-4">
                {checkRules.map((rule) => (
                  <div
                    key={rule.key}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{rule.name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{rule.desc}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="info">{rule.value}</Badge>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        修改
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="outline" icon={ChevronLeft} onClick={() => navigate('/import')}>
          上一步：文件导入
        </Button>
        <Button variant="primary" icon={ChevronRight} iconPosition="right" onClick={handleNext}>
          下一步：差异核对
        </Button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              {editingRule ? '编辑计费规则' : '新增计费规则'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">规则名称</label>
                <input
                  type="text"
                  value={formData.ruleName}
                  onChange={(e) => setFormData({ ...formData, ruleName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="请输入规则名称"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">线路</label>
                  <select
                    value={formData.line}
                    onChange={(e) => setFormData({ ...formData, line: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">请选择线路</option>
                    {LINES.map((line) => (
                      <option key={line} value={line}>
                        {line}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">车型</label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">请选择车型</option>
                    {VEHICLE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                    <option value="通用">通用</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">基础价 (元)</label>
                  <input
                    type="number"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">重量单价 (元/吨)</label>
                  <input
                    type="number"
                    value={formData.weightPrice}
                    onChange={(e) => setFormData({ ...formData, weightPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">里程单价 (元/km)</label>
                  <input
                    type="number"
                    value={formData.mileagePrice}
                    onChange={(e) => setFormData({ ...formData, mileagePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">容差范围 (%)</label>
                <input
                  type="number"
                  value={formData.tolerance}
                  onChange={(e) => setFormData({ ...formData, tolerance: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="5"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                取消
              </Button>
              <Button onClick={handleSaveRule}>保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
