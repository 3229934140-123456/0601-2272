import { Waybill, Receipt, FuelCardRecord, TollFee, Quotation, BillingRule, CheckRecord, DiffRecord, DiffType } from '@/types';

const generateId = () => Math.random().toString(36).substring(2, 11);

const waybills: Waybill[] = Array.from({ length: 50 }, (_, i) => {
  const carriers = ['顺丰速运', '德邦物流', '中通快运', '圆通速递', '申通物流', '韵达快运'];
  const lines = ['北京-上海', '北京-广州', '上海-广州', '深圳-杭州', '广州-成都', '上海-成都'];
  const vehicleTypes = ['4.2米厢车', '6.8米厢车', '9.6米厢车', '13米高栏', '17.5米平板'];
  const baseFreight = [800, 1500, 2500, 3500, 5000][vehicleTypes.indexOf(vehicleTypes[i % 5])];
  const weight = 2 + Math.floor(Math.random() * 30);
  const mileage = 300 + Math.floor(Math.random() * 1500);

  return {
    id: generateId(),
    waybillNo: `YD${String(202406001 + i).padStart(10, '0')}`,
    plateNo: `京A${String(10000 + i).padStart(5, '0')}`,
    line: lines[i % lines.length],
    vehicleType: vehicleTypes[i % vehicleTypes.length],
    weight,
    mileage,
    freight: Math.round(baseFreight + weight * 8 + mileage * 1.2 + Math.random() * 500),
    carrier: carriers[i % carriers.length],
    sendDate: `2024-06-${String((i % 28) + 1).padStart(2, '0')}`,
    status: i % 15 === 0 ? 'abnormal' : 'completed',
  };
});

const receipts: Receipt[] = waybills
  .filter((_, i) => i % 7 !== 3)
  .map((wb, i) => ({
    id: generateId(),
    waybillNo: wb.waybillNo,
    plateNo: wb.plateNo,
    receiptDate: wb.sendDate,
    receiver: `收货方${i + 1}`,
    status: 'confirmed' as const,
  }));

const fuelCardRecords: FuelCardRecord[] = Array.from({ length: 30 }, (_, i) => ({
  id: generateId(),
  cardNo: `YK${String(10001 + i).padStart(6, '0')}`,
  plateNo: `京A${String(10000 + (i * 2) % 50).padStart(5, '0')}`,
  rechargeDate: `2024-06-${String((i % 28) + 1).padStart(2, '0')}`,
  amount: 500 + Math.floor(Math.random() * 3000),
  balance: 200 + Math.floor(Math.random() * 2000),
}));

const tollFees: TollFee[] = waybills.slice(0, 40).map((wb, i) => ({
  id: generateId(),
  waybillNo: wb.waybillNo,
  plateNo: wb.plateNo,
  tollDate: wb.sendDate,
  amount: Math.round(wb.mileage * 0.45 + Math.random() * 100),
  station: `${wb.line.split('-')[0]}收费站`,
}));

const quotations: Quotation[] = [
  { id: generateId(), carrier: '顺丰速运', line: '北京-上海', vehicleType: '4.2米厢车', weightMin: 0, weightMax: 5, unitPrice: 800, mileagePrice: 1.5, effectiveDate: '2024-01-01' },
  { id: generateId(), carrier: '顺丰速运', line: '北京-上海', vehicleType: '6.8米厢车', weightMin: 5, weightMax: 10, unitPrice: 1500, mileagePrice: 2.0, effectiveDate: '2024-01-01' },
  { id: generateId(), carrier: '顺丰速运', line: '北京-上海', vehicleType: '9.6米厢车', weightMin: 10, weightMax: 18, unitPrice: 2500, mileagePrice: 2.8, effectiveDate: '2024-01-01' },
  { id: generateId(), carrier: '顺丰速运', line: '北京-广州', vehicleType: '13米高栏', weightMin: 18, weightMax: 32, unitPrice: 4500, mileagePrice: 3.5, effectiveDate: '2024-01-01' },
  { id: generateId(), carrier: '德邦物流', line: '北京-上海', vehicleType: '4.2米厢车', weightMin: 0, weightMax: 5, unitPrice: 750, mileagePrice: 1.4, effectiveDate: '2024-01-01' },
  { id: generateId(), carrier: '德邦物流', line: '北京-广州', vehicleType: '9.6米厢车', weightMin: 10, weightMax: 18, unitPrice: 2400, mileagePrice: 2.6, effectiveDate: '2024-01-01' },
  { id: generateId(), carrier: '中通快运', line: '上海-广州', vehicleType: '6.8米厢车', weightMin: 5, weightMax: 10, unitPrice: 1200, mileagePrice: 1.8, effectiveDate: '2024-01-01' },
  { id: generateId(), carrier: '中通快运', line: '上海-广州', vehicleType: '9.6米厢车', weightMin: 10, weightMax: 18, unitPrice: 2200, mileagePrice: 2.5, effectiveDate: '2024-01-01' },
  { id: generateId(), carrier: '圆通速递', line: '深圳-杭州', vehicleType: '4.2米厢车', weightMin: 0, weightMax: 5, unitPrice: 600, mileagePrice: 1.2, effectiveDate: '2024-01-01' },
  { id: generateId(), carrier: '圆通速递', line: '广州-成都', vehicleType: '13米高栏', weightMin: 18, weightMax: 32, unitPrice: 4200, mileagePrice: 3.2, effectiveDate: '2024-01-01' },
  { id: generateId(), carrier: '申通物流', line: '上海-成都', vehicleType: '9.6米厢车', weightMin: 10, weightMax: 18, unitPrice: 2800, mileagePrice: 2.7, effectiveDate: '2024-01-01' },
  { id: generateId(), carrier: '韵达快运', line: '北京-上海', vehicleType: '17.5米平板', weightMin: 32, weightMax: 50, unitPrice: 5500, mileagePrice: 4.0, effectiveDate: '2024-01-01' },
];

const billingRules: BillingRule[] = [
  { id: generateId(), ruleName: '北京-上海标准价', line: '北京-上海', vehicleType: '通用', basePrice: 500, weightPrice: 8, mileagePrice: 1.5, tolerance: 5, enabled: true, createdAt: '2024-01-01' },
  { id: generateId(), ruleName: '北京-广州重货价', line: '北京-广州', vehicleType: '9.6米厢车', basePrice: 800, weightPrice: 10, mileagePrice: 2.5, tolerance: 8, enabled: true, createdAt: '2024-01-15' },
  { id: generateId(), ruleName: '上海-广州轻货价', line: '上海-广州', vehicleType: '6.8米厢车', basePrice: 400, weightPrice: 6, mileagePrice: 1.2, tolerance: 5, enabled: true, createdAt: '2024-02-01' },
  { id: generateId(), ruleName: '深圳-杭州短途价', line: '深圳-杭州', vehicleType: '4.2米厢车', basePrice: 300, weightPrice: 5, mileagePrice: 1.0, tolerance: 3, enabled: false, createdAt: '2024-03-01' },
  { id: generateId(), ruleName: '广州-成都长途价', line: '广州-成都', vehicleType: '13米高栏', basePrice: 1200, weightPrice: 12, mileagePrice: 3.0, tolerance: 10, enabled: true, createdAt: '2024-04-01' },
];

const diffTypes: DiffType[] = ['missing_receipt', 'duplicate_waybill', 'exceed_quotation', 'fee_unallocated', 'mileage_mismatch', 'weight_mismatch', 'other'];

const checkRecords: CheckRecord[] = [
  { id: generateId(), checkBatchNo: 'CHECK20240615001', checkDate: '2024-06-15', totalWaybills: 50, matchedCount: 42, diffCount: 8, status: 'completed', operator: '张会计', totalAmount: 125000, diffAmount: 8500, payableAmount: 116500 },
  { id: generateId(), checkBatchNo: 'CHECK20240610002', checkDate: '2024-06-10', totalWaybills: 35, matchedCount: 30, diffCount: 5, status: 'completed', operator: '李出纳', totalAmount: 89000, diffAmount: 5200, payableAmount: 83800 },
  { id: generateId(), checkBatchNo: 'CHECK20240605003', checkDate: '2024-06-05', totalWaybills: 42, matchedCount: 38, diffCount: 4, status: 'reviewing', operator: '张会计', totalAmount: 102000, diffAmount: 3800, payableAmount: 98200 },
  { id: generateId(), checkBatchNo: 'CHECK20240528004', checkDate: '2024-05-28', totalWaybills: 28, matchedCount: 26, diffCount: 2, status: 'completed', operator: '王主管', totalAmount: 72000, diffAmount: 1500, payableAmount: 70500 },
  { id: generateId(), checkBatchNo: 'CHECK20240520005', checkDate: '2024-05-20', totalWaybills: 60, matchedCount: 55, diffCount: 5, status: 'completed', operator: '李出纳', totalAmount: 156000, diffAmount: 6800, payableAmount: 149200 },
];

const generateDiffRecords = (checkId: string, waybills: Waybill[]): DiffRecord[] => {
  const diffs: DiffRecord[] = [];

  waybills.slice(0, 8).forEach((wb, i) => {
    const diffType = diffTypes[i % diffTypes.length];
    let description = '';
    let expectedAmount = wb.freight;
    let actualAmount = wb.freight;
    let diffAmount = 0;

    switch (diffType) {
      case 'missing_receipt':
        description = `运单${wb.waybillNo}未找到对应回单记录`;
        break;
      case 'duplicate_waybill':
        description = `运单${wb.waybillNo}在系统中存在多条重复记录`;
        break;
      case 'exceed_quotation':
        expectedAmount = Math.round(wb.freight * 0.9);
        diffAmount = wb.freight - expectedAmount;
        description = `运费超出报价${diffAmount}元，超出${((diffAmount / expectedAmount) * 100).toFixed(1)}%`;
        break;
      case 'fee_unallocated':
        diffAmount = 500 + Math.floor(Math.random() * 1000);
        actualAmount = wb.freight + diffAmount;
        description = `存在${diffAmount}元油卡/过路费未分摊到运单`;
        break;
      case 'mileage_mismatch':
        expectedAmount = Math.round(wb.mileage * 1.5);
        diffAmount = Math.abs(wb.mileage * 1.2 - expectedAmount);
        description = `实际里程与系统测算里程偏差${Math.round(diffAmount / 1.5)}公里`;
        break;
      case 'weight_mismatch':
        diffAmount = 500 + Math.floor(Math.random() * 800);
        description = `计费重量与实际重量偏差产生费用差异${diffAmount}元`;
        break;
      default:
        diffAmount = 300 + Math.floor(Math.random() * 500);
        description = '其他原因导致的费用差异';
    }

    diffs.push({
      id: generateId(),
      checkId,
      waybillNo: wb.waybillNo,
      plateNo: wb.plateNo,
      carrier: wb.carrier,
      diffType,
      description,
      expectedAmount,
      actualAmount,
      diffAmount: diffAmount || 200 + Math.floor(Math.random() * 1000),
      status: i < 3 ? 'pending' : i < 5 ? 'confirmed' : i < 7 ? 'adjusted' : 'rejected',
      remark: '',
      handler: i < 5 ? '张会计' : undefined,
      handleTime: i < 5 ? '2024-06-15 14:30' : undefined,
      waybill: wb,
    });
  });

  return diffs;
};

export const mockData = {
  waybills,
  receipts,
  fuelCardRecords,
  tollFees,
  quotations,
  billingRules,
  checkRecords,
  generateDiffRecords,
  generateId,
};
