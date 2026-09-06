import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateEmployeePayroll } from '../../engine/src/engine.ts';
import type { AttendanceSummary, Employee, PayrollPeriod } from '../../engine/src/types.ts';
import { generatePayslip } from '../src/generator.ts';
import type { CompanyInfo, EmployeeJobInfo } from '../src/types.ts';
import { convertirNumeroALetrasSoles } from '../src/utils/numberToWords.ts';

describe('Peruvian Payslip Generator (@payroll/payslip-pdf) - Suite Interna de Formato de Boletas A4', () => {
  const testCompany: CompanyInfo = {
    ruc: '20601234567',
    razonSocial: 'LOGISTICA & DISTRIBUCION URBANA S.A.C.',
    direccion: 'Av. Materiales 1234, Cercado de Lima',
  };

  const periodSept2026: PayrollPeriod = {
    year: 2026,
    month: 9,
    periodLabel: '2026-09',
  };

  it('Test 1: Conversión precisa de moneda numérica a texto legal en Soles', () => {
    assert.equal(convertirNumeroALetrasSoles(1025.50), 'SON: UN MIL VEINTICINCO CON 50/100 SOLES');
    assert.equal(convertirNumeroALetrasSoles(2102.00), 'SON: DOS MIL CIENTO DOS CON 00/100 SOLES');
    assert.equal(convertirNumeroALetrasSoles(6000.00), 'SON: SEIS MIL CON 00/100 SOLES');
    assert.equal(convertirNumeroALetrasSoles(0.00), 'SON: CERO CON 00/100 SOLES');
  });

  it('Test 2: Generación de Boleta Oficial con campos mandatorios del D.S. 001-98-TR', () => {
    const employee: Employee = {
      id: 'EMP-201',
      docType: 'DNI',
      docNumber: '41526374',
      fullName: 'Carlos Sanchez Chofer',
      regime: 'PEQUENA_EMPRESA',
      pensionSystem: 'ONP',
      commissionType: 'FLUJO',
      baseSalary: 1500.00,
      hasFamilyAllowance: true,
      hireDate: '2024-02-01',
    };

    const jobInfo: EmployeeJobInfo = {
      cargo: 'Chofer de Reparto',
      fechaIngreso: '2024-02-01',
      cuspp: undefined,
    };

    const attendance: AttendanceSummary = {
      daysInMonth: 30,
      daysWorked: 30,
      regularHours: 240,
      overtimeHours25: 8,
      overtimeHours35: 2,
      nightHours: 0,
      tardyMinutes: 15,
      daysAbsentUnjustified: 0,
      daysSubsidized: 0,
      daysUnpaidLeave: 0,
    };

    const payroll = calculateEmployeePayroll(employee, attendance, periodSept2026);

    const payslip = generatePayslip({
      company: testCompany,
      employee: { ...employee, ...jobInfo },
      attendance,
      payroll,
    });

    assert.ok(payslip.id.length > 0);
    assert.equal(payslip.netPay, payroll.netPay);
    assert.ok(payslip.amountInWords.includes('SOLES'));
    assert.ok(payslip.verificationHash.length === 64);

    // Validar presencia de campos requeridos en el HTML
    const html = payslip.htmlContent;
    assert.ok(html.includes('LOGISTICA & DISTRIBUCION URBANA S.A.C.'), 'Debe incluir razón social');
    assert.ok(html.includes('20601234567'), 'Debe incluir RUC del empleador');
    assert.ok(html.includes('Carlos Sanchez Chofer'), 'Debe incluir nombre completo del trabajador');
    assert.ok(html.includes('41526374'), 'Debe incluir DNI');
    assert.ok(html.includes('Chofer de Reparto'), 'Debe incluir cargo');
    assert.ok(html.includes('Pequeña Empresa (D.L. 1086)'), 'Debe incluir régimen laboral');
    assert.ok(html.includes('0121'), 'Debe incluir código concepto 0121 Básico');
    assert.ok(html.includes('0201'), 'Debe incluir código concepto 0201 Asig. Fam.');
    assert.ok(html.includes('0105'), 'Debe incluir código concepto 0105 H.E. 25%');
    assert.ok(html.includes('0804'), 'Debe incluir aporte EsSalud regular');
    assert.ok(html.includes('TRABAJADOR'), 'Debe incluir espacio de firma del trabajador');
    assert.ok(html.includes('EMPLEADOR'), 'Debe incluir espacio de firma del empleador');
  });

  it('Test 3: Verificación del Hash Criptográfico de Integridad (Auditoría Manus AI)', () => {
    const employee: Employee = {
      id: 'EMP-202',
      docType: 'DNI',
      docNumber: '78945612',
      fullName: 'Ana Flores',
      regime: 'PEQUENA_EMPRESA',
      pensionSystem: 'INTEGRA',
      commissionType: 'FLUJO',
      baseSalary: 1200.00,
      hasFamilyAllowance: false,
      hireDate: '2025-05-10',
    };

    const attendance: AttendanceSummary = {
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

    const payroll = calculateEmployeePayroll(employee, attendance, periodSept2026);

    const payslip = generatePayslip({
      company: testCompany,
      employee: { ...employee, cargo: 'Auxiliar Almacén', fechaIngreso: '2025-05-10' },
      attendance,
      payroll,
    });

    // Hash de integridad no sensible
    assert.equal(typeof payslip.verificationHash, 'string');
    assert.equal(payslip.verificationHash.length, 64);
    assert.ok(payslip.htmlContent.includes(payslip.verificationHash.substring(0, 16)));
  });

  it('Test 4: Reconciliación Matemática Estricta de la Boleta', () => {
    const employee: Employee = {
      id: 'EMP-203',
      docType: 'DNI',
      docNumber: '12349876',
      fullName: 'Miguel Almacén',
      regime: 'PEQUENA_EMPRESA',
      pensionSystem: 'ONP',
      commissionType: 'FLUJO',
      baseSalary: 1800.00,
      hasFamilyAllowance: true,
      hireDate: '2024-08-01',
    };

    const attendance: AttendanceSummary = {
      daysInMonth: 30,
      daysWorked: 30,
      regularHours: 240,
      overtimeHours25: 5,
      overtimeHours35: 0,
      nightHours: 0,
      tardyMinutes: 20,
      daysAbsentUnjustified: 0,
      daysSubsidized: 0,
      daysUnpaidLeave: 0,
    };

    const payroll = calculateEmployeePayroll(employee, attendance, periodSept2026);

    const payslip = generatePayslip({
      company: testCompany,
      employee: { ...employee, cargo: 'Operario', fechaIngreso: '2024-08-01' },
      attendance,
      payroll,
    });

    const expectedNet = Math.round((payroll.earnings.totalGrossRemuneration - payroll.deductions.totalDeductions) * 100) / 100;
    assert.equal(payslip.netPay, expectedNet);
  });
});
