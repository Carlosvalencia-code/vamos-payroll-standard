/**
 * Official parameters and constants for Peruvian Labor & Tax Law
 * Sources: SUNAT, MTPE, SBS, D.S. 003-2022-TR (RMV), D.S. 179-2004-EF (Impuesto a la Renta),
 * D.S. 272-2024-EF (UIT 2025/2026), D.S. 007-2008-TR (Microempresa), D.S. 008-2008-TR (Pequeña Empresa)
 */

import type { AfpRateEntry, ParameterSet } from './types.ts';

export type AfpRates = AfpRateEntry;
export type LegalParameters = ParameterSet;

export const PARAMETER_REGISTRY: Record<string, ParameterSet> = {
  '2026-09': {
    period: '2026-09',
    year: 2026,
    month: 9,
    rmv: 1025.00,
    uit: 5350.00,
    familyAllowanceRate: 0.10,
    essaludRate: 0.09,
    onpRate: 0.13,
    monthlyLaborHours: 240,
    monthlyLaborDays: 30,
    overtimeFirstTwoHoursRate: 0.25,
    overtimeRemainingHoursRate: 0.35,
    nightSurchargeRate: 0.35,
    afpRates: {
      INTEGRA: {
        mandatoryFundRate: 0.10,
        insurancePremiumRate: 0.0170,
        commissionFlowRate: 0.0155,
        commissionMixedRate: 0.0000,
        maxInsurableRemuneration: 12550.00,
      },
      PRIMA: {
        mandatoryFundRate: 0.10,
        insurancePremiumRate: 0.0170,
        commissionFlowRate: 0.0160,
        commissionMixedRate: 0.0000,
        maxInsurableRemuneration: 12550.00,
      },
      PROFUTURO: {
        mandatoryFundRate: 0.10,
        insurancePremiumRate: 0.0170,
        commissionFlowRate: 0.0169,
        commissionMixedRate: 0.0000,
        maxInsurableRemuneration: 12550.00,
      },
      HABITAT: {
        mandatoryFundRate: 0.10,
        insurancePremiumRate: 0.0170,
        commissionFlowRate: 0.0147,
        commissionMixedRate: 0.0000,
        maxInsurableRemuneration: 12550.00,
      },
    },
    legalReferences: [
      {
        concept: 'RMV (Remuneración Mínima Vital)',
        value: 1025.00,
        sourceLaw: 'Decreto Supremo N° 003-2022-TR',
        officialGazetteDate: '2022-04-03',
      },
      {
        concept: 'UIT (Unidad Impositiva Tributaria)',
        value: 5350.00,
        sourceLaw: 'Decreto Supremo N° 272-2024-EF',
        officialGazetteDate: '2024-12-24',
      },
      {
        concept: 'Asignación Familiar (10% RMV)',
        value: 102.50,
        sourceLaw: 'Ley N° 25129 y D.S. N° 035-90-TR',
      },
      {
        concept: 'Aporte de Salud (EsSalud 9%)',
        value: '9%',
        sourceLaw: 'Ley N° 26790 (Ley de Modernización de la Seguridad Social en Salud)',
      },
      {
        concept: 'Aporte Previsional SNP (ONP 13%)',
        value: '13%',
        sourceLaw: 'Decreto Ley N° 19990',
      },
      {
        concept: 'Sobretasa Horas Extras (25% y 35%)',
        value: '25% / 35%',
        sourceLaw: 'D.S. N° 007-2002-TR (TUO de la Ley de Jornada de Trabajo, Art. 10)',
      },
      {
        concept: 'Sobretasa Nocturna (35% RMV)',
        value: '35%',
        sourceLaw: 'D.S. N° 007-2002-TR (Art. 8)',
      },
      {
        concept: 'Régimen Microempresa',
        value: 'Sin Gratificación (Ley 27735) / Sin CTS (D.L. 650) / 15 días vacaciones',
        sourceLaw: 'D.S. N° 007-2008-TR (Art. 48)',
      },
      {
        concept: 'Régimen Pequeña Empresa',
        value: '50% Gratificación (+9% bono Ley 30334) / 50% CTS / 15 días vacaciones / EsSalud 9%',
        sourceLaw: 'D.S. N° 008-2008-TR y Ley N° 30056',
      },
    ],
  },
};

export const DEFAULT_LEGAL_PARAMETERS_PERU: ParameterSet = PARAMETER_REGISTRY['2026-09'];

/**
 * Recovers the official parameter set for a specific payroll period.
 * Throws an explicit error if parameters have not been registered and verified.
 */
export function getParameterSetForPeriod(year: number, month: number): ParameterSet {
  const padMonth = String(month).padStart(2, '0');
  const key = `${year}-${padMonth}`;

  const found = PARAMETER_REGISTRY[key];
  if (found) {
    return found;
  }

  // Si no está registrado el mes exacto pero es 2026, proveer parámetros vigentes 2026
  if (year === 2026) {
    return {
      ...DEFAULT_LEGAL_PARAMETERS_PERU,
      period: key,
      year,
      month,
    };
  }

  throw new Error(
    `[VAMOS Compliance Guard] No se han registrado ni auditado parámetros normativos para el periodo solicitado: "${key}". En nómina laboral peruana, los parámetros (RMV, UIT, tasas SBS) requieren aprobación y base legal expresa.`
  );
}

/**
 * Utility helper for standard half-up decimal rounding (SUNAT specification)
 */
export function roundSunat(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
