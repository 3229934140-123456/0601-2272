import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  ChevronRight,
  Info,
  Eye,
  Check,
  AlertTriangle,
  Table2,
} from 'lucide-react';
import { StepIndicator } from '@/components/StepIndicator';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { useAppStore, REQUIRED_FIELDS_BY_TYPE } from '@/store/useAppStore';
import { formatFileSize } from '@/utils/fileParser';
import { FILE_TYPE_LABELS, FileType } from '@/types';

const steps = ['文件导入', '规则设置', '差异核对', '结果复核', '导出归档'];

const fileTypeConfig: Record<
  FileType,
  { icon: typeof FileText; color: string; desc: string; extensions: string }
> = {
  waybill: {
    icon: FileText,
    color: 'bg-blue-50 text-blue-600 border-blue-200',
    desc: '包含运单号、车牌号、线路、运费等信息',
    extensions: '.xlsx, .xls, .csv',
  },
  receipt: {
    icon: CheckCircle,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    desc: '包含运单号、签收日期、收货人等信息',
    extensions: '.xlsx, .xls, .csv',
  },
  fuelCard: {
    icon: FileSpreadsheet,
    color: 'bg-amber-50 text-amber-600 border-amber-200',
    desc: '包含卡号、车牌号、充值金额、余额等信息',
    extensions: '.xlsx, .xls, .csv',
  },
  tollFee: {
    icon: FileSpreadsheet,
    color: 'bg-purple-50 text-purple-600 border-purple-200',
    desc: '包含运单号、通行日期、费用、收费站等信息',
    extensions: '.xlsx, .xls, .csv',
  },
  quotation: {
    icon: FileText,
    color: 'bg-cyan-50 text-cyan-600 border-cyan-200',
    desc: '包含承运商、线路、车型、报价等信息',
    extensions: '.xlsx, .xls, .csv',
  },
};

export const FileImport = () => {
  const navigate = useNavigate();
  const fileInputRefs = useRef<Record<FileType, HTMLInputElement | null>>({
    waybill: null,
    receipt: null,
    fuelCard: null,
    tollFee: null,
    quotation: null,
  });

  const {
    importFiles,
    addImportFile,
    updateImportFile,
    removeImportFile,
    setCurrentStep,
    processFileToPreview,
    confirmImportPreview,
    waybills,
    receipts,
    fuelCardRecords,
    tollFees,
    quotations,
  } = useAppStore();

  const [dragActive, setDragActive] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent, type: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(type);
    } else if (e.type === 'dragleave') {
      setDragActive(null);
    }
  };

  const handleDrop = (e: React.DragEvent, type: FileType) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0], type);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: FileType) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0], type);
      e.target.value = '';
    }
  };

  const processFile = async (file: File, type: FileType) => {
    const fileId = `${type}-${Date.now()}`;
    addImportFile({
      id: fileId,
      type,
      name: file.name,
      size: file.size,
      status: 'uploading',
      progress: 0,
      uploadedAt: new Date().toLocaleString('zh-CN'),
    });

    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 25;
      if (progress >= 85) {
        clearInterval(progressInterval);
      } else {
        updateImportFile(fileId, { progress: Math.floor(progress) });
      }
    }, 120);

    await processFileToPreview(fileId, file, type);

    clearInterval(progressInterval);
    updateImportFile(fileId, { progress: 100 });
  };

  const getFilesByType = (type: FileType) => {
    return importFiles.filter((f) => f.type === type);
  };

  const getStoredCountByType = (type: FileType): number => {
    switch (type) {
      case 'waybill':
        return waybills.length;
      case 'receipt':
        return receipts.length;
      case 'fuelCard':
        return fuelCardRecords.length;
      case 'tollFee':
        return tollFees.length;
      case 'quotation':
        return quotations.length;
      default:
        return 0;
    }
  };

  const allTypesImported = useAppStore((s) => s.waybills.length > 0);

  const handleNext = () => {
    setCurrentStep(1);
    navigate('/rules');
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">文件导入</h1>
        <p className="text-gray-500 mt-1">上传运单、回单、油卡、过路费和报价文件，预览识别结果后确认入库</p>
      </div>

      <div className="mb-8 bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <StepIndicator steps={steps} currentStep={0} />
      </div>

      <div className="space-y-6">
        {(Object.keys(fileTypeConfig) as FileType[]).map((type) => {
          const config = fileTypeConfig[type];
          const files = getFilesByType(type);
          const hasSuccess = files.some((f) => f.status === 'success');
          const storedCount = getStoredCountByType(type);
          const Icon = config.icon;
          const requiredFields = REQUIRED_FIELDS_BY_TYPE[type];

          return (
            <div
              key={type}
              className={`bg-white rounded-xl border-2 transition-all duration-300 ${
                hasSuccess
                  ? 'border-emerald-200 bg-emerald-50/30'
                  : dragActive === type
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center border ${config.color}`}
                    >
                      <Icon className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {FILE_TYPE_LABELS[type]}
                        </h3>
                        {hasSuccess && (
                          <Badge variant="success" size="sm">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            已导入 {storedCount} 条
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{config.desc}</p>
                      <p className="text-xs text-gray-400 mt-1">支持格式：{config.extensions}</p>
                      <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        必需字段：{requiredFields.join('、')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Upload}
                    onClick={() => fileInputRefs.current[type]?.click()}
                  >
                    选择文件
                  </Button>
                </div>

                <input
                  type="file"
                  ref={(el) => (fileInputRefs.current[type] = el)}
                  onChange={(e) => handleFileSelect(e, type)}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />

                {files.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="border border-gray-100 rounded-lg overflow-hidden"
                      >
                        <div className="flex items-center justify-between p-3 bg-white">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {file.status === 'success' ? (
                              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                            ) : file.status === 'error' ? (
                              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                            ) : file.status === 'preview' ? (
                              <Eye className="w-5 h-5 text-blue-500 flex-shrink-0" />
                            ) : (
                              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(file.size)}
                                {file.rows !== undefined && file.status !== 'preview' && ` · ${file.rows} 条数据`}
                              </p>
                            </div>
                          </div>

                          {file.status === 'preview' && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeImportFile(file.id)}
                              >
                                取消
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                icon={Check}
                                onClick={() => confirmImportPreview(file.id)}
                              >
                                确认入库 ({file.validRows || 0}条)
                              </Button>
                            </div>
                          )}

                          {file.status === 'success' && (
                            <button
                              onClick={() => removeImportFile(file.id)}
                              className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors ml-2 flex-shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {file.status === 'uploading' && (
                          <div className="px-3 pb-3 bg-white">
                            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                style={{ width: `${file.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {file.status === 'error' && (
                          <div className="px-3 pb-3 bg-red-50 border-t border-red-100">
                            <p className="text-xs text-red-600 pt-2">{file.errorMessage}</p>
                            <button
                              onClick={() => removeImportFile(file.id)}
                              className="mt-2 text-xs text-red-600 hover:text-red-700"
                            >
                              移除并关闭
                            </button>
                          </div>
                        )}

                        {file.status === 'preview' && (
                          <div className="px-3 pb-3 bg-blue-50 border-t border-blue-100">
                            <div className="flex items-start gap-2 pt-2 flex-wrap">
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200" size="sm">
                                有效 {file.validRows || 0} 行
                              </Badge>
                              {(file.invalidRows || 0) > 0 && (
                                <Badge className="bg-rose-100 text-rose-700 border-rose-200" size="sm">
                                  异常 {file.invalidRows} 行
                                </Badge>
                              )}
                              <Badge className="bg-gray-100 text-gray-700 border-gray-200" size="sm">
                                共 {file.rows || 0} 行
                              </Badge>
                            </div>

                            {file.headers && file.headers.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                                  <Table2 className="w-3 h-3" />
                                  识别到的表头：
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {file.headers.map((h, i) => (
                                    <span
                                      key={i}
                                      className={`px-2 py-0.5 text-xs rounded ${
                                        requiredFields.some(
                                          (f) =>
                                            f === h || f.toLowerCase() === h.toLowerCase()
                                        )
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-white text-gray-600 border border-gray-200'
                                      }`}
                                    >
                                      {h}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {file.invalidDetails && file.invalidDetails.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-rose-500" />
                                  异常行明细：
                                </p>
                                <div className="max-h-32 overflow-auto border border-rose-200 rounded bg-white">
                                  <table className="w-full text-xs">
                                    <thead className="bg-rose-50 sticky top-0">
                                      <tr>
                                        <th className="px-2 py-1 text-left text-rose-700">行号</th>
                                        <th className="px-2 py-1 text-left text-rose-700">原因</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-rose-50">
                                      {file.invalidDetails.slice(0, 10).map((d, i) => (
                                        <tr key={i}>
                                          <td className="px-2 py-1 text-gray-600">#{d.rowNo}</td>
                                          <td className="px-2 py-1 text-gray-800">{d.reason}</td>
                                        </tr>
                                      ))}
                                      {file.invalidDetails.length > 10 && (
                                        <tr>
                                          <td colSpan={2} className="px-2 py-1 text-gray-400">
                                            还有 {file.invalidDetails.length - 10} 行异常...
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {files.length === 0 && (
                  <div
                    className={`mt-4 border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                      dragActive === type
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onDragEnter={(e) => handleDrag(e, type)}
                    onDragOver={(e) => handleDrag(e, type)}
                    onDragLeave={(e) => handleDrag(e, type)}
                    onDrop={(e) => handleDrop(e, type)}
                  >
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">拖拽文件到此处，或点击选择文件</p>
                    <p className="text-xs text-gray-400 mt-1">支持 Excel 和 CSV 格式</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Info className="w-4 h-4" />
          <span>至少导入运单数据后可进行后续步骤，可预览识别结果后再确认入库</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            返回首页
          </Button>
          <Button
            variant="primary"
            icon={ChevronRight}
            iconPosition="right"
            onClick={handleNext}
            disabled={!allTypesImported}
          >
            下一步：规则设置
          </Button>
        </div>
      </div>
    </div>
  );
};
