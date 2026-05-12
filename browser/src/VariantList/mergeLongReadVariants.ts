// Merges long-read (LR) variants into the short-read (SR) variant array.
// Matched LR variants (via short_read_match_id) attach LR data to existing SR rows.
// Unmatched LR variants become new rows with exome/genome/joint = null.

export type LongReadPopulationFrequency = {
  id: string
  ac: number
  an: number
  af: number
  homozygote_ref_count?: number | null
  homozygote_alt_count?: number | null
  heterozygote_count?: number | null
  homozygote_ref_freq?: number | null
  homozygote_alt_freq?: number | null
  heterozygote_freq?: number | null
}

export type LongReadSequencingTypeData = {
  ac: number
  an: number
  af: number
  homozygote_ref_count?: number | null
  homozygote_alt_count?: number | null
  heterozygote_count?: number | null
  filters: string[]
  populations: LongReadPopulationFrequency[]
}

export type LongReadVariantDetails = {
  allele_type?: string | null
  motifs?: string[] | null
  is_likely_tr?: boolean | null
  enveloping_tr_id?: string | null
  gnomad_str?: string | null
  allele_size_distribution?: any[] | null
  genotype_distribution?: any[] | null
  max_repunits?: number | null
  main_reference_region?: {
    reference_genome: string
    chrom: string
    start: number
    stop: number
  } | null
}

// Raw LR variant shape from the GraphQL long_read_variants query
type RawLongReadVariant = {
  variant_id: string
  pos: number
  end?: number | null
  length?: number | null
  ref?: string
  alt?: string
  allele_type: string
  filters?: string[] | null
  motifs?: string[] | null
  rsids?: string[] | null
  freq?: {
    all: {
      ac: number
      an: number
      af: number
      homozygote_ref_count?: number | null
      homozygote_alt_count?: number | null
      heterozygote_count?: number | null
      homozygote_ref_freq?: number | null
      homozygote_alt_freq?: number | null
      heterozygote_freq?: number | null
    }
    populations?: LongReadPopulationFrequency[]
  } | null
  reference_genome?: string
  chrom?: string
  transcript_consequences?: {
    hgvs?: string | null
    major_consequence?: string | null
    gene_id?: string | null
    gene_symbol?: string | null
    transcript_id?: string | null
    transcript_version?: string | null
    consequence_terms?: string[] | null
    is_canonical?: boolean | null
    is_mane_select?: boolean | null
  }[]
  major_consequence?: string | null
  short_read_match_id?: string | null
  enveloping_tr_id?: string | null
  enveloped_ids?: string[] | null
  allele_size_distribution?: any[] | null
  genotype_distribution?: any[] | null
  max_repunits?: number | null
  main_reference_region?: {
    reference_genome: string
    chrom: string
    start: number
    stop: number
  } | null
  gnomad_str?: string | null
  is_likely_tr?: boolean | null
  cadd_phred?: number | null
  phylop?: number | null
  sv_consequences?: string[] | null
}

function buildLongReadData(lr: RawLongReadVariant): LongReadSequencingTypeData {
  const freq = lr.freq
  if (!freq) {
    return { ac: 0, an: 0, af: 0, filters: lr.filters || [], populations: [] }
  }
  return {
    ac: freq.all.ac,
    an: freq.all.an,
    af: freq.all.af,
    homozygote_ref_count: freq.all.homozygote_ref_count,
    homozygote_alt_count: freq.all.homozygote_alt_count,
    heterozygote_count: freq.all.heterozygote_count,
    filters: lr.filters || [],
    populations: (freq.populations || []).map((pop) => ({
      ...pop,
      id: pop.id.toLowerCase(),
    })),
  }
}

function buildLongReadDetails(lr: RawLongReadVariant): LongReadVariantDetails {
  return {
    allele_type: lr.allele_type,
    motifs: lr.motifs,
    is_likely_tr: lr.is_likely_tr ?? lr.allele_type === 'trv',
    enveloping_tr_id: lr.enveloping_tr_id,
    gnomad_str: lr.gnomad_str,
    allele_size_distribution: lr.allele_size_distribution,
    genotype_distribution: lr.genotype_distribution,
    max_repunits: lr.max_repunits,
    main_reference_region: lr.main_reference_region,
  }
}

// Extract a chrom from the variant_id (format: "chrom-pos-ref-alt")
function chromFromVariantId(variantId: string): string {
  return variantId.split('-')[0]
}

// Build a transcript_consequence-like object from LR transcript_consequences
function mapTranscriptConsequence(lr: RawLongReadVariant) {
  const tc = lr.transcript_consequences?.[0]
  if (!tc) {
    return null
  }
  return {
    consequence_terms: tc.consequence_terms || (tc.major_consequence ? [tc.major_consequence] : []),
    gene_id: tc.gene_id || '',
    gene_version: null,
    gene_symbol: tc.gene_symbol || null,
    hgvs: tc.hgvs || null,
    hgvsc: null,
    hgvsp: null,
    is_canonical: tc.is_canonical || null,
    is_mane_select: tc.is_mane_select || null,
    is_mane_select_version: null,
    lof: null,
    lof_flags: null,
    lof_filter: null,
    major_consequence: tc.major_consequence || lr.major_consequence || null,
    polyphen_prediction: null,
    refseq_id: null,
    refseq_version: null,
    sift_prediction: null,
    transcript_id: tc.transcript_id || '',
    transcript_version: tc.transcript_version || '',
    canonical: tc.is_canonical || null,
    domains: [],
  }
}

/**
 * Merges long-read variants into the short-read variant array.
 *
 * For each LR variant:
 * - If short_read_match_id matches an SR variant_id, attach long_read data to that SR variant
 * - If no match, create a new variant row with exome/genome/joint = null
 *
 * Returns a new array (does not mutate inputs).
 */
export const mergeLongReadVariants = <T extends { variant_id: string }>(
  srVariants: T[],
  lrVariants: RawLongReadVariant[]
): (T & { long_read?: LongReadSequencingTypeData | null; long_read_details?: LongReadVariantDetails | null })[] => {
  if (!lrVariants || lrVariants.length === 0) {
    return srVariants
  }

  // Clone SR variants so we don't mutate the originals
  const srMap = new Map<string, T & { long_read?: LongReadSequencingTypeData | null; long_read_details?: LongReadVariantDetails | null }>()
  const result = srVariants.map((v) => {
    const cloned = { ...v }
    srMap.set(v.variant_id, cloned)
    return cloned
  })

  const lrOnlyVariants: any[] = []

  for (const lr of lrVariants) {
    const longRead = buildLongReadData(lr)
    const longReadDetails = buildLongReadDetails(lr)

    const matchId = lr.short_read_match_id
    if (matchId && srMap.has(matchId)) {
      // Attach LR data to the matched SR variant
      const srVariant = srMap.get(matchId)!
      srVariant.long_read = longRead
      srVariant.long_read_details = longReadDetails
    } else {
      // Synthesize a new variant row for LR-only data
      const chrom = lr.chrom || chromFromVariantId(lr.variant_id)
      const tc = mapTranscriptConsequence(lr)

      lrOnlyVariants.push({
        variant_id: lr.variant_id,
        reference_genome: lr.reference_genome || 'GRCh38',
        chrom,
        pos: lr.pos,
        ref: lr.ref || '',
        alt: lr.alt || '',
        rsids: lr.rsids || null,
        flags: lr.filters || [],
        consequence: tc?.major_consequence || lr.major_consequence || null,
        hgvs: tc?.hgvs || null,
        hgvsc: null,
        hgvsp: null,
        lof: null,
        lof_filter: null,
        lof_flags: null,
        transcript_id: tc?.transcript_id || null,
        transcript_version: tc?.transcript_version || null,
        transcript_consequence: tc,
        exome: null,
        genome: null,
        joint: null,
        faf95_joint: { popmax: null, popmax_population: null },
        in_silico_predictors: null,
        lof_curation: null,
        clinvar: null,
        long_read: longRead,
        long_read_details: longReadDetails,
      })
    }
  }

  return [...result, ...lrOnlyVariants]
}

export default mergeLongReadVariants
