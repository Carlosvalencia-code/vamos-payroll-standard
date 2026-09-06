/**
 * Main Payroll Calculation Engine for Peru
 * Orchestrates legal rules for Small Business (D.L. 1086) and General Regime (D.L. 728)
 */

import { DEFAULT_LEGAL_PARAMETERS_PERU, type LegalParameters, roundSunat } from './parameters.ts';
import { calculateEmployerContributions } from './rules/employer.ts';
import { calculateOvertimeAndNight } from './rules/overtime.ts';
import { calculatePensionDeductions } from './rules/pension.ts';
import { calculateBaseAndAttendanceAdjustments } from './rules/smallBusiness.ts';
import { calculateFifthCategoryTax } from './rules/taxes.ts';
import type {
  AttendanceSummary,
  AuditLogEntry,
  DeductionsBreakdown,
  EarningsBreakdown,
  Employee,
  PayrollPeriod,
  PayrollSlipResult,
} from './types.ts';

export interface PayrollEngineOptions {
  legalParameters?: LegalParameters;
}

export function calculateEmployeePayroll(
  employee: Employee,
  attendance: AttendanceSummary,
  period: PayrollPeriod,
  options: PayrollEngineOptions = {}
): PayrollSlipResult {
  const params = options.legalParameters ?? DEFAULT_LEGAL_PARAMETERS_PERU;
  const masterAuditTrail: AuditLogEntry[] = [];

  // 1. Cálculo de base, asignación familiar y deducciones de asistencia inicial
  const baseResult = calculateBaseAndAttendanceAdjustments(
    employee,
    attendance.daysWorked,
    attendance.daysInMonth,
    attendance.daysAbsentUnjustified,
    attendance.tardyMinutes,
    params
  );
  masterAuditTrail.push(...baseResult.auditEntries);

  // 2. Cálculo de horas extras y sobretasa nocturna
  const overtimeResult = calculateOvertimeAndNight(
    employee.baseSalary,
    baseResult.familyAllowanceAmount,
    attendance.overtimeHours25,
    attendance.overtimeHours35,
    attendance.nightHours,
    params
  );
  masterAuditTrail.push(...overtimeResult.auditEntries);

  // 3. Consolidación de Remuneración Bruta Computable (Ingresos)
  const earnings: EarningsBreakdown = {
    baseSalaryEarned: baseResult.effectiveBaseSalary,
    familyAllowance: baseResult.familyAllowanceAmount,
    overtime25Amount: overtimeResult.overtime25Amount,
    overtime35Amount: overtimeResult.overtime35Amount,
    nightSurchargeAmount: overtimeResult.nightSurchargeAmount,
    additionalBonuses: 0,
    totalGrossRemuneration: roundSunat(
      baseResult.effectiveBaseSalary +
        baseResult.familyAllowanceAmount +
        overtimeResult.overtime25Amount +
        overtimeResult.overtime35Amount +
        overtimeResult.nightSurchargeAmount
    ),
  };

  // 4. Cálculo de Retenciones Previsionales (ONP o AFP)
  const pensionResult = calculatePensionDeductions(
    earnings.totalGrossRemuneration,
    employee.pensionSystem,
    employee.commissionType,
    params
  );
  masterAuditTrail.push(...pensionResult.auditEntries);

  // 5. Cálculo de Renta de 5ta Categoría (SUNAT)
  const taxResult = calculateFifthCategoryTax(
    earnings.totalGrossRemuneration,
    period.month,
    employee.regime,
    params
  );
  masterAuditTrail.push(...taxResult.auditEntries);

  // 6. Consolidación de Descuentos
  const deductions: DeductionsBreakdown = {
    tardinessDeduction: baseResult.tardinessDeduction,
    absenceDeduction: baseResult.absenceDeduction,
    onpAmount: pensionResult.onpAmount,
    afpMandatoryFund: pensionResult.afpMandatoryFund,
    afpInsurancePremium: pensionResult.afpInsurancePremium,
    afpCommission: pensionResult.afpCommission,
    incomeTax5thCategory: taxResult.monthlyWithholdingAmount,
    totalDeductions: roundSunat(
      baseResult.tardinessDeduction +
        baseResult.absenceDeduction +
        pensionResult.totalPensionDeduction +
        taxResult.monthlyWithholdingAmount
    ),
  };

  // 7. Aportaciones del Empleador (EsSalud / SCTR)
  const employerResult = calculateEmployerContributions(
    earnings.totalGrossRemuneration,
    params
  );
  masterAuditTrail.push(...employerResult.auditEntries);

  // 8. Sueldo Neto
  const netPay = roundSunat(earnings.totalGrossRemuneration - deductions.totalDeductions);

  return {
    employeeId: employee.id,
    docNumber: employee.docNumber,
    fullName: employee.fullName,
    period,
    regime: employee.regime,
    pensionSystem: employee.pensionSystem,
    earnings,
    deductions,
    employerContributions: employerResult,
    netPay,
    auditTrail: masterAuditTrail,
  };
}
