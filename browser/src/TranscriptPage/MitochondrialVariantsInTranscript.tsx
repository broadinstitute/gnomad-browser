import React, { useMemo } from 'react'
import { Transcript } from './TranscriptPage'
import {
  referenceGenome,
  labelForDataset,
  DatasetId,
  hasMitochondrialVariants,
} from '@gnomad/dataset-metadata/metadata'
import ClinvarVariants from '../ClinvarVariantsTrack/ClinvarVariantTrack'
import { MitochondrialVariant } from '../MitochondrialVariantPage/MitochondrialVariantPage'
import useLinkedMitochondrialVariantSelection from '../MitochondrialVariantList/useLinkedMitochondrialVariantSelection'
import { ClinvarVariant } from '../VariantPage/VariantPage'
import Link from '../Link'
import Query from '../Query'
import filterVariantsInZoomRegion from '../RegionViewer/filterVariantsInZoomRegion'
import StatusMessage from '../StatusMessage'
import MitochondrialVariants from '../MitochondrialVariantList/MitochondrialVariants'
import annotateVariantsWithClinvar from '../VariantList/annotateVariantsWithClinvar'

const operationName = 'MitochondrialVariantsInTranscript'
const query = `
query ${operationName}($transcriptId: String!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
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
    mitochondrial_variants(dataset: $datasetId) {
      ac_het
      ac_hom
      an
      consequence
      filters
      flags
      gene_id
      gene_symbol
      transcript_id
      hgvsc
      hgvsp
      lof
      lof_filter
      lof_flags
      max_heteroplasmy
      pos
      reference_genome
      variant_id
    }
  }
}
`

type Props = {
  datasetId: DatasetId
  transcript: Transcript
  zoomRegion?: {
    start: number
    stop: number
  } | null
}

type MitochondrialVariantsInTranscriptProps = Props & {
  clinvarReleaseDate: string
  clinvarVariants: ClinvarVariant[] | null | undefined
  variants: MitochondrialVariant[]
}

const MitochondrialVariantsInTranscriptView = ({
  datasetId,
  transcript,
  clinvarReleaseDate,
  clinvarVariants,
  variants,
}: MitochondrialVariantsInTranscriptProps) => {
  const transcripts = useMemo(() => [transcript], [transcript])
  const selection = useLinkedMitochondrialVariantSelection({
    clinvarVariants,
    variants,
    context: transcript,
    clinvarReleaseDate,
  })

  return (
    <>
      <ClinvarVariants
        clinvarVariants={clinvarVariants}
        clinvarReleaseDate={clinvarReleaseDate}
        referenceGenome={referenceGenome(datasetId)}
        transcripts={transcripts}
        pageType="transcript"
        selection={selection.clinvar}
        sync={selection.sync}
      />
      <MitochondrialVariants
        context={transcript}
        exportFileName={`gnomad_mitochondrial_variants_${transcript.transcript_id}`}
        selection={selection.gnomad}
        sync={selection.sync}
      />
    </>
  )
}

const MitochondrialVariantsInTranscript = ({ datasetId, transcript, zoomRegion = null }: Props) => {
  if (!hasMitochondrialVariants(datasetId)) {
    return (
      <StatusMessage>
        Mitochondrial variants are not available in {labelForDataset(datasetId)}
        <br />
        <br />
        <Link
          to={`/transcript/${transcript.transcript_id}?dataset=gnomad_r3`}
          preserveSelectedDataset={false}
        >
          View this transcript in gnomAD v3.1 to see mitochondrial variants
        </Link>
      </StatusMessage>
    )
  }

  return (
    <Query
      operationName={operationName}
      query={query}
      variables={{
        datasetId,
        transcriptId: transcript.transcript_id,
        referenceGenome: referenceGenome(datasetId),
      }}
      loadingMessage="Loading variants"
      errorMessage="Unable to load variants"
      success={(data: any) => data.transcript && data.transcript.mitochondrial_variants}
    >
      {({ data }: any) => {
        data.transcript.mitochondrial_variants.forEach((v: any) => {
          /* eslint-disable no-param-reassign */
          if (v.an !== 0) {
            v.af = (v.ac_het + v.ac_hom) / v.an
            v.af_het = v.ac_het / v.an
            v.af_hom = v.ac_hom / v.an
          } else {
            v.af = 0
            v.af_het = 0
            v.af_hom = 0
          }
          v.hgvs = v.hgvsp || v.hgvsc
          /* eslint-enable no-param-reassign */
        })

        return (
          <MitochondrialVariantsInTranscriptView
            key={`${datasetId}:${referenceGenome(datasetId)}:${transcript.transcript_id}`}
            datasetId={datasetId}
            transcript={transcript}
            clinvarReleaseDate={data.meta.clinvar_release_date}
            clinvarVariants={
              data.transcript.clinvar_variants &&
              filterVariantsInZoomRegion(data.transcript.clinvar_variants, zoomRegion)
            }
            variants={filterVariantsInZoomRegion(
              annotateVariantsWithClinvar(
                data.transcript.mitochondrial_variants,
                data.transcript.clinvar_variants
              ),
              zoomRegion
            )}
          />
        )
      }}
    </Query>
  )
}

MitochondrialVariantsInTranscript.defaultProps = {
  zoomRegion: null,
} as Partial<Props>

export default MitochondrialVariantsInTranscript
