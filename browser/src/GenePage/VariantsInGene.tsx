import React, { useState } from 'react'

import { Badge, List, ListItem, Modal, TextButton } from '@gnomad/ui'

import { DatasetId, labelForDataset, referenceGenome } from '@gnomad/dataset-metadata/metadata'
import ClinvarVariantTrack from '../ClinvarVariantsTrack/ClinvarVariantTrack'
import formatClinvarDate from '../ClinvarVariantsTrack/formatClinvarDate'
import Link from '../Link'
import Query from '../Query'
import filterVariantsInZoomRegion from '../RegionViewer/filterVariantsInZoomRegion'
import { TrackPageSection } from '../TrackPage'
import annotateVariantsWithClinvar from '../VariantList/annotateVariantsWithClinvar'
import Variants from '../VariantList/Variants'
import { Pext } from './GenePage'

type TranscriptsModalProps = {
  gene: {
    symbol: string
    transcripts: {
      transcript_id: string
      transcript_version: string
      exons: {
        feature_type: string
        start: number
        stop: number
      }[]
    }[]
  }
  onRequestClose: (...args: any[]) => any
}

const TranscriptsModal = ({ gene, onRequestClose }: TranscriptsModalProps) => (
  <Modal
    // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; initialFocusOnButton: b... Remove this comment to see the full error message
    initialFocusOnButton={false}
    title={`${gene.symbol} transcripts`}
    onRequestClose={onRequestClose}
  >
    {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
    <List>
      {gene.transcripts.map((transcript) => (
        // @ts-expect-error TS(2769) FIXME: No overload matches this call.
        <ListItem key={transcript.transcript_id}>
          <Link to={`/transcript/${transcript.transcript_id}`}>
            {transcript.transcript_id}.{transcript.transcript_version}
          </Link>
        </ListItem>
      ))}
    </List>
  </Modal>
)

type OwnVariantsInGeneProps = {
  clinvarReleaseDate: string
  clinvarVariants?: any[]
  datasetId: DatasetId
  gene: {
    gene_id: string
    symbol: string
    reference_genome: 'GRCh37' | 'GRCh38'
    chrom: string
    start: number
    stop: number
    transcripts: {
      transcript_id: string
      transcript_version: string
      exons: {
        feature_type: string
        start: number
        stop: number
      }[]
    }[]
    canonical_transcript_id?: string
    mane_select_transcript?: {
      ensembl_id: string
    }
  }
  includeNonCodingTranscripts: boolean
  includeUTRs: boolean
  variants: any[]
  zoomRegion?: {
    start: number
    stop: number
  }
  hasOnlyNonCodingTranscripts?: boolean
}

// @ts-expect-error TS(2456) FIXME: Type alias 'VariantsInGeneProps' circularly refere... Remove this comment to see the full error message
type VariantsInGeneProps = OwnVariantsInGeneProps & typeof VariantsInGene.defaultProps

// @ts-expect-error TS(7022) FIXME: 'VariantsInGene' implicitly has type 'any' because... Remove this comment to see the full error message
const VariantsInGene = ({
  clinvarReleaseDate,
  clinvarVariants,
  datasetId,
  gene,
  includeNonCodingTranscripts,
  includeUTRs,
  variants,
  zoomRegion,
  hasOnlyNonCodingTranscripts,
}: VariantsInGeneProps) => {
  const datasetLabel = labelForDataset(datasetId)

  const [isTranscriptsModalOpen, setIsTranscriptsModalOpen] = useState(false)

  return (
    <>
      <TrackPageSection>
        <h2>ClinVar variants</h2>
      </TrackPageSection>
      {clinvarVariants.length > 0 ? (
        <>
          <ClinvarVariantTrack
            referenceGenome={referenceGenome(datasetId)}
            transcripts={gene.transcripts}
            variants={filterVariantsInZoomRegion(clinvarVariants, zoomRegion)}
          />
          <TrackPageSection as="p">
            Data displayed here is from ClinVar&apos;s {formatClinvarDate(clinvarReleaseDate)}{' '}
            release.
          </TrackPageSection>
        </>
      ) : (
        <TrackPageSection as="p">No ClinVar variants found in this gene.</TrackPageSection>
      )}

      <Variants
        clinvarReleaseDate={clinvarReleaseDate}
        context={gene}
        datasetId={datasetId}
        exportFileName={`${datasetLabel}_${gene.gene_id}`}
        variants={filterVariantsInZoomRegion(variants, zoomRegion)}
      >
        <p>
          <Badge level={includeNonCodingTranscripts || includeUTRs ? 'warning' : 'info'}>
            {includeNonCodingTranscripts || includeUTRs ? 'Warning' : 'Note'}
          </Badge>{' '}
          {hasOnlyNonCodingTranscripts && <>This gene has no coding transcripts. </>}
          Only variants located in or within 75 base pairs of{' '}
          {!hasOnlyNonCodingTranscripts ? <>a coding exon (CDS)</> : <>an exon</>} are shown here.
          To see variants {!hasOnlyNonCodingTranscripts ? <>in UTRs or introns</> : <>in introns</>}
          , use the <Link to={`/region/${gene.chrom}-${gene.start}-${gene.stop}`}>region view</Link>
          .
        </p>
        <p>
          The table below shows the HGVS consequence and VEP annotation for each variant&apos;s most
          severe consequence across all transcripts in this gene. Cases where the most severe
          consequence occurs in a{' '}
          {gene.reference_genome === 'GRCh37'
            ? 'non-canonical transcript'
            : 'non-MANE Select transcript (or non-canonical transcript if no MANE Select transcript exists)'}{' '}
          are denoted with †. To see consequences in a specific transcript, use the{' '}
          <TextButton
            onClick={() => {
              setIsTranscriptsModalOpen(true)
            }}
          >
            transcript view
          </TextButton>
          .
        </p>
        {isTranscriptsModalOpen && (
          <TranscriptsModal
            gene={gene}
            onRequestClose={() => {
              setIsTranscriptsModalOpen(false)
            }}
          />
        )}
      </Variants>
    </>
  )
}

VariantsInGene.defaultProps = {
  clinvarVariants: null,
  zoomRegion: null,
}

const operationName = 'VariantsInGene'
const query = `
query ${operationName}($geneId: String!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
  meta {
    clinvar_release_date
  }
  gene(gene_id: $geneId, reference_genome: $referenceGenome) {
    clinvar_variants {
      clinical_significance
      clinvar_variation_id
      gnomad {
        exome {
          ac
          an
          filters
        }
        genome {
          ac
          an
          filters
        }
      }
      gold_stars
      hgvsc
      hgvsp
      in_gnomad
      major_consequence
      pos
      review_status
      transcript_id
      variant_id
    }
    variants(dataset: $datasetId) {
      consequence
      flags
      hgvs
      hgvsc
      hgvsp
      lof
      lof_filter
      lof_flags
      pos
      rsids
      transcript_id
      transcript_version
      variant_id
      faf95_joint {
        popmax
        popmax_population
      }
      exome {
        ac
        ac_hemi
        ac_hom
        faf95 {
          popmax
          popmax_population
        }
        an
        af
        filters
        populations {
          id
          ac
          an
          ac_hemi
          ac_hom
        }
        fafmax {
          faf95_max
          faf95_max_gen_anc
          faf99_max
          faf99_max_gen_anc
        }
	flags
      }
      genome {
        ac
        ac_hemi
        ac_hom
        faf95 {
          popmax
          popmax_population
        }
        an
        af
        filters
        populations {
          id
          ac
          an
          ac_hemi
          ac_hom
        }
	flags
      }
      joint {
        ac
        hemizygote_count
        homozygote_count
        fafmax {
          faf95_max
          faf95_max_gen_anc
          faf99_max
          faf99_max_gen_anc
        }
        an
        filters
        populations {
          id
          ac
          an
          homozygote_count
          hemizygote_count
        }
      }
      in_silico_predictors {
        id
        value
        flags
      }
      lof_curation {
        verdict
        flags
      }
    }
  }
}`

const annotateVariantsWithPext = (variants: any, pext: any) => {
  const pextRegions = [...pext.regions]
  let currentPextRegion = pextRegions.shift()

  return variants.map((variant: any) => {
    while (pextRegions.length && variant.pos > currentPextRegion.stop) {
      currentPextRegion = pextRegions.shift()
    }

    if (
      currentPextRegion !== undefined &&
      currentPextRegion.start <= variant.pos &&
      variant.pos <= currentPextRegion.stop
    ) {
      return { ...variant, base_level_pext: currentPextRegion.mean }
    }

    return variant
  })
}

type ConnectedVariantsInGeneProps = {
  datasetId: DatasetId
  gene: {
    gene_id: string
    pext?: Pext
  }
} & VariantsInGeneProps

const ConnectedVariantsInGene = ({
  datasetId,
  gene,
  ...otherProps
}: ConnectedVariantsInGeneProps) => {
  return (
    <Query
      operationName={operationName}
      query={query}
      variables={{
        datasetId,
        geneId: gene.gene_id,
        referenceGenome: referenceGenome(datasetId),
      }}
      loadingMessage="Loading variants"
      errorMessage="Unable to load variants"
      success={(data: any) => data.gene && data.gene.variants}
    >
      {({ data }: any) => {
        let variants = annotateVariantsWithClinvar(data.gene.variants, data.gene.clinvar_variants)
        if (gene.pext) {
          variants = annotateVariantsWithPext(variants, gene.pext)
        }

        return (
          <VariantsInGene
            {...otherProps}
            clinvarReleaseDate={data.meta.clinvar_release_date}
            clinvarVariants={data.gene.clinvar_variants}
            datasetId={datasetId}
            gene={gene}
            variants={variants}
          />
        )
      }}
    </Query>
  )
}

export default ConnectedVariantsInGene
