/**
 * GET /api/health/neo4j — Neo4j connectivity check.
 *
 * Uses the graph layer's health helper from `lib/neo4j.ts`. Does not expose
 * credentials or raw connection details.
 */

import { NextResponse } from 'next/server'
import { checkNeo4jHealth } from '@/lib/neo4j'

export async function GET() {
  try {
    const health = await checkNeo4jHealth()
    return NextResponse.json({
      neo4j: health.ok ? 'connected' : 'unavailable',
      source: health.configured ? 'neo4j' : 'in-memory',
      ...(health.error ? { error: health.error } : {}),
    })
  } catch {
    return NextResponse.json({
      neo4j: 'unavailable',
      source: 'in-memory',
    })
  }
}
