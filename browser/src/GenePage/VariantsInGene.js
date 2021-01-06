import PropTypes from 'prop-types'
import React, { useMemo, useState } from 'react'

import { Badge, List, ListItem, Modal, TextButton } from '@gnomad/ui'

import { labelForDataset, referenceGenomeForDataset } from '../datasets'
import Link from '../Link'
import Query from '../Query'
import { getColumns } from '../VariantList/variantTableColumns'
import Variants from '../VariantList/Variants'

const TranscriptsModal = ({ gene, onRequestClose }) => (
  <Modal
    initialFocusOnButton={false}
    title={`${gene.symbol} transcripts`}
    onRequestClose={onRequestClose}
  >
    <List>
      {gene.transcripts.map(transcript => (
        <ListItem key={transcript.transcript_id}>
          <Link to={`/transcript/${transcript.transcript_id}`}>
            {transcript.transcript_id}.{transcript.transcript_version}
          </Link>
        </ListItem>
      ))}
    </List>
  </Modal>
)

TranscriptsModal.propTypes = {
  gene: PropTypes.shape({
    symbol: PropTypes.string.isRequired,
    transcripts: PropTypes.arrayOf(
      PropTypes.shape({
        transcript_id: PropTypes.string.isRequired,
        transcript_version: PropTypes.string.isRequired,
        exons: PropTypes.arrayOf(
          PropTypes.shape({
            feature_type: PropTypes.string.isRequired,
            start: PropTypes.number.isRequired,
            stop: PropTypes.number.isRequired,
          })
        ).isRequired,
      })
    ).isRequired,
  }).isRequired,
  onRequestClose: PropTypes.func.isRequired,
}

const VariantsInGene = ({
  clinvarVariants,
  datasetId,
  gene,
  includeNonCodingTranscripts,
  includeUTRs,
  variants,
  width,
}) => {
  const columns = useMemo(
    () =>
      getColumns({
        context: 'gene',
        width,
        includeLofCuration: variants.some(variant => variant.lof_curation),
        includeHomozygoteAC: gene.chrom !== 'Y',
        includeHemizygoteAC: gene.chrom === 'X' || gene.chrom === 'Y',
        primaryTranscriptId: gene.mane_select_transcript
          ? gene.mane_select_transcript.ensembl_id
          : gene.canonical_transcript_id,
      }),
    [gene, variants, width]
  )

  const datasetLabel = labelForDataset(datasetId)

  const [isTranscriptsModalOpen, setIsTranscriptsModalOpen] = useState(false)

  return (
    <Variants
      clinvarVariants={clinvarVariants}
      columns={columns}
      datasetId={datasetId}
      exportFileName={`${datasetLabel}_${gene.gene_id}`}
      variants={variants}
    >
      <p>
        <Badge level={includeNonCodingTranscripts || includeUTRs ? 'warning' : 'info'}>
          {includeNonCodingTranscripts || includeUTRs ? 'Warning' : 'Note'}
        </Badge>{' '}
        Only variants located in or within 75 base pairs of a coding exon are shown here. To see
        variants in UTRs or introns, use the{' '}
        <Link to={`/region/${gene.chrom}-${gene.start}-${gene.stop}`}>region view</Link>.
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
      {datasetId.startsWith('gnomad_r3') && (
        <p>
          <Badge level="error">Warning</Badge> We have identified an issue in gnomAD v3.1 where some
          variants are missing VEP annotations. As a result, some variants in this gene may be
          missing from the table below. We are working on a resolution for this issue.
        </p>
      )}
      {isTranscriptsModalOpen && (
        <TranscriptsModal
          gene={gene}
          onRequestClose={() => {
            setIsTranscriptsModalOpen(false)
          }}
        />
      )}
    </Variants>
  )
}

VariantsInGene.propTypes = {
  clinvarVariants: PropTypes.arrayOf(PropTypes.object),
  datasetId: PropTypes.string.isRequired,
  gene: PropTypes.shape({
    gene_id: PropTypes.string.isRequired,
    symbol: PropTypes.string.isRequired,
    reference_genome: PropTypes.oneOf(['GRCh37', 'GRCh38']).isRequired,
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
    transcripts: PropTypes.arrayOf(
      PropTypes.shape({
        transcript_id: PropTypes.string.isRequired,
        transcript_version: PropTypes.string.isRequired,
        exons: PropTypes.arrayOf(
          PropTypes.shape({
            feature_type: PropTypes.string.isRequired,
            start: PropTypes.number.isRequired,
            stop: PropTypes.number.isRequired,
          })
        ).isRequired,
      })
    ).isRequired,
    canonical_transcript_id: PropTypes.string,
    mane_select_transcript: PropTypes.shape({
      ensembl_id: PropTypes.string.isRequired,
    }),
  }).isRequired,
  includeNonCodingTranscripts: PropTypes.bool.isRequired,
  includeUTRs: PropTypes.bool.isRequired,
  variants: PropTypes.arrayOf(PropTypes.object).isRequired,
  width: PropTypes.number.isRequired,
}

VariantsInGene.defaultProps = {
  clinvarVariants: null,
}

const query = `
query VariantsInGene($geneId: String!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
  gene(gene_id: $geneId, reference_genome: $referenceGenome) {
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
      transcript_id
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
      lof_curation {
        verdict
        flags
      }
    }
  }
}`

const ConnectedVariantsInGene = ({ datasetId, gene, ...otherProps }) => (
  <Query
    query={query}
    variables={{
      datasetId,
      geneId: gene.gene_id,
      referenceGenome: referenceGenomeForDataset(datasetId),
    }}
    loadingMessage="Loading variants"
    errorMessage="Unable to load variants"
    success={data => data.gene && data.gene.variants}
  >
    {({ data }) => {
      return (
        <VariantsInGene
          {...otherProps}
          clinvarVariants={data.gene.clinvar_variants}
          datasetId={datasetId}
          gene={gene}
          variants={data.gene.variants}
        />
      )
    }}
  </Query>
)

ConnectedVariantsInGene.propTypes = {
  datasetId: PropTypes.string.isRequired,
  gene: PropTypes.shape({
    gene_id: PropTypes.string.isRequired,
  }).isRequired,
}

export default ConnectedVariantsInGene
