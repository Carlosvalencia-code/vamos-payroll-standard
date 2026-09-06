/**
 * PIN Brute-Force Protection and Progressive Rate Limiter for Kiosk Tablet
 * Prevents automated or rapid manual guessing of 4-digit PINs
 */

import type { RateLimitStatus } from '../types.ts';

export interface RateLimiterOptions {
  maxFailedAttempts?: number; // Default: 3
  lockoutDurationSeconds?: number; // Default: 60 segundos
}

interface AttemptRecord {
  failedAttempts: number;
  lockedUntilTimestamp: number;
}

export class PinRateLimiter {
  private readonly maxFailedAttempts: number;
  private readonly lockoutDurationSeconds: number;
  private readonly attemptsMap = new Map<string, AttemptRecord>();

  constructor(options: RateLimiterOptions = {}) {
    this.maxFailedAttempts = options.maxFailedAttempts ?? 3;
    this.lockoutDurationSeconds = options.lockoutDurationSeconds ?? 60;
  }

  public getStatus(identifier: string, nowMs: number = Date.now()): RateLimitStatus {
    const record = this.attemptsMap.get(identifier);
    if (!record) {
      return { isBlocked: false, failedAttempts: 0, remainingLockoutSeconds: 0 };
    }

    if (record.lockedUntilTimestamp > nowMs) {
      const remainingSeconds = Math.ceil((record.lockedUntilTimestamp - nowMs) / 1000);
      return {
        isBlocked: true,
        failedAttempts: record.failedAttempts,
        remainingLockoutSeconds: remainingSeconds,
      };
    }

    // El tiempo de bloqueo ya expiró
    return {
      isBlocked: false,
      failedAttempts: record.failedAttempts,
      remainingLockoutSeconds: 0,
    };
  }

  public recordFailure(identifier: string, nowMs: number = Date.now()): RateLimitStatus {
    const current = this.attemptsMap.get(identifier) ?? { failedAttempts: 0, lockedUntilTimestamp: 0 };
    const newFailedCount = current.failedAttempts + 1;

    let lockedUntil = current.lockedUntilTimestamp;
    if (newFailedCount >= this.maxFailedAttempts) {
      // Activar bloqueo por lockoutDurationSeconds
      lockedUntil = nowMs + this.lockoutDurationSeconds * 1000;
    }

    const updated: AttemptRecord = {
      failedAttempts: newFailedCount,
      lockedUntilTimestamp: lockedUntil,
    };
    this.attemptsMap.set(identifier, updated);

    return this.getStatus(identifier, nowMs);
  }

  public reset(identifier: string): void {
    this.attemptsMap.delete(identifier);
  }

  public clearAll(): void {
    this.attemptsMap.clear();
  }
}
