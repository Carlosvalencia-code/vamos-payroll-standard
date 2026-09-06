import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { GENESIS_HASH, verifyChainIntegrity } from '../src/security/hashChain.ts';
import { PinRateLimiter } from '../src/security/rateLimiter.ts';
import { KioskStorage } from '../src/storage/kioskStorage.ts';

describe('Offline-First Attendance Core (@payroll/attendance-core) - Suite de Integridad y Detección de Alteraciones', () => {
  let storage: KioskStorage;
  const testDeviceId = 'TABLET-ALMACEN-01';

  beforeEach(() => {
    storage = new KioskStorage(':memory:');
    storage.registerEmployeeWithRawPin('EMP-101', '40506070', 'Manuel Chofer', '1234');
    storage.registerEmployeeWithRawPin('EMP-102', '70809010', 'Rosa Almacen', '5678');
  });

  it('Test 1: Registro secuencial de marcaje y encadenamiento criptográfico SHA-256 inmutable', () => {
    // 1. Ingreso
    const ev1 = storage.recordAttendanceWithPin('40506070', '1234', 'INGRESO', testDeviceId, {
      simulatedMonotonicMs: 1000,
    });
    assert.equal(ev1.sequenceNumber, 1);
    assert.equal(ev1.previousEventHash, GENESIS_HASH, 'El primer evento debe enlazarse al bloque génesis');
    assert.ok(ev1.eventHash.length === 64, 'Debe generar hash SHA-256 de 64 caracteres hex');

    // 2. Salida Refrigerio
    const ev2 = storage.recordAttendanceWithPin('40506070', '1234', 'SALIDA_REFRIGERIO', testDeviceId, {
      simulatedMonotonicMs: 2000,
    });
    assert.equal(ev2.sequenceNumber, 2);
    assert.equal(ev2.previousEventHash, ev1.eventHash, 'El evento 2 debe encadenar el hash del evento 1');

    // 3. Retorno Refrigerio
    const ev3 = storage.recordAttendanceWithPin('70809010', '5678', 'RETORNO_REFRIGERIO', testDeviceId, {
      simulatedMonotonicMs: 3000,
    });
    assert.equal(ev3.sequenceNumber, 3);
    assert.equal(ev3.previousEventHash, ev2.eventHash);

    // 4. Verificar integridad de toda la base de datos local
    const integrity = storage.verifyDatabaseIntegrity();
    assert.equal(integrity.isValid, true);
    assert.equal(integrity.totalVerifiedEvents, 3);
  });

  it('Test 2: Rate Limiting en PIN - Bloqueo de 60 segundos tras 3 intentos fallidos consecutivos', () => {
    const rateLimiter = new PinRateLimiter({ maxFailedAttempts: 3, lockoutDurationSeconds: 60 });
    const localKiosk = new KioskStorage(':memory:', rateLimiter);
    localKiosk.registerEmployeeWithRawPin('EMP-101', '40506070', 'Manuel Chofer', '1234');

    // Intento 1: Fallido (PIN incorrecto)
    assert.throws(
      () => localKiosk.recordAttendanceWithPin('40506070', '9999', 'INGRESO', testDeviceId),
      /PIN incorrecto\. Le quedan 2 intento\(s\)/
    );

    // Intento 2: Fallido
    assert.throws(
      () => localKiosk.recordAttendanceWithPin('40506070', '8888', 'INGRESO', testDeviceId),
      /PIN incorrecto\. Le quedan 1 intento\(s\)/
    );

    // Intento 3: Fallido -> Activa Bloqueo
    assert.throws(
      () => localKiosk.recordAttendanceWithPin('40506070', '7777', 'INGRESO', testDeviceId),
      /Límite de 3 intentos alcanzado\. Dispositivo bloqueado por 60 segundos/
    );

    // Intento 4: Aunque ingrese el PIN CORRECTO, debe ser rechazado por bloqueo activo
    assert.throws(
      () => localKiosk.recordAttendanceWithPin('40506070', '1234', 'INGRESO', testDeviceId),
      /Acceso temporalmente bloqueado por intentos fallidos/
    );
  });

  it('Test 3: Detección Tamper-Evident - Cualquier alteración directa en SQLite rompe la cadena', () => {
    storage.recordAttendanceWithPin('40506070', '1234', 'INGRESO', testDeviceId, { simulatedMonotonicMs: 1000 });
    storage.recordAttendanceWithPin('40506070', '1234', 'SALIDA', testDeviceId, { simulatedMonotonicMs: 2000 });
    storage.recordAttendanceWithPin('70809010', '5678', 'INGRESO', testDeviceId, { simulatedMonotonicMs: 3000 });

    // Verificar que inicialmente es válido
    assert.equal(storage.verifyDatabaseIntegrity().isValid, true);

    // Simular un intento malicioso de editar el registro #2 directamente en SQLite
    storage.tamperRecordForTesting(2, '99999999');

    // La verificación debe fallar inmediatamente y señalar el registro corrupto
    const compromisedIntegrity = storage.verifyDatabaseIntegrity();
    assert.equal(compromisedIntegrity.isValid, false);
    assert.equal(compromisedIntegrity.corruptedEventSequence, 2);
    assert.ok(compromisedIntegrity.errorReason?.includes('Contenido manipulado en evento 2'));
  });

  it('Test 4: Detección de Clock Drift - Alerta si el reloj del sistema operativo retrocede', () => {
    // Evento 1 a tiempo monotónico 5000ms
    const ev1 = storage.recordAttendanceWithPin('40506070', '1234', 'INGRESO', testDeviceId, {
      simulatedMonotonicMs: 5000,
    });
    assert.equal(ev1.trustState, 'TRUSTED');

    // Evento 2 simulando que el reloj del SO fue retrasado manualmente (tiempo monotónico retrocede a 3000ms)
    const ev2 = storage.recordAttendanceWithPin('70809010', '5678', 'INGRESO', testDeviceId, {
      simulatedMonotonicMs: 3000,
    });
    assert.equal(ev2.trustState, 'FLAGGED_CLOCK_DRIFT', 'Debe marcar como sospechoso de alteración horaria');
  });

  it('Test 5: Cola de Sincronización Offline y Conciliación con la Nube', () => {
    storage.recordAttendanceWithPin('40506070', '1234', 'INGRESO', testDeviceId);
    storage.recordAttendanceWithPin('70809010', '5678', 'INGRESO', testDeviceId);

    // Inicialmente no sincronizados
    const unsynced = storage.getUnsyncedEvents();
    assert.equal(unsynced.length, 2);

    // Simular sincronización con servidor en la nube
    const serverTimestamp = '2026-09-05T23:00:00.000Z';
    const eventIds = unsynced.map((e) => e.id);
    storage.markEventsAsSynced(eventIds, serverTimestamp);

    // Ahora la cola debe estar vacía
    const remainingUnsynced = storage.getUnsyncedEvents();
    assert.equal(remainingUnsynced.length, 0);

    const allEvents = storage.getAllEvents();
    assert.equal(allEvents[0].isSynced, true);
    assert.equal(allEvents[0].serverTimestamp, serverTimestamp);
  });

  it('Test 6: Exportación de Contingencia para Inspección SUNAFIL (Protocolo sin Internet)', () => {
    storage.recordAttendanceWithPin('40506070', '1234', 'INGRESO', testDeviceId);
    storage.recordAttendanceWithPin('40506070', '1234', 'SALIDA', testDeviceId);

    const dump = storage.exportContingencyDump(testDeviceId);

    assert.equal(dump.deviceId, testDeviceId);
    assert.equal(dump.totalEvents, 2);
    assert.equal(dump.chainIntegrity, true);
    assert.ok(dump.verificationSignature.length === 64, 'Debe incluir firma digital de verificación');
  });
});
