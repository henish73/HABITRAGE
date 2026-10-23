import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Liveness check for load balancers and the Docker HEALTHCHECK. Public and data-free. */
export async function GET() {
  return NextResponse.json({ ok: true });
}
