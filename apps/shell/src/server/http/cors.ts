function toOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

const allowedOrigins = [
  toOrigin(process.env.NEXT_PUBLIC_TRANSACTIONS_MFE_URL ?? 'http://localhost:3003'),
  toOrigin(process.env.NEXT_PUBLIC_DASHBOARD_MFE_URL ?? 'http://localhost:3002'),
];

export function corsHeaders(origin: string | null) {
  const allowed = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}
