/**
 * Diagnostic: compare variant sets between lr_variants (GraphQL summary source)
 * and lr_haplotypes (REST haplotype source) for a given region.
 *
 * Usage:
 *   CLICKHOUSE_URL=http://localhost:8123 npx ts-node development/scripts/compare-variant-sources.ts [chrom] [start] [stop]
 *
 * Default region: chr2:130000000-130100000 (test region from spec)
 */

import { createClient } from '@clickhouse/client'

const ch = createClient({
  url: process.env.CLICKHOUSE_URL || 'http://127.0.0.1:8123',
  clickhouse_settings: { readonly: '1' },
})

async function query(sql: string, params: Record<string, any> = {}): Promise<any[]> {
  const rs = await ch.query({ query: sql, query_params: params, format: 'JSONEachRow' })
  return rs.json() as Promise<any[]>
}

async function main() {
  const chrom = process.argv[2] || 'chr2'
  const start = parseInt(process.argv[3] || '130000000', 10)
  const stop = parseInt(process.argv[4] || '130100000', 10)

  console.log(`\n=== Comparing variant sources for ${chrom}:${start}-${stop} ===\n`)

  // 1. lr_variants: aggregate variant table (GraphQL source)
  const summaryVariants = await query(`
    SELECT variant_id, position, ref, alt, allele_type, end, length, info_AF
    FROM lr_variants
    WHERE chrom = {chrom:String} AND position BETWEEN {start:UInt32} AND {stop:UInt32}
    ORDER BY position
  `, { chrom, start, stop })

  // 2. lr_haplotypes: per-carrier table (REST haplotype source) — distinct variants
  const haplotypeVariants = await query(`
    SELECT
      concat({chrom:String}, '-', toString(position), '-', upper(substring(allele_type, 1, 3)), '-', toString(abs(allele_length))) AS variant_id,
      position, any(ref) AS ref, any(alt) AS alt,
      any(allele_type) AS allele_type, any(allele_length) AS allele_length,
      any(info_AF) AS info_AF,
      count() AS carrier_count
    FROM lr_haplotypes
    WHERE chrom = {chrom:String} AND position BETWEEN {start:UInt32} AND {stop:UInt32}
    GROUP BY position, ref, alt
    ORDER BY position
  `, { chrom, start, stop })

  // Build lookup sets keyed by (position, ref, alt)
  const summaryKeys = new Set(summaryVariants.map(v => `${v.position}:${v.ref}:${v.alt}`))
  const hapKeys = new Set(haplotypeVariants.map(v => `${v.position}:${v.ref}:${v.alt}`))

  // Categorize by allele_type
  const summaryByType: Record<string, number> = {}
  const hapByType: Record<string, number> = {}
  for (const v of summaryVariants) {
    summaryByType[v.allele_type] = (summaryByType[v.allele_type] || 0) + 1
  }
  for (const v of haplotypeVariants) {
    hapByType[v.allele_type] = (hapByType[v.allele_type] || 0) + 1
  }

  console.log(`lr_variants (summary):   ${summaryVariants.length} variants`)
  console.log(`lr_haplotypes (distinct): ${haplotypeVariants.length} variants`)
  console.log()

  console.log('--- Breakdown by allele_type ---')
  const allTypes = new Set([...Object.keys(summaryByType), ...Object.keys(hapByType)])
  console.log(`${'type'.padEnd(20)} ${'summary'.padStart(8)} ${'haplotype'.padStart(10)} ${'diff'.padStart(6)}`)
  for (const t of [...allTypes].sort()) {
    const s = summaryByType[t] || 0
    const h = hapByType[t] || 0
    const diff = h - s
    const flag = diff !== 0 ? (diff > 0 ? ' <<<' : ' >>>') : ''
    console.log(`${t.padEnd(20)} ${String(s).padStart(8)} ${String(h).padStart(10)} ${String(diff > 0 ? `+${diff}` : diff).padStart(6)}${flag}`)
  }

  // In haplotype but NOT in summary
  const onlyInHaplotype = haplotypeVariants.filter(v => !summaryKeys.has(`${v.position}:${v.ref}:${v.alt}`))
  // In summary but NOT in haplotype
  const onlyInSummary = summaryVariants.filter(v => !hapKeys.has(`${v.position}:${v.ref}:${v.alt}`))

  console.log(`\n--- Missing from lr_variants (in haplotype only): ${onlyInHaplotype.length} ---`)
  if (onlyInHaplotype.length > 0) {
    const byType: Record<string, any[]> = {}
    for (const v of onlyInHaplotype) {
      const t = v.allele_type || 'unknown'
      ;(byType[t] = byType[t] || []).push(v)
    }
    for (const [type, variants] of Object.entries(byType).sort()) {
      console.log(`  ${type}: ${variants.length}`)
      for (const v of variants.slice(0, 5)) {
        console.log(`    pos=${v.position} ref=${v.ref.substring(0, 20)}${v.ref.length > 20 ? '…' : ''} alt=${v.alt.substring(0, 20)}${v.alt.length > 20 ? '…' : ''} AF=${v.info_AF} carriers=${v.carrier_count}`)
      }
      if (variants.length > 5) console.log(`    ... and ${variants.length - 5} more`)
    }
  }

  console.log(`\n--- Missing from lr_haplotypes (in summary only): ${onlyInSummary.length} ---`)
  if (onlyInSummary.length > 0) {
    const byType: Record<string, any[]> = {}
    for (const v of onlyInSummary) {
      const t = v.allele_type || 'unknown'
      ;(byType[t] = byType[t] || []).push(v)
    }
    for (const [type, variants] of Object.entries(byType).sort()) {
      console.log(`  ${type}: ${variants.length}`)
      for (const v of variants.slice(0, 5)) {
        console.log(`    pos=${v.position} variant_id=${v.variant_id} AF=${v.info_AF}`)
      }
      if (variants.length > 5) console.log(`    ... and ${variants.length - 5} more`)
    }
  }

  // Sanity check: variants in both with mismatched allele_type
  const summaryLookup = new Map(summaryVariants.map(v => [`${v.position}:${v.ref}:${v.alt}`, v]))
  const typeMismatches: Array<{ key: string; summaryType: string; hapType: string }> = []
  for (const hv of haplotypeVariants) {
    const key = `${hv.position}:${hv.ref}:${hv.alt}`
    const sv = summaryLookup.get(key)
    if (sv && sv.allele_type !== hv.allele_type) {
      typeMismatches.push({ key, summaryType: sv.allele_type, hapType: hv.allele_type })
    }
  }
  if (typeMismatches.length > 0) {
    console.log(`\n--- allele_type MISMATCHES (same variant, different type): ${typeMismatches.length} ---`)
    for (const m of typeMismatches.slice(0, 10)) {
      console.log(`  ${m.key}: summary=${m.summaryType} haplotype=${m.hapType}`)
    }
  }

  console.log('\n=== Done ===\n')
  await ch.close()
}

main().catch(e => { console.error(e); process.exit(1) })
