/**
 * Types and Interfaces for Peruvian Boletas de Pago
 * Base Legal: D.S. 001-98-TR, D.S. 009-2011-TR
 */

import type { AttendanceSummary, Employee, PayrollSlipResult } from '../../engine/src/types.ts';

export interface CompanyInfo {
  ruc: string;
  razonSocial: string;
  direccion: string;
}

export interface EmployeeJobInfo {
  cargo: string;
  fechaIngreso: string;
  cuspp?: string;
}

export interface PayslipInput {
  company: CompanyInfo;
  employee: Employee & EmployeeJobInfo;
  attendance: AttendanceSummary;
  payroll: PayrollSlipResult;
}

export interface GeneratedPayslip {
  id: string; // Identificador único del comprobante
  employeeDoc: string;
  periodLabel: string;
  netPay: number;
  amountInWords: string;
  verificationHash: string; // SHA-256 no sensible para verificar autenticidad
  htmlContent: string; // Documento imprimible A4 auto-contenido
}
