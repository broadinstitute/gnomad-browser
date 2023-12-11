import { Factory } from 'fishery'
import { VariantTableVariant } from '../VariantList/ExportVariantsButton'
import {
  Variant,
  SequencingType,
  TranscriptConsequence,
  Histogram,
  Population,
} from '../VariantPage/VariantPage'

export const defaultHistogram: Histogram = {
  bin_edges: [0.5],
  bin_freq: [100],
  n_larger: 1,
  n_smaller: 1,
}

const transcriptConsequenceFactory = Factory.define<TranscriptConsequence>(({ params }) => {
  const {
    consequence_terms = ['lof', 'plof'],
    domains = ['aaa', 'bbb'],
    gene_id = 'ENSG012345',
    gene_version = '1',
    gene_symbol = 'ABC1',
    hgvs = '',
    hgvsc = '',
    hgvsp = '',
    is_canonical = false,
    is_mane_select = false,
    is_mane_select_version = false,
    lof = '',
    lof_flags = '',
    lof_filter = '',
    major_consequence = '',
    polyphen_prediction = '',
    refseq_id = '',
    refseq_version = '',
    sift_prediction = '',
    transcript_id = 'ENST012345',
    transcript_version = '1',

    canonical = false,
  } = params

  return {
    consequence_terms,
    domains,
    gene_id,
    gene_version,
    gene_symbol,
    hgvs,
    hgvsc,
    hgvsp,
    is_canonical,
    is_mane_select,
    is_mane_select_version,
    lof,
    lof_flags,
    lof_filter,
    major_consequence,
    polyphen_prediction,
    refseq_id,
    refseq_version,
    sift_prediction,
    transcript_id,
    transcript_version,
    canonical,
  }
})

export const variantFactory = Factory.define<Variant>(({ params, associations }) => {
  const {
    reference_genome = 'GRCh37',
    variant_id = '13-123-A-C',
    caid = null,
    pos = 123,
    ref = 'A',
    alt = 'C',
    chrom = '13',
    flags = [],
    lof_curations = null,
    in_silico_predictors = null,
    rsids = null,
    colocated_variants = [],
    liftover = null,
    liftover_sources = null,
  } = params

  const {
    exome = null,
    genome = null,
    non_coding_constraint = null,
    clinvar = null,
    coverage = { exome: null, genome: null },
    transcript_consequences = [],
    faf95_joint = {
      popmax: 1,
      popmax_population: 'nfe',
    },
  } = associations
  return {
    reference_genome,
    variant_id,
    chrom,
    caid,
    pos,
    ref,
    alt,
    flags,
    clinvar,
    exome,
    genome,
    lof_curations,
    in_silico_predictors,
    non_coding_constraint,
    rsids,
    colocated_variants,
    faf95_joint,
    transcript_consequences,
    coverage,
    liftover,
    liftover_sources,
  }
})

export const populationFactory = Factory.define<Population>(({ params }) => {
  const { id = 'afr', ac = 1, an = 1, ac_hemi = 1, ac_hom = 1 } = params

  return {
    id,
    ac,
    an,
    ac_hemi,
    ac_hom,
  }
})

export const variantTableVariantFactory = Factory.define<VariantTableVariant>(
  ({ params, associations }) => {
    const {
      ac = 1,
      ac_hemi = 1,
      ac_hom = 1,
      an = 1,
      af = 1,
      consequence = 'synonymous',
      flags = [],
      hgvs = 'string',
      hgvsc = 'string',
      hgvsp = 'string',
      populations = [],
      pos = 1,
      rsids = [],
      variant_id = '',
    } = params

    const {
      exome = {
        filters: [],
      },
      genome = {
        filters: [],
      },
    } = associations

    return {
      ac,
      ac_hemi,
      ac_hom,
      an,
      af,
      consequence,
      flags,
      hgvs,
      hgvsc,
      hgvsp,
      populations,
      pos,
      rsids,
      variant_id,
      exome,
      genome,
    }
  }
)

export const sequencingFactory = Factory.define<SequencingType>(({ params, associations }) => {
  const {
    ac = 1,
    an = 1,
    homozygote_count = null,
    hemizygote_count = null,
    filters = [],
    populations = [],
    local_ancestry_populations = [],
    ac_hemi = 1,
    ac_hom = 1,
  } = params

  const {
    age_distribution = { het: defaultHistogram, hom: defaultHistogram },
    quality_metrics = {
      site_quality_metrics: [],
      allele_balance: { alt: defaultHistogram },
      genotype_depth: { all: defaultHistogram, alt: defaultHistogram },
      genotype_quality: { all: defaultHistogram, alt: defaultHistogram },
    },
    faf95 = {
      popmax: 1,
      popmax_population: 'nfe',
    },
  } = associations

  return {
    ac,
    an,
    ac_hemi,
    ac_hom,
    homozygote_count,
    hemizygote_count,
    filters,
    populations,
    local_ancestry_populations,
    age_distribution,
    quality_metrics,
    faf95,
  }
})

export const v2SequencingFactory = sequencingFactory.associations({
  quality_metrics: {
    allele_balance: { alt: defaultHistogram },
    genotype_depth: { all: defaultHistogram, alt: defaultHistogram },
    genotype_quality: { all: defaultHistogram, alt: defaultHistogram },
    site_quality_metrics: [
      { metric: 'BaseQRankSum', value: 1 },
      { metric: 'ClippingRankSum', value: 1 },
      { metric: 'DP', value: 1 },
      { metric: 'FS', value: 1 },
      { metric: 'InbreedingCoeff', value: 1 },
      { metric: 'MQ', value: 1 },
      { metric: 'MQRankSum', value: 1 },
      { metric: 'pab_max', value: 1 },
      { metric: 'QD', value: 1 },
      { metric: 'ReadPosRankSum', value: 1 },
      { metric: 'RF', value: 1 },
      { metric: 'SiteQuality', value: 1 },
      { metric: 'SOR', value: 1 },
      { metric: 'VQSLOD', value: 1 },
    ],
  },
})

export const v3SequencingFactory = sequencingFactory.associations({
  quality_metrics: {
    allele_balance: { alt: defaultHistogram },
    genotype_depth: { all: defaultHistogram, alt: defaultHistogram },
    genotype_quality: { all: defaultHistogram, alt: defaultHistogram },
    site_quality_metrics: [
      { metric: 'SiteQuality', value: 1 },
      { metric: 'InbreedingCoeff', value: 1 },
      { metric: 'AS_FS', value: 1 },
      { metric: 'AS_MQ', value: 1 },
      { metric: 'AS_MQRankSum', value: 1 },
      { metric: 'AS_pab_max', value: 1 },
      { metric: 'AS_QUALapprox', value: 1 },
      { metric: 'AS_QD', value: 1 },
      { metric: 'AS_ReadPosRankSum', value: 1 },
      { metric: 'AS_SOR', value: 1 },
      { metric: 'AS_VarDP', value: 1 },
      { metric: 'AS_VQSLOD', value: 1 },
    ],
  },
})

export const v2VariantFactory = variantFactory.params({ reference_genome: 'GRCh37' }).associations({
  exome: v2SequencingFactory.build(),
  genome: null,
  transcript_consequences: [
    transcriptConsequenceFactory
      .params({ is_canonical: true, transcript_id: 'ENST123456' })
      .build(),
    transcriptConsequenceFactory.build(),
  ],
})

export const v3VariantFactory = variantFactory.params({ reference_genome: 'GRCh38' }).associations({
  exome: null,
  genome: v3SequencingFactory.build(),
  transcript_consequences: [
    transcriptConsequenceFactory
      .params({ is_canonical: true, transcript_id: 'ENST123456' })
      .build(),
    transcriptConsequenceFactory.build(),
  ],
})
