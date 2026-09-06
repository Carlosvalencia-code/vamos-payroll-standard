import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateEmployeePayroll } from '../../engine/src/engine.ts';
import type { AttendanceSummary, Employee, PayrollPeriod } from '../../engine/src/types.ts';
import { compilePlamePackage } from '../src/compiler.ts';
import type { CompanyHeader, EmployeePayrollItem } from '../src/types.ts';

describe('PDT-PLAME v4.5 Compiler (@payroll/plame-compiler) - Official SUNAT Test Suite', () => {
  const testCompany: CompanyHeader = {
    ruc: '20601234567',
    razonSocial: 'DISTRIBUIDORA LIMA NORTE S.A.C.',
    year: 2026,
    month: 9,
  };

  const periodSept2026: PayrollPeriod = {
    year: 2026,
    month: 9,
    periodLabel: '2026-09',
  };

  it('Test 1: Nombres de archivo oficiales según estructura SUNAT (0601<AAAA><MM><RUC>.<ext>)', () => {
    const pkg = compilePlamePackage(testCompany, []);

    assert.equal(pkg.files.jor.fileName, '060120260920601234567.jor');
    assert.equal(pkg.files.snl.fileName, '060120260920601234567.snl');
    assert.equal(pkg.files.rem.fileName, '060120260920601234567.rem');
  });

  it('Test 2: Estructura 04 (.jor) - Formato de jornada laboral y horas de sobretiempo', () => {
    const employee: Employee = {
      id: 'EMP-001',
      docType: 'DNI',
      docNumber: '40506070',
      fullName: 'Carlos Mendoza Chofer',
      regime: 'PEQUENA_EMPRESA',
      pensionSystem: 'ONP',
      commissionType: 'FLUJO',
      baseSalary: 1500.00,
      hasFamilyAllowance: true,
      hireDate: '2024-01-15',
    };

    const attendance: AttendanceSummary = {
      daysInMonth: 30,
      daysWorked: 30,
      regularHours: 240,
      overtimeHours25: 10,
      overtimeHours35: 4,
      nightHours: 0,
      tardyMinutes: 0,
      daysAbsentUnjustified: 0,
      daysSubsidized: 0,
      daysUnpaidLeave: 0,
    };

    const payroll = calculateEmployeePayroll(employee, attendance, periodSept2026);
    const item: EmployeePayrollItem = { docType: 'DNI', docNumber: '40506070', payroll, attendance };

    const pkg = compilePlamePackage(testCompany, [item]);

    // Línea .jor esperada: 01|40506070|240|0|14|0|\r\n
    assert.equal(pkg.files.jor.recordCount, 1);
    assert.ok(pkg.files.jor.content.includes('01|40506070|240|0|14|0|\r\n'));
  });

  it('Test 3: Estructura 05 (.snl) - Codificación de suspensiones y días no laborados (Tabla 21)', () => {
    const employee: Employee = {
      id: 'EMP-002',
      docType: 'DNI',
      docNumber: '50607080',
      fullName: 'Juan Falton',
      regime: 'PEQUENA_EMPRESA',
      pensionSystem: 'ONP',
      commissionType: 'FLUJO',
      baseSalary: 1200.00,
      hasFamilyAllowance: false,
      hireDate: '2025-03-01',
    };

    const attendanceWithAbsence: AttendanceSummary = {
      daysInMonth: 30,
      daysWorked: 28,
      regularHours: 224,
      overtimeHours25: 0,
      overtimeHours35: 0,
      nightHours: 0,
      tardyMinutes: 0,
      daysAbsentUnjustified: 2, // 2 faltas injustificadas (código SUNAT 07)
      daysSubsidized: 0,
      daysUnpaidLeave: 0,
    };

    const payroll = calculateEmployeePayroll(employee, attendanceWithAbsence, periodSept2026);
    const item: EmployeePayrollItem = { docType: 'DNI', docNumber: '50607080', payroll, attendance: attendanceWithAbsence };

    const pkg = compilePlamePackage(testCompany, [item]);

    // Línea .snl esperada: 01|50607080|07|2|\r\n
    assert.equal(pkg.files.snl.recordCount, 1);
    assert.ok(pkg.files.snl.content.includes('01|50607080|07|2|\r\n'));
  });

  it('Test 4: Estructura 11 (.rem) - Desglose exacto de conceptos (Tabla 22) y montos a 2 decimales', () => {
    const employee: Employee = {
      id: 'EMP-003',
      docType: 'DNI',
      docNumber: '70809010',
      fullName: 'Pedro Almacen',
      regime: 'PEQUENA_EMPRESA',
      pensionSystem: 'ONP',
      commissionType: 'FLUJO',
      baseSalary: 1025.00,
      hasFamilyAllowance: true, // + 102.50
      hireDate: '2025-06-01',
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
    const item: EmployeePayrollItem = { docType: 'DNI', docNumber: '70809010', payroll, attendance };

    const pkg = compilePlamePackage(testCompany, [item]);

    // Conceptos esperados en .rem:
    // 0121 (Básico: 1025.00)
    // 0201 (Asig. Fam: 102.50)
    // 0607 (ONP 13% de 1127.50 = 146.58)
    // 0804 (EsSalud 9% de 1127.50 = 101.48)
    const rem = pkg.files.rem.content;
    assert.ok(rem.includes('01|70809010|0121|1025.00|1025.00|\r\n'), 'Debe incluir concepto 0121 Remuneración Básica');
    assert.ok(rem.includes('01|70809010|0201|102.50|102.50|\r\n'), 'Debe incluir concepto 0201 Asignación Familiar');
    assert.ok(rem.includes('01|70809010|0607|146.58|146.58|\r\n'), 'Debe incluir concepto 0607 ONP');
    assert.ok(rem.includes('01|70809010|0804|101.48|101.48|\r\n'), 'Debe incluir concepto 0804 EsSalud Regular');
  });

  it('Test 5: Delimitador Windows CRLF estricto (Compatibilidad con validador de SUNAT)', () => {
    const employee: Employee = {
      id: 'EMP-004',
      docType: 'DNI',
      docNumber: '80901020',
      fullName: 'Rosa Silva',
      regime: 'PEQUENA_EMPRESA',
      pensionSystem: 'ONP',
      baseSalary: 1025.00,
      commissionType: 'FLUJO',
      hasFamilyAllowance: false,
      hireDate: '2025-01-01',
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
    const item: EmployeePayrollItem = { docType: 'DNI', docNumber: '80901020', payroll, attendance };

    const pkg = compilePlamePackage(testCompany, [item]);

    assert.ok(pkg.files.jor.content.endsWith('\r\n'), '.jor debe terminar con CRLF');
    assert.ok(pkg.files.rem.content.endsWith('\r\n'), '.rem debe terminar con CRLF');
  });

  it('Test 6: Detección de Errores de Validación (RUC y DNI inválidos)', () => {
    const invalidCompany: CompanyHeader = {
      ruc: '12345', // RUC inválido (< 11 dígitos)
      razonSocial: 'EMPRESA ERRONEA',
      year: 2026,
      month: 13, // Mes inválido
    };

    const pkg = compilePlamePackage(invalidCompany, []);

    assert.equal(pkg.summary.isValid, false);
    assert.ok(pkg.summary.issues.length >= 2);
    const issueFields = pkg.summary.issues.map((i) => i.field);
    assert.ok(issueFields.includes('ruc'));
    assert.ok(issueFields.includes('month'));
  });
});
