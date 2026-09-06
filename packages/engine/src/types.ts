/**
 * Types and interfaces for the Peruvian Payroll Engine
 * Standards: SUNAT (PDT-PLAME v4.5), D.L. 1086 (REMYPE), D.L. 728
 */

export type LaborRegime = 'PEQUENA_EMPRESA' | 'REGIMEN_GENERAL' | 'MICROEMPRESA';

export type PensionSystem = 'ONP' | 'INTEGRA' | 'PRIMA' | 'PROFUTURO' | 'HABITAT';

export type CommissionType = 'FLUJO' | 'MIXTA';

export type PayrollLifecycleState =
  | 'BORRADOR'
  | 'CALCULADA'
  | 'REVISADA'
  | 'APROBADA'
  | 'EXPORTADA'
  | 'PRESENTADA'
  | 'REABIERTA';

export interface Employee {
  id: string;
  docType: 'DNI' | 'CE' | 'PASAPORTE';
  docNumber: string;
  fullName: string;
  regime: LaborRegime;
  pensionSystem: PensionSystem;
  commissionType: CommissionType;
  baseSalary: number; // Salario básico mensual pactado
  hasFamilyAllowance: boolean; // Cumple requisitos de Asignación Familiar (Ley 25129)
  hireDate: string; // ISO 8601 YYYY-MM-DD
  cuspp?: string; // Código Único de Afiliado al SPP (si aplica)
}

export interface AttendanceSummary {
  daysInMonth: number; // Generalmente 30 para cálculo laboral estándar en Perú
  daysWorked: number; // Días efectivamente laborados
  regularHours: number; // Horas ordinarias laboradas
  overtimeHours25: number; // Horas extras al 25% (primeras 2 horas diarias)
  overtimeHours35: number; // Horas extras al 35% (a partir de la 3era hora diaria)
  nightHours: number; // Horas laboradas entre 10:00 PM y 6:00 AM
  tardyMinutes: number; // Minutos acumulados de tardanza injustificada
  daysAbsentUnjustified: number; // Días de inasistencia injustificada (faltas)
  daysSubsidized: number; // Días con subsidio (maternidad, incapacidad temporal Essalud)
  daysUnpaidLeave: number; // Días de permiso sin goce de haber
}

export interface PayrollPeriod {
  year: number;
  month: number; // 1 a 12
  periodLabel: string; // ej. "2026-09"
}

export interface EarningsBreakdown {
  baseSalaryEarned: number; // Concepto 0121 (proporcional a días trabajados)
  familyAllowance: number; // Concepto 0201 (Asignación Familiar Ley 25129)
  overtime25Amount: number; // Concepto 0105 (Horas Extras 25%)
  overtime35Amount: number; // Concepto 0106 (Horas Extras 35%)
  nightSurchargeAmount: number; // Concepto 0107 (Sobretasa Nocturna)
  additionalBonuses: number; // Conceptos adicionales remunerativos
  totalGrossRemuneration: number; // Remuneración computable total (Base imponible)
}

export interface DeductionsBreakdown {
  tardinessDeduction: number; // Descuento proporcional por tardanzas
  absenceDeduction: number; // Descuento proporcional por faltas
  onpAmount: number; // Código 0607 (SNP - Sistema Nacional de Pensiones)
  afpMandatoryFund: number; // Código 0608 (Aporte Obligatorio Fondo de Pensiones 10%)
  afpInsurancePremium: number; // Código 0606 (Prima de Seguro SIS)
  afpCommission: number; // Código 0601 (Comisión AFP sobre flujo o mixta)
  incomeTax5thCategory: number; // Código 0605 (Renta de 5ta Categoría SUNAT)
  totalDeductions: number; // Total descuentos al trabajador
}

export interface EmployerContributionsBreakdown {
  essaludAmount: number; // Código 0804 (EsSalud regular 9%, mínimo 9% RMV)
  sctrHealthAmount: number; // SCTR Salud (si aplica)
  sctrPensionAmount: number; // SCTR Pensión (si aplica)
  totalEmployerContributions: number; // Total aportes a cargo del empleador
}

export interface AuditLogEntry {
  ruleId: string;
  sourceLaw: string;
  description: string;
  formula: string;
  inputValues: Record<string, number | string | boolean>;
  resultValue: number | string;
}

export interface PayrollSlipResult {
  employeeId: string;
  docNumber: string;
  fullName: string;
  period: PayrollPeriod;
  regime: LaborRegime;
  pensionSystem: PensionSystem;
  earnings: EarningsBreakdown;
  deductions: DeductionsBreakdown;
  employerContributions: EmployerContributionsBreakdown;
  netPay: number; // Sueldo neto a pagar al trabajador
  auditTrail: AuditLogEntry[];
}
