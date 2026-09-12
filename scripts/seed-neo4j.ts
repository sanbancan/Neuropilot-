#!/usr/bin/env tsx
/**
 * Seed the NeuroPilot knowledge graph.
 *
 * Idempotent: running this script multiple times will not create duplicates.
 * Nodes are MERGEd on their `key` property and relationships are fully
 * replaced (old ones deleted, new ones created) on each run.
 *
 * Usage:
 *   NEO4J_URI=neo4j+s://... NEO4J_USERNAME=neo4j NEO4J_PASSWORD=... \
 *     npm run db:seed
 */

import neo4j from 'neo4j-driver'
import { ALL_NODES, ALL_EDGES } from '@/lib/graph/seed-data'

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const uri = process.env.NEO4J_URI
const username = process.env.NEO4J_USERNAME
const password = process.env.NEO4J_PASSWORD

if (!uri || !username || !password) {
  console.error(
    '❌  Missing Neo4j credentials.\n' +
      '    Set NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD in your environment.\n',
  )
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

const driver = neo4j.driver(uri, neo4j.auth.basic(username, password))

async function main() {
  console.log(`🌐  Connecting to ${uri} ...`)

  // Verify connectivity first so we fail fast on bad credentials.
  try {
    await driver.executeQuery('RETURN 1 AS ok')
  } catch (err) {
    console.error('❌  Could not connect to Neo4j:', (err as Error).message)
    process.exit(1)
  }

  await driver.executeQuery('MATCH (n) DETACH DELETE n')
  console.log('🧹  Cleared existing graph data')

  // ── Nodes ──────────────────────────────────────────────────────────────
  let nodeCount = 0
  for (const node of ALL_NODES) {
    const { label, key, ...props } = node as unknown as Record<string, unknown> & {
      label: string
      key: string
    }

    // Strip undefined values — Neo4j doesn't store them.
    const cleanProps: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(props)) {
      if (v !== undefined && v !== null) cleanProps[k] = v
    }

    await driver.executeQuery(
      `MERGE (n:${label} {key: $key}) SET n += $props`,
      { key, props: cleanProps },
    )
    nodeCount++
  }
  console.log(`✅  Merged ${nodeCount} nodes`)

  // ── Relationships ──────────────────────────────────────────────────────
  let edgeCount = 0
  for (const edge of ALL_EDGES) {
    const props: Record<string, unknown> = {}
    if (edge.evidence) props.evidence = edge.evidence
    if (edge.note) props.note = edge.note

    await driver.executeQuery(
      `MATCH (a {key: $from}) MATCH (b {key: $to})
       CREATE (a)-[:${edge.type} $props]->(b)`,
      { from: edge.fromKey, to: edge.toKey, props },
    )
    edgeCount++
  }
  console.log(`✅  Created ${edgeCount} relationships`)

  console.log('\n🎉  Graph seeded successfully!')
}

main()
  .catch((err) => {
    console.error('❌  Seeding failed:', err)
    process.exit(1)
  })
  .finally(() => driver.close())
