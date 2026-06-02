type GoogleAuthEnv = Record<string, string | undefined>;

export function isGoogleAuthConfigured(env: GoogleAuthEnv = process.env) {
  return Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
}

export const isGoogleAuthEnabled = isGoogleAuthConfigured();
