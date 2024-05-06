type Locus = {
  contig: string
  position: number
}

type Variant = {
  locus: Locus
  alleles: string[]
}

type AlleleFrequency = {
  ac: number
  ac_raw: number
  an: number
  hemizygote_count: number
  homozygote_count: number
  ancestry_groups: AncestryGroup[]
}

type AncestryGroup = {
  id: string
  ac: number
  an: number
  hemizygote_count: number
  homozygote_count: number
}

type Frequency = {
  [key: string]: AlleleFrequency
}

type FAF = {
  popmax_population: string
  popmax: number
}

type AgeDistribution = {
  bin_edges: number[]
  bin_freq: number[]
  n_smaller: number
  n_larger: number
}

type HistogramBin = {
  bin_edges: number[]
  bin_freq: number[]
  n_smaller: number
  n_larger: number
}

type QualityMetrics = {
  allele_balance: {
    alt: HistogramBin
  }
  genotype_depth: {
    alt: HistogramBin
    all: HistogramBin
  }
  genotype_quality: {
    alt: HistogramBin
    all: HistogramBin
  }
  site_quality_metrics: SiteQualityMetric[]
}

type SiteQualityMetric = {
  metric: string
  value: number
}

type CoverageStats = {
  mean: number
  median: number
  [key: string]: number
}

type Coverage = {
  exome: CoverageStats
  genome: CoverageStats
}

type TranscriptConsequence = {
  biotype: string
  consequence_terms: string[]
  gene_id: string
  gene_symbol: string
  hgvsc: string
  is_canonical: boolean
  major_consequence: string
  transcript_id: string
  transcript_version: string
  gene_version: string
  is_mane_select?: boolean
  is_mane_select_version?: boolean
  refseq_id?: string
  refseq_version?: string
}

type InSilicoPredictor = {
  id: string
  value: string
  flags: string[]
}

type ExomeData = {
  colocated_variants: {
    all: string[]
    non_ukb: string[]
  }
  subsets: string[]
  flags: string[]
  freq: Frequency
  faf95: FAF
  faf99: FAF
  fafmax: {
    gnomad: FAF
    non_ukb: FAF
  }
  age_distribution: {
    het: AgeDistribution
    hom: AgeDistribution
  }
  filters: string[]
  quality_metrics: QualityMetrics
  ac: number
  ac_raw: number
  an: number
  hemizygote_count: number
  homozygote_count: number
  ancestry_groups: AncestryGroup[]
  populations: AncestryGroup[]
  local_ancestry_populations: any[]
}

type GnomadData = {
  locus: Locus
  alleles: string[]
  exome: ExomeData
  rsids: string[]
  in_silico_predictors: InSilicoPredictor[]
  variant_id: string
  faf95_joint: FAF
  faf99_joint: FAF
  colocated_variants: string[]
  coverage: Coverage
  transcript_consequences: TranscriptConsequence[]
  document_id: string
  reference_genome: string
  chrom: string
  pos: number
  ref: string
  alt: string
  flags: string[]
}

export const POPULATION_NAMES: Record<string, string> = {
  afr: 'African/African-American',
  ami: 'Amish',
  amr: 'Admixed American',
  asj: 'Ashkenazi Jewish',
  eas: 'East Asian',
  eur: 'European',
  fin: 'Finnish',
  mid: 'Middle Eastern',
  nfe: 'Non-Finnish European',
  oth: 'Other',
  remaining: 'Remaining individuals',
  sas: 'South Asian',
  uniform: 'Uniform',
  sas_non_consang: 'South Asian (F < 0.05)',
  consanguineous: 'South Asian (F > 0.05)',
  exac: 'ExAC',
  bgr: 'Bulgarian (Eastern European)',
  est: 'Estonian',
  gbr: 'British',
  nwe: 'North-Western European',
  seu: 'Southern European',
  swe: 'Swedish',
  kor: 'Korean',
  sgp: 'Singaporean',
  jpn: 'Japanese',
  oea: 'Other East Asian',
  oeu: 'Other European',
  onf: 'Other Non-Finnish European',
  unk: 'Unknown',
}

export interface GnomadVariant {
  locus: {
    contig: string
    position: number
    reference_genome: string
  }
  alleles: string[]
  va: any
  vrs: any
}

export interface CohortAlleleFrequency {
  id: string
  type: string
  label: string
  focusAllele: FocusAllele
  focusAlleleCount: number
  locusAlleleCount: number
  alleleFrequency: number
  cohort: {
    id: string
  }
  ancillaryResults: {
    grpMaxFAF95?: FAF95
    homozygotes: number
    jointGrpMaxFAF95?: FAF95
  }
  subcohortFrequency: CohortAlleleFrequency[]
  qualityMeasures: QualityMeasures
}

export interface FocusAllele {
  _id: string
  location: {
    _id: string
    interval: SequenceInterval
    sequence_id: string
    type: string
  }
  state: {
    sequence: string
    type: string
  }
  type: string
}

export interface FAF95 {
  frequency: number
  confidenceInterval: number
  groupId: string
}

export interface SequenceInterval {
  start: {
    type: string
    value: number
  }
  end: {
    type: string
    value: number
  }
  type: string
}

export interface QualityMeasures {
  qcFilters: string[]
  meanDepth: number
  fractionCoverage20x: number
}

export interface GksVrsVariant {
  _id: string
  location: {
    _id: string
    interval: SequenceInterval
    sequence_id: string
    type: string
  }
  state: {
    sequence: string
    type: string
  }
  type: string
}

export interface VaShaperReturnType {
  locus: {
    contig: string
    position: number
    reference_genome: string
  }
  alleles: string[]
  va: CohortAlleleFrequency
  vrs: GksVrsVariant
}

export function vaShaper(elasticsearchResponse: GnomadData): VaShaperReturnType {
  const { locus, alleles, exome, variant_id, flags, coverage, faf95_joint } = elasticsearchResponse
  const { contig, position } = locus

  const focusAllele = {
    _id: `ga4gh:VA.${variant_id}`,
    location: {
      _id: `ga4gh:SL.${variant_id}`,
      interval: {
        start: { type: 'Number', value: locus.position },
        end: { type: 'Number', value: locus.position },
        type: 'SequenceInterval',
      },
      sequence_id: `ga4gh:SQ.${locus.contig}`,
      type: 'SequenceLocation',
    },
    state: {
      sequence: alleles[1],
      type: 'LiteralSequenceExpression',
    },
    type: 'Allele',
  }

  const gks_va_freq: any = {
    id: variant_id,
    type: 'CohortAlleleFrequency',
    label: `Overall Cohort Allele Frequency for ${variant_id}`,
    focusAllele,
    focusAlleleCount: exome.ac,
    locusAlleleCount: exome.an,
    alleleFrequency: exome.freq.all.ac / exome.freq.all.an,
    cohort: {
      id: 'ALL',
    },
    ancillaryResults: {
      grpMaxFAF95: exome.faf95
        ? {
            frequency: exome.faf95.popmax,
            confidenceInterval: 0.95,
            groupId: `chr${locus.contig}-${locus.position}-${alleles[0]}-${alleles[1]}.${exome.faf95.popmax_population}`,
          }
        : undefined,
      homozygotes: exome.homozygote_count,
      jointGrpMaxFAF95: faf95_joint
        ? {
            frequency: faf95_joint.popmax,
            confidenceInterval: 0.95,
            groupId: `chr${locus.contig}-${locus.position}-${alleles[0]}-${alleles[1]}.${faf95_joint.popmax_population}`,
          }
        : undefined,
    },
    subcohortFrequency: exome.ancestry_groups.map((group: AncestryGroup) => ({
      id: `chr${locus.contig}-${locus.position}-${alleles[0]}-${
        alleles[1]
      }.${group.id.toUpperCase()}`,
      type: 'CohortAlleleFrequency',
      label: `${POPULATION_NAMES[group.id]} Cohort Allele Frequency for ${variant_id}`,
      focusAllele,
      focusAlleleCount: group.ac,
      locusAlleleCount: group.an,
      alleleFrequency: group.ac / group.an,
      cohort: {
        id: group.id.toUpperCase(),
        label: POPULATION_NAMES[group.id],
      },
      ancillaryResults: {
        grpMaxFAF95: exome.faf95
          ? {
              frequency: exome.faf95.popmax,
              confidenceInterval: 0.95,
              groupId: `chr${locus.contig}-${locus.position}-${alleles[0]}-${alleles[1]}.${exome.faf95.popmax_population}`,
            }
          : undefined,
        homozygotes: exome.homozygote_count,
        jointGrpMaxFAF95: faf95_joint
          ? {
              frequency: faf95_joint.popmax,
              confidenceInterval: 0.95,
              groupId: `chr${locus.contig}-${locus.position}-${alleles[0]}-${alleles[1]}.${faf95_joint.popmax_population}`,
            }
          : undefined,
      },
    })),
    qualityMeasures: {
      qcFilters: flags,
      meanDepth: coverage.exome.mean,
      fractionCoverage20x: coverage.exome.over_20,
    },
  }

  const gks_vrs_variant: any = {
    _id: `ga4gh:VA.${variant_id}`,
    location: {
      _id: `ga4gh:VSL.${variant_id}`,
      interval: {
        start: { type: 'Number', value: position },
        end: { type: 'Number', value: position },
        type: 'SequenceInterval',
      },
      sequence_id: `ga4gh:SQ.${contig}`,
      type: 'SequenceLocation',
    },
    state: { sequence: alleles[1], type: 'LiteralSequenceExpression' },
    type: 'Allele',
  }

  return {
    locus: {
      contig,
      position,
      reference_genome: 'GRCh38',
    },
    alleles,
    va: gks_va_freq,
    vrs: gks_vrs_variant,
  }
}
