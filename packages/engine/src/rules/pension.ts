/**
 * Rules for Pension Contributions (ONP & AFP) under Peruvian Law
 * Base Legal: D.L. 19990 (Sistema Nacional de Pensiones - ONP), D.L. 25897 (Sistema Privado de Pensiones - AFP)
 */

import { type LegalParameters, roundSunat } from '../parameters.ts';
import type { AuditLogEntry, CommissionType, PensionSystem } from '../types.ts';

export interface PensionCalculationResult {
  onpAmount: number;
  afpMandatoryFund: number;
  afpInsurancePremium: number;
  afpCommission: number;
  totalPensionDeduction: number;
  auditEntries: AuditLogEntry[];
}

export function calculatePensionDeductions(
  totalGrossRemuneration: number,
  pensionSystem: PensionSystem,
  commissionType: CommissionType,
  params: LegalParameters
): PensionCalculationResult {
  const auditEntries: AuditLogEntry[] = [];

  let onpAmount = 0;
  let afpMandatoryFund = 0;
  let afpInsurancePremium = 0;
  let afpCommission = 0;

  if (pensionSystem === 'ONP') {
    onpAmount = roundSunat(totalGrossRemuneration * params.onpRate);

    auditEntries.push({
      ruleId: 'DESCUENTO_ONP',
      sourceLaw: 'D.L. 19990',
      description: 'Retención previsional al Sistema Nacional de Pensiones (13%)',
      formula: 'totalGrossRemuneration * 0.13',
      inputValues: { totalGrossRemuneration, rate: params.onpRate },
      resultValue: onpAmount,
    });
  } else {
    const afpConfig = params.afpRates[pensionSystem];

    // 1. Aporte Obligatorio al Fondo (10%)
    afpMandatoryFund = roundSunat(totalGrossRemuneration * afpConfig.mandatoryFundRate);
    auditEntries.push({
      ruleId: 'AFP_FONDO_OBLIGATORIO',
      sourceLaw: 'Art. 30 D.L. 25897',
      description: 'Aporte obligatorio a la cuenta de capitalización individual (10%)',
      formula: 'totalGrossRemuneration * 0.10',
      inputValues: { pensionSystem, totalGrossRemuneration, rate: afpConfig.mandatoryFundRate },
      resultValue: afpMandatoryFund,
    });

    // 2. Prima de Seguro de Invalidez y Sobrevivencia (SIS) - Sujeto a Tope Asegurable SBS
    const insurableBaseForInsurance = Math.min(totalGrossRemuneration, afpConfig.maxInsurableRemuneration);
    afpInsurancePremium = roundSunat(insurableBaseForInsurance * afpConfig.insurancePremiumRate);
    auditEntries.push({
      ruleId: 'AFP_PRIMA_SEGURO_SIS',
      sourceLaw: 'Circular SBS Prev-XXX',
      description: 'Prima de seguro SIS sobre remuneración con tope asegurable SBS',
      formula: 'min(totalGross, maxInsurable) * insurancePremiumRate',
      inputValues: { insurableBaseForInsurance, rate: afpConfig.insurancePremiumRate },
      resultValue: afpInsurancePremium,
    });

    // 3. Comisión sobre flujo (o mixta)
    const commissionRate = commissionType === 'FLUJO' ? afpConfig.commissionFlowRate : afpConfig.commissionMixedRate;
    afpCommission = roundSunat(totalGrossRemuneration * commissionRate);
    auditEntries.push({
      ruleId: 'AFP_COMISION',
      sourceLaw: 'Ley 29903 / SBS',
      description: `Comisión de administración AFP (${commissionType})`,
      formula: 'totalGrossRemuneration * commissionRate',
      inputValues: { commissionType, commissionRate, totalGrossRemuneration },
      resultValue: afpCommission,
    });
  }

  const totalPensionDeduction = roundSunat(onpAmount + afpMandatoryFund + afpInsurancePremium + afpCommission);

  return {
    onpAmount,
    afpMandatoryFund,
    afpInsurancePremium,
    afpCommission,
    totalPensionDeduction,
    auditEntries,
  };
}
