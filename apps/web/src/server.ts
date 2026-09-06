/**
 * Interactive Web Dashboard and Local Kiosk Terminal for VAMOS Payroll
 * Native Node.js 24 Server with Zero External Dependencies
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { KioskStorage } from '../../../packages/attendance-core/src/storage/kioskStorage.ts';
import { calculateEmployeePayroll } from '../../../packages/engine/src/engine.ts';
import type { AttendanceSummary, Employee, PayrollPeriod } from '../../../packages/engine/src/types.ts';
import { compilePlamePackage } from '../../../packages/plame-compiler/src/compiler.ts';
import type { CompanyHeader, EmployeePayrollItem } from '../../../packages/plame-compiler/src/types.ts';
import { generatePayslip } from '../../../packages/payslip-pdf/src/generator.ts';
import type { CompanyInfo, EmployeeJobInfo } from '../../../packages/payslip-pdf/src/types.ts';

const PORT = Number(process.env.PORT || 3000);

// 1. Datos Demo de la Distribuidora en Lima
const companyHeader: CompanyHeader = {
  ruc: '20601234567',
  razonSocial: 'DISTRIBUIDORA MAYORISTA LIMA S.A.C.',
  year: 2026,
  month: 9,
};

const companyInfo: CompanyInfo = {
  ruc: companyHeader.ruc,
  razonSocial: companyHeader.razonSocial,
  direccion: 'Av. Nicolás Dueñas 850, Lima Industrial',
};

const periodSept2026: PayrollPeriod = {
  year: 2026,
  month: 9,
  periodLabel: '2026-09',
};

interface DemoWorker {
  employee: Employee & EmployeeJobInfo;
  attendance: AttendanceSummary;
  rawPin: string;
}

const DEMO_WORKERS: DemoWorker[] = [
  {
    employee: {
      id: 'EMP-001',
      docType: 'DNI',
      docNumber: '40506070',
      fullName: 'Carlos Mendoza Ramos',
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
      fullName: 'Rosa Alva Sanchez',
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
      fullName: 'Juan Quispe Morales',
      cargo: 'Estibador de Carga',
      fechaIngreso: '2025-03-01',
      regime: 'PEQUENA_EMPRESA',
      pensionSystem: 'PRIMA',
      commissionType: 'FLUJO',
      baseSalary: 1025.00, // RMV
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
      daysAbsentUnjustified: 2, // 2 faltas
      daysSubsidized: 0,
      daysUnpaidLeave: 0,
    },
    rawPin: '4321',
  },
];

// 2. Inicializar Kiosco en Memoria
const kioskStorage = new KioskStorage(':memory:');
for (const w of DEMO_WORKERS) {
  kioskStorage.registerEmployeeWithRawPin(w.employee.id, w.employee.docNumber, w.employee.fullName, w.rawPin);
}

// Marcajes iniciales para simular datos reales
kioskStorage.recordAttendanceWithPin('40506070', '1234', 'INGRESO', 'TABLET-ALMACEN-01');
kioskStorage.recordAttendanceWithPin('70809010', '5678', 'INGRESO', 'TABLET-ALMACEN-01');

// 3. Helper para calcular nómina consolidada
function getConsolidatedPayroll() {
  const items: EmployeePayrollItem[] = DEMO_WORKERS.map((w) => {
    const payroll = calculateEmployeePayroll(w.employee, w.attendance, periodSept2026);
    return {
      docType: w.employee.docType,
      docNumber: w.employee.docNumber,
      payroll,
      attendance: w.attendance,
    };
  });

  const plamePackage = compilePlamePackage(companyHeader, items);
  return { items, plamePackage };
}

// 4. Servidor HTTP
const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Rutas API
  if (url.pathname === '/api/payroll-data') {
    const { items, plamePackage } = getConsolidatedPayroll();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        company: companyHeader,
        period: periodSept2026,
        employees: items.map((i, idx) => ({
          ...i.payroll,
          cargo: DEMO_WORKERS[idx].employee.cargo,
          attendance: i.attendance,
        })),
        summary: plamePackage.summary,
      })
    );
    return;
  }

  // Descarga de archivos PLAME (.rem, .jor, .snl)
  if (url.pathname.startsWith('/api/download/plame/')) {
    const ext = url.pathname.replace('/api/download/plame/', '');
    const { plamePackage } = getConsolidatedPayroll();

    let fileData = plamePackage.files.rem;
    if (ext === 'jor') fileData = plamePackage.files.jor;
    if (ext === 'snl') fileData = plamePackage.files.snl;

    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=iso-8859-1',
      'Content-Disposition': `attachment; filename="${fileData.fileName}"`,
    });
    res.end(fileData.content);
    return;
  }

  // Visor de Boleta de Pago HTML
  if (url.pathname.startsWith('/api/boleta/')) {
    const docNum = url.pathname.replace('/api/boleta/', '');
    const worker = DEMO_WORKERS.find((w) => w.employee.docNumber === docNum);

    if (!worker) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Trabajador no encontrado.');
      return;
    }

    const payroll = calculateEmployeePayroll(worker.employee, worker.attendance, periodSept2026);
    const payslip = generatePayslip({
      company: companyInfo,
      employee: worker.employee,
      attendance: worker.attendance,
      payroll,
    });

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(payslip.htmlContent);
    return;
  }

  // Kiosco: Obtener Eventos y Estado de Integridad
  if (url.pathname === '/api/kiosk/events') {
    const events = kioskStorage.getAllEvents();
    const integrity = kioskStorage.verifyDatabaseIntegrity();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ events, integrity }));
    return;
  }

  // Kiosco: Registrar Marcaje con PIN
  if (url.pathname === '/api/kiosk/punch' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const { docNumber, pin, eventType } = JSON.parse(body);
        const event = kioskStorage.recordAttendanceWithPin(docNumber, pin, eventType, 'TABLET-ALMACEN-01');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, event }));
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Interfaz Web Principal (Dashboard SPA)
  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(DASHBOARD_HTML);
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

// HTML interactivo del Dashboard
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>VAMOS — Dashboard de Nómina & Kiosco Almacén</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #1e3a8a;
      --primary-hover: #172554;
      --accent: #2563eb;
      --bg: #f8fafc;
      --card: #ffffff;
      --border: #e2e8f0;
      --text: #0f172a;
      --text-muted: #64748b;
      --success: #059669;
      --danger: #dc2626;
      --warning: #d97706;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
    body { background: var(--bg); color: var(--text); padding-bottom: 50px; }
    header { background: #fff; border-bottom: 1px solid var(--border); padding: 16px 24px; position: sticky; top: 0; z-index: 40; }
    .header-wrap { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
    .logo { font-size: 18px; font-weight: 800; color: var(--primary); display: flex; align-items: center; gap: 8px; }
    .badge-pe { background: #eff6ff; color: var(--accent); padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; border: 1px solid #bfdbfe; }
    
    .nav-tabs { display: flex; gap: 8px; background: #f1f5f9; padding: 4px; border-radius: 8px; }
    .tab-btn { border: none; background: transparent; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; color: var(--text-muted); cursor: pointer; transition: all 0.2s; }
    .tab-btn.active { background: #fff; color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

    .container { max-width: 1200px; margin: 24px auto; padding: 0 20px; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    .card { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .card-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }

    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
    th { background: #f8fafc; padding: 10px 12px; border-bottom: 2px solid var(--border); font-weight: 600; color: var(--text-muted); }
    td { padding: 12px; border-bottom: 1px solid var(--border); }
    tr:hover { background: #f8fafc; }

    .amt { font-weight: 600; text-align: right; }
    th.amt { text-align: right; }
    .badge-onp { background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; }
    .badge-afp { background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; }

    .btn { background: var(--accent); color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; text-decoration: none; transition: background 0.15s; }
    .btn:hover { background: #1d4ed8; }
    .btn-secondary { background: #fff; color: var(--text); border: 1px solid var(--border); }
    .btn-secondary:hover { background: #f1f5f9; }
    .btn-sm { padding: 4px 10px; font-size: 11px; }

    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: #fff; border: 1px solid var(--border); padding: 18px; border-radius: 10px; }
    .stat-label { font-size: 12px; color: var(--text-muted); font-weight: 500; margin-bottom: 4px; }
    .stat-val { font-size: 22px; font-weight: 800; color: var(--primary); }

    /* Terminal Kiosco */
    .kiosk-grid { display: grid; grid-template-columns: 360px 1fr; gap: 24px; }
    @media (max-width: 800px) { .kiosk-grid { grid-template-columns: 1fr; } }
    .terminal-box { background: #0f172a; color: #fff; padding: 24px; border-radius: 16px; box-shadow: 0 10px 25px rgba(15,23,42,0.3); }
    .terminal-title { font-size: 14px; color: #94a3b8; text-transform: uppercase; margin-bottom: 16px; text-align: center; }
    .pin-display { background: #1e293b; height: 50px; border-radius: 8px; font-size: 24px; letter-spacing: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 1px solid #334155; }
    .keypad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
    .key-btn { background: #334155; color: #fff; border: none; height: 50px; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; transition: background 0.1s; }
    .key-btn:active { background: #475569; transform: scale(0.98); }
    .event-select { width: 100%; background: #1e293b; color: #fff; border: 1px solid #334155; padding: 10px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
    .kiosk-status { padding: 10px; border-radius: 6px; font-size: 12px; text-align: center; margin-top: 12px; display: none; }
    .kiosk-status.ok { background: rgba(5, 150, 105, 0.2); color: #34d399; border: 1px solid #059669; display: block; }
    .kiosk-status.err { background: rgba(220, 38, 38, 0.2); color: #f87171; border: 1px solid #dc2626; display: block; }

    .sha-tag { font-family: monospace; font-size: 11px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #475569; }
  </style>
</head>
<body>

  <header>
    <div class="header-wrap">
      <div class="logo">
        🇵🇪 VAMOS <span class="badge-pe">Nómina MYPE Perú</span>
      </div>
      <div class="nav-tabs">
        <button class="tab-btn active" onclick="switchTab('tab-payroll')">📊 Planilla Mensual</button>
        <button class="tab-btn" onclick="switchTab('tab-kiosk')">🏢 Kiosco Almacén</button>
        <button class="tab-btn" onclick="switchTab('tab-plame')">📁 Archivos SUNAT</button>
      </div>
    </div>
  </header>

  <div class="container">

    <!-- TAB 1: PLANILLA MENSUAL -->
    <div id="tab-payroll" class="tab-content active">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Planilla Bruta</div>
          <div class="stat-val" id="stat-gross">S/ 0.00</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Descuentos (ONP/AFP)</div>
          <div class="stat-val" id="stat-deductions" style="color: var(--danger);">S/ 0.00</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Neto Total a Pagar</div>
          <div class="stat-val" id="stat-net" style="color: var(--success);">S/ 0.00</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Aporte EsSalud (9%)</div>
          <div class="stat-val" id="stat-essalud" style="color: var(--warning);">S/ 0.00</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">
          <span>Periodo: Septiembre 2026 (Régimen Pequeña Empresa D.L. 1086)</span>
          <div style="display: flex; gap: 8px;">
            <a href="/api/download/plame/rem" class="btn btn-sm">Descargar .rem</a>
            <a href="/api/download/plame/jor" class="btn btn-sm">Descargar .jor</a>
            <a href="/api/download/plame/snl" class="btn btn-sm">Descargar .snl</a>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Cargo</th>
                <th>Pensión</th>
                <th class="amt">Básico</th>
                <th class="amt">H. Extras</th>
                <th class="amt">Total Bruto</th>
                <th class="amt">Descuentos</th>
                <th class="amt">Neto a Pagar</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="payroll-tbody">
              <!-- Cargado dinámicamente vía fetch -->
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 2: KIOSCO ALMACÉN TERMINAL -->
    <div id="tab-kiosk" class="tab-content">
      <div class="kiosk-grid">
        <div class="terminal-box">
          <div class="terminal-title">Terminal de Almacén (Tablet)</div>
          
          <select id="worker-select" class="event-select">
            <option value="40506070">Carlos Mendoza (Chofer) - DNI: 40506070 (PIN: 1234)</option>
            <option value="70809010">Rosa Alva (Almacén) - DNI: 70809010 (PIN: 5678)</option>
            <option value="10203040">Juan Quispe (Estibador) - DNI: 10203040 (PIN: 4321)</option>
          </select>

          <select id="event-type" class="event-select">
            <option value="INGRESO">🟢 INGRESO (Inicio Jornada)</option>
            <option value="SALIDA_REFRIGERIO">🥪 SALIDA A REFRIGERIO</option>
            <option value="RETORNO_REFRIGERIO">🔙 RETORNO DE REFRIGERIO</option>
            <option value="SALIDA">🔴 SALIDA (Fin de Jornada)</option>
          </select>

          <div class="pin-display" id="pin-display">----</div>

          <div class="keypad">
            <button class="key-btn" onclick="pressKey('1')">1</button>
            <button class="key-btn" onclick="pressKey('2')">2</button>
            <button class="key-btn" onclick="pressKey('3')">3</button>
            <button class="key-btn" onclick="pressKey('4')">4</button>
            <button class="key-btn" onclick="pressKey('5')">5</button>
            <button class="key-btn" onclick="pressKey('6')">6</button>
            <button class="key-btn" onclick="pressKey('7')">7</button>
            <button class="key-btn" onclick="pressKey('8')">8</button>
            <button class="key-btn" onclick="pressKey('9')">9</button>
            <button class="key-btn" style="background: #b91c1c;" onclick="clearPin()">C</button>
            <button class="key-btn" onclick="pressKey('0')">0</button>
            <button class="key-btn" style="background: var(--success);" onclick="submitPunch()">OK</button>
          </div>

          <div id="kiosk-status" class="kiosk-status"></div>
        </div>

        <div class="card">
          <div class="card-title">
            <span>Log Inmutable de Marcaciones (SQLite Local)</span>
            <span id="chain-badge" class="badge-pe" style="background: #ecfdf5; color: var(--success); border-color: #a7f3d0;">
              🔒 Cadena SHA-256 Íntegra
            </span>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Seq</th>
                  <th>DNI</th>
                  <th>Evento</th>
                  <th>Fecha/Hora UTC</th>
                  <th>Hash Criptográfico</th>
                </tr>
              </thead>
              <tbody id="kiosk-events-tbody">
                <!-- Cargado dinámicamente -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: ARCHIVOS SUNAT -->
    <div id="tab-plame" class="tab-content">
      <div class="card">
        <div class="card-title">Estructura Oficial PDT-PLAME v4.5 (Vigente Oct 2025+)</div>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">
          Archivos planos generados con codificación ANSI/ASCII, delimitador de campo pipe (|) y fin de línea Windows CRLF para importación directa en el validador de SUNAT.
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
          <div style="border: 1px solid var(--border); padding: 16px; border-radius: 8px;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">Estructura 04 (.jor)</div>
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">Jornada laboral ordinaria y horas de sobretiempo acumuladas.</p>
            <a href="/api/download/plame/jor" class="btn btn-sm">Descargar .jor</a>
          </div>

          <div style="border: 1px solid var(--border); padding: 16px; border-radius: 8px;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">Estructura 05 (.snl)</div>
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">Días no laborados y suspensiones bajo Tabla 21 de SUNAT.</p>
            <a href="/api/download/plame/snl" class="btn btn-sm">Descargar .snl</a>
          </div>

          <div style="border: 1px solid var(--border); padding: 16px; border-radius: 8px;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">Estructura 11 (.rem)</div>
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">Conceptos remunerativos, descuentos y aportes bajo Tabla 22.</p>
            <a href="/api/download/plame/rem" class="btn btn-sm">Descargar .rem</a>
          </div>
        </div>
      </div>
    </div>

  </div>

  <script>
    let currentPin = '';

    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      event.target.classList.add('active');
    }

    async function loadPayroll() {
      const res = await fetch('/api/payroll-data');
      const data = await res.json();

      document.getElementById('stat-gross').innerText = 'S/ ' + data.summary.totalGrossAmount.toFixed(2);
      document.getElementById('stat-deductions').innerText = 'S/ ' + data.summary.totalDeductionsAmount.toFixed(2);
      document.getElementById('stat-net').innerText = 'S/ ' + (data.summary.totalGrossAmount - data.summary.totalDeductionsAmount).toFixed(2);
      document.getElementById('stat-essalud').innerText = 'S/ ' + data.summary.totalEssaludAmount.toFixed(2);

      const tbody = document.getElementById('payroll-tbody');
      tbody.innerHTML = '';

      data.employees.forEach(emp => {
        const tr = document.createElement('tr');
        tr.innerHTML = \`
          <td><strong>\${emp.fullName}</strong><br><small style="color: #64748b;">DNI: \${emp.docNumber}</small></td>
          <td>\${emp.cargo}</td>
          <td><span class="\${emp.pensionSystem === 'ONP' ? 'badge-onp' : 'badge-afp'}">\${emp.pensionSystem}</span></td>
          <td class="amt">S/ \${emp.earnings.baseSalaryEarned.toFixed(2)}</td>
          <td class="amt">S/ \${(emp.earnings.overtime25Amount + emp.earnings.overtime35Amount).toFixed(2)}</td>
          <td class="amt"><strong>S/ \${emp.earnings.totalGrossRemuneration.toFixed(2)}</strong></td>
          <td class="amt" style="color: var(--danger);">S/ \${emp.deductions.totalDeductions.toFixed(2)}</td>
          <td class="amt" style="color: var(--success);"><strong>S/ \${emp.netPay.toFixed(2)}</strong></td>
          <td>
            <a href="/api/boleta/\${emp.docNumber}" target="_blank" class="btn btn-secondary btn-sm">📄 Ver Boleta</a>
          </td>
        \`;
        tbody.appendChild(tr);
      });
    }

    async function loadKioskEvents() {
      const res = await fetch('/api/kiosk/events');
      const data = await res.json();
      const tbody = document.getElementById('kiosk-events-tbody');
      tbody.innerHTML = '';

      data.events.forEach(ev => {
        const tr = document.createElement('tr');
        tr.innerHTML = \`
          <td><strong>#\${ev.sequenceNumber}</strong></td>
          <td>\${ev.employeeDoc}</td>
          <td><span class="badge-pe">\${ev.eventType}</span></td>
          <td><small>\${new Date(ev.deviceTimestamp).toLocaleTimeString()}</small></td>
          <td><span class="sha-tag">\${ev.eventHash.substring(0, 16)}...</span></td>
        \`;
        tbody.appendChild(tr);
      });
    }

    function pressKey(k) {
      if (currentPin.length < 4) {
        currentPin += k;
        updatePinDisplay();
      }
    }

    function clearPin() {
      currentPin = '';
      updatePinDisplay();
    }

    function updatePinDisplay() {
      const d = document.getElementById('pin-display');
      d.innerText = currentPin.length > 0 ? '*'.repeat(currentPin.length) : '----';
    }

    async function submitPunch() {
      if (currentPin.length !== 4) {
        showKioskStatus('Ingrese un PIN de 4 dígitos.', false);
        return;
      }

      const docNumber = document.getElementById('worker-select').value;
      const eventType = document.getElementById('event-type').value;

      try {
        const res = await fetch('/api/kiosk/punch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ docNumber, pin: currentPin, eventType }),
        });
        const result = await res.json();

        if (result.success) {
          showKioskStatus('✓ Marcación registrada con éxito (Seq #' + result.event.sequenceNumber + ')', true);
          clearPin();
          loadKioskEvents();
        } else {
          showKioskStatus(result.error, false);
          clearPin();
        }
      } catch (err) {
        showKioskStatus('Error de conexión con el terminal.', false);
      }
    }

    function showKioskStatus(msg, isOk) {
      const s = document.getElementById('kiosk-status');
      s.innerText = msg;
      s.className = 'kiosk-status ' + (isOk ? 'ok' : 'err');
    }

    // Inicializar
    loadPayroll();
    loadKioskEvents();
  </script>
</body>
</html>`;

server.listen(PORT, () => {
  console.log(`🚀 Servidor VAMOS Web Dashboard activo en: http://localhost:${PORT}`);
});
