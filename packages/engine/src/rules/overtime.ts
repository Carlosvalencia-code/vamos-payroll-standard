/**
 * Rules for Overtime and Night Surcharge under Peruvian Labor Law
 * Base Legal: D.L. 728, D.S. 007-2002-TR (TUO de la Ley de Jornada de Trabajo, Horario y Trabajo en Sobretiempo)
 */

import { type LegalParameters, roundSunat } from '../parameters.ts';
import type { AuditLogEntry } from '../types.ts';

export interface OvertimeCalculationResult {
  hourlyRate: number;
  overtime25Amount: number;
  overtime35Amount: number;
  nightSurchargeAmount: number;
  totalOvertimeAndNightAmount: number;
  auditEntries: AuditLogEntry[];
}

export function calculateOvertimeAndNight(
  baseSalary: number,
  familyAllowance: number,
  overtimeHours25: number,
  overtimeHours35: number,
  nightHours: number,
  params: LegalParameters
): OvertimeCalculationResult {
  const auditEntries: AuditLogEntry[] = [];

  // 1. Remuneración ordinaria computable para valor hora (Salario Básico + Asignación Familiar)
  const regularMonthlyComputable = baseSalary + familyAllowance;
  const hourlyRate = roundSunat(regularMonthlyComputable / params.monthlyLaborHours);

  auditEntries.push({
    ruleId: 'VALOR_HORA_ORDINARIA',
    sourceLaw: 'Art. 11 D.S. 007-2002-TR',
    description: 'Cálculo de la alícuota horaria ordinaria (Remuneración computable / 240 horas)',
    formula: 'hourlyRate = (baseSalary + familyAllowance) / 240',
    inputValues: { baseSalary, familyAllowance, monthlyHours: params.monthlyLaborHours },
    resultValue: hourlyRate,
  });

  // 2. Horas Extras al 25% (primeras 2 horas diarias)
  const rate25 = hourlyRate * (1 + params.overtimeFirstTwoHoursRate);
  const overtime25Amount = roundSunat(rate25 * overtimeHours25);

  if (overtimeHours25 > 0) {
    auditEntries.push({
      ruleId: 'HORAS_EXTRAS_25',
      sourceLaw: 'Art. 10 D.S. 007-2002-TR / Art. 19 D.S. 008-2002-TR',
      description: 'Sobrecosto del 25% del valor hora por las dos primeras horas de sobretiempo',
      formula: 'hourlyRate * 1.25 * overtimeHours25',
      inputValues: { hourlyRate, factor: 1.25, overtimeHours25 },
      resultValue: overtime25Amount,
    });
  }

  // 3. Horas Extras al 35% (a partir de la tercera hora diaria)
  const rate35 = hourlyRate * (1 + params.overtimeRemainingHoursRate);
  const overtime35Amount = roundSunat(rate35 * overtimeHours35);

  if (overtimeHours35 > 0) {
    auditEntries.push({
      ruleId: 'HORAS_EXTRAS_35',
      sourceLaw: 'Art. 10 D.S. 007-2002-TR / Art. 19 D.S. 008-2002-TR',
      description: 'Sobrecosto del 35% del valor hora por horas en sobretiempo a partir de la tercera hora diaria',
      formula: 'hourlyRate * 1.35 * overtimeHours35',
      inputValues: { hourlyRate, factor: 1.35, overtimeHours35 },
      resultValue: overtime35Amount,
    });
  }

  // 4. Sobretasa Nocturna (Jornada entre 10:00 PM y 6:00 AM)
  const minimumMonthlyNightSalary = params.rmv * (1 + params.nightSurchargeRate); // S/ 1,383.75
  const minimumHourlyNightRate = minimumMonthlyNightSalary / params.monthlyLaborHours; // S/ 5.7656
  
  let nightSurchargeAmount = 0;
  if (nightHours > 0) {
    if (hourlyRate < minimumHourlyNightRate) {
      const diffPerHour = minimumHourlyNightRate - hourlyRate;
      nightSurchargeAmount = roundSunat(diffPerHour * nightHours);

      auditEntries.push({
        ruleId: 'SOBRETASA_NOCTURNA_DIFERENCIAL',
        sourceLaw: 'Art. 8 D.S. 007-2002-TR',
        description: 'Diferencial para alcanzar la Remuneración Mínima Nocturna (RMV + 35%)',
        formula: '(minimumHourlyNightRate - hourlyRate) * nightHours',
        inputValues: { minimumHourlyNightRate: roundSunat(minimumHourlyNightRate), hourlyRate, nightHours },
        resultValue: nightSurchargeAmount,
      });
    } else {
      auditEntries.push({
        ruleId: 'SOBRETASA_NOCTURNA_CUMPLIDA',
        sourceLaw: 'Art. 8 D.S. 007-2002-TR',
        description: 'La remuneración horaria ya supera la mínima legal nocturna (RMV + 35%)',
        formula: 'hourlyRate >= minimumHourlyNightRate',
        inputValues: { hourlyRate, minimumHourlyNightRate: roundSunat(minimumHourlyNightRate), nightHours },
        resultValue: 0,
      });
    }
  }

  const totalOvertimeAndNightAmount = roundSunat(overtime25Amount + overtime35Amount + nightSurchargeAmount);

  return {
    hourlyRate,
    overtime25Amount,
    overtime35Amount,
    nightSurchargeAmount,
    totalOvertimeAndNightAmount,
    auditEntries,
  };
}
