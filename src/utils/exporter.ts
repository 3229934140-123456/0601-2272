import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { DiffRecord, Waybill, CheckSummary, CarrierSummary, WaybillSummary, DIFF_TYPE_LABELS } from '@/types';

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
  waybillSummaries?: WaybillSummary[]
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
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, '汇总');

  const carrierData = carrierSummaries.map((c) => ({
    承运商: c.carrier,
    运单数量: c.waybillCount,
    受影响运单: c.affectedWaybillCount || 0,
    差异数量: c.diffCount,
    总金额: c.totalAmount,
    差异金额: c.diffAmount,
    应付金额: c.payableAmount,
  }));
  const carrierSheet = XLSX.utils.json_to_sheet(carrierData);
  XLSX.utils.book_append_sheet(workbook, carrierSheet, '按承运商汇总');

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
    const wsSheet = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(workbook, wsSheet, '按运单汇总');
  }

  const waybillData = waybills.map((w) => {
    const diff = diffs.find((d) => d.waybillNo === w.waybillNo);
    return {
      运单号: w.waybillNo,
      车牌号: w.plateNo,
      线路: w.line,
      车型: w.vehicleType,
      重量: w.weight,
      里程: w.mileage,
      运费: w.freight,
      承运商: w.carrier,
      发运日期: w.sendDate,
      是否有差异: diff ? '是' : '否',
      差异类型: diff ? diffTypeLabel(diff.diffType) : '',
      差异金额: diff ? diff.diffAmount : 0,
      状态: diff ? diffStatusLabel(diff.status) : '正常',
    };
  });
  const waybillSheet = XLSX.utils.json_to_sheet(waybillData);
  XLSX.utils.book_append_sheet(workbook, waybillSheet, '运单明细');

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
  const diffSheet = XLSX.utils.json_to_sheet(diffData);
  XLSX.utils.book_append_sheet(workbook, diffSheet, '差异明细');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
};
