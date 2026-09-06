/**
 * Generator for Peruvian Official Payslip (Boleta de Pago)
 * Base Legal: D.S. 001-98-TR (Planillas de Pago) y D.S. 009-2011-TR (Boletas Electrónicas)
 */

import { createHash, randomUUID } from 'node:crypto';
import type { GeneratedPayslip, PayslipInput } from './types.ts';
import { convertirNumeroALetrasSoles } from './utils/numberToWords.ts';

function formatCurrency(amount: number): string {
  return `S/ ${amount.toFixed(2)}`;
}

export function generatePayslip(input: PayslipInput): GeneratedPayslip {
  const { company, employee, attendance, payroll } = input;
  const payslipId = randomUUID();

  const netPay = payroll.netPay;
  const amountInWords = convertirNumeroALetrasSoles(netPay);
  const periodLabel = `${payroll.period.year}-${String(payroll.period.month).padStart(2, '0')}`;

  // Hash de integridad no sensible (Auditoría Manus AI: verificar autenticidad sin revelar datos públicos)
  const hashPayload = `${payslipId}|${company.ruc}|${employee.docNumber}|${periodLabel}|${netPay.toFixed(2)}`;
  const verificationHash = createHash('sha256').update(hashPayload, 'utf8').digest('hex');

  const totalOvertimeHours = attendance.overtimeHours25 + attendance.overtimeHours35;

  // Renderizado HTML/CSS listo para impresión o exportación A4
  const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Boleta de Pago - ${employee.fullName} - ${periodLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; }
    body { background: #f8fafc; padding: 20px; color: #1e293b; font-size: 11px; }
    .sheet { background: #ffffff; max-width: 800px; margin: 0 auto; padding: 30px; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { border: none; box-shadow: none; max-width: 100%; padding: 15px; }
    }
    .header { border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-start; }
    .company-title { font-size: 14px; font-weight: bold; color: #1e3a8a; text-transform: uppercase; }
    .company-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
    .doc-badge { text-align: right; }
    .doc-title { font-size: 13px; font-weight: bold; color: #0f172a; text-transform: uppercase; }
    .doc-period { font-size: 11px; font-weight: bold; color: #2563eb; margin-top: 2px; }
    
    .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .grid-table td { padding: 4px 8px; border: 1px solid #e2e8f0; font-size: 10px; }
    .label { font-weight: 600; color: #475569; background: #f1f5f9; width: 18%; }
    .val { color: #0f172a; }

    .columns-wrap { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 15px; }
    .col-card { border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; }
    .col-header { background: #1e3a8a; color: #ffffff; font-weight: bold; padding: 6px 8px; font-size: 10px; text-transform: uppercase; text-align: center; }
    .col-body { padding: 8px; flex: 1; background: #ffffff; }
    .item-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10px; }
    .item-code { color: #64748b; font-size: 9px; margin-right: 4px; }
    .item-desc { color: #1e293b; }
    .item-amt { font-weight: 600; }
    .col-footer { background: #f8fafc; border-top: 1px solid #cbd5e1; padding: 6px 8px; display: flex; justify-content: space-between; font-weight: bold; font-size: 10px; }

    .net-box { background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px; border-radius: 4px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .net-text { font-size: 10px; font-weight: bold; color: #1e40af; }
    .net-words { font-size: 9px; color: #475569; margin-top: 3px; font-style: italic; }
    .net-val { font-size: 16px; font-weight: 800; color: #1e3a8a; }

    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 35px; text-align: center; }
    .sig-line { border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 10px; font-weight: 600; color: #334155; }
    .sig-sub { font-size: 8px; color: #64748b; margin-top: 2px; }

    .footer { margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 8px; color: #94a3b8; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="sheet">
    <!-- Encabezado -->
    <div class="header">
      <div>
        <div class="company-title">${company.razonSocial}</div>
        <div class="company-sub">RUC: ${company.ruc} | ${company.direccion}</div>
      </div>
      <div class="doc-badge">
        <div class="doc-title">Boleta de Pago</div>
        <div class="doc-period">PERIODO: ${periodLabel}</div>
      </div>
    </div>

    <!-- Datos del Trabajador -->
    <table class="grid-table">
      <tr>
        <td class="label">Trabajador:</td>
        <td class="val" colspan="3"><strong>${employee.fullName}</strong></td>
        <td class="label">Doc. Identidad:</td>
        <td class="val">${employee.docType}: ${employee.docNumber}</td>
      </tr>
      <tr>
        <td class="label">Cargo / Puesto:</td>
        <td class="val">${employee.cargo}</td>
        <td class="label">Fecha Ingreso:</td>
        <td class="val">${employee.hireDate}</td>
        <td class="label">Régimen Laboral:</td>
        <td class="val">Pequeña Empresa (D.L. 1086)</td>
      </tr>
      <tr>
        <td class="label">Sistema Pensión:</td>
        <td class="val">${employee.pensionSystem} (${employee.commissionType})</td>
        <td class="label">CUSPP:</td>
        <td class="val">${employee.cuspp ?? 'NO APLICA'}</td>
        <td class="label">Básico Mensual:</td>
        <td class="val">${formatCurrency(employee.baseSalary)}</td>
      </tr>
      <tr>
        <td class="label">Días Laborados:</td>
        <td class="val">${attendance.daysWorked} días (Ord: ${attendance.regularHours}h)</td>
        <td class="label">Días No Laborados:</td>
        <td class="val">${attendance.daysAbsentUnjustified + attendance.daysSubsidized + attendance.daysUnpaidLeave} días</td>
        <td class="label">Sobretiempo:</td>
        <td class="val">${totalOvertimeHours} horas</td>
      </tr>
    </table>

    <!-- 3 Columnas de Liquidación -->
    <div class="columns-wrap">
      <!-- Columna 1: Ingresos -->
      <div class="col-card">
        <div class="col-header">Ingresos</div>
        <div class="col-body">
          <div class="item-row">
            <div><span class="item-code">0121</span><span class="item-desc">Rem. Básica</span></div>
            <div class="item-amt">${formatCurrency(payroll.earnings.baseSalaryEarned)}</div>
          </div>
          ${payroll.earnings.familyAllowance > 0 ? `
          <div class="item-row">
            <div><span class="item-code">0201</span><span class="item-desc">Asig. Familiar</span></div>
            <div class="item-amt">${formatCurrency(payroll.earnings.familyAllowance)}</div>
          </div>` : ''}
          ${payroll.earnings.overtime25Amount > 0 ? `
          <div class="item-row">
            <div><span class="item-code">0105</span><span class="item-desc">Horas Extras 25%</span></div>
            <div class="item-amt">${formatCurrency(payroll.earnings.overtime25Amount)}</div>
          </div>` : ''}
          ${payroll.earnings.overtime35Amount > 0 ? `
          <div class="item-row">
            <div><span class="item-code">0106</span><span class="item-desc">Horas Extras 35%</span></div>
            <div class="item-amt">${formatCurrency(payroll.earnings.overtime35Amount)}</div>
          </div>` : ''}
          ${payroll.earnings.nightSurchargeAmount > 0 ? `
          <div class="item-row">
            <div><span class="item-code">0107</span><span class="item-desc">Sobretasa Nocturna</span></div>
            <div class="item-amt">${formatCurrency(payroll.earnings.nightSurchargeAmount)}</div>
          </div>` : ''}
        </div>
        <div class="col-footer">
          <span>TOTAL INGRESOS</span>
          <span>${formatCurrency(payroll.earnings.totalGrossRemuneration)}</span>
        </div>
      </div>

      <!-- Columna 2: Descuentos -->
      <div class="col-card">
        <div class="col-header">Descuentos</div>
        <div class="col-body">
          ${payroll.deductions.absenceDeduction > 0 ? `
          <div class="item-row">
            <div><span class="item-code">0706</span><span class="item-desc">Faltas Injustificadas</span></div>
            <div class="item-amt">${formatCurrency(payroll.deductions.absenceDeduction)}</div>
          </div>` : ''}
          ${payroll.deductions.tardinessDeduction > 0 ? `
          <div class="item-row">
            <div><span class="item-code">0701</span><span class="item-desc">Tardanzas</span></div>
            <div class="item-amt">${formatCurrency(payroll.deductions.tardinessDeduction)}</div>
          </div>` : ''}
          ${payroll.deductions.onpAmount > 0 ? `
          <div class="item-row">
            <div><span class="item-code">0607</span><span class="item-desc">SNP (ONP 13%)</span></div>
            <div class="item-amt">${formatCurrency(payroll.deductions.onpAmount)}</div>
          </div>` : ''}
          ${payroll.deductions.afpMandatoryFund > 0 ? `
          <div class="item-row">
            <div><span class="item-code">0608</span><span class="item-desc">AFP Fondo (10%)</span></div>
            <div class="item-amt">${formatCurrency(payroll.deductions.afpMandatoryFund)}</div>
          </div>` : ''}
          ${payroll.deductions.afpInsurancePremium > 0 ? `
          <div class="item-row">
            <div><span class="item-code">0606</span><span class="item-desc">AFP Seguro SIS</span></div>
            <div class="item-amt">${formatCurrency(payroll.deductions.afpInsurancePremium)}</div>
          </div>` : ''}
          ${payroll.deductions.afpCommission > 0 ? `
          <div class="item-row">
            <div><span class="item-code">0601</span><span class="item-desc">AFP Comisión</span></div>
            <div class="item-amt">${formatCurrency(payroll.deductions.afpCommission)}</div>
          </div>` : ''}
          ${payroll.deductions.incomeTax5thCategory > 0 ? `
          <div class="item-row">
            <div><span class="item-code">0605</span><span class="item-desc">Renta 5ta Categoría</span></div>
            <div class="item-amt">${formatCurrency(payroll.deductions.incomeTax5thCategory)}</div>
          </div>` : ''}
        </div>
        <div class="col-footer">
          <span>TOTAL DESCUENTOS</span>
          <span>${formatCurrency(payroll.deductions.totalDeductions)}</span>
        </div>
      </div>

      <!-- Columna 3: Aportes Empleador -->
      <div class="col-card">
        <div class="col-header">Aportes Empleador</div>
        <div class="col-body">
          <div class="item-row">
            <div><span class="item-code">0804</span><span class="item-desc">EsSalud (9%)</span></div>
            <div class="item-amt">${formatCurrency(payroll.employerContributions.essaludAmount)}</div>
          </div>
          ${payroll.employerContributions.sctrHealthAmount > 0 ? `
          <div class="item-row">
            <div><span class="item-code">0805</span><span class="item-desc">SCTR Salud</span></div>
            <div class="item-amt">${formatCurrency(payroll.employerContributions.sctrHealthAmount)}</div>
          </div>` : ''}
        </div>
        <div class="col-footer">
          <span>TOTAL APORTES</span>
          <span>${formatCurrency(payroll.employerContributions.totalEmployerContributions)}</span>
        </div>
      </div>
    </div>

    <!-- Total Neto a Pagar -->
    <div class="net-box">
      <div>
        <div class="net-text">NETO A PAGAR:</div>
        <div class="net-words">${amountInWords}</div>
      </div>
      <div class="net-val">${formatCurrency(netPay)}</div>
    </div>

    <!-- Firmas -->
    <div class="signatures">
      <div>
        <div class="sig-line">EMPLEADOR</div>
        <div class="sig-sub">${company.razonSocial}<br>RUC: ${company.ruc}</div>
      </div>
      <div>
        <div class="sig-line">TRABAJADOR</div>
        <div class="sig-sub">${employee.fullName}<br>${employee.docType}: ${employee.docNumber}</div>
      </div>
    </div>

    <!-- Pie de Página y Auditoría -->
    <div class="footer">
      <div>Emitido conforme al D.S. 001-98-TR y D.S. 009-2011-TR (MTPE Perú)</div>
      <div>Hash de Integridad: ${verificationHash.substring(0, 16)}...</div>
    </div>
  </div>
</body>
</html>`;

  return {
    id: payslipId,
    employeeDoc: employee.docNumber,
    periodLabel,
    netPay,
    amountInWords,
    verificationHash,
    htmlContent,
  };
}
