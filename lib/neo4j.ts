/**
 * Server-only Neo4j driver singleton.
 *
 * Uses the `globalThis` cache pattern so Next.js hot-reload during
 * development does not create a new connection pool on every save.
 *
 * When the required environment variables are absent the driver is not
 * created and `getNeo4jDriver` returns `null`, allowing the rest of the
 * application to fall back to the in-memory graph mirror.
 */

import neo4j, { type Driver } from 'neo4j-driver'

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

interface GlobalWithNeo4j {
  _neo4jDriver?: Driver | null
}

const globalRef = globalThis as GlobalWithNeo4j

function createDriver(): Driver | null {
  const uri = process.env.NEO4J_URI
  const username = process.env.NEO4J_USERNAME
  const password = process.env.NEO4J_PASSWORD

  if (!uri || !username || !password) {
    return null
  }

  return neo4j.driver(uri, neo4j.auth.basic(username, password))
}

/**
 * Returns the shared Neo4j `Driver`, creating it on first call.
 * Returns `null` when credentials are not configured.
 */
export function getNeo4jDriver(): Driver | null {
  if (globalRef._neo4jDriver === undefined) {
    globalRef._neo4jDriver = createDriver()
  }
  return globalRef._neo4jDriver
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export interface Neo4jHealthStatus {
  ok: boolean
  configured: boolean
  error?: string
}

/**
 * Lightweight connectivity check suitable for `/api/health/neo4j`.
 * Does **not** throw — callers always receive a status object.
 */
export async function checkNeo4jHealth(): Promise<Neo4jHealthStatus> {
  const driver = getNeo4jDriver()

  if (!driver) {
    return { ok: false, configured: false }
  }

  try {
    await driver.executeQuery('RETURN 1 AS ok')
    return { ok: true, configured: true }
  } catch (err) {
    return {
      ok: false,
      configured: true,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
