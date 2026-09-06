/**
 * Validator for PDT-PLAME v4.5 Input and Output Specifications
 * Base Legal: R.S. 204-2025/SUNAT, Guía de Importación del PDT-PLAME
 */

import { SUNAT_CONCEPT_CODES, SUNAT_DOC_TYPES, SUNAT_SUSPENSION_TYPES } from './catalogs.ts';
import type { CompanyHeader, EmployeePayrollItem, ValidationIssue } from './types.ts';

export function validateCompanyHeader(header: CompanyHeader): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. RUC debe tener 11 dígitos numéricos y comenzar con 10 o 20
  if (!/^\d{11}$/.test(header.ruc)) {
    issues.push({
      employeeDoc: 'EMPRESA',
      field: 'ruc',
      message: `El RUC '${header.ruc}' debe tener exactamente 11 dígitos numéricos.`,
      severity: 'ERROR',
    });
  } else if (!header.ruc.startsWith('10') && !header.ruc.startsWith('20') && !header.ruc.startsWith('15')) {
    issues.push({
      employeeDoc: 'EMPRESA',
      field: 'ruc',
      message: `El RUC '${header.ruc}' no inicia con un prefijo válido de empleador (10, 20 o 15).`,
      severity: 'WARNING',
    });
  }

  // 2. Mes debe estar entre 1 y 12
  if (header.month < 1 || header.month > 12) {
    issues.push({
      employeeDoc: 'EMPRESA',
      field: 'month',
      message: `El mes ${header.month} es inválido (debe ser entre 1 y 12).`,
      severity: 'ERROR',
    });
  }

  // 3. Año debe ser un periodo razonable
  if (header.year < 2020 || header.year > 2030) {
    issues.push({
      employeeDoc: 'EMPRESA',
      field: 'year',
      message: `El año fiscal ${header.year} está fuera del rango permitido.`,
      severity: 'ERROR',
    });
  }

  return issues;
}

export function validatePayrollItem(item: EmployeePayrollItem): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const doc = item.docNumber;

  // 1. Validación de Documento de Identidad
  if (item.docType === 'DNI' && !/^\d{8}$/.test(item.docNumber)) {
    issues.push({
      employeeDoc: doc,
      field: 'docNumber',
      message: `DNI '${item.docNumber}' inválido. Debe tener exactamente 8 dígitos numéricos.`,
      severity: 'ERROR',
    });
  }

  // 2. Validación de Jornada Laboral
  if (item.attendance.regularHours < 0 || item.attendance.regularHours > 360) {
    issues.push({
      employeeDoc: doc,
      field: 'regularHours',
      message: `Horas ordinarias '${item.attendance.regularHours}' fuera de rango mensual razonable.`,
      severity: 'ERROR',
    });
  }

  // 3. Validación de Días No Laborados
  const totalDaysOut =
    item.attendance.daysAbsentUnjustified +
    item.attendance.daysSubsidized +
    item.attendance.daysUnpaidLeave;

  if (totalDaysOut > 30) {
    issues.push({
      employeeDoc: doc,
      field: 'daysSuspended',
      message: `Total de días no laborados (${totalDaysOut}) no puede exceder los 30 días del mes laboral.`,
      severity: 'ERROR',
    });
  }

  // 4. Validación de Montos de Nómina
  if (item.payroll.earnings.totalGrossRemuneration < 0) {
    issues.push({
      employeeDoc: doc,
      field: 'totalGrossRemuneration',
      message: `La remuneración bruta (${item.payroll.earnings.totalGrossRemuneration}) no puede ser negativa.`,
      severity: 'ERROR',
    });
  }

  if (item.payroll.netPay < 0) {
    issues.push({
      employeeDoc: doc,
      field: 'netPay',
      message: `El sueldo neto (${item.payroll.netPay}) no puede ser negativo (descuentos superan ingresos).`,
      severity: 'ERROR',
    });
  }

  return issues;
}
