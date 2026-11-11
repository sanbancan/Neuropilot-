/** Free public GET only. Never reads an API key or sends a completion request. */
import { createModelDiscovery } from '@/lib/ai/providers/discovery'

async function main() {
  const { models } = await createModelDiscovery().list()
  console.table(models.map(model => ({
    model: model.id, family: model.family,
    tools: model.capabilities.tools, streaming: model.capabilities.streaming,
    webSearch: model.capabilities.webSearch, vision: model.capabilities.vision, documents: model.capabilities.documents,
    jsonCompatibility: 'unverified — prompt mode by default',
  })))
  console.log('Capabilities are provider-advertised, not live completion tests. Tool execution, streaming, web search and persistent memory remain disabled in NeuroPilot.')
}
main().catch(() => { console.error('Mia21 public model discovery failed. No completion request was made.'); process.exitCode = 1 })
