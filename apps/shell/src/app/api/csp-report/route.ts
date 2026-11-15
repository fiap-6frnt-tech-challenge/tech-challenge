import type { AuditEvent } from '@bytebank/core/application';
import { container } from '@/server/container';
import { withRequestContext } from '@/server/http/requestContext';

const MAX_REPORT_BYTES = 16 * 1024;
const MAX_LOGGED_VIOLATIONS = 10;
const DIRECTIVE = /^[a-z-]{1,64}$/;
const REPORT_MEDIA_TYPES = new Set([
  'application/csp-report',
  'application/reports+json',
  'application/json',
]);

class ReportTooLargeError extends Error {}

type ReportFields = Record<string, unknown>;

const isObject = (value: unknown): value is ReportFields =>
  typeof value === 'object' && value !== null;

function violationsIn(report: unknown): ReportFields[] {
  if (Array.isArray(report)) {
    return report.flatMap((entry) =>
      isObject(entry) && entry.type === 'csp-violation' && isObject(entry.body) ? [entry.body] : []
    );
  }
  return isObject(report) && isObject(report['csp-report']) ? [report['csp-report']] : [];
}

function toAuditEvent(violation: ReportFields): AuditEvent {
  const raw =
    violation.effectiveDirective ??
    violation['effective-directive'] ??
    violation['violated-directive'];
  const directive = typeof raw === 'string' ? raw.trim().split(/\s+/, 1)[0].toLowerCase() : '';
  return {
    event: 'csp.violation',
    outcome: violation.disposition === 'enforce' ? 'denied' : 'failure',
    reason: DIRECTIVE.test(directive) ? directive : 'unknown',
  };
}

async function readReportBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError('Corpo ausente');

  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > MAX_REPORT_BYTES) {
      await reader.cancel();
      throw new ReportTooLargeError();
    }
    chunks.push(value);
  }

  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return JSON.parse(new TextDecoder().decode(body));
}

async function receiveReport(request: Request): Promise<Response> {
  const mediaType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (!mediaType || !REPORT_MEDIA_TYPES.has(mediaType)) {
    return Response.json({ error: 'Content-Type não suportado' }, { status: 415 });
  }

  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_REPORT_BYTES) {
    return Response.json({ error: 'Relatório muito grande' }, { status: 413 });
  }

  let report: unknown;
  try {
    report = await readReportBody(request);
    if (!report || typeof report !== 'object') {
      return Response.json({ error: 'Relatório inválido' }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof ReportTooLargeError) {
      return Response.json({ error: 'Relatório muito grande' }, { status: 413 });
    }
    return Response.json({ error: 'Relatório inválido' }, { status: 400 });
  }

  for (const violation of violationsIn(report).slice(0, MAX_LOGGED_VIOLATIONS)) {
    container.auditLogger.record(toAuditEvent(violation));
  }
  return new Response(null, { status: 204 });
}

export function POST(request: Request): Promise<Response> {
  return withRequestContext(request.headers, () => receiveReport(request));
}
