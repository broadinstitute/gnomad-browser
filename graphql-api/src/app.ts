import compression from 'compression'
import cors from 'cors'
import express from 'express'
import onFinished from 'on-finished'
import onHeaders from 'on-headers'
import config from './config'
import { client as esClient } from './elasticsearch'
import graphQLApi from './graphql/graphql-api'
import logger from './logger'

import { loadWhitelist } from './whitelist'

import startEsStatsPolling from './esPoll'

const STATS_POLL_INTERVAL = 5000

process.on('uncaughtException', (error) => {
  logger.error(error)
  process.exit(1)
})

process.on('unhandledRejection', (error) => {
  logger.error(error)
  process.exit(1)
})

const app = express()
app.use(compression())
app.use(cors())

app.set('trust proxy', config.TRUST_PROXY)

// Health check endpoint for load balancer.
// GCE load balancers require a 200 response from the health check endpoint, so this must be
// registered before the HTTP=>HTTPS redirect middleware, which would return a 30x response.
app.get('/health/ready', (_request: any, response: any) => {
  response.send('ok')
})

// Log requests
// Add logging here to avoid logging health checks
app.use(function requestLogMiddleware(request: any, response: any, next: any) {
  request.startAt = process.hrtime()
  response.startAt = undefined
  onHeaders(response, () => {
    response.startAt = process.hrtime()
  })

  onFinished(response, () => {
    logger.info({
      httpRequest: {
        requestMethod: request.method,
        requestUrl: `${request.protocol}://${request.hostname}${
          request.originalUrl || request.url
        }`,
        status: response.statusCode,
        userAgent: request.headers['user-agent'],
        remoteIp: request.ip,
        referer: request.headers.referer || request.headers.referrer,
        latency:
          request.startAt && response.startAt
            ? `${(
                response.startAt[0] -
                request.startAt[0] +
                (response.startAt[1] - request.startAt[1]) * 1e-9
              ).toFixed(3)}s`
            : undefined,
        protocol: `HTTP/${request.httpVersionMajor}.${request.httpVersionMinor}`,
      },
      graphqlRequest: request.graphqlParams
        ? {
            graphqlQueryOperationName: request.graphqlParams.operationName,
            graphqlQueryString: request.graphqlParams.query,
            graphqlQueryVariables: request.graphqlParams.variables,
            graphqlQueryCost: request.graphqlQueryCost,
          }
        : undefined,
    })
  })

  next()
})

loadWhitelist()

const context = { esClient }

// REST endpoint for haplotype groups — bypasses GraphQL overhead for large payloads
import {
  fetchHaplotypeGroupAssignments,
  fetchDistinctHaplotypeVariants,
  fetchTrvCarrierAlts,
} from './queries/haplotype-queries'
import { assembleHaplotypeGroups } from './queries/haplotype-grouping'

app.get('/api/lr/haplotype-groups', async (req: any, res: any) => {
  const t0 = performance.now()
  try {
    const chrom = (req.query.chrom || '').startsWith('chr')
      ? req.query.chrom
      : `chr${req.query.chrom}`
    const start = parseInt(req.query.start, 10)
    const stop = parseInt(req.query.stop, 10)
    const minAf = parseFloat(req.query.min_af) || 0
    const sortBy = req.query.sort_by || 'similarity_score'

    if (!chrom || isNaN(start) || isNaN(stop)) {
      return res.status(400).json({ error: 'chrom, start, stop required' })
    }

    const [groupAssignments, distinctVariants, trvCarriers] = await Promise.all([
      fetchHaplotypeGroupAssignments(chrom, start, stop, minAf),
      fetchDistinctHaplotypeVariants(chrom, start, stop),
      fetchTrvCarrierAlts(chrom, start, stop),
    ])

    const result = assembleHaplotypeGroups(
      groupAssignments as any,
      distinctVariants as any,
      chrom,
      minAf,
      sortBy,
      trvCarriers as any
    )

    // Deduplicate response: send variant_dict + index-based references instead of full objects
    // Reduces payload from ~295MB to <10MB by eliminating 50x variant duplication

    // Build variant array and key→index lookup
    const variantArray: any[] = []
    const keyToIndex = new Map<string, number>()
    for (const [key, variant] of result.variantMap) {
      keyToIndex.set(key, variantArray.length)
      variantArray.push(variant)
    }

    const deduplicatedGroups = result.groups.map((g: any) => ({
      hash: g.hash,
      start: g.start,
      stop: g.stop,
      samples: g.samples.map((s: any) => ({ sample_id: s.sample_id })),
      variant_indices: g.readable_id.split(';').map((k: string) => keyToIndex.get(k)),
      below_threshold: (g.below_threshold?.variants || []).map((v: any) => ({
        vi: keyToIndex.get(`${v.chrom}-${v.pos}:${v.ref}-${v.alt}`),
        in_samples: v.in_samples,
      })),
    }))

    const ms = performance.now() - t0
    res.json({
      groups: deduplicatedGroups,
      variants: variantArray,
      clusters: result.clusters,
      tree_json: result.tree_json,
      _timing: { total_ms: Math.round(ms) },
    })
  } catch (e: any) {
    logger.error(`REST haplotype-groups error: ${e.message}`)
    res.status(500).json({ error: 'Internal error' })
  }
})

app.use('/api/', graphQLApi({ context }))

if (!process.env.NO_ES_STATS_POLL) {
  startEsStatsPolling(STATS_POLL_INTERVAL)
}

app.listen(config.PORT)
