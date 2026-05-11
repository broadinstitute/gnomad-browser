import { clickhouseClient } from '../clickhouse'
import { isRsId } from '@gnomad/identifiers'
import { getFilteredRegions } from './variant-datasets/gnomad-v4-variant-queries'
import { mergeOverlappingRegions } from './helpers/region-helpers'
import { withCache } from '../cache'
import { fetchSTRHistogram } from './haplotype-queries'

const normalizeChrom = (chrom: string) =>
  chrom.startsWith('chr') ? chrom : `chr${chrom}`

const mapClickHouseRowToGraphQL = (row: any) => ({
  variant_id: row.variant_id,
  reference_genome: 'GRCh38',
  chrom: row.chrom.replace('chr', ''),
  pos: Number(row.position),
  ref: row.ref,
  alt: row.alt,
  xpos: Number(row.xpos),
  rsids: row.rsids,
  allele_type: row.allele_type,
  filters: row.filters,
  intergenic: row.intergenic === 1,
  gene_region: row.gene_region || null,
  major_consequence: row.major_consequence || null,
  short_read_match_id: row.short_read_match_id || null,
  short_read_match_type: row.short_read_match_type || null,
  short_read_match_source: row.short_read_match_source || null,
  enveloping_tr_id: row.enveloping_tr_id || null,
  enveloped_ids: row.enveloped_ids,
  motifs: row.motifs,
  is_likely_tr: row.is_likely_tr === 1,
  gnomad_str: row.gnomad_str || null,
  freq: row.freq_json ? JSON.parse(row.freq_json) : null,
  transcript_consequences: row.transcript_consequences_json
    ? JSON.parse(row.transcript_consequences_json)
    : null,
  genes: row.genes_json ? JSON.parse(row.genes_json) : null,
  main_reference_region: row.main_reference_region_json
    ? JSON.parse(row.main_reference_region_json)
    : null,
  allele_size_distribution: null as any,
  genotype_distribution: null as any,
  max_repunits: null as any,
})

const parseAlleleSizeDistribution = (populations: { key: string; histogram: string }[]) => {
  const results: any[] = []
  for (const { key, histogram } of populations) {
    if (!key.startsWith('AlleleSizeHistogram:')) continue
    const parts = key.split(':')
    const ancestry_group = parts[1]
    const sex = parts[2] === 'female' ? 'XX' : 'XY'
    const bins = (histogram as string)
      .split(',')
      .filter((b: string) => b.includes('x'))
      .map((b: string) => {
        const [countStr, freqStr] = b.split(':')
        return {
          repunit_count: parseInt(countStr.replace('x', ''), 10),
          frequency: parseInt(freqStr, 10),
        }
      })
    results.push({ ancestry_group, sex, repunit: '', distribution: bins })
  }
  return results.length > 0 ? results : null
}

const parseGenotypeDistribution = (populations: { key: string; histogram: string }[]) => {
  const results: any[] = []
  for (const { key, histogram } of populations) {
    if (!key.startsWith('BiallelicHistogram:')) continue
    const parts = key.split(':')
    const ancestry_group = parts[1]
    const sex = parts[2] === 'female' ? 'XX' : 'XY'
    const bins = (histogram as string)
      .split(',')
      .filter((b: string) => b.includes(':'))
      .map((b: string) => {
        const [countsStr, freqStr] = b.split(':')
        const [shortStr, longStr] = countsStr.split('/')
        return {
          short_allele_repunit_count: parseInt(shortStr, 10),
          long_allele_repunit_count: parseInt(longStr, 10),
          frequency: parseInt(freqStr, 10),
        }
      })
    results.push({
      ancestry_group,
      sex,
      short_allele_repunit: '',
      long_allele_repunit: '',
      distribution: bins,
    })
  }
  return results.length > 0 ? results : null
}

export const fetchVariantById = async (variantId: string) => {
  let query: string
  if (isRsId(variantId)) {
    query = `SELECT * FROM lr_variants WHERE has(rsids, {id:String}) LIMIT 1`
  } else {
    query = `SELECT * FROM lr_variants WHERE variant_id = {id:String} LIMIT 1`
  }

  const resultSet = await clickhouseClient.query({
    query,
    query_params: { id: variantId },
    format: 'JSONEachRow',
  })
  const rows = (await resultSet.json()) as any[]
  if (!rows.length) return null

  const variant = mapClickHouseRowToGraphQL(rows[0])

  if (rows[0].allele_type === 'trv') {
    const histogram = await fetchSTRHistogram(null, rows[0].chrom, Number(rows[0].position))
    if (histogram) {
      variant.allele_size_distribution = parseAlleleSizeDistribution(histogram.populations)
      variant.genotype_distribution = parseGenotypeDistribution(histogram.populations)
      variant.max_repunits = histogram.max_repeats ? Number(histogram.max_repeats) : null
    }
  }

  return variant
}

const _fetchVariantsByGene = async (gene: any) => {
  const filteredRegions = getFilteredRegions(gene.exons)
  const sortedRegions = filteredRegions.sort((r1: any, r2: any) => r1.xstart - r2.xstart)
  const padding = 75
  const paddedRegions = sortedRegions.map((r: any) => ({
    ...r,
    start: r.start - padding,
    stop: r.stop + padding,
    xstart: r.xstart - padding,
    xstop: r.xstop + padding,
  }))

  const mergedRegions = mergeOverlappingRegions(paddedRegions)

  if (mergedRegions.length === 0) return []

  const rangeConditions = mergedRegions
    .map((r: any) => `(position BETWEEN ${Number(r.start)} AND ${Number(r.stop)})`)
    .join(' OR ')

  const chrom = normalizeChrom(gene.chrom)

  const query = `
    SELECT * FROM lr_variants
    WHERE chrom = {chrom:String} AND (${rangeConditions})
    ORDER BY position ASC
  `

  const resultSet = await clickhouseClient.query({
    query,
    query_params: { chrom },
    format: 'JSONEachRow',
  })
  const rows = (await resultSet.json()) as any[]

  return rows.map(mapClickHouseRowToGraphQL)
}

export const fetchVariantsByGene = withCache(
  _fetchVariantsByGene,
  (gene: any) => `lr_variants:gene:${gene.gene_id}`,
  { expiration: 1 }
)

const queries = {
  fetchVariantById,
  fetchVariantsByGene,
}

export default queries
