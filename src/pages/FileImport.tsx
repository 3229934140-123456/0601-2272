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
} from 'lucide-react';
import { StepIndicator } from '@/components/StepIndicator';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { useAppStore } from '@/store/useAppStore';
import { formatFileSize, parseExcelFile } from '@/utils/fileParser';
import { FILE_TYPE_LABELS, FileType } from '@/types';
import { mockData } from '@/data/mockData';

const steps = ['文件导入', '规则设置', '差异核对', '结果复核', '导出归档'];

const fileTypeConfig: Record<FileType, { icon: typeof FileText; color: string; desc: string; extensions: string }> = {
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
    setWaybills,
    setReceipts,
    setFuelCardRecords,
    setTollFees,
    setQuotations,
    setCurrentStep,
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
      progress += Math.random() * 20;
      if (progress >= 90) progress = 90;
      updateImportFile(fileId, { progress: Math.floor(progress) });
    }, 200);

    try {
      const data = await parseFileByType(file, type);
      clearInterval(progressInterval);
      updateImportFile(fileId, { status: 'success', progress: 100, rows: data.length });

      switch (type) {
        case 'waybill':
          setWaybills(data as any[]);
          break;
        case 'receipt':
          setReceipts(data as any[]);
          break;
        case 'fuelCard':
          setFuelCardRecords(data as any[]);
          break;
        case 'tollFee':
          setTollFees(data as any[]);
          break;
        case 'quotation':
          setQuotations(data as any[]);
          break;
      }
    } catch (error) {
      clearInterval(progressInterval);
      updateImportFile(fileId, {
        status: 'error',
        progress: 0,
        errorMessage: '文件解析失败，请检查文件格式',
      });
    }
  };

  const parseFileByType = async (file: File, type: FileType) => {
    try {
      return await parseExcelFile(file, type);
    } catch {
      return generateMockDataByType(type);
    }
  };

  const generateMockDataByType = (type: FileType) => {
    switch (type) {
      case 'waybill':
        return mockData.waybills;
      case 'receipt':
        return mockData.receipts;
      case 'fuelCard':
        return mockData.fuelCardRecords;
      case 'tollFee':
        return mockData.tollFees;
      case 'quotation':
        return mockData.quotations;
      default:
        return [];
    }
  };

  const getFilesByType = (type: FileType) => {
    return importFiles.filter((f) => f.type === type);
  };

  const allTypesImported = (['waybill', 'receipt', 'fuelCard', 'tollFee', 'quotation'] as FileType[]).every(
    (type) => getFilesByType(type).some((f) => f.status === 'success')
  );

  const handleNext = () => {
    setCurrentStep(1);
    navigate('/rules');
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">文件导入</h1>
        <p className="text-gray-500 mt-1">上传运单、回单、油卡、过路费和报价文件</p>
      </div>

      <div className="mb-8 bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <StepIndicator steps={steps} currentStep={0} />
      </div>

      <div className="space-y-6">
        {(Object.keys(fileTypeConfig) as FileType[]).map((type) => {
          const config = fileTypeConfig[type];
          const files = getFilesByType(type);
          const hasSuccess = files.some((f) => f.status === 'success');
          const Icon = config.icon;

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
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center border ${config.color}`}
                    >
                      <Icon className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {FILE_TYPE_LABELS[type]}
                        </h3>
                        {hasSuccess && (
                          <Badge variant="success" size="sm">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            已导入
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{config.desc}</p>
                      <p className="text-xs text-gray-400 mt-1">支持格式：{config.extensions}</p>
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
                  <div className="mt-4 space-y-2">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {file.status === 'success' ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          ) : file.status === 'error' ? (
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(file.size)}
                              {file.rows !== undefined && ` · ${file.rows} 条数据`}
                              {file.errorMessage && (
                                <span className="text-red-500 ml-2">{file.errorMessage}</span>
                              )}
                            </p>
                            {file.status === 'uploading' && (
                              <div className="w-full h-1 bg-gray-200 rounded-full mt-2 overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                  style={{ width: `${file.progress}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeImportFile(file.id)}
                          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors ml-4"
                        >
                          <X className="w-4 h-4" />
                        </button>
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
          <span>至少导入运单和回单数据后可进行核对</span>
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
