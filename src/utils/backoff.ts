// Exponential backoff: 1s, 2s, 4s, 8s, 16s, capped at 30s.
// Never a hard lockout — the account is always reachable, just
// increasingly delayed. Avoids CWE-645 (attacker can't deny a
// legitimate user access by deliberately failing their password).
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

export const computeBackoffMs = (failedAttempts: number): number => {
  if (failedAttempts <= 0) return 0;
  const delay = BASE_DELAY_MS * 2 ** (failedAttempts - 1);
  return Math.min(delay, MAX_DELAY_MS);
};

// Given the last failure time and current attempt count, how many more
// milliseconds must the caller wait right now? 0 or negative means "go ahead."
export const remainingBackoffMs = (
  failedAttempts: number,
  lastFailedLoginAt: Date | null,
): number => {
  if (!lastFailedLoginAt || failedAttempts <= 0) return 0;
  const requiredDelay = computeBackoffMs(failedAttempts);
  const elapsed = Date.now() - lastFailedLoginAt.getTime();
  return requiredDelay - elapsed;
};