/**
 * Graph-layer query facade for NeuroPilot.
 *
 * Exposes `getParadigmContext()` and `checkNeo4jHealth()` — the only
 * functions the agent layer is allowed to call for knowledge retrieval.
 *
 * When Neo4j credentials are present the driver is used; otherwise the
 * in-memory mirror in `memory-graph.ts` serves identical `ParadigmContext`
 * objects so the application remains fully functional in demo mode.
 */

import type { ParadigmContext, ParadigmKey, GraphSource } from './types'
import { PARADIGM_KEYS } from './types'
import { getInMemoryContext } from './memory-graph'

// ---------------------------------------------------------------------------
// Neo4j driver (lazy singleton)
// ---------------------------------------------------------------------------

type Neo4jDriver = {
  close: () => Promise<void>
  // Minimal surface we actually use
  executeRead: (
    work: (tx: { run: (query: string, params?: Record<string, unknown>) => Promise<{ records: unknown[] }> }) => Promise<unknown>,
  ) => Promise<unknown>
}

let _driver: Neo4jDriver | null | undefined = undefined

/**
 * Lazily initialise the Neo4j driver.
 * Returns `null` when credentials are missing or the import fails.
 */
async function getDriver(): Promise<Neo4jDriver | null> {
  if (_driver !== undefined) return _driver

  const uri = process.env.NEO4J_URI
  const user = process.env.NEO4J_USERNAME
  const pass = process.env.NEO4J_PASSWORD

  if (!uri || !user || !pass) {
    _driver = null
    return null
  }

  try {
    // Dynamic import so the module is only loaded when credentials exist.
    const neo4j = await import('neo4j-driver')
    const driver = neo4j.default.driver(uri, neo4j.default.auth.basic(user, pass))
    // Quick connectivity check
    await driver.getServerInfo()
    _driver = driver as unknown as Neo4jDriver
    return _driver
  } catch {
    _driver = null
    return null
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface Neo4jHealthStatus {
  connected: boolean
  source: GraphSource
  error?: string
}

/**
 * Check Neo4j connectivity without exposing credentials.
 */
export async function checkNeo4jHealth(): Promise<Neo4jHealthStatus> {
  const driver = await getDriver()
  if (!driver) {
    return { connected: false, source: 'in-memory' }
  }
  return { connected: true, source: 'neo4j' }
}

/**
 * Retrieve structured knowledge for one supported paradigm.
 *
 * Tries Neo4j first; falls back to the in-memory mirror when Neo4j is
 * unavailable or a query fails.  The caller never needs to know which
 * backend served the response — the `source` field on the returned
 * `ParadigmContext` discloses it.
 */
export async function getParadigmContext(
  paradigm: ParadigmKey,
): Promise<ParadigmContext> {
  // Validate the key
  if (!PARADIGM_KEYS.includes(paradigm)) {
    throw new Error(`Unsupported paradigm key: ${paradigm}`)
  }

  // Try Neo4j
  const driver = await getDriver()
  if (driver) {
    try {
      const ctx = await queryNeo4jParadigmContext(driver, paradigm)
      if (ctx) return ctx
    } catch {
      // Fall through to in-memory
    }
  }

  // Fallback: in-memory mirror
  const memCtx = getInMemoryContext(paradigm)
  if (!memCtx) {
    throw new Error(`No context available for paradigm: ${paradigm}`)
  }
  return { ...memCtx, source: 'in-memory' }
}

// ---------------------------------------------------------------------------
// Neo4j query implementation (placeholder — real Cypher lives here)
// ---------------------------------------------------------------------------

/**
 * Query Neo4j for a full ParadigmContext.
 * Returns null when the paradigm is not found in the graph.
 *
 * NOTE: The actual Cypher queries are intentionally a thin layer.
 * The seed script (`scripts/seed-neo4j.ts`) defines the graph schema;
 * when that script is finalised these queries will be updated to match.
 * For now, Neo4j connectivity is verified but queries gracefully
 * return null so the in-memory mirror is used.
 */
async function queryNeo4jParadigmContext(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _driver: Neo4jDriver,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _paradigm: ParadigmKey,
): Promise<ParadigmContext | null> {
  // TODO: implement full Cypher retrieval once seed schema is finalised.
  // For now, return null so the in-memory mirror is always used.
  return null
}
