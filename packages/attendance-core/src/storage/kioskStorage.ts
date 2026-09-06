/**
 * Offline-First SQLite Storage for Kiosk Tablet
 * Base Legal: MTPE - Guía Oficial de Registro de Asistencia (2024), D.S. 016-2024-JUS
 * Uses Node.js 24 native built-in 'node:sqlite' (DatabaseSync)
 */

import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import {
  calculateEventHash,
  computeSha256,
  GENESIS_HASH,
  hashPin,
  verifyChainIntegrity,
} from '../security/hashChain.ts';
import { PinRateLimiter } from '../security/rateLimiter.ts';
import type {
  AttendanceEvent,
  AttendanceEventType,
  ChainVerificationResult,
  ContingencyExportDump,
  KioskEmployee,
  TrustState,
} from '../types.ts';

export class KioskStorage {
  private readonly db: DatabaseSync;
  private readonly rateLimiter: PinRateLimiter;
  private lastMonotonicMs: number = 0;

  constructor(dbPath: string = ':memory:', rateLimiter?: PinRateLimiter) {
    this.db = new DatabaseSync(dbPath);
    this.rateLimiter = rateLimiter ?? new PinRateLimiter({ maxFailedAttempts: 3, lockoutDurationSeconds: 60 });
    this.initializeTables();
  }

  private initializeTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        doc_number TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        pin_hash TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        sequence_number INTEGER UNIQUE NOT NULL,
        employee_id TEXT NOT NULL,
        employee_doc TEXT NOT NULL,
        event_type TEXT NOT NULL,
        verification_method TEXT NOT NULL,
        device_timestamp TEXT NOT NULL,
        monotonic_time_ms REAL NOT NULL,
        server_timestamp TEXT,
        device_id TEXT NOT NULL,
        trust_state TEXT NOT NULL,
        previous_event_hash TEXT NOT NULL,
        event_hash TEXT NOT NULL,
        is_synced INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_events_sequence ON events(sequence_number);
      CREATE INDEX IF NOT EXISTS idx_events_synced ON events(is_synced);
    `);
  }

  public registerEmployee(employee: KioskEmployee): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO employees (id, doc_number, full_name, pin_hash)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(employee.id, employee.docNumber, employee.fullName, employee.pinHash);
  }

  public registerEmployeeWithRawPin(
    id: string,
    docNumber: string,
    fullName: string,
    rawPin: string
  ): void {
    const pinHash = hashPin(rawPin);
    this.registerEmployee({ id, docNumber, fullName, pinHash });
  }

  public recordAttendanceWithPin(
    docNumber: string,
    pin: string,
    eventType: AttendanceEventType,
    deviceId: string,
    options: { simulatedTimestamp?: string; simulatedMonotonicMs?: number } = {}
  ): AttendanceEvent {
    const now = Date.now();

    // 1. Validar Rate Limiter (Protección contra fuerza bruta de 4 dígitos)
    const rateStatus = this.rateLimiter.getStatus(docNumber, now);
    if (rateStatus.isBlocked) {
      throw new Error(
        `Acceso temporalmente bloqueado por intentos fallidos. Intente nuevamente en ${rateStatus.remainingLockoutSeconds} segundos.`
      );
    }

    // 2. Buscar colaborador en SQLite
    const empStmt = this.db.prepare(
      'SELECT id, doc_number, full_name, pin_hash FROM employees WHERE doc_number = ?'
    );
    const empRow = empStmt.get(docNumber) as
      | { id: string; doc_number: string; full_name: string; pin_hash: string }
      | undefined;

    if (!empRow) {
      throw new Error(`Colaborador con documento '${docNumber}' no registrado en este Kiosco.`);
    }

    // 3. Validar PIN
    const enteredPinHash = hashPin(pin);
    if (enteredPinHash !== empRow.pin_hash) {
      const failureStatus = this.rateLimiter.recordFailure(docNumber, now);
      if (failureStatus.isBlocked) {
        throw new Error(
          `PIN incorrecto. Límite de 3 intentos alcanzado. Dispositivo bloqueado por ${failureStatus.remainingLockoutSeconds} segundos.`
        );
      }
      const attemptsLeft = 3 - failureStatus.failedAttempts;
      throw new Error(`PIN incorrecto. Le quedan ${attemptsLeft} intento(s).`);
    }

    // PIN correcto: reiniciar contador de fallos
    this.rateLimiter.reset(docNumber);

    // 4. Obtener último evento para encadenamiento criptográfico SHA-256
    const lastEventStmt = this.db.prepare(
      'SELECT sequence_number, event_hash, monotonic_time_ms FROM events ORDER BY sequence_number DESC LIMIT 1'
    );
    const lastEventRow = lastEventStmt.get() as
      | { sequence_number: number; event_hash: string; monotonic_time_ms: number }
      | undefined;

    const sequenceNumber = lastEventRow ? lastEventRow.sequence_number + 1 : 1;
    const previousEventHash = lastEventRow ? lastEventRow.event_hash : GENESIS_HASH;

    // 5. Auditoría de Monotonic Clock (Detección de alteración manual de reloj en Android/Windows)
    const monotonicTimeMs = options.simulatedMonotonicMs ?? performance.now();
    let trustState: TrustState = 'TRUSTED';

    if (lastEventRow && monotonicTimeMs < lastEventRow.monotonic_time_ms) {
      trustState = 'FLAGGED_CLOCK_DRIFT'; // El reloj del dispositivo retrocedió en el tiempo
    }
    this.lastMonotonicMs = monotonicTimeMs;

    const deviceTimestamp = options.simulatedTimestamp ?? new Date().toISOString();

    // 6. Calcular hash SHA-256 inmutable del evento
    const eventHash = calculateEventHash(
      {
        sequenceNumber,
        employeeId: empRow.id,
        employeeDoc: empRow.doc_number,
        eventType,
        verificationMethod: 'PIN',
        deviceTimestamp,
        monotonicTimeMs,
        deviceId,
      },
      previousEventHash
    );

    const eventId = randomUUID();

    // 7. Insertar en SQLite local
    const insertStmt = this.db.prepare(`
      INSERT INTO events (
        id, sequence_number, employee_id, employee_doc, event_type,
        verification_method, device_timestamp, monotonic_time_ms,
        device_id, trust_state, previous_event_hash, event_hash, is_synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);

    insertStmt.run(
      eventId,
      sequenceNumber,
      empRow.id,
      empRow.doc_number,
      eventType,
      'PIN',
      deviceTimestamp,
      monotonicTimeMs,
      deviceId,
      trustState,
      previousEventHash,
      eventHash
    );

    return {
      id: eventId,
      sequenceNumber,
      employeeId: empRow.id,
      employeeDoc: empRow.doc_number,
      eventType,
      verificationMethod: 'PIN',
      deviceTimestamp,
      monotonicTimeMs,
      deviceId,
      trustState,
      previousEventHash,
      eventHash,
      isSynced: false,
    };
  }

  public getAllEvents(): AttendanceEvent[] {
    const stmt = this.db.prepare('SELECT * FROM events ORDER BY sequence_number ASC');
    const rows = stmt.all() as any[];

    return rows.map((r) => ({
      id: r.id,
      sequenceNumber: r.sequence_number,
      employeeId: r.employee_id,
      employeeDoc: r.employee_doc,
      eventType: r.event_type as AttendanceEventType,
      verificationMethod: r.verification_method,
      deviceTimestamp: r.device_timestamp,
      monotonicTimeMs: r.monotonic_time_ms,
      serverTimestamp: r.server_timestamp ?? undefined,
      deviceId: r.device_id,
      trustState: r.trust_state as TrustState,
      previousEventHash: r.previous_event_hash,
      eventHash: r.event_hash,
      isSynced: r.is_synced === 1,
    }));
  }

  public getUnsyncedEvents(): AttendanceEvent[] {
    return this.getAllEvents().filter((e) => !e.isSynced);
  }

  public markEventsAsSynced(eventIds: string[], serverTimestamp: string): void {
    if (eventIds.length === 0) return;
    const stmt = this.db.prepare(`
      UPDATE events
      SET is_synced = 1, server_timestamp = ?
      WHERE id = ?
    `);
    for (const id of eventIds) {
      stmt.run(serverTimestamp, id);
    }
  }

  public verifyDatabaseIntegrity(): ChainVerificationResult {
    const allEvents = this.getAllEvents();
    return verifyChainIntegrity(allEvents);
  }

  public exportContingencyDump(deviceId: string): ContingencyExportDump {
    const events = this.getAllEvents();
    const verification = verifyChainIntegrity(events);
    const exportDate = new Date().toISOString();

    const signaturePayload = `${deviceId}|${exportDate}|${events.length}|${verification.isValid}`;
    const verificationSignature = computeSha256(signaturePayload);

    return {
      exportDate,
      deviceId,
      chainIntegrity: verification.isValid,
      totalEvents: events.length,
      events,
      verificationSignature,
    };
  }

  /**
   * Método de prueba exclusivamente para testear la detección de manipulación
   */
  public tamperRecordForTesting(sequenceNumber: number, forgedDocNumber: string): void {
    const stmt = this.db.prepare('UPDATE events SET employee_doc = ? WHERE sequence_number = ?');
    stmt.run(forgedDocNumber, sequenceNumber);
  }

  public close(): void {
    this.db.close();
  }
}
