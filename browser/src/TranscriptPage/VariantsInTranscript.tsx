import React from 'react'

import { Badge } from '@gnomad/ui'

import ClinvarVariantTrack from '../ClinvarVariantsTrack/ClinvarVariantTrack'
import formatClinvarDate from '../ClinvarVariantsTrack/formatClinvarDate'
import { labelForDataset, referenceGenomeForDataset } from '../datasets'
import Link from '../Link'
import Query from '../Query'
import filterVariantsInZoomRegion from '../RegionViewer/filterVariantsInZoomRegion'
import { TrackPageSection } from '../TrackPage'
import annotateVariantsWithClinvar from '../VariantList/annotateVariantsWithClinvar'
import Variants from '../VariantList/Variants'

type OwnVariantsInTranscriptProps = {
  clinvarReleaseDate: string
  clinvarVariants?: any[]
  datasetId: string
  includeUTRs: boolean
  transcript: {
    transcript_id: string
    chrom: string
    start: number
    stop: number
    exons: {
      feature_type: string
      start: number
      stop: number
    }[]
  }
  variants: any[]
  zoomRegion?: {
    start: number
    stop: number
  }
}

// @ts-expect-error TS(2456) FIXME: Type alias 'VariantsInTranscriptProps' circularly ... Remove this comment to see the full error message
type VariantsInTranscriptProps = OwnVariantsInTranscriptProps &
  typeof VariantsInTranscript.defaultProps

// @ts-expect-error TS(7022) FIXME: 'VariantsInTranscript' implicitly has type 'any' b... Remove this comment to see the full error message
const VariantsInTranscript = ({
  clinvarReleaseDate,
  clinvarVariants,
  datasetId,
  includeUTRs,
  transcript,
  variants,
  zoomRegion,
}: VariantsInTranscriptProps) => {
  const isCodingTranscript = transcript.exons.some((exon: any) => exon.feature_type === 'CDS')

  const datasetLabel = labelForDataset(datasetId)

  return (
    <>
      <TrackPageSection>
        <h2>ClinVar variants</h2>
      </TrackPageSection>
      {clinvarVariants.length > 0 ? (
        <>
          <ClinvarVariantTrack
            referenceGenome={referenceGenomeForDataset(datasetId)}
            transcripts={[transcript]}
            variants={filterVariantsInZoomRegion(clinvarVariants, zoomRegion)}
          />
          <TrackPageSection as="p">
            Data displayed here is from ClinVar&apos;s {formatClinvarDate(clinvarReleaseDate)}{' '}
            release.
          </TrackPageSection>
        </>
      ) : (
        <TrackPageSection as="p">No ClinVar variants found in this transcript.</TrackPageSection>
      )}

      <Variants
        clinvarReleaseDate={clinvarReleaseDate}
        context={transcript}
        datasetId={datasetId}
        exportFileName={`${datasetLabel}_${transcript.transcript_id}`}
        variants={filterVariantsInZoomRegion(variants, zoomRegion)}
      >
        {isCodingTranscript ? (
          <p>
            <Badge level={includeUTRs ? 'warning' : 'info'}>
              {includeUTRs ? 'Warning' : 'Note'}
            </Badge>{' '}
            Only variants located in or within 75 base pairs of a coding exon are shown here. To see
            variants in UTRs or introns, use the{' '}
            <Link to={`/region/${transcript.chrom}-${transcript.start}-${transcript.stop}`}>
              region view
            </Link>
            .
          </p>
        ) : (
          <p>
            <Badge level="info">Note</Badge> Only variants located in or within 75 base pairs of an
            exon are shown here. To see variants in introns, use the{' '}
            <Link to={`/region/${transcript.chrom}-${transcript.start}-${transcript.stop}`}>
              region view
            </Link>
            .
          </p>
        )}
      </Variants>
    </>
  )
}

VariantsInTranscript.defaultProps = {
  clinvarVariants: null,
  zoomRegion: null,
}

const query = `
query VariantsInTranscript($transcriptId: String!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
  meta {
    clinvar_release_date
  }
  transcript(transcript_id: $transcriptId, reference_genome: $referenceGenome) {
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
      exome {
        ac
        ac_hemi
        ac_hom
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
      }
      genome {
        ac
        ac_hemi
        ac_hom
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
      }
    }
  }
}`

type ConnectedVariantsInTranscriptProps = {
  datasetId: string
  transcript: {
    transcript_id: string
  }
}

const ConnectedVariantsInTranscript = ({
  datasetId,
  transcript,
  ...otherProps
}: ConnectedVariantsInTranscriptProps) => (
  <Query
    query={query}
    variables={{
      datasetId,
      transcriptId: transcript.transcript_id,
      referenceGenome: referenceGenomeForDataset(datasetId),
    }}
    loadingMessage="Loading variants"
    errorMessage="Unable to load variants"
    success={(data: any) => data.transcript && data.transcript.variants}
  >
    {({ data }: any) => {
      return (
        <VariantsInTranscript
          {...otherProps}
          clinvarReleaseDate={data.meta.clinvar_release_date}
          clinvarVariants={data.transcript.clinvar_variants}
          datasetId={datasetId}
          transcript={transcript}
          variants={annotateVariantsWithClinvar(
            data.transcript.variants,
            data.transcript.clinvar_variants
          )}
        />
      )
    }}
  </Query>
)

export default ConnectedVariantsInTranscript
