/**
 * Social Benefits (Gratificaciones, CTS, Vacaciones) under Peruvian Labor Regimes
 * Distinguishes strictly between:
 * - MICRO_EMPRESA (D.S. 007-2008-TR, Art. 48: No Gratificaciones, No CTS, 15 days vacation)
 * - PEQUENA_EMPRESA (D.S. 008-2008-TR, Arts. 41-43: 50% Gratificación + 9% bono Ley 30334, 50% CTS, 15 days vacation)
 * - REGIMEN_GENERAL (D.L. 728, Ley 27735, D.L. 650: 100% Gratificación + 9% bono, 100% CTS, 30 days vacation)
 */

import { roundSunat } from '../parameters.ts';
import type { AuditLogEntry, LaborRegime } from '../types.ts';

export interface GratificationResult {
  gratificationAmount: number;
  extraordinaryBonus9Percent: number;
  totalPayable: number;
  isEligible: boolean;
  auditEntries: AuditLogEntry[];
}

export interface CtsResult {
  ctsAmount: number;
  isEligible: boolean;
  auditEntries: AuditLogEntry[];
}

export function calculateGratification(
  baseSalary: number,
  familyAllowance: number,
  monthsWorkedInSemester: number, // 1 a 6
  regime: LaborRegime
): GratificationResult {
  const auditEntries: AuditLogEntry[] = [];
  const computableBase = baseSalary + familyAllowance;

  if (regime === 'MICRO_EMPRESA' || regime === 'MICROEMPRESA') {
    auditEntries.push({
      ruleId: 'GRATIFICACION_EXCLUSION_MICROEMPRESA',
      sourceLaw: 'Art. 48 D.S. N° 007-2008-TR (Texto Único Ordenado de la Ley MYPE)',
      description: 'Los trabajadores de la Microempresa no tienen derecho a Gratificaciones Legales de Fiestas Patrias ni Navidad',
      formula: '0.00',
      inputValues: { regime, monthsWorkedInSemester },
      resultValue: 0,
    });

    return {
      gratificationAmount: 0,
      extraordinaryBonus9Percent: 0,
      totalPayable: 0,
      isEligible: false,
      auditEntries,
    };
  }

  const factor = regime === 'PEQUENA_EMPRESA' ? 0.50 : 1.00;
  const sourceLaw = regime === 'PEQUENA_EMPRESA'
    ? 'Art. 41 D.S. N° 008-2008-TR y Ley N° 30056 (50% de Gratificación legal para Pequeña Empresa)'
    : 'Ley N° 27735 y D.S. N° 005-2002-TR (100% de Gratificación legal Régimen General)';

  const gratificationAmount = roundSunat(((computableBase * factor) / 6) * Math.min(6, monthsWorkedInSemester));
  const extraordinaryBonus9Percent = roundSunat(gratificationAmount * 0.09); // Ley 30334
  const totalPayable = roundSunat(gratificationAmount + extraordinaryBonus9Percent);

  auditEntries.push({
    ruleId: 'GRATIFICACION_LEGAL',
    sourceLaw,
    description: `Cálculo de Gratificación legal proporcional (${factor * 100}%)`,
    formula: `((computableBase * ${factor}) / 6) * monthsWorked`,
    inputValues: { computableBase, factor, monthsWorkedInSemester },
    resultValue: gratificationAmount,
  });

  auditEntries.push({
    ruleId: 'BONIFICACION_EXTRAORDINARIA_LEY_30334',
    sourceLaw: 'Ley N° 30334 (Inafectación de Gratificaciones y Bonificación Extraordinaria del 9% de EsSalud)',
    description: 'Bonificación extraordinaria equivalente al aporte patronal a EsSalud (9%)',
    formula: 'gratificationAmount * 0.09',
    inputValues: { gratificationAmount, rate: 0.09 },
    resultValue: extraordinaryBonus9Percent,
  });

  return {
    gratificationAmount,
    extraordinaryBonus9Percent,
    totalPayable,
    isEligible: true,
    auditEntries,
  };
}

export function calculateCts(
  baseSalary: number,
  familyAllowance: number,
  monthsWorkedInSemester: number, // 1 a 6
  regime: LaborRegime
): CtsResult {
  const auditEntries: AuditLogEntry[] = [];
  const computableBase = baseSalary + familyAllowance;

  if (regime === 'MICRO_EMPRESA' || regime === 'MICROEMPRESA') {
    auditEntries.push({
      ruleId: 'CTS_EXCLUSION_MICROEMPRESA',
      sourceLaw: 'Art. 48 D.S. N° 007-2008-TR',
      description: 'Los trabajadores de la Microempresa no están comprendidos en el régimen de Compensación por Tiempo de Servicios (CTS)',
      formula: '0.00',
      inputValues: { regime, monthsWorkedInSemester },
      resultValue: 0,
    });

    return {
      ctsAmount: 0,
      isEligible: false,
      auditEntries,
    };
  }

  if (regime === 'PEQUENA_EMPRESA') {
    // 15 remuneraciones diarias por año completo = 50% de 1 mes al año = 1/24 por mes semestral
    const ctsAmount = roundSunat(((computableBase * 0.50) / 12) * Math.min(6, monthsWorkedInSemester));

    auditEntries.push({
      ruleId: 'CTS_PEQUENA_EMPRESA',
      sourceLaw: 'Art. 42 D.S. N° 008-2008-TR (Pequeña Empresa: tope de 15 remuneraciones diarias por año completo)',
      description: 'Depósito semestral de CTS computable a razón de 15 remuneraciones diarias anuales',
      formula: '((computableBase * 0.50) / 12) * monthsWorked',
      inputValues: { computableBase, monthsWorkedInSemester },
      resultValue: ctsAmount,
    });

    return {
      ctsAmount,
      isEligible: true,
      auditEntries,
    };
  }

  // Régimen General: D.L. 650 (remuneración mensual + 1/6 gratificación)/12 * meses
  const sixthGratification = roundSunat(computableBase / 6);
  const totalComputableGeneral = computableBase + sixthGratification;
  const ctsAmount = roundSunat((totalComputableGeneral / 12) * Math.min(6, monthsWorkedInSemester));

  auditEntries.push({
    ruleId: 'CTS_REGIMEN_GENERAL',
    sourceLaw: 'Texto Único Ordenado del D.L. N° 650 (D.S. N° 001-97-TR)',
    description: 'Depósito semestral de CTS con alícuota de 1/6 de gratificación legal',
    formula: '((computableBase + (computableBase / 6)) / 12) * monthsWorked',
    inputValues: { computableBase, sixthGratification, monthsWorkedInSemester },
    resultValue: ctsAmount,
  });

  return {
    ctsAmount,
    isEligible: true,
    auditEntries,
  };
}

export function getLegalVacationDays(regime: LaborRegime): number {
  if (regime === 'MICRO_EMPRESA' || regime === 'MICROEMPRESA' || regime === 'PEQUENA_EMPRESA') {
    return 15; // D.S. 007-2008-TR Art. 43 y D.S. 008-2008-TR Art. 43
  }
  return 30; // D.L. 713 Art. 10 (Régimen Laboral de la Actividad Privada)
}
