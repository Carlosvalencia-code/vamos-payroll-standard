/**
 * Cryptographic Hash Chaining and Tamper-Evidence for Attendance Events
 * Prevents tampering, deletion, or back-dating of attendance records in offline SQLite
 */

import { createHash } from 'node:crypto';
import type { AttendanceEvent, ChainVerificationResult } from '../types.ts';

export const GENESIS_HASH = '0'.repeat(64); // 64 ceros para el bloque génesis

export function computeSha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

export function hashPin(pin: string, salt: string = 'vamos_kiosk_salt_2026'): string {
  return computeSha256(`${pin}:${salt}`);
}

export function buildEventPayloadString(event: {
  sequenceNumber: number;
  employeeId: string;
  employeeDoc: string;
  eventType: string;
  verificationMethod: string;
  deviceTimestamp: string;
  monotonicTimeMs: number;
  deviceId: string;
  previousEventHash: string;
}): string {
  return [
    event.sequenceNumber,
    event.employeeId,
    event.employeeDoc,
    event.eventType,
    event.verificationMethod,
    event.deviceTimestamp,
    event.monotonicTimeMs.toFixed(3),
    event.deviceId,
    event.previousEventHash,
  ].join('|');
}

export function calculateEventHash(
  event: {
    sequenceNumber: number;
    employeeId: string;
    employeeDoc: string;
    eventType: string;
    verificationMethod: string;
    deviceTimestamp: string;
    monotonicTimeMs: number;
    deviceId: string;
  },
  previousEventHash: string
): string {
  const payload = buildEventPayloadString({ ...event, previousEventHash });
  return computeSha256(payload);
}

export function verifyChainIntegrity(events: AttendanceEvent[]): ChainVerificationResult {
  if (events.length === 0) {
    return { isValid: true, totalVerifiedEvents: 0 };
  }

  // Ordenar por número de secuencia para validar la cadena
  const sorted = [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const expectedSequence = i + 1;

    // 1. Verificar número de secuencia consecutivo
    if (current.sequenceNumber !== expectedSequence) {
      return {
        isValid: false,
        totalVerifiedEvents: i,
        corruptedEventSequence: current.sequenceNumber,
        errorReason: `Salto o alteración en número de secuencia: se esperaba ${expectedSequence} pero se encontró ${current.sequenceNumber}.`,
      };
    }

    // 2. Verificar enlace con el bloque previo
    const expectedPreviousHash = i === 0 ? GENESIS_HASH : sorted[i - 1].eventHash;
    if (current.previousEventHash !== expectedPreviousHash) {
      return {
        isValid: false,
        totalVerifiedEvents: i,
        corruptedEventSequence: current.sequenceNumber,
        errorReason: `Ruptura de cadena criptográfica: previousEventHash en evento ${current.sequenceNumber} no coincide con el hash del evento anterior.`,
      };
    }

    // 3. Recalcular el hash del evento actual y verificar inmutabilidad
    const recomputedHash = calculateEventHash(
      {
        sequenceNumber: current.sequenceNumber,
        employeeId: current.employeeId,
        employeeDoc: current.employeeDoc,
        eventType: current.eventType,
        verificationMethod: current.verificationMethod,
        deviceTimestamp: current.deviceTimestamp,
        monotonicTimeMs: current.monotonicTimeMs,
        deviceId: current.deviceId,
      },
      current.previousEventHash
    );

    if (recomputedHash !== current.eventHash) {
      return {
        isValid: false,
        totalVerifiedEvents: i,
        corruptedEventSequence: current.sequenceNumber,
        errorReason: `Contenido manipulado en evento ${current.sequenceNumber}: el hash recalculado no coincide con el hash almacenado.`,
      };
    }
  }

  return {
    isValid: true,
    totalVerifiedEvents: sorted.length,
  };
}
