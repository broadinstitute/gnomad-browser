import { parseHaplotypeResponse } from './haplotypeResponse'

const response = (overrides: Partial<Pick<Response, 'ok' | 'status' | 'statusText'>> = {}) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  ...overrides,
})

describe('parseHaplotypeResponse', () => {
  test('returns a successful REST payload', () => {
    const payload = { variants: { variant_id: [] }, carrier_variant_indices: {} }
    expect(parseHaplotypeResponse(response(), JSON.stringify(payload))).toEqual(payload)
  })

  test('rejects a JSON HTTP error before it can enter the worker', () => {
    expect(() =>
      parseHaplotypeResponse(
        response({ ok: false, status: 500, statusText: 'Internal Server Error' }),
        JSON.stringify({ error: 'Internal error' })
      )
    ).toThrow('Haplotype data request failed (HTTP 500): Internal error')
  })

  test('uses the status text when an HTTP error is not JSON', () => {
    expect(() =>
      parseHaplotypeResponse(
        response({ ok: false, status: 502, statusText: 'Bad Gateway' }),
        '<html>unavailable</html>'
      )
    ).toThrow('Haplotype data request failed (HTTP 502): Bad Gateway')
  })
})
