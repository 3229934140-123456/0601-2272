import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  DiffRecord,
  Waybill,
  Receipt,
  FuelCardRecord,
  TollFee,
  Quotation,
  CheckSummary,
  CarrierSummary,
  WaybillSummary,
  DIFF_TYPE_LABELS,
} from '@/types';

const diffTypeLabel = (t: string) => (DIFF_TYPE_LABELS as any)[t] || t;
const diffStatusLabel = (s: string) => {
  const map: Record<string, string> = {
    pending: '待处理',
    confirmed: '已确认',
    rejected: '已驳回',
    adjusted: '已调整',
  };
  return map[s] || s;
};

const resolveWaybillFinalStatus = (statuses: string[]): string => {
  if (statuses.length === 0) return '正常';
  if (statuses.includes('adjusted')) return '已调整';
  if (statuses.includes('rejected')) return '已驳回';
  if (statuses.includes('confirmed')) return '已确认';
  if (statuses.includes('pending')) return '待处理';
  return '正常';
};

export const exportDiffRecords = (diffs: DiffRecord[], filename: string) => {
  const data = diffs.map((d) => ({
    运单号: d.waybillNo,
    车牌号: d.plateNo,
    承运商: d.carrier,
    问题类型: diffTypeLabel(d.diffType),
    问题描述: d.description,
    预期金额: d.expectedAmount,
    实际金额: d.actualAmount,
    差异金额: d.diffAmount,
    状态: diffStatusLabel(d.status),
    备注: d.remark,
    处理人: d.handler || '',
    处理时间: d.handleTime || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '差异明细');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
};

export const exportReconciliation = (
  waybills: Waybill[],
  diffs: DiffRecord[],
  summary: CheckSummary,
  carrierSummaries: CarrierSummary[],
  filename: string,
  waybillSummaries?: WaybillSummary[],
  receipts?: Receipt[],
  fuelCardRecords?: FuelCardRecord[],
  tollFees?: TollFee[],
  quotations?: Quotation[]
) => {
  const workbook = XLSX.utils.book_new();

  const summaryData = [
    { 项目: '运单总数', 值: summary.totalWaybills },
    { 项目: '匹配正常', 值: summary.matchedCount },
    { 项目: '差异数量', 值: summary.diffCount },
    { 项目: '受影响运单', 值: (summary as any).affectedWaybillCount || 0 },
    { 项目: '总运费金额', 值: summary.totalAmount },
    { 项目: '差异金额', 值: summary.diffAmount },
    { 项目: '应付金额', 值: summary.payableAmount },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryData), '汇总');

  const carrierData = carrierSummaries.map((c) => ({
    承运商: c.carrier,
    运单数量: c.waybillCount,
    受影响运单: c.affectedWaybillCount || 0,
    差异数量: c.diffCount,
    总金额: c.totalAmount,
    差异金额: c.diffAmount,
    应付金额: c.payableAmount,
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(carrierData), '按承运商汇总');

  if (waybillSummaries && waybillSummaries.length > 0) {
    const wsData = waybillSummaries.map((w) => ({
      运单号: w.waybillNo,
      车牌号: w.plateNo,
      承运商: w.carrier,
      运费: w.freight,
      差异数量: w.diffCount,
      差异类型: w.diffTypes.map(diffTypeLabel).join('、'),
      差异金额: w.diffAmount,
      应付金额: w.payableAmount,
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(wsData), '按运单汇总');
  }

  const waybillByNo = new Map(waybills.map((w) => [w.waybillNo, w]));
  const diffsByNo = new Map<string, DiffRecord[]>();
  diffs.forEach((d) => {
    if (!diffsByNo.has(d.waybillNo)) diffsByNo.set(d.waybillNo, []);
    diffsByNo.get(d.waybillNo)!.push(d);
  });

  const baseWaybillRows = waybillSummaries && waybillSummaries.length > 0
    ? waybillSummaries
    : waybills.map((w) => {
        const ds = diffsByNo.get(w.waybillNo) || [];
        const diffTypes = Array.from(new Set(ds.map((d) => d.diffType)));
        const diffAmount = ds
          .filter((d) => d.status !== 'rejected')
          .reduce((s, d) => s + d.diffAmount, 0);
        return {
          waybillNo: w.waybillNo,
          plateNo: w.plateNo,
          carrier: w.carrier,
          freight: w.freight,
          diffCount: ds.length,
          diffTypes,
          diffAmount,
          payableAmount: w.freight - diffAmount,
        } as WaybillSummary;
      });

  const waybillData = baseWaybillRows.map((ws) => {
    const w = waybillByNo.get(ws.waybillNo);
    const ds = diffsByNo.get(ws.waybillNo) || [];
    const finalStatus = resolveWaybillFinalStatus(ds.map((d) => d.status));
    return {
      运单号: ws.waybillNo,
      车牌号: ws.plateNo,
      承运商: ws.carrier,
      线路: w?.line || '',
      车型: w?.vehicleType || '',
      重量: w?.weight || 0,
      里程: w?.mileage || 0,
      运费: ws.freight,
      发运日期: w?.sendDate || '',
      差异数量: ws.diffCount,
      差异类型: ws.diffTypes.map(diffTypeLabel).join('、'),
      差异金额: ws.diffAmount,
      应付金额: ws.payableAmount,
      最终状态: finalStatus,
    };
  });
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(waybillData), '运单明细');

  const diffData = diffs.map((d) => ({
    运单号: d.waybillNo,
    车牌号: d.plateNo,
    承运商: d.carrier,
    问题类型: diffTypeLabel(d.diffType),
    问题描述: d.description,
    预期金额: d.expectedAmount,
    实际金额: d.actualAmount,
    差异金额: d.diffAmount,
    状态: diffStatusLabel(d.status),
    备注: d.remark,
    处理人: d.handler || '',
    处理时间: d.handleTime || '',
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(diffData), '差异明细');

  if (waybills && waybills.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        waybills.map((w) => ({
          运单号: w.waybillNo,
          车牌号: w.plateNo,
          线路: w.line,
          车型: w.vehicleType,
          重量: w.weight,
          里程: w.mileage,
          运费: w.freight,
          承运商: w.carrier,
          发运日期: w.sendDate,
          状态: w.status,
        }))
      ),
      '原始运单'
    );
  }

  if (receipts && receipts.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        receipts.map((r) => ({
          运单号: r.waybillNo,
          车牌号: r.plateNo,
          回单日期: r.receiptDate,
          收货人: r.receiver,
          状态: r.status,
        }))
      ),
      '原始回单'
    );
  }

  if (fuelCardRecords && fuelCardRecords.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        fuelCardRecords.map((f) => ({
          卡号: f.cardNo,
          车牌号: f.plateNo,
          充值日期: f.rechargeDate,
          金额: f.amount,
          余额: f.balance,
        }))
      ),
      '原始油卡'
    );
  }

  if (tollFees && tollFees.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        tollFees.map((t) => ({
          运单号: t.waybillNo,
          车牌号: t.plateNo,
          日期: t.tollDate,
          金额: t.amount,
          收费站: t.station,
        }))
      ),
      '原始过路费'
    );
  }

  if (quotations && quotations.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        quotations.map((q) => ({
          承运商: q.carrier,
          线路: q.line,
          车型: q.vehicleType,
          最小重量: q.weightMin,
          最大重量: q.weightMax,
          单价: q.unitPrice,
          里程价: q.mileagePrice,
          生效日期: q.effectiveDate,
        }))
      ),
      '原始报价'
    );
  }

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
};
