// Merges long-read (LR) variants into the short-read (SR) variant array.
// Matched LR variants (via short_read_match_id) attach LR data to existing SR rows.
// Unmatched LR variants become new rows with exome/genome/joint = null.

import {
  parseTrLocusId,
  trLocusDisplayEnvelope,
  TrLocusId,
} from '@gnomad/dataset-metadata/longReadTrLocusId'

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
  ac: number | null
  an: number | null
  af: number | null
  homozygote_ref_count?: number | null
  homozygote_alt_count?: number | null
  heterozygote_count?: number | null
  filters: string[]
  populations: LongReadPopulationFrequency[]
}

export type LongReadVariantDetails = {
  variant_id?: string
  lr_cohort?: 'hgsvc_hprc' | 'aou' | null
  source_variant_id?: string | null
  alt_index?: number | null
  alt_count?: number | null
  chrom?: string | null
  pos?: number | null
  end?: number | null
  length?: number | null
  ref?: string | null
  alt?: string | null
  allele_type?: string | null
  motifs?: string[] | null
  is_likely_tr?: boolean | null
  enveloping_tr_id?: string | null
  gnomad_str?: string | null
  tr_locus_id?: string | null
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
export type RawLongReadVariant = {
  variant_id: string
  source_variant_id?: string | null
  alt_index?: number | null
  alt_count?: number | null
  lr_cohort?: 'hgsvc_hprc' | 'aou' | null
  pos: number
  end?: number | null
  length?: number | null
  ref?: string
  alt?: string
  allele_type: string
  filters?: string[] | null
  motifs?: string[] | null
  tr_locus_id?: string | null
  tr_structure?: string | null
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
    variant_id: lr.variant_id,
    lr_cohort: lr.lr_cohort,
    source_variant_id: lr.source_variant_id,
    alt_index: lr.alt_index,
    alt_count: lr.alt_count,
    chrom: lr.chrom,
    pos: lr.pos,
    end: lr.end,
    length: lr.length,
    ref: lr.ref,
    alt: lr.alt,
    allele_type: lr.allele_type,
    motifs: lr.motifs,
    is_likely_tr: lr.is_likely_tr ?? lr.allele_type === 'trv',
    enveloping_tr_id: lr.enveloping_tr_id,
    gnomad_str: lr.gnomad_str,
    tr_locus_id: lr.tr_locus_id,
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

export type LongReadMergeOptions = {
  geneSymbol?: string | null
}

type TrLocusGroup = {
  locus: TrLocusId
  cohort: 'hgsvc_hprc' | 'aou'
  sourceVariantId: string
  variants: RawLongReadVariant[]
}

const exactTrGroupIdentity = (lr: RawLongReadVariant) => {
  const isTr = lr.is_likely_tr === true || lr.allele_type.toLowerCase() === 'trv'
  const locus = parseTrLocusId(lr.tr_locus_id || '')
  if (!isTr || !locus || !lr.source_variant_id || !lr.lr_cohort) return null
  return {
    key: JSON.stringify([lr.lr_cohort, locus.canonicalId, lr.source_variant_id]),
    locus,
    cohort: lr.lr_cohort,
    sourceVariantId: lr.source_variant_id,
  }
}

const aggregateTrFrequency = (variants: RawLongReadVariant[]) => {
  const declaredCounts = new Set(variants.map((variant) => variant.alt_count))
  const declaredCount = declaredCounts.size === 1 ? variants[0].alt_count : null
  const altIndices = variants.map((variant) => variant.alt_index)
  const completeExactAltSet =
    Number.isSafeInteger(declaredCount) &&
    declaredCount === variants.length &&
    new Set(altIndices).size === variants.length &&
    altIndices.every(
      (index) => Number.isSafeInteger(index) && index! >= 1 && index! <= declaredCount!
    )

  const frequencies = variants.map((variant) => variant.freq?.all)
  const ans = frequencies.map((frequency) => frequency?.an)
  const invariantAn = new Set(ans).size === 1 ? ans[0] : null
  const validAlleles = frequencies.every((frequency) => {
    if (
      !frequency ||
      !Number.isFinite(frequency.ac) ||
      !Number.isFinite(frequency.an) ||
      !Number.isFinite(frequency.af) ||
      frequency.ac < 0 ||
      frequency.an <= 0
    ) {
      return false
    }
    return Math.abs(frequency.af - frequency.ac / frequency.an) <= 1e-6
  })
  const ac = validAlleles ? frequencies.reduce((sum, frequency) => sum + frequency!.ac, 0) : null

  if (
    !completeExactAltSet ||
    !validAlleles ||
    !Number.isFinite(invariantAn) ||
    invariantAn! <= 0 ||
    ac === null ||
    ac > invariantAn!
  ) {
    return { ac: null, an: null, af: null }
  }
  return { ac, an: invariantAn!, af: ac / invariantAn! }
}

const exactSharedLabel = (values: Array<string | null | undefined>) => {
  const labels = Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean)))
  return labels.length === 1 ? labels[0] : null
}

const trLocusLabel = (group: TrLocusGroup, options: LongReadMergeOptions): string => {
  const catalogLabel = exactSharedLabel(group.variants.map((variant) => variant.gnomad_str))
  const label = catalogLabel || options.geneSymbol?.trim()
  if (label) return `${label} tandem-repeat locus`

  const envelope = trLocusDisplayEnvelope(group.locus)
  const motifs = group.locus.components.map((component) => component.motif).join('+')
  return `${
    envelope.chrom
  }:${envelope.start1.toLocaleString()}–${envelope.end1.toLocaleString()} ${motifs} tandem-repeat locus`
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
  lrVariants: RawLongReadVariant[],
  options: LongReadMergeOptions = {}
): (T & {
  long_read?: LongReadSequencingTypeData | null
  long_read_details?: LongReadVariantDetails | null
  long_read_alleles?: LongReadVariantDetails[]
})[] => {
  if (!lrVariants || lrVariants.length === 0) {
    return srVariants
  }

  // Clone SR variants so we don't mutate the originals
  const srMap = new Map<
    string,
    T & {
      long_read?: LongReadSequencingTypeData | null
      long_read_details?: LongReadVariantDetails | null
      long_read_alleles?: LongReadVariantDetails[]
    }
  >()
  const result = srVariants.map((v) => {
    const cloned = { ...v }
    srMap.set(v.variant_id, cloned)
    return cloned
  })

  const trGroups = new Map<string, TrLocusGroup>()

  lrVariants.forEach((lr) => {
    const matchId = lr.short_read_match_id
    if (matchId && srMap.has(matchId)) {
      const longRead = buildLongReadData(lr)
      const longReadDetails = buildLongReadDetails(lr)
      // Keep the standard row's primary ID/link owned by the short-read
      // allele. Preserve every exact LR match separately; never construct an
      // LR route from the SR variant_id or silently overwrite another ALT.
      const srVariant = srMap.get(matchId)!
      srVariant.long_read_alleles = [...(srVariant.long_read_alleles || []), longReadDetails]
      if (!srVariant.long_read_details) {
        srVariant.long_read = longRead
        srVariant.long_read_details = longReadDetails
      }
      return
    }

    const identity = exactTrGroupIdentity(lr)
    if (identity) {
      const group = trGroups.get(identity.key) || { ...identity, variants: [] }
      group.variants.push(lr)
      trGroups.set(identity.key, group)
    }
  })

  const emittedTrGroups = new Set<string>()
  const lrOnlyVariants: any[] = []
  lrVariants.forEach((lr) => {
    const matchId = lr.short_read_match_id
    if (matchId && srMap.has(matchId)) return

    const identity = exactTrGroupIdentity(lr)
    if (identity) {
      if (emittedTrGroups.has(identity.key)) return
      emittedTrGroups.add(identity.key)
      const group = trGroups.get(identity.key)!
      const first = group.variants[0]
      const longReadAlleles = group.variants.map(buildLongReadDetails)
      const frequency = aggregateTrFrequency(group.variants)
      const filters = Array.from(
        new Set(group.variants.flatMap((variant) => variant.filters || []))
      )
      const label = trLocusLabel(group, options)
      const loadedAltCount = group.variants.length
      const sourceAltCount = exactSharedLabel(
        group.variants.map((variant) =>
          Number.isSafeInteger(variant.alt_count) ? String(variant.alt_count) : null
        )
      )

      lrOnlyVariants.push({
        variant_id: `lr-tr-locus:${group.cohort}:${group.locus.canonicalId}:${group.sourceVariantId}`,
        source_variant_id: group.sourceVariantId,
        alt_index: null,
        alt_count: loadedAltCount,
        lr_cohort: group.cohort,
        reference_genome: first.reference_genome || 'GRCh38',
        chrom: first.chrom || group.locus.components[0].chrom,
        pos: first.pos,
        ref: '',
        alt: '',
        rsids: Array.from(new Set(group.variants.flatMap((variant) => variant.rsids || []))),
        flags: filters,
        consequence: null,
        hgvs: null,
        hgvsc: null,
        hgvsp: null,
        lof: null,
        lof_filter: null,
        lof_flags: null,
        transcript_id: null,
        transcript_version: null,
        transcript_consequence: null,
        exome: null,
        genome: null,
        joint: null,
        faf95_joint: { popmax: null, popmax_population: null },
        in_silico_predictors: null,
        lof_curation: null,
        clinvar: null,
        long_read: {
          ...frequency,
          filters,
          populations: [],
        },
        long_read_details: {
          ...buildLongReadDetails(first),
          variant_id: undefined,
          alt_index: null,
          alt_count: loadedAltCount,
          ref: null,
          alt: null,
          is_likely_tr: true,
          tr_locus_id: group.locus.canonicalId,
        },
        long_read_alleles: longReadAlleles,
        is_long_read_tr_locus: true,
        long_read_tr_locus_id: group.locus.canonicalId,
        long_read_tr_source_variant_id: group.sourceVariantId,
        long_read_tr_alt_count: loadedAltCount,
        long_read_tr_source_alt_count: sourceAltCount ? Number(sourceAltCount) : null,
        long_read_tr_label: label,
        long_read_tr_tooltip: `${label}; ${loadedAltCount} exact ALT allele${
          loadedAltCount === 1 ? '' : 's'
        } loaded from source record ${group.sourceVariantId}; locus ID ${group.locus.canonicalId}`,
        long_read_tr_aggregation_valid: frequency.an !== null,
      })
      return
    }

    // Synthesize an ordinary row for non-TR LR-only data or for a TR allele
    // without an exact authoritative locus/source identity.
    const chrom = lr.chrom || chromFromVariantId(lr.variant_id)
    const tc = mapTranscriptConsequence(lr)
    lrOnlyVariants.push({
      variant_id: lr.variant_id,
      source_variant_id: lr.source_variant_id,
      alt_index: lr.alt_index,
      alt_count: lr.alt_count,
      lr_cohort: lr.lr_cohort || 'hgsvc_hprc',
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
      long_read: buildLongReadData(lr),
      long_read_details: buildLongReadDetails(lr),
    })
  })

  return [...result, ...lrOnlyVariants]
}

export default mergeLongReadVariants
