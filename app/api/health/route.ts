/**
 * GET /api/health — basic application health check.
 *
 * Returns a small status object without exposing any secrets.
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'neuropilot-agent-api',
    branch: 'feat/agent-api',
    timestamp: new Date().toISOString(),
  })
}
