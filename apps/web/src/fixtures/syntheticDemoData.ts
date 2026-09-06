/**
 * SYNTHETIC DEMO FIXTURES — LOCAL LAB AND PILOT SIMULATION ONLY
 * 
 * ⚠️ AVISO DE PRIVACIDAD Y SEGURIDAD:
 * Los siguientes registros son datos puramente ficticios y sintéticos generados para
 * pruebas unitarias, demostración de arquitectura y verificación de interoperabilidad.
 * NO CONTIENEN NI DEBEN SER REEMPLAZADOS POR INFORMACIÓN LABORAL REAL EN ESTE ARCHIVO.
 * En un entorno de producción, los datos deben residir en bases de datos con cifrado
 * y aislamiento por tenant (empresa).
 */

import type { AttendanceSummary, Employee, PayrollPeriod } from '../../../packages/engine/src/types.ts';
import type { CompanyHeader } from '../../../packages/plame-compiler/src/types.ts';
import type { CompanyInfo, EmployeeJobInfo } from '../../../packages/payslip-pdf/src/types.ts';

export const SYNTHETIC_COMPANY_HEADER: CompanyHeader = {
  ruc: '20601234567',
  razonSocial: 'DISTRIBUIDORA SIMULADA LIMA S.A.C.',
  year: 2026,
  month: 9,
};

export const SYNTHETIC_COMPANY_INFO: CompanyInfo = {
  ruc: SYNTHETIC_COMPANY_HEADER.ruc,
  razonSocial: SYNTHETIC_COMPANY_HEADER.razonSocial,
  direccion: 'Av. Industrial 123, Lima (Entorno de Laboratorio)',
};

export const SYNTHETIC_PERIOD_SEPT_2026: PayrollPeriod = {
  year: 2026,
  month: 9,
  periodLabel: '2026-09',
};

export interface SyntheticWorkerRecord {
  employee: Employee & EmployeeJobInfo;
  attendance: AttendanceSummary;
  rawPin: string;
}

export const SYNTHETIC_WORKERS: SyntheticWorkerRecord[] = [
  {
    employee: {
      id: 'EMP-001',
      docType: 'DNI',
      docNumber: '40506070',
      fullName: 'Carlos Mendoza Ramos (Sintético)',
      cargo: 'Chofer de Reparto',
      fechaIngreso: '2024-02-15',
      regime: 'PEQUENA_EMPRESA',
      pensionSystem: 'INTEGRA',
      commissionType: 'FLUJO',
      baseSalary: 1600.00,
      hasFamilyAllowance: true,
      hireDate: '2024-02-15',
      cuspp: '548721CMR0',
    },
    attendance: {
      daysInMonth: 30,
      daysWorked: 30,
      regularHours: 240,
      overtimeHours25: 12,
      overtimeHours35: 4,
      nightHours: 15,
      tardyMinutes: 0,
      daysAbsentUnjustified: 0,
      daysSubsidized: 0,
      daysUnpaidLeave: 0,
    },
    rawPin: '1234',
  },
  {
    employee: {
      id: 'EMP-002',
      docType: 'DNI',
      docNumber: '70809010',
      fullName: 'Rosa Alva Sanchez (Sintético)',
      cargo: 'Auxiliar de Almacén',
      fechaIngreso: '2025-01-10',
      regime: 'PEQUENA_EMPRESA',
      pensionSystem: 'ONP',
      commissionType: 'FLUJO',
      baseSalary: 1200.00,
      hasFamilyAllowance: false,
      hireDate: '2025-01-10',
    },
    attendance: {
      daysInMonth: 30,
      daysWorked: 30,
      regularHours: 240,
      overtimeHours25: 4,
      overtimeHours35: 0,
      nightHours: 0,
      tardyMinutes: 25,
      daysAbsentUnjustified: 0,
      daysSubsidized: 0,
      daysUnpaidLeave: 0,
    },
    rawPin: '5678',
  },
  {
    employee: {
      id: 'EMP-003',
      docType: 'DNI',
      docNumber: '10203040',
      fullName: 'Juan Quispe Morales (Sintético)',
      cargo: 'Estibador de Carga',
      fechaIngreso: '2025-03-01',
      regime: 'MICRO_EMPRESA', // Demostración de Microempresa
      pensionSystem: 'PRIMA',
      commissionType: 'FLUJO',
      baseSalary: 1025.00,
      hasFamilyAllowance: true,
      hireDate: '2025-03-01',
    },
    attendance: {
      daysInMonth: 30,
      daysWorked: 28,
      regularHours: 224,
      overtimeHours25: 0,
      overtimeHours35: 0,
      nightHours: 0,
      tardyMinutes: 0,
      daysAbsentUnjustified: 2,
      daysSubsidized: 0,
      daysUnpaidLeave: 0,
    },
    rawPin: '4321',
  },
];
