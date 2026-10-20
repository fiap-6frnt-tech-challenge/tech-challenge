const MAX_REPORT_BYTES = 16 * 1024;
const REPORT_MEDIA_TYPES = new Set([
  'application/csp-report',
  'application/reports+json',
  'application/json',
]);

class ReportTooLargeError extends Error {}

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

export async function POST(request: Request): Promise<Response> {
  const mediaType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (!mediaType || !REPORT_MEDIA_TYPES.has(mediaType)) {
    return Response.json({ error: 'Content-Type não suportado' }, { status: 415 });
  }

  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_REPORT_BYTES) {
    return Response.json({ error: 'Relatório muito grande' }, { status: 413 });
  }

  try {
    const report = await readReportBody(request);
    if (!report || typeof report !== 'object') {
      return Response.json({ error: 'Relatório inválido' }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof ReportTooLargeError) {
      return Response.json({ error: 'Relatório muito grande' }, { status: 413 });
    }
    return Response.json({ error: 'Relatório inválido' }, { status: 400 });
  }

  // Structured audit logging is added by S4-01; this route only accepts reports.
  return new Response(null, { status: 204 });
}
