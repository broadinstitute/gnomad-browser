import PropTypes from 'prop-types'
import React, { useMemo } from 'react'

import { Badge } from '@gnomad/ui'

import { labelForDataset, referenceGenomeForDataset } from '../datasets'
import Link from '../Link'
import Query from '../Query'
import Variants from '../VariantList/Variants'
import { getColumns } from '../VariantList/variantTableColumns'

const VariantsInTranscript = ({
  clinvarVariants,
  datasetId,
  includeUTRs,
  transcript,
  variants,
  width,
}) => {
  const columns = useMemo(
    () =>
      getColumns({
        context: 'transcript',
        width,
        includeHomozygoteAC: transcript.chrom !== 'Y',
        includeHemizygoteAC: transcript.chrom === 'X' || transcript.chrom === 'Y',
      }),
    [transcript, width]
  )

  const isCodingTranscript = transcript.exons.some(exon => exon.feature_type === 'CDS')

  const datasetLabel = labelForDataset(datasetId)

  return (
    <Variants
      clinvarVariants={clinvarVariants}
      columns={columns}
      datasetId={datasetId}
      exportFileName={`${datasetLabel}_${transcript.transcript_id}`}
      variants={variants}
    >
      {isCodingTranscript ? (
        <p>
          <Badge level={includeUTRs ? 'warning' : 'info'}>{includeUTRs ? 'Warning' : 'Note'}</Badge>{' '}
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

      {datasetId.startsWith('gnomad_r3') && (
        <p>
          <Badge level="error">Warning</Badge> We have identified an issue in gnomAD v3.1 where some
          variants are missing VEP annotations. As a result, some variants in this transcript may be
          missing from the table below. We are working on a resolution for this issue.
        </p>
      )}
    </Variants>
  )
}

VariantsInTranscript.propTypes = {
  clinvarVariants: PropTypes.arrayOf(PropTypes.object),
  datasetId: PropTypes.string.isRequired,
  includeUTRs: PropTypes.bool.isRequired,
  transcript: PropTypes.shape({
    transcript_id: PropTypes.string.isRequired,
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
    exons: PropTypes.arrayOf(
      PropTypes.shape({
        feature_type: PropTypes.string.isRequired,
        start: PropTypes.number.isRequired,
        stop: PropTypes.number.isRequired,
      })
    ).isRequired,
  }).isRequired,
  variants: PropTypes.arrayOf(PropTypes.object).isRequired,
  width: PropTypes.number.isRequired,
}

VariantsInTranscript.defaultProps = {
  clinvarVariants: null,
}

const query = `
query VariantsInTranscript($transcriptId: String!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
  transcript(transcript_id: $transcriptId, reference_genome: $referenceGenome) {
    clinvar_variants {
      clinical_significance
      clinvar_variation_id
      gold_stars
      major_consequence
      pos
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
      rsid
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

const ConnectedVariantsInTranscript = ({ datasetId, transcript, ...otherProps }) => (
  <Query
    query={query}
    variables={{
      datasetId,
      transcriptId: transcript.transcript_id,
      referenceGenome: referenceGenomeForDataset(datasetId),
    }}
    loadingMessage="Loading variants"
    errorMessage="Unable to load variants"
    success={data => data.transcript && data.transcript.variants}
  >
    {({ data }) => {
      return (
        <VariantsInTranscript
          {...otherProps}
          clinvarVariants={data.transcript.clinvar_variants}
          datasetId={datasetId}
          transcript={transcript}
          variants={data.transcript.variants}
        />
      )
    }}
  </Query>
)

ConnectedVariantsInTranscript.propTypes = {
  datasetId: PropTypes.string.isRequired,
  transcript: PropTypes.shape({
    transcript_id: PropTypes.string.isRequired,
  }).isRequired,
}

export default ConnectedVariantsInTranscript
