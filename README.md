# 🇵🇪 VAMOS — Estándar Open-Core de Nómina y Asistencia Operativa

[![Licencia AGPLv3](https://img.shields.io/badge/licencia-AGPLv3-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D24.0.0-green.svg)](https://nodejs.org/)
[![Suite de Pruebas](https://img.shields.io/badge/tests-16%2F16%20passing-brightgreen.svg)]()
[![Compliance](https://img.shields.io/badge/Perú-D.L.%201086%20%7C%20PDT--PLAME%20v4.5-orange.svg)]()

> **Estándar de software abierto, auditable y modular** para la liquidación de nómina (Pequeña Empresa D.L. 1086 y Régimen General D.L. 728), compilación de archivos planos para **PDT-PLAME v4.5** y control de asistencia operativa en pequeñas y medianas empresas del Perú.

---

## 🎯 ¿Por qué este proyecto?

En el mercado peruano, las soluciones de nómina y recursos humanos presentan tres problemas críticos:
1. **Caja Negra Propietaria:** Las suites corporativas cerradas no permiten al contador auditar cómo se calculan las horas extras, la Renta de 5ta Categoría o las alícuotas diarias, forzando a las empresas a pagar contratos anuales de miles de dólares.
2. **Desconexión Operativa:** Los sistemas contables tradicionales de escritorio (*Concar, Siscont, StarSoft*) carecen de módulos de asistencia móvil para choferes o kioscos offline para almacenes, obligando a digitar a mano cientos de horas de sobretiempo.
3. **Vendor Lock-in:** Migrar datos de un software cerrado es costoso y traumático.

**VAMOS** nace como un **estándar transparente y desacoplado**, donde **el 100% de las fórmulas laborales y la generación de archivos para SUNAT están escritas en TypeScript limpio y auditables línea por línea**, con pruebas unitarias que garantizan exactitud matemática al céntimo.

---

## 🏛️ Marco Normativo Implementado

| Dominio Laboral / Tributario | Base Legal Oficial | Implementación en Código |
| :--- | :--- | :--- |
| **Régimen Pequeña Empresa** | **D.L. 1086 (REMYPE)** | Vacaciones 15 días, Gratificación (1/2 sueldo + 9% EsSalud), CTS (1/2 sueldo anual), EsSalud 9%. |
| **Horas Extras Diurnas** | **D.S. 007-2002-TR (Art. 10)** | Alícuota horaria base sobre 240 horas mensuales. 25% las 2 primeras horas, 35% las restantes. |
| **Sobretasa Nocturna** | **D.S. 007-2002-TR (Art. 8)** | Garantía de remuneración mínima nocturna (RMV + 35% = S/ 1,383.75). Diferencial horario automático entre 10:00 PM y 6:00 AM. |
| **Asignación Familiar** | **Ley N° 25129 / D.S. 035-90-TR** | 10% fijo de la Remuneración Mínima Vital (RMV) = S/ 102.50. |
| **Piso Mínimo EsSalud** | **Art. 6 D.S. 009-97-SA** | El aporte patronal a EsSalud (9%) nunca puede ser inferior al 9% de la RMV (S/ 92.25). |
| **Renta de 5ta Categoría** | **D.S. 179-2004-EF / D.S. 122-94-EF** | Proyección anualizada de ingresos, deducción de 7 UIT y escala progresiva acumulativa (8%, 14%, 17%, 20%, 30%). |
| **Previsión (ONP y AFP)** | **D.L. 19990 y D.L. 25897** | ONP (13%), AFP Fondo (10%), Seguro SIS con tope asegurable SBS y comisiones por flujo/mixta. |
| **Archivos Planos PDT-PLAME v4.5** | **R.S. 204-2025/SUNAT** | Estructuras oficiales obligatorias: `.jor` (jornada/sobretiempo), `.snl` (suspensiones/faltas) y `.rem` (conceptos remunerativos). |

---

## 📦 Estructura del Monorepo

```
vamos-payroll-standard/
├── packages/
│   ├── engine/                    # Motor puro de cálculo laboral (Sin dependencias externas)
│   │   ├── src/
│   │   │   ├── parameters.ts      # RMV, UIT, tablas AFP y redondeo SUNAT
│   │   │   ├── types.ts           # Modelos de datos del empleado, asistencias y boletas
│   │   │   ├── rules/
│   │   │   │   ├── overtime.ts    # Horas extras 25%, 35% y sobretasa nocturna
│   │   │   │   ├── pension.ts     # Retenciones ONP y AFP (Integra, Prima, Profuturo, Hábitat)
│   │   │   │   ├── taxes.ts       # Renta de 5ta Categoría proyectada
│   │   │   │   ├── employer.ts    # EsSalud patronal con piso legal
│   │   │   │   └── smallBusiness.ts # Asignación familiar, faltas y prorrateos D.L. 1086
│   │   │   ├── engine.ts          # Orquestador del cálculo con Audit Trail legal
│   │   │   └── index.ts           # Punto de entrada del paquete
│   │   └── tests/
│   │       └── payroll.test.ts    # Suite de 10 casos de prueba legales exhaustivos
│   └── plame-compiler/            # Compilador y validador de archivos PDT-PLAME v4.5
│       ├── src/
│       │   ├── catalogs.ts        # Tablas oficiales SUNAT (Tabla 03 Doc, Tabla 21 Suspensión, Tabla 22 Conceptos)
│       │   ├── validator.ts       # Validador de RUC, DNIs, consistencia de montos y jornadas
│       │   ├── compiler.ts        # Generador de archivos .rem, .jor y .snl con delimitador CRLF
│       │   └── index.ts
│       └── tests/
│           └── plame.test.ts      # Suite de 6 pruebas de integración y validación SUNAT
├── package.json                   # Configuración de workspaces y scripts de test
└── README.md
```

---

## ⚡ Inicio Rápido (Quickstart)

El proyecto utiliza **Node.js 24+** con soporte nativo para TypeScript (sin necesidad de transpiladores pesados ni herramientas intermedias).

### 1. Ejecutar las 16 Pruebas Unitarias del Monorepo

```bash
# Ejecuta todos los tests de nómina y compilación PLAME en ~130ms
node --test --experimental-strip-types packages/engine/tests/payroll.test.ts packages/plame-compiler/tests/plame.test.ts
```

**Resultado verificado:**
```text
▶ Peruvian Payroll Engine (@payroll/engine) - Legal Validation Suite
  ✔ Caso 1: Pequeña Empresa - Salario RMV (S/ 1,025.00), ONP, sin horas extras (1.1ms)
  ✔ Caso 2: Pequeña Empresa - Salario S/ 2,000.00 + Asignación Familiar, AFP Integra (0.2ms)
  ✔ Caso 3: Horas Extras Diurnas (Chofer con H.E. al 25% y 35%) (0.1ms)
  ✔ Caso 4: Sobretasa Nocturna (Chofer de reparto en horario nocturno) (0.2ms)
  ✔ Caso 5: Descuentos por Inasistencias Injustificadas y Tardanzas (0.1ms)
  ✔ Caso 6: Retención de Renta de 5ta Categoría (Salario S/ 6,000.00 mensual) (0.2ms)
  ✔ Caso 7: Piso Mínimo Legal de EsSalud (Art. 6 D.S. 009-97-SA) (0.4ms)
  ✔ Caso 8: Prorrateo por Ingreso a Mitad de Mes (15 días laborados) (0.1ms)
  ✔ Caso 9: Trazabilidad y Registro de Auditoría Legal (Audit Trail Completo) (0.2ms)
  ✔ Caso 10: Integridad Matemática Rigurosa (Neto = Bruto - Descuentos) (0.2ms)
✔ Peruvian Payroll Engine (@payroll/engine) (4.7ms)

▶ PDT-PLAME v4.5 Compiler (@payroll/plame-compiler) - Official SUNAT Test Suite
  ✔ Test 1: Nombres de archivo oficiales SUNAT (0601<AAAA><MM><RUC>.<ext>) (0.9ms)
  ✔ Test 2: Estructura 04 (.jor) - Jornada laboral y sobretiempo (0.9ms)
  ✔ Test 3: Estructura 05 (.snl) - Codificación de suspensiones y faltas Tabla 21 (0.2ms)
  ✔ Test 4: Estructura 11 (.rem) - Conceptos Tabla 22 y montos a 2 decimales (0.3ms)
  ✔ Test 5: Delimitador Windows CRLF estricto (Compatibilidad validador SUNAT) (0.4ms)
  ✔ Test 6: Detección de Errores de Validación (RUC y DNI inválidos) (0.2ms)
✔ PDT-PLAME v4.5 Compiler (@payroll/plame-compiler) (4.1ms)

ℹ tests 16 | pass 16 | fail 0
```

---

## 💻 Ejemplo: Del Cálculo a los Archivos Planos de SUNAT

```typescript
import { calculateEmployeePayroll } from '@payroll/engine';
import { compilePlamePackage } from '@payroll/plame-compiler';

// 1. Datos de la Empresa
const company = {
  ruc: '20601234567',
  razonSocial: 'DISTRIBUIDORA LIMA NORTE S.A.C.',
  year: 2026,
  month: 9,
};

// 2. Cálculo de Nómina del Colaborador
const employee = {
  id: 'EMP-001',
  docType: 'DNI' as const,
  docNumber: '40506070',
  fullName: 'Carlos Mendoza',
  regime: 'PEQUENA_EMPRESA' as const,
  pensionSystem: 'ONP' as const,
  commissionType: 'FLUJO' as const,
  baseSalary: 1500.00,
  hasFamilyAllowance: true,
  hireDate: '2024-01-15',
};

const attendance = {
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

const payroll = calculateEmployeePayroll(employee, attendance, { year: 2026, month: 9, periodLabel: '2026-09' });

// 3. Compilación a Estructura Oficial PDT-PLAME v4.5
const plamePackage = compilePlamePackage(company, [{
  docType: 'DNI',
  docNumber: '40506070',
  payroll,
  attendance,
}]);

console.log('Archivo Jornada (.jor):', plamePackage.files.jor.fileName);
console.log(plamePackage.files.jor.content);
// 01|40506070|240|0|14|0|\r\n

console.log('Archivo Conceptos (.rem):', plamePackage.files.rem.fileName);
console.log(plamePackage.files.rem.content);
// 01|40506070|0121|1500.00|1500.00|\r\n
// 01|40506070|0201|102.50|102.50|\r\n
// 01|40506070|0105|78.13|78.13|\r\n
// ...
```

---

## 🛡️ Gobernanza, Privacidad y Responsabilidad

1. **Herramienta de Asistencia con Supervisión Humana:**  
   Este software es una herramienta técnica de asistencia para el cálculo de nómina. **No reemplaza el criterio profesional de un contador colegiado**, quien debe revisar y autorizar cada liquidación antes de la declaración oficial ante SUNAT.
2. **Privacidad por Diseño (D.S. 016-2024-JUS):**  
   El módulo de asistencia para choferes opera **exclusivamente por evento** (inicio, refrigerio, fin de ruta). Queda terminantemente prohibido el rastreo GPS continuo en segundo plano.
3. **Trazabilidad Inmutable:**  
   Cada cálculo genera un `auditTrail` detallando la norma legal aplicada, los valores de entrada y el resultado intermedio para facilitar inspecciones de SUNAFIL o auditorías tributarias.

---

## 📄 Licencia

Este proyecto está bajo la licencia **GNU Affero General Public License v3.0 (AGPLv3)**.
