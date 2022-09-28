import { ReferenceGenome } from '@gnomad/dataset-metadata/metadata'

export type GeneMetadata = {
  gene_id: string
  gene_version: string
  symbol: string
  mane_select_transcript?: {
    ensembl_id: string
    ensembl_version: string
    refseq_id: string
    refseq_version: string
  }
  canonical_transcript_id: string | null
  flags: string[]
}

export type Gene = GeneMetadata & {
  reference_genome: ReferenceGenome
  name?: string
  chrom: string
  strand: Strand
  start: number
  stop: number
  exons: {
    feature_type: string
    start: number
    stop: number
  }[]
  transcripts: {
    transcript_id: string
    transcript_version: string
    exons: {
      feature_type: string
      start: number
      stop: number
    }[]
  }[]
  flags: string[]
  gnomad_constraint?: GnomadConstraint
  exac_constraint?: ExacConstraint
  pext?: {
    regions: {
      start: number
      stop: number
      mean: number
      tissues: {
        [key: string]: number
      }
    }[]
    flags: string[]
  }
  short_tandem_repeats?: {
    id: string
  }[]
  exac_regional_missense_constraint_regions?: any
}

export type Transcript = {
  transcript_id: string
  transcript_version: string
  reference_genome: ReferenceGenome
  chrom: string
  strand: Strand
  start: number
  stop: number
  exons: {
    feature_type: string
    start: number
    stop: number
  }[]
  gnomad_constraint?: GnomadConstraint
  exac_constraint?: ExacConstraint
  gene: GeneMetadata
}

export type Strand = '+' | '-'
