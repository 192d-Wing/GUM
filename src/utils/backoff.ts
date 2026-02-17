// Copyright 2026 U.S. Federal Government (in countries where recognized)
// SPDX-License-Identifier: Apache-2.0

/** Exponential backoff with full jitter, capped at MAX_DELAY. */
export const BASE_DELAY = 1_000;
export const MAX_DELAY = 60_000;
const JITTER = 0.5;

/**
 * Returns a reconnect delay in ms using exponential backoff with jitter.
 *
 * attempt 0 → ~1s, 1 → ~2s, 2 → ~4s, … 6+ → capped ~60s
 */
export function getReconnectDelay(attempt: number): number {
  const exp = Math.min(BASE_DELAY * 2 ** attempt, MAX_DELAY);
  const jitter = 1 - JITTER + Math.random() * JITTER * 2;
  return Math.min(Math.round(exp * jitter), MAX_DELAY);
}
