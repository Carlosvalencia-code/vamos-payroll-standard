/**
 * Small Business (Pequeña Empresa) Labor Rules under D.L. 1086 (REMYPE)
 * Base Legal: D.L. 1086 (Ley de Promoción de la Competitividad, Formalización y Desarrollo de la Micro y Pequeña Empresa)
 */

import { type LegalParameters, roundSunat } from '../parameters.ts';
import type { AuditLogEntry, Employee } from '../types.ts';

export interface ProrationAndDeductionResult {
  effectiveBaseSalary: number;
  familyAllowanceAmount: number;
  absenceDeduction: number;
  tardinessDeduction: number;
  auditEntries: AuditLogEntry[];
}

export function calculateBaseAndAttendanceAdjustments(
  employee: Employee,
  daysWorked: number,
  daysInMonth: number,
  daysAbsentUnjustified: number,
  tardyMinutes: number,
  params: LegalParameters
): ProrationAndDeductionResult {
  const auditEntries: AuditLogEntry[] = [];

  // 1. Asignación Familiar (Ley 25129): 10% de la RMV vigente
  let familyAllowanceAmount = 0;
  if (employee.hasFamilyAllowance) {
    familyAllowanceAmount = roundSunat(params.rmv * params.familyAllowanceRate); // S/ 102.50
    auditEntries.push({
      ruleId: 'ASIGNACION_FAMILIAR',
      sourceLaw: 'Ley N° 25129 / D.S. 035-90-TR',
      description: 'Asignación familiar mensual equivalente al 10% de la RMV',
      formula: 'RMV * 0.10',
      inputValues: { rmv: params.rmv, rate: params.familyAllowanceRate },
      resultValue: familyAllowanceAmount,
    });
  }

  // 2. Salario Básico Proporcional a Días Trabajados (Prorrateo solo si laboró menos del mes completo)
  // Regla contable: Mes completo laborado (>= 30 días) devenga el sueldo pactado íntegro sin distorsión de redondeo diario
  let effectiveBaseSalary = employee.baseSalary;
  if (daysWorked < params.monthlyLaborDays) {
    effectiveBaseSalary = roundSunat((employee.baseSalary * daysWorked) / params.monthlyLaborDays);
    auditEntries.push({
      ruleId: 'PRORRATEO_DIAS_LABORADOS',
      sourceLaw: 'D.L. 728 / D.L. 1086',
      description: 'Prorrateo de sueldo básico por días efectivamente computables en el mes',
      formula: '(baseSalary * daysWorked) / 30',
      inputValues: { baseSalary: employee.baseSalary, daysWorked, daysInMonth: params.monthlyLaborDays },
      resultValue: effectiveBaseSalary,
    });
  }

  // 3. Descuento por Faltas Injustificadas
  let absenceDeduction = 0;
  if (daysAbsentUnjustified > 0) {
    const dailyRate = roundSunat(employee.baseSalary / params.monthlyLaborDays);
    absenceDeduction = roundSunat(dailyRate * daysAbsentUnjustified);
    auditEntries.push({
      ruleId: 'DESCUENTO_FALTAS',
      sourceLaw: 'D.S. 003-97-TR',
      description: 'Descuento por inasistencias injustificadas',
      formula: 'dailyRate * daysAbsent',
      inputValues: { dailyRate, daysAbsentUnjustified },
      resultValue: absenceDeduction,
    });
  }

  // 4. Descuento por Tardanzas Injustificadas
  let tardinessDeduction = 0;
  if (tardyMinutes > 0) {
    const minuteRate = (employee.baseSalary + familyAllowanceAmount) / (params.monthlyLaborHours * 60);
    tardinessDeduction = roundSunat(minuteRate * tardyMinutes);
    auditEntries.push({
      ruleId: 'DESCUENTO_TARDANZAS',
      sourceLaw: 'Reglamento Interno de Trabajo / D.L. 728',
      description: 'Descuento proporcional por minutos acumulados de tardanza',
      formula: '(remuneracionComputable / (240 * 60)) * tardyMinutes',
      inputValues: { tardyMinutes, minuteRate: roundSunat(minuteRate) },
      resultValue: tardinessDeduction,
    });
  }

  return {
    effectiveBaseSalary,
    familyAllowanceAmount,
    absenceDeduction,
    tardinessDeduction,
    auditEntries,
  };
}
