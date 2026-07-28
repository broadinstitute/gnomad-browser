import {
  clickhouseClient,
  isY1Chr22MixedProvenanceEnabled,
  isY1PilotEnabled,
} from '../clickhouse'
import { isRsId } from '@gnomad/identifiers'
import { getFilteredRegions } from './variant-datasets/gnomad-v4-variant-queries'
import { mergeOverlappingRegions } from './helpers/region-helpers'
import { withCache } from '../cache'
import { fetchSTRHistogram } from './haplotype-queries'
import {
  fetchY1VariantById,
  fetchY1VariantsByRegion,
  fetchY1VariantsByRegions,
  LongReadCohort,
} from './long_read_y1_variants'
import { getY1SourceSnapshot } from './long_read_y1_provenance'

const normalizeChrom = (chrom: string) =>
  chrom.startsWith('chr') ? chrom : `chr${chrom}`

const mapClickHouseRowToGraphQL = (row: any) => {
  const filters = Array.isArray(row.filters) ? [...row.filters] : []
  if (row.enveloping_tr_id && row.enveloping_tr_id !== '') {
    if (!filters.includes('TRGT_OVERLAPPED')) {
      filters.push('TRGT_OVERLAPPED')
    }
  }

  return {
  variant_id: row.variant_id,
  data_source: 'LEGACY_V1',
  source_release: 'legacy',
  source_run_id: null,
  reference_genome: 'GRCh38',
  chrom: row.chrom.replace('chr', ''),
  pos: Number(row.position),
  end: row.end != null ? Number(row.end) : null,
  length: row.allele_length != null ? Number(row.allele_length) : (row.length != null ? Number(row.length) : null),
  ref: row.ref,
  alt: row.alt,
  xpos: Number(row.xpos),
  rsids: row.rsids,
  allele_type: row.allele_type,
  sv_consequences: Array.isArray(row.sv_consequences) ? row.sv_consequences : [],
  filters,
  intergenic: row.intergenic === 1,
  gene_region: row.gene_region || null,
  major_consequence: row.major_consequence || null,
  cadd_phred: row.cadd_phred != null ? Number(row.cadd_phred) : null,
  phylop: row.phylop != null ? Number(row.phylop) : null,
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
}
}

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

export const fetchVariantById = async (variantId: string, cohort: LongReadCohort = 'hgsvc_hprc') => {
  if (isY1PilotEnabled) {
    if (isRsId(variantId)) return null
    if (isY1Chr22MixedProvenanceEnabled && !/^(?:chr)?22[-:]/.test(variantId)) {
      throw new Error('OUT_OF_SCOPE: mixed-provenance Y1 data are available only on chr22')
    }
    const source = await getY1SourceSnapshot(cohort)
    return fetchY1VariantById(variantId, cohort, source.run_id)
  }

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

const _fetchVariantsByGene = async (
  gene: any,
  cohort: LongReadCohort = 'hgsvc_hprc',
  y1RunId?: string
) => {
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

  if (isY1PilotEnabled) {
    if (isY1Chr22MixedProvenanceEnabled && chrom !== 'chr22') {
      throw new Error('OUT_OF_SCOPE: mixed-provenance Y1 data are available only on chr22')
    }
    if (!y1RunId) throw new Error('Missing resolved Y1 run identity')
    return fetchY1VariantsByRegions(chrom, mergedRegions, cohort, y1RunId)
  }

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

const cachedVariantsByGene = withCache(
  _fetchVariantsByGene,
  (gene: any, cohort: LongReadCohort = 'hgsvc_hprc', y1RunId?: string) =>
    `lr_variants:${isY1PilotEnabled ? 'y1:y1:GRCh38:prototype=' + isY1Chr22MixedProvenanceEnabled + ':' + cohort + ':' + (y1RunId || 'unpinned') : 'legacy'}:gene:${gene.gene_id}`,
  { expiration: 1 }
)

export const fetchVariantsByGene = async (
  gene: any,
  cohort: LongReadCohort = 'hgsvc_hprc'
) => {
  const source = isY1PilotEnabled ? await getY1SourceSnapshot(cohort) : null
  return cachedVariantsByGene(gene, cohort, source?.run_id)
}

const countVariantsByRegion = async (...args: any[]) => {
  // Called as (esClient, region) from variant-queries.ts or (region) directly
  const region: { chrom: string; start: number; stop: number } =
    args.length > 1 ? args[1] : args[0]
  const chrom = normalizeChrom(region.chrom)
  if (isY1PilotEnabled) {
    const cohort: LongReadCohort = args.length > 2 ? args[2] : 'hgsvc_hprc'
    if (isY1Chr22MixedProvenanceEnabled && chrom !== 'chr22') {
      throw new Error('OUT_OF_SCOPE: mixed-provenance Y1 data are available only on chr22')
    }
    const source = await getY1SourceSnapshot(cohort)
    return (await fetchY1VariantsByRegion(region, cohort, source.run_id)).length
  }

  const query = `
    SELECT count() as count FROM lr_variants
    WHERE chrom = {chrom:String}
      AND position >= {start:UInt32}
      AND position <= {stop:UInt32}
  `

  const resultSet = await clickhouseClient.query({
    query,
    query_params: { chrom, start: region.start, stop: region.stop },
    format: 'JSONEachRow',
  })
  const rows = (await resultSet.json()) as any[]
  return Number(rows[0]?.count || 0)
}

export const countVariantsInRegion = countVariantsByRegion

const _fetchVariantsByRegion = async (
  region: { chrom: string; start: number; stop: number },
  cohort: LongReadCohort = 'hgsvc_hprc',
  y1RunId?: string
) => {
  const chrom = normalizeChrom(region.chrom)

  if (isY1PilotEnabled) {
    if (isY1Chr22MixedProvenanceEnabled && chrom !== 'chr22') {
      throw new Error('OUT_OF_SCOPE: mixed-provenance Y1 data are available only on chr22')
    }
    if (!y1RunId) throw new Error('Missing resolved Y1 run identity')
    return fetchY1VariantsByRegion(region, cohort, y1RunId)
  }

  const query = `
    SELECT * FROM lr_variants
    WHERE chrom = {chrom:String}
      AND position >= {start:UInt32}
      AND position <= {stop:UInt32}
    ORDER BY position ASC
  `

  const resultSet = await clickhouseClient.query({
    query,
    query_params: { chrom, start: region.start, stop: region.stop },
    format: 'JSONEachRow',
  })
  const rows = (await resultSet.json()) as any[]

  return rows.map(mapClickHouseRowToGraphQL)
}

const cachedVariantsByRegion = withCache(
  _fetchVariantsByRegion,
  (
    region: { chrom: string; start: number; stop: number },
    cohort: LongReadCohort = 'hgsvc_hprc',
    y1RunId?: string
  ) =>
    `lr_variants:${isY1PilotEnabled ? 'y1:y1:GRCh38:prototype=' + isY1Chr22MixedProvenanceEnabled + ':' + cohort + ':' + (y1RunId || 'unpinned') : 'legacy'}:region:${region.chrom}:${region.start}:${region.stop}`,
  { expiration: 1 }
)

export const fetchVariantsByRegion = async (
  region: { chrom: string; start: number; stop: number },
  cohort: LongReadCohort = 'hgsvc_hprc'
) => {
  const source = isY1PilotEnabled ? await getY1SourceSnapshot(cohort) : null
  return cachedVariantsByRegion(region, cohort, source?.run_id)
}

const queries = {
  countVariantsInRegion,
  fetchVariantById,
  fetchVariantsByGene,
  fetchVariantsByRegion,
}

export default queries
