/**
 * Types and Interfaces for PDT-PLAME v4.5 Compiler
 */

import type { AttendanceSummary, PayrollSlipResult } from '../../engine/src/types.ts';
import type { SunatConceptCode, SunatDocTypeCode, SunatSuspensionTypeCode } from './catalogs.ts';

export interface CompanyHeader {
  ruc: string; // 11 dígitos
  razonSocial: string;
  year: number; // YYYY (ej. 2026)
  month: number; // 1 a 12
}

export interface EmployeePayrollItem {
  docType: 'DNI' | 'CE' | 'PASAPORTE';
  docNumber: string;
  payroll: PayrollSlipResult;
  attendance: AttendanceSummary;
}

export interface PlameJorRecord {
  docType: SunatDocTypeCode;
  docNumber: string;
  regularHours: number;
  regularMinutes: number;
  overtimeHours: number;
  overtimeMinutes: number;
}

export interface PlameSnlRecord {
  docType: SunatDocTypeCode;
  docNumber: string;
  suspensionType: SunatSuspensionTypeCode;
  daysSuspended: number;
}

export interface PlameRemRecord {
  docType: SunatDocTypeCode;
  docNumber: string;
  conceptCode: SunatConceptCode;
  amountAccrued: number; // Monto devengado
  amountPaid: number; // Monto pagado
}

export interface ValidationIssue {
  employeeDoc: string;
  field: string;
  message: string;
  severity: 'WARNING' | 'ERROR';
}

export interface PlameExportPackage {
  ruc: string;
  periodLabel: string; // YYYYMM (ej. "202609")
  files: {
    jor: {
      fileName: string;
      content: string;
      recordCount: number;
    };
    snl: {
      fileName: string;
      content: string;
      recordCount: number;
    };
    rem: {
      fileName: string;
      content: string;
      recordCount: number;
    };
  };
  summary: {
    totalEmployees: number;
    totalGrossAmount: number;
    totalDeductionsAmount: number;
    totalEssaludAmount: number;
    isValid: boolean;
    issues: ValidationIssue[];
  };
}
