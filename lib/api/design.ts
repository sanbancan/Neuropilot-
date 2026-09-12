import {
  designResponseSchema,
  designErrorResponseSchema,
  type DesignRequest,
  type DesignResponse,
} from '@/lib/schemas/design'

/**
 * Client for POST /api/design — the NeuroPilot BCI Systems Architect.
 *
 * Returns a Zod-validated `DesignResponse`, or throws an `Error` whose
 * message carries the API's human-readable failure explanation (including
 * the supported-paradigm list for unsupported objectives).
 */

export async function designBci(request: DesignRequest): Promise<DesignResponse> {
  let response: Response

  try {
    response = await fetch('/api/design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
  } catch {
    throw new Error('Could not reach the NeuroPilot design service. Please try again.')
  }

  if (!response.ok) {
    throw new Error(await describeApiError(response))
  }

  const json: unknown = await response.json()

  const parsed = designResponseSchema.safeParse(json)
  if (!parsed.success) {
    throw new Error('NeuroPilot returned an unexpected response format. Please try again.')
  }

  return parsed.data
}

async function describeApiError(response: Response): Promise<string> {
  try {
    const json: unknown = await response.json()
    const parsed = designErrorResponseSchema.safeParse(json)

    if (parsed.success) {
      const { message, details } = parsed.data.error
      return details && details.length > 0 ? `${message} (${details.join(', ')})` : message
    }
  } catch {
    // Fall through to the status-code fallback below.
  }

  return `Design request failed (${response.status}). Please try again.`
}
