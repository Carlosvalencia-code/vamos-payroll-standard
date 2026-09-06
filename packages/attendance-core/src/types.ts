/**
 * Types and Interfaces for Offline-First Kiosk & Attendance Core
 * Base Legal: MTPE - Guía Oficial de Registro de Asistencia (2024), D.S. 016-2024-JUS
 */

export type AttendanceEventType =
  | 'INGRESO'
  | 'SALIDA_REFRIGERIO'
  | 'RETORNO_REFRIGERIO'
  | 'SALIDA';

export type VerificationMethod = 'PIN' | 'GPS_EVENT';

export type TrustState =
  | 'TRUSTED'
  | 'FLAGGED_CLOCK_DRIFT'
  | 'FLAGGED_MOCK_LOCATION'
  | 'OFFLINE_SYNCED';

export interface AttendanceEvent {
  id: string; // UUIDv4
  sequenceNumber: number; // 1, 2, 3... (estricto orden monotónico local)
  employeeId: string;
  employeeDoc: string;
  eventType: AttendanceEventType;
  verificationMethod: VerificationMethod;
  deviceTimestamp: string; // ISO 8601 UTC
  monotonicTimeMs: number; // performance.now() para auditar saltos de reloj en SO
  serverTimestamp?: string; // Asignado tras sincronización con la nube
  deviceId: string;
  trustState: TrustState;
  previousEventHash: string; // Hash SHA-256 del evento anterior (Cadena Inmutable)
  eventHash: string; // Hash SHA-256 de este evento
  isSynced: boolean;
}

export interface KioskEmployee {
  id: string;
  docNumber: string;
  fullName: string;
  pinHash: string; // SHA-256 del PIN + salt
}

export interface RateLimitStatus {
  isBlocked: boolean;
  failedAttempts: number;
  remainingLockoutSeconds: number;
}

export interface ChainVerificationResult {
  isValid: boolean;
  totalVerifiedEvents: number;
  corruptedEventSequence?: number;
  errorReason?: string;
}

export interface ContingencyExportDump {
  exportDate: string;
  deviceId: string;
  chainIntegrity: boolean;
  totalEvents: number;
  events: AttendanceEvent[];
  verificationSignature: string;
}
