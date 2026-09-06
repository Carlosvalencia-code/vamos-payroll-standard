import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateEmployeePayroll } from '../src/engine.ts';
import { DEFAULT_LEGAL_PARAMETERS_PERU } from '../src/parameters.ts';
import type { AttendanceSummary, Employee, PayrollPeriod } from '../src/types.ts';

describe('Peruvian Payroll Engine (@payroll/engine) - Legal Validation Suite', () => {
  const periodSept2026: PayrollPeriod = {
    year: 2026,
    month: 9,
    periodLabel: '2026-09',
  };

  const defaultFullAttendance: AttendanceSummary = {
    daysInMonth: 30,
    daysWorked: 30,
    regularHours: 240,
    overtimeHours25: 0,
    overtimeHours35: 0,
    nightHours: 0,
    tardyMinutes: 0,
    daysAbsentUnjustified: 0,
    daysSubsidized: 0,
    daysUnpaidLeave: 0,
  };

  it('Caso 1: Pequeña Empresa - Salario RMV (S/ 1,025.00), ONP, sin horas extras ni asignación familiar', () => {
    const employee: Employee = {
      id: 'EMP-001',
      docType: 'DNI',
      docNumber: '10203040',
      fullName: 'Juan Perez',
      regime: 'PEQUENA_EMPRESA',
      pensionSystem: 'ONP',
      commissionType: 'FLUJO',
      baseSalary: 1025.00,
      hasFamilyAllowance: false,
      hireDate: '2025-01-15',
    };

    const result = calculateEmployeePayroll(employee, defaultFullAttendance, periodSept2026);

    // Verificaciones
    assert.equal(result.earnings.baseSalaryEarned, 1025.00);
    assert.equal(result.earnings.familyAllowance, 0);
    assert.equal(result.earnings.totalGrossRemuneration, 1025.00);

    // Descuento ONP (13% de 1025 = 133.25)
    assert.equal(result.deductions.onpAmount, 133.25);
    assert.equal(result.deductions.incomeTax5thCategory, 0);
    assert.equal(result.deductions.totalDeductions, 133.25);

    // Sueldo Neto (1025.00 - 133.25 = 891.75)
    assert.equal(result.netPay, 891.75);

    // EsSalud Empleador (9% de 1025 = 92.25)
    assert.equal(result.employerContributions.essaludAmount, 92.25);
  });

  it('Caso 2: Pequeña Empresa - Salario S/ 2,000.00 + Asignación Familiar, AFP Integra (Flujo)', () => {
    const employee: Employee = {
      id: 'EMP-002',
      docType: 'DNI',
      docNumber: '20304050',
      fullName: 'Maria Rodriguez',
      regime: 'PEQUENA_EMPRESA',
      pensionSystem: 'INTEGRA',
      commissionType: 'FLUJO',
      baseSalary: 2000.00,
      hasFamilyAllowance: true,
      hireDate: '2024-03-01',
    };

    const result = calculateEmployeePayroll(employee, defaultFullAttendance, periodSept2026);

    // Remuneración computable: 2000 + 102.50 (Asig. Fam.) = 2,102.50
    assert.equal(result.earnings.familyAllowance, 102.50);
    assert.equal(result.earnings.totalGrossRemuneration, 2102.50);

    // AFP Integra:
    // Fondo: 10% de 2102.50 = 210.25
    // Seguro SIS: 1.70% de 2102.50 = 35.74
    // Comisión Flujo: 1.55% de 2102.50 = 32.59
    assert.equal(result.deductions.afpMandatoryFund, 210.25);
    assert.equal(result.deductions.afpInsurancePremium, 35.74);
    assert.equal(result.deductions.afpCommission, 32.59);
    assert.equal(result.deductions.totalDeductions, 278.58);

    // Sueldo Neto: 2102.50 - 278.58 = 1823.92
    assert.equal(result.netPay, 1823.92);

    // EsSalud 9% de 2102.50 = 189.23
    assert.equal(result.employerContributions.essaludAmount, 189.23);
  });

  it('Caso 3: Horas Extras Diurnas (Chofer con H.E. al 25% y 35%)', () => {
    const employee: Employee = {
      id: 'EMP-003',
      docType: 'DNI',
      docNumber: '30405060',
      fullName: 'Carlos Mendoza',
      regime: 'PEQUENA_EMPRESA',
      pensionSystem: 'ONP',
      commissionType: 'FLUJO',
      baseSalary: 1200.00,
      hasFamilyAllowance: false,
      hireDate: '2025-06-01',
    };

    const attendanceWithOvertime: AttendanceSummary = {
      ...defaultFullAttendance,
      overtimeHours25: 10, // 10 horas extras al 25%
      overtimeHours35: 4,  // 4 horas extras al 35%
    };

    const result = calculateEmployeePayroll(employee, attendanceWithOvertime, periodSept2026);

    // Valor hora ordinaria: 1200 / 240 = S/ 5.00
    // Hora al 25%: 5.00 * 1.25 = 6.25 * 10h = S/ 62.50
    // Hora al 35%: 5.00 * 1.35 = 6.75 * 4h = S/ 27.00
    assert.equal(result.earnings.overtime25Amount, 62.50);
    assert.equal(result.earnings.overtime35Amount, 27.00);

    // Remuneración total: 1200 + 62.50 + 27.00 = 1,289.50
    assert.equal(result.earnings.totalGrossRemuneration, 1289.50);
  });

  it('Caso 4: Sobretasa Nocturna (Chofer de reparto en horario nocturno)', () => {
    const employee: Employee = {
      id: 'EMP-004',
      docType: 'DNI',
      docNumber: '40506070',
      fullName: 'Raul Quispe',
      regime: 'PEQUENA_EMPRESA',
      pensionSystem: 'ONP',
      commissionType: 'FLUJO',
      baseSalary: 1025.00, // Percibe el básico RMV
      hasFamilyAllowance: false,
      hireDate: '2025-02-01',
    };

    const attendanceNight: AttendanceSummary = {
      ...defaultFullAttendance,
      nightHours: 30, // 30 horas laboradas entre 10pm y 6am
    };

    const result = calculateEmployeePayroll(employee, attendanceNight, periodSept2026);

    // Valor hora regular: 1025 / 240 = 4.27
    // Valor hora mínima nocturna: (1025 * 1.35) / 240 = 1383.75 / 240 = 5.7656
    // Diferencial: 5.7656 - 4.27 = 1.4956
    // Sobretasa nocturna: roundSunat(1.4956 * 30) = 44.87
    assert.ok(result.earnings.nightSurchargeAmount > 0, 'Debe calcular diferencial nocturno positivo');
    assert.equal(result.earnings.nightSurchargeAmount, 44.87);
    assert.equal(result.earnings.totalGrossRemuneration, 1025.00 + 44.87);
  });

  it('Caso 5: Descuentos por Inasistencias Injustificadas y Tardanzas', () => {
    const employee: Employee = {
      id: 'EMP-005',
      docType: 'DNI',
      docNumber: '50607080',
      fullName: 'Ana Morales',
      regime: 'PEQUENA_EMPRESA',
      pensionSystem: 'ONP',
      commissionType: 'FLUJO',
      baseSalary: 1500.00,
      hasFamilyAllowance: false,
      hireDate: '2024-01-10',
    };

    const attendanceWithPenalties: AttendanceSummary = {
      ...defaultFullAttendance,
      daysAbsentUnjustified: 2, // 2 faltas injustificadas
      tardyMinutes: 90,         // 90 minutos de tardanza
    };

    const result = calculateEmployeePayroll(employee, attendanceWithPenalties, periodSept2026);

    // Cuota diaria: 1500 / 30 = S/ 50.00
    // Descuento por 2 faltas: 50.00 * 2 = S/ 100.00
    assert.equal(result.deductions.absenceDeduction, 100.00);

    // Descuento por tardanza: (1500 / (240 * 60)) * 90 = 0.10416 * 90 = S/ 9.38
    assert.equal(result.deductions.tardinessDeduction, 9.38);
    assert.ok(result.deductions.totalDeductions >= 100.00 + 9.38);
  });

  it('Caso 6: Retención de Renta de 5ta Categoría (Salario S/ 6,000.00 mensual)', () => {
    const employee: Employee = {
      id: 'EMP-006',
      docType: 'DNI',
      docNumber: '60708090',
      fullName: 'Roberto Silva',
      regime: 'PEQUENA_EMPRESA',
      pensionSystem: 'PRIMA',
      commissionType: 'FLUJO',
      baseSalary: 6000.00,
      hasFamilyAllowance: true,
      hireDate: '2023-05-15',
    };

    const result = calculateEmployeePayroll(employee, defaultFullAttendance, periodSept2026);

    // Supera las 7 UIT deducibles, por lo tanto debe retener Renta de 5ta categoría
    assert.ok(
      result.deductions.incomeTax5thCategory > 0,
      'Trabajador con remuneración alta debe retener Renta de 5ta Categoría'
    );
  });

  it('Caso 7: Piso Mínimo Legal de EsSalud (Art. 6 D.S. 009-97-SA)', () => {
    const employee: Employee = {
      id: 'EMP-007',
      docType: 'DNI',
      docNumber: '70809010',
      fullName: 'Lucia Flores',
      regime: 'PEQUENA_EMPRESA',
      pensionSystem: 'ONP',
      commissionType: 'FLUJO',
      baseSalary: 600.00, // Salario bajo pactado
      hasFamilyAllowance: false,
      hireDate: '2025-08-01',
    };

    const result = calculateEmployeePayroll(employee, defaultFullAttendance, periodSept2026);

    // 9% de 600 = S/ 54.00, pero el piso legal mínimo es 9% de la RMV (1025 * 0.09 = S/ 92.25)
    assert.equal(result.employerContributions.essaludAmount, 92.25);
  });

  it('Caso 8: Prorrateo por Ingreso a Mitad de Mes (15 días laborados)', () => {
    const employee: Employee = {
      id: 'EMP-008',
      docType: 'DNI',
      docNumber: '80901020',
      fullName: 'Pedro Diaz',
      regime: 'PEQUENA_EMPRESA',
      pensionSystem: 'ONP',
      commissionType: 'FLUJO',
      baseSalary: 1800.00,
      hasFamilyAllowance: false,
      hireDate: '2026-09-16', // Ingresó el 16
    };

    const halfMonthAttendance: AttendanceSummary = {
      ...defaultFullAttendance,
      daysWorked: 15, // Solo laboró 15 días
    };

    const result = calculateEmployeePayroll(employee, halfMonthAttendance, periodSept2026);

    // Cuota diaria: 1800 / 30 = 60.00. Sueldo básico devengado por 15 días: 60.00 * 15 = S/ 900.00
    assert.equal(result.earnings.baseSalaryEarned, 900.00);
    assert.equal(result.earnings.totalGrossRemuneration, 900.00);
  });

  it('Caso 9: Trazabilidad y Registro de Auditoría Legal (Audit Trail Completo)', () => {
    const employee: Employee = {
      id: 'EMP-009',
      docType: 'DNI',
      docNumber: '90102030',
      fullName: 'Elena Paredes',
      regime: 'PEQUENA_EMPRESA',
      pensionSystem: 'HABITAT',
      commissionType: 'FLUJO',
      baseSalary: 1400.00,
      hasFamilyAllowance: true,
      hireDate: '2025-04-01',
    };

    const result = calculateEmployeePayroll(employee, defaultFullAttendance, periodSept2026);

    assert.ok(result.auditTrail.length >= 4, 'Debe registrar al menos 4 eventos de auditoría legal');
    const ruleIds = result.auditTrail.map((e) => e.ruleId);
    assert.ok(ruleIds.includes('ASIGNACION_FAMILIAR'), 'Debe auditar asignación familiar');
    assert.ok(ruleIds.includes('VALOR_HORA_ORDINARIA'), 'Debe auditar valor hora');
    assert.ok(ruleIds.includes('ESSALUD_APORTE_PATRONAL'), 'Debe auditar aporte a EsSalud');
  });

  it('Caso 10: Integridad Matemática Rigurosa (Neto = Bruto - Descuentos)', () => {
    const employee: Employee = {
      id: 'EMP-010',
      docType: 'DNI',
      docNumber: '01020304',
      fullName: 'Miguel Alva',
      regime: 'PEQUENA_EMPRESA',
      pensionSystem: 'INTEGRA',
      commissionType: 'FLUJO',
      baseSalary: 2500.00,
      hasFamilyAllowance: true,
      hireDate: '2024-07-01',
    };

    const attendanceMixed: AttendanceSummary = {
      ...defaultFullAttendance,
      overtimeHours25: 6,
      overtimeHours35: 2,
      tardyMinutes: 45,
    };

    const result = calculateEmployeePayroll(employee, attendanceMixed, periodSept2026);

    const calculatedNet = Math.round((result.earnings.totalGrossRemuneration - result.deductions.totalDeductions) * 100) / 100;
    assert.equal(result.netPay, calculatedNet, 'El sueldo neto debe ser exactamente la diferencia matemática');
  });
});
