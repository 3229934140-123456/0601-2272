export type FileType = 'waybill' | 'receipt' | 'fuelCard' | 'tollFee' | 'quotation';

export interface ImportFile {
  id: string;
  type: FileType;
  name: string;
  size: number;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  rows?: number;
  errorMessage?: string;
  uploadedAt: string;
}

export interface Waybill {
  id: string;
  waybillNo: string;
  plateNo: string;
  line: string;
  vehicleType: string;
  weight: number;
  mileage: number;
  freight: number;
  carrier: string;
  sendDate: string;
  status: 'pending' | 'completed' | 'abnormal';
}

export interface Receipt {
  id: string;
  waybillNo: string;
  plateNo: string;
  receiptDate: string;
  receiver: string;
  status: 'confirmed' | 'pending';
}

export interface FuelCardRecord {
  id: string;
  cardNo: string;
  plateNo: string;
  rechargeDate: string;
  amount: number;
  balance: number;
}

export interface TollFee {
  id: string;
  waybillNo: string;
  plateNo: string;
  tollDate: string;
  amount: number;
  station: string;
}

export interface Quotation {
  id: string;
  carrier: string;
  line: string;
  vehicleType: string;
  weightMin: number;
  weightMax: number;
  unitPrice: number;
  mileagePrice: number;
  effectiveDate: string;
}

export interface BillingRule {
  id: string;
  ruleName: string;
  line: string;
  vehicleType: string;
  basePrice: number;
  weightPrice: number;
  mileagePrice: number;
  tolerance: number;
  enabled: boolean;
  createdAt: string;
}

export type DiffType =
  | 'missing_receipt'
  | 'duplicate_waybill'
  | 'exceed_quotation'
  | 'fee_unallocated'
  | 'mileage_mismatch'
  | 'weight_mismatch'
  | 'other';

export type DiffStatus = 'pending' | 'confirmed' | 'rejected' | 'adjusted';

export interface DiffRecord {
  id: string;
  checkId: string;
  waybillNo: string;
  plateNo: string;
  carrier: string;
  diffType: DiffType;
  description: string;
  expectedAmount: number;
  actualAmount: number;
  diffAmount: number;
  status: DiffStatus;
  remark: string;
  handler?: string;
  handleTime?: string;
  waybill?: Waybill;
}

export interface CheckRecord {
  id: string;
  checkBatchNo: string;
  checkDate: string;
  totalWaybills: number;
  matchedCount: number;
  diffCount: number;
  status: 'pending' | 'reviewing' | 'completed';
  operator: string;
  remark?: string;
  totalAmount: number;
  diffAmount: number;
  payableAmount: number;
}

export interface CheckSummary {
  totalWaybills: number;
  matchedCount: number;
  diffCount: number;
  diffByType: Record<DiffType, number>;
  totalAmount: number;
  diffAmount: number;
  payableAmount: number;
}

export interface CarrierSummary {
  carrier: string;
  waybillCount: number;
  totalAmount: number;
  diffCount: number;
  diffAmount: number;
  payableAmount: number;
}

export const FILE_TYPE_LABELS: Record<FileType, string> = {
  waybill: '运单数据',
  receipt: '回单数据',
  fuelCard: '油卡数据',
  tollFee: '过路费数据',
  quotation: '承运商报价',
};

export const DIFF_TYPE_LABELS: Record<DiffType, string> = {
  missing_receipt: '缺少回单',
  duplicate_waybill: '重复运单',
  exceed_quotation: '超出报价',
  fee_unallocated: '费用未分摊',
  mileage_mismatch: '里程不符',
  weight_mismatch: '重量不符',
  other: '其他问题',
};

export const DIFF_TYPE_COLORS: Record<DiffType, string> = {
  missing_receipt: 'bg-amber-100 text-amber-700 border-amber-200',
  duplicate_waybill: 'bg-rose-100 text-rose-700 border-rose-200',
  exceed_quotation: 'bg-red-100 text-red-700 border-red-200',
  fee_unallocated: 'bg-purple-100 text-purple-700 border-purple-200',
  mileage_mismatch: 'bg-blue-100 text-blue-700 border-blue-200',
  weight_mismatch: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  other: 'bg-gray-100 text-gray-700 border-gray-200',
};

export const DIFF_STATUS_LABELS: Record<DiffStatus, string> = {
  pending: '待处理',
  confirmed: '已确认',
  rejected: '已驳回',
  adjusted: '已调整',
};

export const DIFF_STATUS_COLORS: Record<DiffStatus, string> = {
  pending: 'bg-amber-50 text-amber-600 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-600 border-rose-200',
  adjusted: 'bg-blue-50 text-blue-600 border-blue-200',
};

export const VEHICLE_TYPES = ['4.2米厢车', '6.8米厢车', '9.6米厢车', '13米高栏', '17.5米平板'];

export const LINES = ['北京-上海', '北京-广州', '上海-广州', '深圳-杭州', '广州-成都', '上海-成都'];

export const CARRIERS = ['顺丰速运', '德邦物流', '中通快运', '圆通速递', '申通物流', '韵达快运'];
