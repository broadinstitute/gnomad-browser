#!/usr/bin/env npx ts-node
/**
 * Benchmark suite for haplotype viewer GraphQL queries.
 *
 * Measures per-query latency, ClickHouse vs Node.js compute breakdown,
 * and data volume across small/medium/large genomic regions.
 *
 * Usage:
 *   npx ts-node development/benchmark-haplotype.ts [--iterations 5] [--api http://localhost:8010/api]
 *
 * Requires the GraphQL API to be running with timing instrumentation.
 */

const API_URL = process.argv.includes('--api')
  ? process.argv[process.argv.indexOf('--api') + 1]
  : 'http://localhost:8010/api/'

const ITERATIONS = process.argv.includes('--iterations')
  ? parseInt(process.argv[process.argv.indexOf('--iterations') + 1], 10)
  : 5

// --- Region definitions ---

type Region = {
  name: string
  chrom: string
  start: number
  stop: number
  description: string
}

const REGIONS: Region[] = [
  {
    name: 'tiny',
    chrom: '22',
    start: 19990000,
    stop: 20010000,
    description: '20kb — sub-gene scale',
  },
  {
    name: 'small',
    chrom: '22',
    start: 19978753,
    stop: 20068756,
    description: '~90kb — a few genes (user-provided region)',
  },
  {
    name: 'medium',
    chrom: '22',
    start: 20000000,
    stop: 20250000,
    description: '250kb — moderate multi-gene region',
  },
  {
    name: 'large',
    chrom: '22',
    start: 20000000,
    stop: 20500000,
    description: '500kb — large region, stress test',
  },
  {
    name: 'full',
    chrom: '22',
    start: 20000000,
    stop: 21000000,
    description: '1Mb — entire loaded dataset',
  },
]

// --- Query definitions ---

type QueryDef = {
  name: string
  operationName: string
  query: string
  variables: (r: Region) => Record<string, any>
  /** If true, skip from default runs (e.g. mQTL is slow) */
  optional?: boolean
}

const QUERIES: QueryDef[] = [
  {
    name: 'haplotype_groups',
    operationName: 'RegionHaploGroups',
    query: `query RegionHaploGroups($chrom: String!, $start: Int!, $stop: Int!, $min_allele_freq: Float, $sort_by: String) {
      haplotype_groups(chrom: $chrom, start: $start, stop: $stop, min_allele_freq: $min_allele_freq, sort_by: $sort_by) {
        groups { samples { sample_id } variants { variants { position alleles } readable_id } start stop hash }
      }
    }`,
    variables: (r) => ({
      chrom: r.chrom,
      start: r.start,
      stop: r.stop,
      min_allele_freq: 0.0,
      sort_by: 'similarity_score',
    }),
  },
  {
    name: 'methylation_summary',
    operationName: 'RegionMethylationSummary',
    query: `query RegionMethylationSummary($chrom: String!, $start: Int!, $stop: Int!) {
      methylation_summary(chrom: $chrom, start: $start, stop: $stop) {
        pos1 pos2 mean_methylation mean_coverage num_samples std_methylation
      }
    }`,
    variables: (r) => ({ chrom: r.chrom, start: r.start, stop: r.stop }),
  },
  {
    name: 'methylation_outliers',
    operationName: 'RegionMethylationOutliers',
    query: `query RegionMethylationOutliers($chrom: String!, $start: Int!, $stop: Int!) {
      methylation_outliers(chrom: $chrom, start: $start, stop: $stop) {
        total_cpg_sites total_samples samples { sample_id outlier_count outlier_fraction }
      }
    }`,
    variables: (r) => ({ chrom: r.chrom, start: r.start, stop: r.stop }),
  },
  {
    name: 'lr_coverage',
    operationName: 'LRCoverage',
    query: `query LRCoverage($chrom: String!, $start: Int!, $stop: Int!) {
      lr_coverage(chrom: $chrom, start: $start, stop: $stop) { pos mean median }
    }`,
    variables: (r) => ({ chrom: r.chrom, start: r.start, stop: r.stop }),
  },
  {
    name: 'mqtl_associations',
    operationName: 'RegionMQTL',
    query: `query RegionMQTL($chrom: String!, $start: Int!, $stop: Int!, $min_af: Float) {
      mqtl_associations(chrom: $chrom, start: $start, stop: $stop, min_af: $min_af) {
        variant_id variant_pos cpg_pos p_value effect_size
      }
    }`,
    variables: (r) => ({ chrom: r.chrom, start: r.start, stop: r.stop, min_af: 0.0 }),
    optional: true,
  },
]

// --- Helpers ---

async function runQuery(
  queryDef: QueryDef,
  region: Region
): Promise<{ wallMs: number; timings: any[]; dataSize: number; error?: string }> {
  const body = JSON.stringify({
    operationName: queryDef.operationName,
    query: queryDef.query,
    variables: queryDef.variables(region),
  })

  const t0 = performance.now()
  let resp: Response
  try {
    resp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
  } catch (e: any) {
    return { wallMs: performance.now() - t0, timings: [], dataSize: 0, error: e.message }
  }
  const wallMs = performance.now() - t0

  const text = await resp.text()
  const dataSize = text.length

  try {
    const json = JSON.parse(text)
    if (json.errors) {
      return { wallMs, timings: [], dataSize, error: json.errors[0]?.message }
    }
    return { wallMs, timings: json.extensions?.timings || [], dataSize }
  } catch {
    return { wallMs, timings: [], dataSize, error: 'Failed to parse response' }
  }
}

function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const sum = sorted.reduce((a, b) => a + b, 0)
  return {
    min: sorted[0],
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    max: sorted[sorted.length - 1],
    mean: sum / sorted.length,
  }
}

function fmtMs(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`
}

function padRight(s: string, n: number) {
  return s.length >= n ? s : s + ' '.repeat(n - s.length)
}

function padLeft(s: string, n: number) {
  return s.length >= n ? s : ' '.repeat(n - s.length) + s
}

// --- Main ---

async function main() {
  console.log(`\nHaplotype Viewer Benchmark`)
  console.log(`API: ${API_URL}`)
  console.log(`Iterations: ${ITERATIONS}`)

  const includeOptional = process.argv.includes('--all')
  const queries = includeOptional ? QUERIES : QUERIES.filter((q) => !q.optional)

  // Warmup
  console.log(`\nWarming up...`)
  for (const q of queries) {
    await runQuery(q, REGIONS[1]) // use the "small" region
  }

  // Collect results
  type Result = {
    query: string
    region: string
    regionSize: string
    wallMs: number[]
    timings: any[][]
    dataSize: number[]
    errors: string[]
  }

  const results: Result[] = []

  for (const region of REGIONS) {
    console.log(`\n${'='.repeat(70)}`)
    console.log(`Region: ${region.name} — ${region.description}`)
    console.log(`  chr${region.chrom}:${region.start.toLocaleString()}-${region.stop.toLocaleString()} (${((region.stop - region.start) / 1000).toFixed(0)}kb)`)
    console.log(`${'='.repeat(70)}`)

    for (const q of queries) {
      const result: Result = {
        query: q.name,
        region: region.name,
        regionSize: `${((region.stop - region.start) / 1000).toFixed(0)}kb`,
        wallMs: [],
        timings: [],
        dataSize: [],
        errors: [],
      }

      process.stdout.write(`  ${padRight(q.name, 25)}`)

      for (let i = 0; i < ITERATIONS; i++) {
        const r = await runQuery(q, region)
        result.wallMs.push(r.wallMs)
        result.timings.push(r.timings)
        result.dataSize.push(r.dataSize)
        if (r.error) result.errors.push(r.error)
        process.stdout.write('.')
      }

      const s = stats(result.wallMs)
      const sizeKb = Math.round(result.dataSize[0] / 1024)
      process.stdout.write(
        ` ${padLeft(fmtMs(s.median), 8)} median  ${padLeft(fmtMs(s.p95), 8)} p95  ${padLeft(fmtMs(s.min), 8)} min  ${padLeft(`${sizeKb}kb`, 8)} payload`
      )

      // Print server-side breakdown if available
      const lastTimings = result.timings[result.timings.length - 1]
      if (lastTimings && lastTimings.length > 0) {
        const t = lastTimings[0]
        if (t.meta) {
          const meta = t.meta
          const parts: string[] = []
          if (meta.clickhouse_ms !== undefined) parts.push(`ch:${fmtMs(meta.clickhouse_ms)}`)
          if (meta.reconstruct_ms !== undefined) parts.push(`reconstruct:${fmtMs(meta.reconstruct_ms)}`)
          if (meta.grouping_ms !== undefined) parts.push(`group:${fmtMs(meta.grouping_ms)}`)
          if (meta.rows_fetched !== undefined) parts.push(`rows:${meta.rows_fetched}`)
          if (meta.groups !== undefined) parts.push(`groups:${meta.groups}`)
          if (meta.samples !== undefined) parts.push(`samples:${meta.samples}`)
          if (meta.rows !== undefined) parts.push(`rows:${meta.rows}`)
          if (parts.length > 0) {
            process.stdout.write(`\n${' '.repeat(27)}└─ ${parts.join('  ')}`)
          }
        }
      }

      if (result.errors.length > 0) {
        process.stdout.write(`  ERROR: ${result.errors[0]}`)
      }

      console.log()
      results.push(result)
    }
  }

  // Summary table: region size scaling
  console.log(`\n${'='.repeat(70)}`)
  console.log(`SCALING SUMMARY (median wall-clock ms)`)
  console.log(`${'='.repeat(70)}`)

  const header = padRight('query', 25) + REGIONS.map((r) => padLeft(r.name, 12)).join('')
  console.log(header)
  console.log('-'.repeat(header.length))

  for (const q of queries) {
    const row = results.filter((r) => r.query === q.name)
    const cells = REGIONS.map((region) => {
      const r = row.find((x) => x.region === region.name)
      return r ? padLeft(fmtMs(stats(r.wallMs).median), 12) : padLeft('—', 12)
    }).join('')
    console.log(padRight(q.name, 25) + cells)
  }

  console.log()
}

main().catch((e) => {
  console.error('Benchmark failed:', e)
  process.exit(1)
})
