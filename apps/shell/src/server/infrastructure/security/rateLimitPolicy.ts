export interface RateLimitPolicy {
  maxFailures: number;
  windowSeconds: number;
  lockSeconds: number;
  progressive?: boolean;
  maxLockSeconds?: number;
}

export interface RateLimitPolicies {
  loginEmail: RateLimitPolicy;
  loginIp: RateLimitPolicy;
  registerIp: RateLimitPolicy;
}

type Environment = Record<string, string | undefined>;

function positiveInteger(env: Environment, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} deve ser um inteiro positivo`);
  }
  return value;
}

export function getRateLimitPolicies(env: Environment = process.env): RateLimitPolicies {
  const loginEmailLockSeconds = positiveInteger(env, 'AUTH_LOCK_SECONDS', 15 * 60);
  const loginEmailMaxLockSeconds = positiveInteger(env, 'AUTH_MAX_LOCK_SECONDS', 24 * 60 * 60);
  if (loginEmailMaxLockSeconds < loginEmailLockSeconds) {
    throw new Error('AUTH_MAX_LOCK_SECONDS não pode ser menor que AUTH_LOCK_SECONDS');
  }

  return {
    loginEmail: {
      maxFailures: positiveInteger(env, 'AUTH_MAX_FAILURES', 5),
      windowSeconds: positiveInteger(env, 'AUTH_WINDOW_SECONDS', 15 * 60),
      lockSeconds: loginEmailLockSeconds,
      progressive: true,
      maxLockSeconds: loginEmailMaxLockSeconds,
    },
    loginIp: {
      maxFailures: positiveInteger(env, 'AUTH_IP_MAX_FAILURES', 20),
      windowSeconds: positiveInteger(env, 'AUTH_IP_WINDOW_SECONDS', 15 * 60),
      lockSeconds: positiveInteger(env, 'AUTH_IP_LOCK_SECONDS', 15 * 60),
    },
    registerIp: {
      maxFailures: positiveInteger(env, 'AUTH_REGISTER_IP_MAX_FAILURES', 10),
      windowSeconds: positiveInteger(env, 'AUTH_REGISTER_IP_WINDOW_SECONDS', 60 * 60),
      lockSeconds: positiveInteger(env, 'AUTH_REGISTER_IP_LOCK_SECONDS', 60 * 60),
    },
  };
}
