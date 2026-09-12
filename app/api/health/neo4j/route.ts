/**
 * GET /api/health/neo4j — Neo4j connectivity check.
 *
 * Uses the graph layer's health helper. Does not expose credentials
 * or raw connection details.
 */

import { NextResponse } from 'next/server'
import { checkNeo4jHealth } from '@/lib/graph/queries'

export async function GET() {
  try {
    const health = await checkNeo4jHealth()
    return NextResponse.json({
      neo4j: health.connected ? 'connected' : 'unavailable',
      source: health.source,
      ...(health.error ? { error: health.error } : {}),
    })
  } catch {
    return NextResponse.json({
      neo4j: 'unavailable',
      source: 'in-memory',
    })
  }
}
