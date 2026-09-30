import { NextResponse } from 'next/server';

const reports: unknown[] = [];

export async function POST(req: Request) {
  const body = await req.text();
  try {
    const parsed = JSON.parse(body) as { 'csp-report'?: unknown };
    const report = parsed['csp-report'] ?? parsed;
    reports.push(report);
    console.warn('[csp-report]', JSON.stringify(report));
  } catch {
    reports.push({ raw: body.slice(0, 500) });
  }
  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  return NextResponse.json(reports);
}

export async function DELETE() {
  reports.length = 0;
  return new NextResponse(null, { status: 204 });
}
