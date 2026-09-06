# 🇵🇪 VAMOS — Estándar Open-Core de Nómina y Asistencia Operativa

[![Licencia AGPLv3](https://img.shields.io/badge/licencia-AGPLv3-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D24.0.0-green.svg)](https://nodejs.org/)
[![Suite de Pruebas](https://img.shields.io/badge/tests-22%2F22%20passing-brightgreen.svg)]()
[![Compliance](https://img.shields.io/badge/Perú-D.L.%201086%20%7C%20PDT--PLAME%20v4.5-orange.svg)]()
[![Seguridad](https://img.shields.io/badge/Kiosco-SHA--256%20Tamper--Evident-purple.svg)]()

> **Estándar de software abierto, auditable y modular** para la liquidación de nómina (Pequeña Empresa D.L. 1086 y Régimen General D.L. 728), compilación de archivos planos para **PDT-PLAME v4.5** y control de **asistencia operativa offline-first con SQLite local y encadenamiento criptográfico** en pequeñas y medianas empresas del Perú.

---

## 🎯 ¿Por qué este proyecto?

En el mercado peruano, las soluciones de nómina y recursos humanos presentan tres problemas críticos:
1. **Caja Negra Propietaria:** Las suites corporativas cerradas no permiten al contador auditar cómo se calculan las horas extras, la Renta de 5ta Categoría o las alícuotas diarias, forzando a las empresas a pagar contratos anuales de miles de dólares.
2. **Desconexión Operativa y Caídas de Conectividad:** Los almacenes sufren cortes de internet y luz. Si el sistema de asistencia depende de la nube, una caída de red impide el marcaje ante inspecciones inopinadas de SUNAFIL.
3. **Vulnerabilidad de Manipulación:** Las bases de datos locales no cifradas permiten alterar registros de asistencia a posteriori. VAMOS resuelve esto mediante **encadenamiento criptográfico SHA-256 (*tamper-evident*)**.

---

## 🏛️ Marco Normativo y de Seguridad Implementado

| Dominio | Base Legal / Estándar | Implementación en Código |
| :--- | :--- | :--- |
| **Régimen Pequeña Empresa** | **D.L. 1086 (REMYPE)** | Vacaciones 15 días, Gratificación (1/2 sueldo + 9% EsSalud), CTS (1/2 sueldo anual), EsSalud 9%. |
| **Horas Extras Diurnas** | **D.S. 007-2002-TR (Art. 10)** | Alícuota horaria base sobre 240 horas mensuales. 25% las 2 primeras horas, 35% las restantes. |
| **Sobretasa Nocturna** | **D.S. 007-2002-TR (Art. 8)** | Garantía de remuneración mínima nocturna (RMV + 35% = S/ 1,383.75). Diferencial horario automático entre 10:00 PM y 6:00 AM. |
| **Asistencia en Almacén** | **Guía MTPE 2024 (Registro de Asistencia)** | Registro de 4 eventos: `INGRESO`, `SALIDA_REFRIGERIO`, `RETORNO_REFRIGERIO` y `SALIDA`. |
| **Integridad Offline** | **Criptografía SHA-256 (Hash Chaining)** | Cada marcaje incluye el hash del evento anterior. Modificar cualquier registro en SQLite rompe la cadena automáticamente. |
| **Anti-Fuerza Bruta (PIN)** | **Seguridad por Diseño** | Rate limiter estricto: 3 intentos fallidos de PIN bloquean el terminal por 60 segundos. |
| **Detección de Clock Drift** | **Auditoría de Monotonic Clock** | Compara el tiempo monotónico de alta resolución (`performance.now()`) para detectar si el reloj del SO fue retrasado manualmente. |
| **Archivos Planos PDT-PLAME v4.5** | **R.S. 204-2025/SUNAT** | Estructuras oficiales obligatorias: `.jor` (jornada/sobretiempo), `.snl` (suspensiones/faltas) y `.rem` (conceptos remunerativos). |

---

## 📦 Estructura de Paquetes del Monorepo

```
vamos-payroll-standard/
├── packages/
│   ├── engine/                    # Motor puro de cálculo laboral (Sin dependencias externas)
│   │   ├── src/
│   │   │   ├── parameters.ts      # RMV, UIT, tablas AFP y redondeo SUNAT
│   │   │   ├── types.ts           # Modelos de datos del empleado, asistencias y boletas
│   │   │   ├── rules/             # Reglas laborales parametrizadas
│   │   │   ├── engine.ts          # Orquestador del cálculo con Audit Trail legal
│   │   │   └── index.ts
│   │   └── tests/
│   │       └── payroll.test.ts    # 10 pruebas unitarias de cálculo laboral
│   ├── plame-compiler/            # Compilador y validador de archivos PDT-PLAME v4.5
│   │   ├── src/
│   │   │   ├── catalogs.ts        # Tablas oficiales SUNAT (Tabla 03, Tabla 21, Tabla 22)
│   │   │   ├── validator.ts       # Validador de consistencia y formato
│   │   │   ├── compiler.ts        # Generador de archivos .rem, .jor y .snl (CRLF)
│   │   │   └── index.ts
│   │   └── tests/
│   │       └── plame.test.ts      # 6 pruebas de integración SUNAT
│   └── attendance-core/           # Módulo de asistencia offline-first para Kiosco Tablet
│       ├── src/
│       │   ├── security/
│       │   │   ├── hashChain.ts   # Encadenamiento SHA-256 y detección tamper-evident
│       │   │   └── rateLimiter.ts # Protección contra fuerza bruta en PIN de 4 dígitos
│       │   ├── storage/
│       │   │   └── kioskStorage.ts # Base de datos local SQLite (Node 24 native DatabaseSync)
│       │   ├── types.ts           # Eventos MTPE, estados de confianza y contingencia USB
│       │   └── index.ts
│       └── tests/
│           └── attendance.test.ts # 6 pruebas de integridad offline y rate-limiting
├── package.json                   # Configuración de workspaces y scripts de test
└── README.md
```

---

## ⚡ Inicio Rápido (Quickstart)

El proyecto utiliza **Node.js 24+** con soporte nativo para TypeScript y SQLite embebido (cero dependencias de compiladores externos o bases de datos pesadas).

### 1. Ejecutar las 22 Pruebas Unitarias del Monorepo

```bash
# Ejecuta todos los tests de nómina, compilador PLAME y kiosco offline en ~180ms
node --test --experimental-strip-types packages/engine/tests/payroll.test.ts packages/plame-compiler/tests/plame.test.ts packages/attendance-core/tests/attendance.test.ts
```

**Resultado verificado:**
```text
▶ Offline-First Attendance Core (@payroll/attendance-core) - Kiosk Test Suite
  ✔ Test 1: Registro secuencial de marcaje y encadenamiento criptográfico SHA-256 (4.0ms)
  ✔ Test 2: Rate Limiting en PIN - Bloqueo de 60s tras 3 intentos fallidos (2.1ms)
  ✔ Test 3: Detección Tamper-Evident - Alteración directa en SQLite rompe la cadena (1.8ms)
  ✔ Test 4: Detección de Clock Drift - Alerta si el reloj del SO retrocede (1.1ms)
  ✔ Test 5: Cola de Sincronización Offline y Conciliación con la Nube (2.4ms)
  ✔ Test 6: Exportación de Contingencia para Inspección SUNAFIL (1.1ms)
✔ Offline-First Attendance Core (14.1ms)

▶ Peruvian Payroll Engine (@payroll/engine) - Legal Validation Suite
  ✔ 10 casos de prueba de nómina MYPE / Régimen General (4.5ms)
✔ Peruvian Payroll Engine (4.5ms)

▶ PDT-PLAME v4.5 Compiler (@payroll/plame-compiler) - Official SUNAT Test Suite
  ✔ 6 pruebas de exportación .jor, .snl, .rem y validación de tablas SUNAT (4.1ms)
✔ PDT-PLAME v4.5 Compiler (4.1ms)

ℹ tests 22 | pass 22 | fail 0 | duration_ms 180.8ms
```

---

## 💻 Ejemplo: Uso del Kiosco Tablet Offline

```typescript
import { KioskStorage } from '@payroll/attendance-core';

// 1. Inicializar almacenamiento local SQLite en la tablet (persistente o en memoria)
const kiosk = new KioskStorage('kiosk_attendance.db');

// 2. Registrar colaborador con PIN seguro (almacenado con hash SHA-256 + salt)
kiosk.registerEmployeeWithRawPin('EMP-001', '40506070', 'Manuel Chofer', '1234');

// 3. Registrar marcaje de ingreso
const event = kiosk.recordAttendanceWithPin(
  '40506070',
  '1234',
  'INGRESO',
  'TABLET-ALMACEN-01'
);

console.log('Marcaje registrado con éxito:', event.eventType);
console.log('Secuencia monotónica:', event.sequenceNumber);
console.log('Hash criptográfico inmutable:', event.eventHash);

// 4. Auditoría automática de inmutabilidad (Detecta manipulaciones en la base de datos)
const audit = kiosk.verifyDatabaseIntegrity();
console.log('¿Cadena íntegra sin manipulaciones?:', audit.isValid); // true

// 5. Exportar volcado de contingencia en USB ante fiscalización de SUNAFIL sin internet
const contingencyDump = kiosk.exportContingencyDump('TABLET-ALMACEN-01');
console.log('Firma digital de contingencia:', contingencyDump.verificationSignature);
```

---

## 📄 Licencia

Este proyecto está bajo la licencia **GNU Affero General Public License v3.0 (AGPLv3)**.
