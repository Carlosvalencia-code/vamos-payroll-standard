/**
 * Compiler for PDT-PLAME v4.5 Flat Files (.rem, .jor, .snl)
 * Base Legal: R.S. 204-2025/SUNAT, Anexo Estructura de Importación PDT-PLAME
 */

import {
  SUNAT_CONCEPT_CODES,
  SUNAT_DOC_TYPES,
  SUNAT_SUSPENSION_TYPES,
  type SunatDocTypeCode,
} from './catalogs.ts';
import type {
  CompanyHeader,
  EmployeePayrollItem,
  PlameExportPackage,
  ValidationIssue,
} from './types.ts';
import { validateCompanyHeader, validatePayrollItem } from './validator.ts';

function mapDocTypeToSunat(docType: 'DNI' | 'CE' | 'PASAPORTE'): SunatDocTypeCode {
  switch (docType) {
    case 'DNI':
      return SUNAT_DOC_TYPES.DNI;
    case 'CE':
      return SUNAT_DOC_TYPES.CARNET_EXTRANJERIA;
    case 'PASAPORTE':
      return SUNAT_DOC_TYPES.PASAPORTE;
    default:
      return SUNAT_DOC_TYPES.DNI;
  }
}

function formatDecimal(amount: number): string {
  return amount.toFixed(2);
}

export function compilePlamePackage(
  header: CompanyHeader,
  items: EmployeePayrollItem[]
): PlameExportPackage {
  const issues: ValidationIssue[] = [];

  // 1. Validar encabezado de la empresa
  issues.push(...validateCompanyHeader(header));

  const monthPadded = String(header.month).padStart(2, '0');
  const periodLabel = `${header.year}${monthPadded}`;
  const baseFileName = `0601${periodLabel}${header.ruc}`;

  const jorLines: string[] = [];
  const snlLines: string[] = [];
  const remLines: string[] = [];

  let totalGrossAmount = 0;
  let totalDeductionsAmount = 0;
  let totalEssaludAmount = 0;

  // 2. Procesar cada colaborador
  for (const item of items) {
    // Validar datos individuales
    issues.push(...validatePayrollItem(item));

    const sunatDoc = mapDocTypeToSunat(item.docType);
    const docNum = item.docNumber;
    const att = item.attendance;
    const pay = item.payroll;

    totalGrossAmount += pay.earnings.totalGrossRemuneration;
    totalDeductionsAmount += pay.deductions.totalDeductions;
    totalEssaludAmount += pay.employerContributions.essaludAmount;

    // --- ARCHIVO .JOR (Estructura 04 - Jornada y Sobretiempo) ---
    // Columnas: TipoDoc|NumDoc|HorasOrd|MinOrd|HorasSobre|MinSobre|
    const totalOvertimeHours = att.overtimeHours25 + att.overtimeHours35;
    jorLines.push(
      `${sunatDoc}|${docNum}|${att.regularHours}|0|${totalOvertimeHours}|0|`
    );

    // --- ARCHIVO .SNL (Estructura 05 - Días No Laborados y Suspendidos) ---
    // Columnas: TipoDoc|NumDoc|TipoSuspension|DiasSuspension|
    if (att.daysAbsentUnjustified > 0) {
      snlLines.push(
        `${sunatDoc}|${docNum}|${SUNAT_SUSPENSION_TYPES.FALTA_INJUSTIFICADA}|${att.daysAbsentUnjustified}|`
      );
    }
    if (att.daysSubsidized > 0) {
      snlLines.push(
        `${sunatDoc}|${docNum}|${SUNAT_SUSPENSION_TYPES.INCAPACIDAD_TEMPORAL_SUBSIDIADA}|${att.daysSubsidized}|`
      );
    }
    if (att.daysUnpaidLeave > 0) {
      snlLines.push(
        `${sunatDoc}|${docNum}|${SUNAT_SUSPENSION_TYPES.LICENCIA_SIN_GOCE}|${att.daysUnpaidLeave}|`
      );
    }

    // --- ARCHIVO .REM (Estructura 11 - Conceptos, Ingresos y Descuentos) ---
    // Columnas: TipoDoc|NumDoc|CodConcepto|MontoDevengado|MontoPagado|

    // 0121: Remuneración Básica
    if (pay.earnings.baseSalaryEarned > 0) {
      const amt = formatDecimal(pay.earnings.baseSalaryEarned);
      remLines.push(`${sunatDoc}|${docNum}|${SUNAT_CONCEPT_CODES.REMUNERACION_BASICA}|${amt}|${amt}|`);
    }

    // 0201: Asignación Familiar
    if (pay.earnings.familyAllowance > 0) {
      const amt = formatDecimal(pay.earnings.familyAllowance);
      remLines.push(`${sunatDoc}|${docNum}|${SUNAT_CONCEPT_CODES.ASIGNACION_FAMILIAR}|${amt}|${amt}|`);
    }

    // 0105: Horas Extras 25%
    if (pay.earnings.overtime25Amount > 0) {
      const amt = formatDecimal(pay.earnings.overtime25Amount);
      remLines.push(`${sunatDoc}|${docNum}|${SUNAT_CONCEPT_CODES.HORAS_EXTRAS_25}|${amt}|${amt}|`);
    }

    // 0106: Horas Extras 35%
    if (pay.earnings.overtime35Amount > 0) {
      const amt = formatDecimal(pay.earnings.overtime35Amount);
      remLines.push(`${sunatDoc}|${docNum}|${SUNAT_CONCEPT_CODES.HORAS_EXTRAS_35}|${amt}|${amt}|`);
    }

    // 0107: Sobretasa Nocturna
    if (pay.earnings.nightSurchargeAmount > 0) {
      const amt = formatDecimal(pay.earnings.nightSurchargeAmount);
      remLines.push(`${sunatDoc}|${docNum}|${SUNAT_CONCEPT_CODES.SOBRETASA_NOCTURNA}|${amt}|${amt}|`);
    }

    // 0701: Descuento por Tardanzas
    if (pay.deductions.tardinessDeduction > 0) {
      const amt = formatDecimal(pay.deductions.tardinessDeduction);
      remLines.push(`${sunatDoc}|${docNum}|${SUNAT_CONCEPT_CODES.DESCUENTO_TARDANZAS_ADELANTOS}|${amt}|${amt}|`);
    }

    // 0706: Descuento por Faltas Injustificadas
    if (pay.deductions.absenceDeduction > 0) {
      const amt = formatDecimal(pay.deductions.absenceDeduction);
      remLines.push(`${sunatDoc}|${docNum}|${SUNAT_CONCEPT_CODES.DESCUENTO_FALTAS_INJUSTIFICADAS}|${amt}|${amt}|`);
    }

    // 0607: SNP (ONP 13%)
    if (pay.deductions.onpAmount > 0) {
      const amt = formatDecimal(pay.deductions.onpAmount);
      remLines.push(`${sunatDoc}|${docNum}|${SUNAT_CONCEPT_CODES.ONP_SNP}|${amt}|${amt}|`);
    }

    // 0608: Aporte Obligatorio Fondo AFP (10%)
    if (pay.deductions.afpMandatoryFund > 0) {
      const amt = formatDecimal(pay.deductions.afpMandatoryFund);
      remLines.push(`${sunatDoc}|${docNum}|${SUNAT_CONCEPT_CODES.FONDO_PENSIONES_AFP}|${amt}|${amt}|`);
    }

    // 0606: Prima Seguro SIS AFP
    if (pay.deductions.afpInsurancePremium > 0) {
      const amt = formatDecimal(pay.deductions.afpInsurancePremium);
      remLines.push(`${sunatDoc}|${docNum}|${SUNAT_CONCEPT_CODES.PRIMA_SEGURO_AFP}|${amt}|${amt}|`);
    }

    // 0601: Comisión AFP
    if (pay.deductions.afpCommission > 0) {
      const amt = formatDecimal(pay.deductions.afpCommission);
      remLines.push(`${sunatDoc}|${docNum}|${SUNAT_CONCEPT_CODES.COMISION_AFP}|${amt}|${amt}|`);
    }

    // 0605: Renta de 5ta Categoría
    if (pay.deductions.incomeTax5thCategory > 0) {
      const amt = formatDecimal(pay.deductions.incomeTax5thCategory);
      remLines.push(`${sunatDoc}|${docNum}|${SUNAT_CONCEPT_CODES.RENTA_5TA_CATEGORIA}|${amt}|${amt}|`);
    }

    // 0804: EsSalud Regular Empleador (9%)
    if (pay.employerContributions.essaludAmount > 0) {
      const amt = formatDecimal(pay.employerContributions.essaludAmount);
      remLines.push(`${sunatDoc}|${docNum}|${SUNAT_CONCEPT_CODES.ESSALUD_REGULAR}|${amt}|${amt}|`);
    }
  }

  // Estándar SUNAT: líneas delimitadas por CRLF (\r\n) y terminadas con newline
  const jorContent = jorLines.length > 0 ? jorLines.join('\r\n') + '\r\n' : '';
  const snlContent = snlLines.length > 0 ? snlLines.join('\r\n') + '\r\n' : '';
  const remContent = remLines.length > 0 ? remLines.join('\r\n') + '\r\n' : '';

  const hasErrors = issues.some((i) => i.severity === 'ERROR');

  return {
    ruc: header.ruc,
    periodLabel,
    files: {
      jor: {
        fileName: `${baseFileName}.jor`,
        content: jorContent,
        recordCount: jorLines.length,
      },
      snl: {
        fileName: `${baseFileName}.snl`,
        content: snlContent,
        recordCount: snlLines.length,
      },
      rem: {
        fileName: `${baseFileName}.rem`,
        content: remContent,
        recordCount: remLines.length,
      },
    },
    summary: {
      totalEmployees: items.length,
      totalGrossAmount: Math.round(totalGrossAmount * 100) / 100,
      totalDeductionsAmount: Math.round(totalDeductionsAmount * 100) / 100,
      totalEssaludAmount: Math.round(totalEssaludAmount * 100) / 100,
      isValid: !hasErrors,
      issues,
    },
  };
}
