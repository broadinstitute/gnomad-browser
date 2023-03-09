import { Factory } from 'fishery'
import { Variant, SequencingType } from '../VariantPage/VariantPage'

const defaultHistogram = {
  bin_edges: [0.5],
  bin_freq: [100],
  n_larger: 0,
  n_smaller: 0,
}

const variantFactory = Factory.define<Variant>(({ params, associations }) => {
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
    transcript_consequences = [],
    liftover = null,
    liftover_sources = null,
  } = params

  const {
    exome = null,
    genome = null,
    non_coding_constraint = null,
    clinvar = null,
    coverage = { exome: null, genome: null },
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
    transcript_consequences,
    coverage,
    liftover,
    liftover_sources,
  }
})

export const sequencingFactory = Factory.define<SequencingType>(({ params, associations }) => {
  const {
    ac = 0,
    an = 0,
    homozygote_count = null,
    hemizygote_count = null,
    filters = [],
    populations = [],
    local_ancestry_populations = [],
    ac_hemi = 0,
    ac_hom = 0,
  } = params

  const {
    age_distribution = { het: defaultHistogram, hom: defaultHistogram },
    quality_metrics = {
      site_quality_metrics: [],
      allele_balance: { alt: defaultHistogram },
      genotype_depth: { all: defaultHistogram, alt: defaultHistogram },
      genotype_quality: { all: defaultHistogram, alt: defaultHistogram },
    },
    faf95 = { popmax: 0, popmax_population: 'nfe' },
  } = associations

  return {
    ac,
    an,
    homozygote_count,
    hemizygote_count,
    filters,
    populations,
    local_ancestry_populations,
    age_distribution,
    quality_metrics,
    ac_hemi,
    ac_hom,
    faf95,
  }
})

export const v3SequencingFactory = sequencingFactory.associations({
  quality_metrics: {
    allele_balance: { alt: defaultHistogram },
    genotype_depth: { all: defaultHistogram, alt: defaultHistogram },
    genotype_quality: { all: defaultHistogram, alt: defaultHistogram },
    site_quality_metrics: [
      { metric: 'SiteQuality', value: 0 },
      { metric: 'InbreedingCoeff', value: 0 },
      { metric: 'AS_FS', value: 0 },
      { metric: 'AS_MQ', value: 0 },
      { metric: 'AS_MQRankSum', value: 0 },
      { metric: 'AS_pab_max', value: 0 },
      { metric: 'AS_QUALapprox', value: 0 },
      { metric: 'AS_QD', value: 0 },
      { metric: 'AS_ReadPosRankSum', value: 0 },
      { metric: 'AS_SOR', value: 0 },
      { metric: 'AS_VarDP', value: 0 },
      { metric: 'AS_VQSLOD', value: 0 },
    ],
  },
})

export const v3VariantFactory = variantFactory
  .params({ reference_genome: 'GRCh38' })
  .associations({ exome: null, genome: v3SequencingFactory.build() })

export default variantFactory
