/**
 * Official parameters and constants for Peruvian Labor & Tax Law
 * Sources: SUNAT, MTPE, SBS, D.S. 003-2022-TR (RMV), D.S. 179-2004-EF (Impuesto a la Renta)
 */

export interface AfpRates {
  mandatoryFundRate: number; // 10%
  insurancePremiumRate: number; // Tasa de seguro SIS (aprox 1.70%)
  commissionFlowRate: number; // Comisión sobre flujo
  commissionMixedRate: number; // Comisión mixta sobre saldo/flujo
  maxInsurableRemuneration: number; // Tope de remuneración asegurable SBS
}

export interface LegalParameters {
  rmv: number; // Remuneración Mínima Vital vigente (S/ 1,025.00)
  uit: number; // Unidad Impositiva Tributaria vigente
  monthlyLaborHours: number; // 240 horas estándar (30 días * 8 horas)
  monthlyLaborDays: number; // 30 días laborales estándar en contabilidad de nómina
  familyAllowanceRate: number; // 10% de la RMV (Ley 25129)
  essaludRate: number; // 9% del total de remuneración computable (Ley 26790)
  onpRate: number; // 13% del total computable (D.L. 19990)
  overtimeFirstTwoHoursRate: number; // 25% de sobrecosto (factor 1.25)
  overtimeRemainingHoursRate: number; // 35% de sobrecosto (factor 1.35)
  nightSurchargeRate: number; // 35% sobre la RMV proporcional a las horas nocturnas
  afpRates: Record<'INTEGRA' | 'PRIMA' | 'PROFUTURO' | 'HABITAT', AfpRates>;
}

export const DEFAULT_LEGAL_PARAMETERS_PERU: LegalParameters = {
  rmv: 1025.00,
  uit: 5350.00, // UIT vigente 2026 (o 5150 para ejercicios previos)
  monthlyLaborHours: 240,
  monthlyLaborDays: 30,
  familyAllowanceRate: 0.10, // S/ 102.50
  essaludRate: 0.09,
  onpRate: 0.13,
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
};

/**
 * Utility helper for standard half-up decimal rounding (SUNAT specification)
 */
export function roundSunat(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
