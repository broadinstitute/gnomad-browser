import PropTypes from 'prop-types'
import React, { useState } from 'react'

import { Badge, List, ListItem, Modal, TextButton } from '@gnomad/ui'

import ClinvarVariantTrack from '../ClinvarVariantsTrack/ClinvarVariantTrack'
import formatClinvarDate from '../ClinvarVariantsTrack/formatClinvarDate'
import { labelForDataset, referenceGenomeForDataset } from '../datasets'
import Link from '../Link'
import Query from '../Query'
import filterVariantsInRegions from '../RegionViewer/filterVariantsInRegions'
import { TrackPageSection } from '../TrackPage'
import annotateVariantsWithClinvar from '../VariantList/annotateVariantsWithClinvar'
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
  clinvarReleaseDate,
  clinvarVariants,
  datasetId,
  gene,
  includeNonCodingTranscripts,
  includeUTRs,
  variants,
  visibleRegions,
}) => {
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
            referenceGenome={referenceGenomeForDataset(datasetId)}
            transcripts={gene.transcripts}
            variants={filterVariantsInRegions(clinvarVariants, visibleRegions)}
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
        variants={filterVariantsInRegions(variants, visibleRegions)}
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

VariantsInGene.propTypes = {
  clinvarReleaseDate: PropTypes.string.isRequired,
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
  visibleRegions: PropTypes.arrayOf(
    PropTypes.shape({ start: PropTypes.number.isRequired, stop: PropTypes.number.isRequired })
  ).isRequired,
}

VariantsInGene.defaultProps = {
  clinvarVariants: null,
}

const query = `
query VariantsInGene($geneId: String!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
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

const annotateVariantsWithPext = (variants, pext) => {
  const pextRegions = [...pext.regions]
  let currentPextRegion = pextRegions.shift()

  return variants.map(variant => {
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

ConnectedVariantsInGene.propTypes = {
  datasetId: PropTypes.string.isRequired,
  gene: PropTypes.shape({
    gene_id: PropTypes.string.isRequired,
    pext: PropTypes.shape({
      regions: PropTypes.arrayOf(
        PropTypes.shape({
          start: PropTypes.number.isRequired,
          stop: PropTypes.number.isRequired,
          mean: PropTypes.number.isRequired,
          tissues: PropTypes.objectOf(PropTypes.number).isRequired,
        })
      ).isRequired,
    }),
  }).isRequired,
}

export default ConnectedVariantsInGene
