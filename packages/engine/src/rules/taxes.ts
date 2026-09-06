/**
 * Rules for 5th Category Income Tax (Renta de Quinta Categoría) in Peru
 * Base Legal: D.S. 179-2004-EF (TUO de la Ley del Impuesto a la Renta), D.S. 122-94-EF (Reglamento)
 */

import { type LegalParameters, roundSunat } from '../parameters.ts';
import type { AuditLogEntry, LaborRegime } from '../types.ts';

export interface FifthCategoryCalculationResult {
  projectedAnnualGross: number;
  deduction7Uit: number;
  netAnnualTaxableIncome: number;
  projectedAnnualTax: number;
  monthlyWithholdingAmount: number;
  auditEntries: AuditLogEntry[];
}

export function calculateFifthCategoryTax(
  monthlyGrossRemuneration: number,
  month: number, // 1 a 12
  regime: LaborRegime,
  params: LegalParameters
): FifthCategoryCalculationResult {
  const auditEntries: AuditLogEntry[] = [];

  let projectedGratifications = 0;
  if (regime === 'PEQUENA_EMPRESA') {
    projectedGratifications = roundSunat(monthlyGrossRemuneration * 1.09);
  } else if (regime === 'REGIMEN_GENERAL') {
    projectedGratifications = roundSunat(monthlyGrossRemuneration * 2 * 1.09);
  }

  const projectedAnnualGross = roundSunat((monthlyGrossRemuneration * 12) + projectedGratifications);

  // Deducción de 7 UIT (Inafectación legal Art. 46 LIR)
  const deduction7Uit = roundSunat(7 * params.uit);
  const netAnnualTaxableIncome = Math.max(0, roundSunat(projectedAnnualGross - deduction7Uit));

  auditEntries.push({
    ruleId: 'RENTA_5TA_PROYECCION_ANUAL',
    sourceLaw: 'Art. 40 D.S. 122-94-EF / Art. 46 D.S. 179-2004-EF',
    description: 'Proyección anualizada de ingresos y deducción de 7 UIT',
    formula: 'netAnnualTaxableIncome = max(0, projectedAnnualGross - (7 * UIT))',
    inputValues: { monthlyGrossRemuneration, projectedAnnualGross, deduction7Uit },
    resultValue: netAnnualTaxableIncome,
  });

  // Escala Progresiva Acumulativa (Art. 53 LIR)
  let projectedAnnualTax = 0;
  if (netAnnualTaxableIncome > 0) {
    const bracket1Limit = 5 * params.uit; // Hasta 5 UIT (8%)
    let remainingTaxable = netAnnualTaxableIncome;

    // Tramo 1: hasta 5 UIT al 8%
    const inBracket1 = Math.min(remainingTaxable, bracket1Limit);
    projectedAnnualTax += inBracket1 * 0.08;
    remainingTaxable = Math.max(0, remainingTaxable - inBracket1);

    // Tramo 2: > 5 hasta 20 UIT (15 UIT de ancho) al 14%
    if (remainingTaxable > 0) {
      const inBracket2 = Math.min(remainingTaxable, 15 * params.uit);
      projectedAnnualTax += inBracket2 * 0.14;
      remainingTaxable = Math.max(0, remainingTaxable - inBracket2);
    }

    // Tramo 3: > 20 hasta 35 UIT (15 UIT de ancho) al 17%
    if (remainingTaxable > 0) {
      const inBracket3 = Math.min(remainingTaxable, 15 * params.uit);
      projectedAnnualTax += inBracket3 * 0.17;
      remainingTaxable = Math.max(0, remainingTaxable - inBracket3);
    }

    // Tramo 4: > 35 hasta 45 UIT (10 UIT de ancho) al 20%
    if (remainingTaxable > 0) {
      const inBracket4 = Math.min(remainingTaxable, 10 * params.uit);
      projectedAnnualTax += inBracket4 * 0.20;
      remainingTaxable = Math.max(0, remainingTaxable - inBracket4);
    }

    // Tramo 5: exceso de 45 UIT al 30%
    if (remainingTaxable > 0) {
      projectedAnnualTax += remainingTaxable * 0.30;
    }

    projectedAnnualTax = roundSunat(projectedAnnualTax);
  }

  // Divisor mensual según mes de cálculo (Art. 40 Reglamento LIR)
  let monthlyDivisor = 12;
  if (month >= 1 && month <= 3) monthlyDivisor = 12;
  else if (month === 4) monthlyDivisor = 9;
  else if (month >= 5 && month <= 7) monthlyDivisor = 8;
  else if (month === 8) monthlyDivisor = 5;
  else if (month >= 9 && month <= 11) monthlyDivisor = 4;
  else if (month === 12) monthlyDivisor = 1;

  const monthlyWithholdingAmount = roundSunat(projectedAnnualTax / monthlyDivisor);

  if (monthlyWithholdingAmount > 0) {
    auditEntries.push({
      ruleId: 'RENTA_5TA_RETENCION_MENSUAL',
      sourceLaw: 'Art. 40 D.S. 122-94-EF',
      description: 'Retención mensual del impuesto proyectado según divisor del mes',
      formula: 'monthlyWithholding = projectedAnnualTax / monthlyDivisor',
      inputValues: { projectedAnnualTax, month, monthlyDivisor },
      resultValue: monthlyWithholdingAmount,
    });
  }

  return {
    projectedAnnualGross,
    deduction7Uit,
    netAnnualTaxableIncome,
    projectedAnnualTax,
    monthlyWithholdingAmount,
    auditEntries,
  };
}
