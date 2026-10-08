import { describe, expect, jest, test } from '@jest/globals'

import { fetchCoverageForTranscript } from './coverage-queries'

jest.mock('../cache', () => ({
  withCache: <QueryFunction>(query: QueryFunction) => query,
}))

const emptyCoverageResponse = {
  body: { aggregations: { coverage: { buckets: [] } } },
}

const deferredCoverageResponse = () => {
  let resolve!: (response: typeof emptyCoverageResponse) => void
  let reject!: (error: Error) => void
  const promise = new Promise<typeof emptyCoverageResponse>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

const transcript = {
  transcript_id: 'ENST00000648276',
  reference_genome: 'GRCh38',
  chrom: 'X',
  exons: [{ start: 72329920, stop: 72330076, xstart: 72329920, xstop: 72330076 }],
}

describe('fetchCoverageForTranscript', () => {
  test.each(['exome', 'genome', 'both'])(
    'propagates %s coverage failure promptly without an unhandled rejection',
    async (failedFetch) => {
      const exome = deferredCoverageResponse()
      const genome = deferredCoverageResponse()
      const search = ({ index }: { index: string }) => {
        return index === 'gnomad_v4_exome_coverage' ? exome.promise : genome.promise
      }
      const coverage = fetchCoverageForTranscript({ search }, 'gnomad_r4', transcript)
      const nextEventLoopTurn = new Promise<string>((resolve) => {
        setImmediate(() => resolve('Coverage is still pending'))
      })
      const rejection = expect(Promise.race([coverage, nextEventLoopTurn])).rejects.toThrow(
        "Couldn't fetch coverage, Error: Elasticsearch rejected coverage"
      )

      if (failedFetch === 'exome' || failedFetch === 'both') {
        exome.reject(new Error('Elasticsearch rejected coverage'))
      }
      if (failedFetch === 'genome' || failedFetch === 'both') {
        genome.reject(new Error('Elasticsearch rejected coverage'))
      }

      try {
        await rejection
        await new Promise<void>((resolve) => {
          setImmediate(resolve)
        })
      } finally {
        exome.resolve(emptyCoverageResponse)
        genome.resolve(emptyCoverageResponse)
      }
    }
  )
})
