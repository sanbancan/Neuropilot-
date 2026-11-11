/** Add/update only NeuroPilot's scoped scientific catalog; never clears user data. */
import neo4j from 'neo4j-driver'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseEnv } from 'node:util'
import { seedCatalog } from '@/lib/graph/seed'

async function main() {
  // npm runs this script from the project root. Parse data, never source shell code.
  // Use this file explicitly so stale exported variables cannot select another instance.
  const configuration = parseEnv(readFileSync(resolve(process.cwd(), '.env.local'), 'utf8'))
  const { NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD } = configuration
  if (!NEO4J_URI || !NEO4J_USERNAME || !NEO4J_PASSWORD) throw new Error('Missing Neo4j configuration')
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD), {
    connectionTimeout: 10000,
    connectionAcquisitionTimeout: 15000,
    maxTransactionRetryTime: 0,
    logging: { level: 'error', logger: () => {} },
  })
  const session = driver.session()
  try {
    await driver.verifyConnectivity()
    console.log('Connected to the Neo4j instance configured in .env.local. Connection details are withheld.')
    await session.executeWrite(tx => seedCatalog(tx))
    console.log('NeuroPilot scientific catalog updated. Unrelated and legacy records were preserved.')
  } finally {
    await session.close()
    await driver.close()
  }
}
main().catch(() => {
  console.error('Catalog update failed. Check .env.local, connectivity and write permissions. Any failed transaction was rolled back. Connection details are withheld.')
  process.exitCode = 1
})
