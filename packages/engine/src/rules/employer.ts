/**
 * Rules for Employer Contributions under Peruvian Labor Law
 * Base Legal: Ley 26790 (Ley de Modernización de la Seguridad Social en Salud - EsSalud)
 */

import { type LegalParameters, roundSunat } from '../parameters.ts';
import type { AuditLogEntry } from '../types.ts';

export interface EmployerCalculationResult {
  essaludAmount: number;
  sctrHealthAmount: number;
  sctrPensionAmount: number;
  totalEmployerContributions: number;
  auditEntries: AuditLogEntry[];
}

export function calculateEmployerContributions(
  totalGrossRemuneration: number,
  params: LegalParameters
): EmployerCalculationResult {
  const auditEntries: AuditLogEntry[] = [];

  const calculatedEssalud = roundSunat(totalGrossRemuneration * params.essaludRate);
  const minimumLegalEssalud = roundSunat(params.rmv * params.essaludRate); // S/ 92.25

  const essaludAmount = Math.max(calculatedEssalud, minimumLegalEssalud);

  auditEntries.push({
    ruleId: 'ESSALUD_APORTE_PATRONAL',
    sourceLaw: 'Art. 6 Ley 26790 / D.S. 009-97-SA',
    description: 'Aporte patronal a EsSalud (9%) con piso mínimo legal del 9% de la RMV',
    formula: 'max(totalGross * 0.09, RMV * 0.09)',
    inputValues: { totalGrossRemuneration, calculatedEssalud, minimumLegalEssalud },
    resultValue: essaludAmount,
  });

  const sctrHealthAmount = 0;
  const sctrPensionAmount = 0;

  const totalEmployerContributions = roundSunat(essaludAmount + sctrHealthAmount + sctrPensionAmount);

  return {
    essaludAmount,
    sctrHealthAmount,
    sctrPensionAmount,
    totalEmployerContributions,
    auditEntries,
  };
}
