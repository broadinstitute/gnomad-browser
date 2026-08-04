import type { RawPayload } from '../Haplotypes/haplotypeCompute'

type HaplotypeHttpResponse = Pick<Response, 'ok' | 'status' | 'statusText'>

export const parseHaplotypeResponse = (
  response: HaplotypeHttpResponse,
  text: string
): RawPayload => {
  if (!response.ok) {
    let detail = response.statusText
    try {
      const payload = JSON.parse(text)
      detail = payload.error || payload.message || detail
    } catch {
      // Keep the HTTP status text when the error response is not JSON.
    }
    throw new Error(
      `Haplotype data request failed (HTTP ${response.status})${detail ? `: ${detail}` : ''}`
    )
  }

  return JSON.parse(text)
}
