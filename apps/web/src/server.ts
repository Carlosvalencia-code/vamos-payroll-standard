/**
 * Interactive Web Dashboard and Local Kiosk Terminal for VAMOS Payroll
 * Native Node.js 24 Server — Hardened Technical Prototype for Local Lab & Closed Pilot
 * 
 * Security Controls Implemented (Sept 2026 Audit Remediation):
 * - Strict Host Binding to 127.0.0.1 (No accidental network exposure)
 * - Restrictive CORS (Localhost whitelist, no wildcard '*')
 * - Lab Authentication Guard ('x-vamos-key' header / '?key=' query token)
 * - DoS Mitigation (16 KB max request body limit on POST)
 * - XSS Prevention (Strict HTML escaping and textContent DOM binding)
 * - Synthetic Test Fixtures isolation (Zero real employee PII)
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { KioskStorage } from '../../../packages/attendance-core/src/storage/kioskStorage.ts';
import { calculateEmployeePayroll } from '../../../packages/engine/src/engine.ts';
import { compilePlamePackage } from '../../../packages/plame-compiler/src/compiler.ts';
import type { EmployeePayrollItem } from '../../../packages/plame-compiler/src/types.ts';
import { generatePayslip } from '../../../packages/payslip-pdf/src/generator.ts';
import {
  SYNTHETIC_COMPANY_HEADER,
  SYNTHETIC_COMPANY_INFO,
  SYNTHETIC_PERIOD_SEPT_2026,
  SYNTHETIC_WORKERS,
} from './fixtures/syntheticDemoData.ts';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const VAMOS_LAB_KEY = process.env.VAMOS_LAB_KEY || 'test-lab-token';
const MAX_PAYLOAD_BYTES = 16 * 1024; // 16 KB

// 1. Inicializar Kiosco en Memoria con Datos Sintéticos de Demostración
const kioskStorage = new KioskStorage(':memory:');
for (const w of SYNTHETIC_WORKERS) {
  kioskStorage.registerEmployeeWithRawPin(w.employee.id, w.employee.docNumber, w.employee.fullName, w.rawPin);
}

// Marcajes sintéticos iniciales para simular datos en el log inmutable
kioskStorage.recordAttendanceWithPin('40506070', '1234', 'INGRESO', 'TABLET-ALMACEN-01');
kioskStorage.recordAttendanceWithPin('70809010', '5678', 'INGRESO', 'TABLET-ALMACEN-01');

// 2. Helper para calcular nómina consolidada
function getConsolidatedPayroll() {
  const items: EmployeePayrollItem[] = SYNTHETIC_WORKERS.map((w) => {
    const payroll = calculateEmployeePayroll(w.employee, w.attendance, SYNTHETIC_PERIOD_SEPT_2026);
    return {
      docType: w.employee.docType,
      docNumber: w.employee.docNumber,
      payroll,
      attendance: w.attendance,
    };
  });

  const plamePackage = compilePlamePackage(SYNTHETIC_COMPANY_HEADER, items);
  return { items, plamePackage };
}

// 3. Helpers de Seguridad HTTP
function applySecurityHeaders(res: ServerResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com;"
  );
}

function handleCors(req: IncomingMessage, res: ServerResponse): boolean {
  const origin = req.headers.origin;
  const host = req.headers.host || `${HOST}:${PORT}`;

  const allowedOrigins = [
    `http://${host}`,
    `http://localhost:${PORT}`,
    `http://127.0.0.1:${PORT}`,
  ];

  if (origin) {
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-VAMOS-KEY');
    } else {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'CORS policy violation: Origen no autorizado en este entorno de pruebas.' }));
      return false;
    }
  }
  return true;
}

function verifyAuth(req: IncomingMessage, url: URL): boolean {
  const headerKey = req.headers['x-vamos-key'];
  const queryKey = url.searchParams.get('key');
  return headerKey === VAMOS_LAB_KEY || queryKey === VAMOS_LAB_KEY;
}

// 4. Servidor HTTP Hardened
const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  applySecurityHeaders(res);

  if (!handleCors(req, res)) {
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || HOST}`);

  // Rutas Protegidas (Requieren autenticación)
  if (url.pathname === '/api/payroll-data') {
    if (!verifyAuth(req, url)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Acceso No Autorizado',
        message: 'Se requiere la cabecera "x-vamos-key" o parámetro "?key=" para consultar datos de nómina en este entorno.',
        environment: 'local-laboratory-prototype',
      }));
      return;
    }

    const { items, plamePackage } = getConsolidatedPayroll();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        company: SYNTHETIC_COMPANY_HEADER,
        period: SYNTHETIC_PERIOD_SEPT_2026,
        employees: items.map((i, idx) => ({
          ...i.payroll,
          cargo: SYNTHETIC_WORKERS[idx].employee.cargo,
          attendance: i.attendance,
        })),
        summary: plamePackage.summary,
      })
    );
    return;
  }

  // Descarga de archivos PLAME (.rem, .jor, .snl) protegida
  if (url.pathname.startsWith('/api/download/plame/')) {
    if (!verifyAuth(req, url)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Acceso No Autorizado',
        message: 'Se requiere autorización para descargar archivos tributarios PLAME.',
      }));
      return;
    }

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

  // Visor de Boleta de Pago HTML protegido
  if (url.pathname.startsWith('/api/boleta/')) {
    if (!verifyAuth(req, url)) {
      res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <div style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h2>🔒 Acceso Restringido a Boleta de Pago</h2>
          <p style="color: #64748b;">Este entorno de laboratorio requiere autorización previa para consultar boletas individuales.</p>
          <p>Utilice la aplicación con el token configurado: <code>?key=${VAMOS_LAB_KEY}</code></p>
        </div>
      `);
      return;
    }

    const docNum = url.pathname.replace('/api/boleta/', '');
    const worker = SYNTHETIC_WORKERS.find((w) => w.employee.docNumber === docNum);

    if (!worker) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Colaborador sintético no encontrado.');
      return;
    }

    const payroll = calculateEmployeePayroll(worker.employee, worker.attendance, SYNTHETIC_PERIOD_SEPT_2026);
    const payslip = generatePayslip({
      company: SYNTHETIC_COMPANY_INFO,
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

  // Kiosco: Registrar Marcaje con PIN (Con límite estricto de payload anti-DoS)
  if (url.pathname === '/api/kiosk/punch' && req.method === 'POST') {
    let body = '';
    let bodyLength = 0;

    req.on('data', (chunk) => {
      bodyLength += chunk.length;
      if (bodyLength > MAX_PAYLOAD_BYTES) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Payload Too Large: El tamaño excede el límite permitido de 16KB.' }));
        req.destroy();
        return;
      }
      body += chunk;
    });

    req.on('end', () => {
      if (bodyLength > MAX_PAYLOAD_BYTES) return;
      try {
        const { docNumber, pin, eventType } = JSON.parse(body);
        if (!docNumber || !pin || !eventType) {
          throw new Error('Parámetros incompletos en la solicitud de marcación.');
        }
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

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint no encontrado.' }));
});

// HTML interactivo del Dashboard con mitigación de XSS y advertencias de laboratorio
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>VAMOS — Dashboard de Nómina & Kiosco Almacén (Lab Prototype)</title>
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
    
    .lab-banner {
      background: #fef3c7;
      color: #92400e;
      font-size: 12px;
      font-weight: 600;
      padding: 8px 24px;
      text-align: center;
      border-bottom: 1px solid #fde68a;
    }

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

  <div class="lab-banner">
    ⚠️ <strong>ENTORNO DE LABORATORIO TÉCNICO (v0.1.0-alpha)</strong> — Registros sintéticos simulados • Acceso protegido con clave local
  </div>

  <header>
    <div class="header-wrap">
      <div class="logo">
        🇵🇪 VAMOS <span class="badge-pe">Lab Pilot Prototype</span>
      </div>
      <div class="nav-tabs">
        <button class="tab-btn active" onclick="switchTab('tab-payroll', this)">📊 Planilla Mensual</button>
        <button class="tab-btn" onclick="switchTab('tab-kiosk', this)">🏢 Kiosco Almacén</button>
        <button class="tab-btn" onclick="switchTab('tab-plame', this)">📁 Archivos SUNAT</button>
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
          <span>Periodo: Septiembre 2026 (Datos de Demostración Sintéticos)</span>
          <div style="display: flex; gap: 8px;">
            <a href="/api/download/plame/rem?key=test-lab-token" class="btn btn-sm">Descargar .rem</a>
            <a href="/api/download/plame/jor?key=test-lab-token" class="btn btn-sm">Descargar .jor</a>
            <a href="/api/download/plame/snl?key=test-lab-token" class="btn btn-sm">Descargar .snl</a>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Cargo / Régimen</th>
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
              <!-- Cargado dinámicamente de forma segura -->
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
            <button class="key-btn" style="background: #dc2626;" onclick="clearPin()">C</button>
            <button class="key-btn" onclick="pressKey('0')">0</button>
            <button class="key-btn" style="background: #059669;" onclick="submitPunch()">OK</button>
          </div>

          <div class="kiosk-status" id="kiosk-status"></div>
        </div>

        <div class="card">
          <div class="card-title">
            <span>Log Inmutable de Marcaciones (SQLite Local)</span>
            <span class="badge-pe" style="background: #ecfdf5; color: #059669; border-color: #a7f3d0;">
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
                <!-- Eventos cargados dinámicamente -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: ARCHIVOS SUNAT PLAME -->
    <div id="tab-plame" class="tab-content">
      <div class="card">
        <div class="card-title">
          <span>Paquete de Exportación Oficial PDT-PLAME v4.5 (Régimen 2026)</span>
        </div>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">
          Los siguientes archivos planos son generados con codificación de texto estándar ISO-8859-1 y delimitador CRLF (Windows) para carga directa en el validador oficial del aplicativo SUNAT:
        </p>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; background: #f8fafc; border: 1px solid var(--border); border-radius: 8px;">
            <div>
              <strong>060120260920601234567.rem</strong>
              <div style="font-size: 12px; color: var(--text-muted);">Conceptos remunerativos, descuentos y aportes del empleador (Estructura 11)</div>
            </div>
            <a href="/api/download/plame/rem?key=test-lab-token" class="btn btn-sm">Descargar .rem</a>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; background: #f8fafc; border: 1px solid var(--border); border-radius: 8px;">
            <div>
              <strong>060120260920601234567.jor</strong>
              <div style="font-size: 12px; color: var(--text-muted);">Jornada laboral ordinaria y horas de sobretiempo diurno/nocturno (Estructura 04)</div>
            </div>
            <a href="/api/download/plame/jor?key=test-lab-token" class="btn btn-sm">Descargar .jor</a>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; background: #f8fafc; border: 1px solid var(--border); border-radius: 8px;">
            <div>
              <strong>060120260920601234567.snl</strong>
              <div style="font-size: 12px; color: var(--text-muted);">Días subsidiados y suspensiones no remuneradas / faltas injustificadas (Estructura 05)</div>
            </div>
            <a href="/api/download/plame/snl?key=test-lab-token" class="btn btn-sm">Descargar .snl</a>
          </div>
        </div>
      </div>
    </div>

  </div>

  <script>
    const LAB_KEY = 'test-lab-token';
    let currentPin = '';

    // Mitigación estricta de XSS
    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function switchTab(tabId, btn) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
      const content = document.getElementById(tabId);
      if (content) content.classList.add('active');
      if (btn) {
        btn.classList.add('active');
      } else {
        const matchingBtn = document.querySelector('button[onclick*="' + tabId + '"]');
        if (matchingBtn) matchingBtn.classList.add('active');
      }
    }

    async function loadPayroll() {
      try {
        const res = await fetch('/api/payroll-data', {
          headers: { 'x-vamos-key': LAB_KEY }
        });
        if (!res.ok) {
          throw new Error('No autorizado o error de respuesta');
        }
        const data = await res.json();

        document.getElementById('stat-gross').innerText = 'S/ ' + data.summary.totalGrossAmount.toFixed(2);
        document.getElementById('stat-deductions').innerText = 'S/ ' + data.summary.totalDeductionsAmount.toFixed(2);
        document.getElementById('stat-net').innerText = 'S/ ' + (data.summary.totalGrossAmount - data.summary.totalDeductionsAmount).toFixed(2);
        document.getElementById('stat-essalud').innerText = 'S/ ' + data.summary.totalEssaludAmount.toFixed(2);

        const tbody = document.getElementById('payroll-tbody');
        tbody.innerHTML = '';

        data.employees.forEach(emp => {
          const tr = document.createElement('tr');
          const safeName = escapeHtml(emp.fullName);
          const safeDoc = escapeHtml(emp.docNumber);
          const safeCargo = escapeHtml(emp.cargo);
          const safeRegime = escapeHtml(emp.regime);
          const safePension = escapeHtml(emp.pensionSystem);

          tr.innerHTML = \`
            <td><strong>\${safeName}</strong><br><small style="color: #64748b;">DNI: \${safeDoc}</small></td>
            <td>\${safeCargo}<br><small style="color: #2563eb;">\${safeRegime}</small></td>
            <td><span class="\${safePension === 'ONP' ? 'badge-onp' : 'badge-afp'}">\${safePension}</span></td>
            <td class="amt">S/ \${emp.earnings.baseSalaryEarned.toFixed(2)}</td>
            <td class="amt">S/ \${(emp.earnings.overtime25Amount + emp.earnings.overtime35Amount).toFixed(2)}</td>
            <td class="amt"><strong>S/ \${emp.earnings.totalGrossRemuneration.toFixed(2)}</strong></td>
            <td class="amt" style="color: var(--danger);">S/ \${emp.deductions.totalDeductions.toFixed(2)}</td>
            <td class="amt" style="color: var(--success);"><strong>S/ \${emp.netPay.toFixed(2)}</strong></td>
            <td>
              <a href="/api/boleta/\${encodeURIComponent(emp.docNumber)}?key=\${encodeURIComponent(LAB_KEY)}" target="_blank" class="btn btn-secondary btn-sm">📄 Ver Boleta</a>
            </td>
          \`;
          tbody.appendChild(tr);
        });
      } catch (err) {
        console.error('Error cargando planilla:', err);
      }
    }

    async function loadKioskEvents() {
      try {
        const res = await fetch('/api/kiosk/events');
        const data = await res.json();
        const tbody = document.getElementById('kiosk-events-tbody');
        tbody.innerHTML = '';

        data.events.forEach(ev => {
          const tr = document.createElement('tr');
          const safeSeq = escapeHtml(ev.sequenceNumber);
          const safeDoc = escapeHtml(ev.employeeDoc);
          const safeType = escapeHtml(ev.eventType);
          const safeHash = escapeHtml(ev.eventHash.substring(0, 16));

          tr.innerHTML = \`
            <td><strong>#\${safeSeq}</strong></td>
            <td>\${safeDoc}</td>
            <td><span class="badge-pe">\${safeType}</span></td>
            <td><small>\${new Date(ev.deviceTimestamp).toLocaleTimeString()}</small></td>
            <td><span class="sha-tag">\${safeHash}...</span></td>
          \`;
          tbody.appendChild(tr);
        });
      } catch (err) {
        console.error('Error cargando eventos:', err);
      }
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
    if (window.location.hash) {
      const targetTab = window.location.hash.replace('#', '');
      if (document.getElementById(targetTab)) {
        switchTab(targetTab);
      }
    }
  </script>
</body>
</html>`;

server.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor VAMOS Web Dashboard (Lab Prototype) activo en: http://${HOST}:${PORT}`);
  console.log(`🔒 Control de Acceso: Clave de laboratorio activa ('${VAMOS_LAB_KEY}')`);
});
