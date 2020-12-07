import throttle from 'lodash.throttle'
import memoizeOne from 'memoize-one'
import PropTypes from 'prop-types'
import React, { Component } from 'react'

import { Cursor, PositionAxisTrack } from '@gnomad/region-viewer'
import { Badge, List, ListItem, Modal, TextButton } from '@gnomad/ui'

import ClinvarVariantTrack from '../clinvar/ClinvarVariantTrack'
import { labelForDataset, referenceGenomeForDataset } from '../datasets'
import Link from '../Link'
import Query from '../Query'
import { TrackPageSection } from '../TrackPage'
import ExportVariantsButton from '../VariantList/ExportVariantsButton'
import filterVariants from '../VariantList/filterVariants'
import mergeExomeAndGenomeData from '../VariantList/mergeExomeAndGenomeData'
import sortVariants from '../VariantList/sortVariants'
import VariantFilterControls from '../VariantList/VariantFilterControls'
import VariantTable from '../VariantList/VariantTable'
import { getColumns } from '../VariantList/variantTableColumns'
import VariantTrack from '../VariantList/VariantTrack'

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

class VariantsInGene extends Component {
  static propTypes = {
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

  static defaultProps = {
    clinvarVariants: null,
  }

  constructor(props) {
    super(props)

    const defaultFilter = {
      includeCategories: {
        lof: true,
        missense: true,
        synonymous: true,
        other: true,
      },
      includeFilteredVariants: false,
      includeSNVs: true,
      includeIndels: true,
      includeExomes: true,
      includeGenomes: true,
      searchText: '',
    }

    const defaultSortKey = 'variant_id'
    const defaultSortOrder = 'ascending'

    const renderedVariants = sortVariants(
      mergeExomeAndGenomeData(filterVariants(props.variants, defaultFilter)),
      {
        sortKey: defaultSortKey,
        sortOrder: defaultSortOrder,
      }
    )

    this.state = {
      filter: defaultFilter,
      isTranscriptsModalOpen: false,
      rowIndexLastClickedInNavigator: 0,
      renderedVariants,
      sortKey: defaultSortKey,
      sortOrder: defaultSortOrder,
      variantHoveredInTable: null,
      variantHoveredInTrack: null,
      visibleVariantWindow: [0, 19],
    }
  }

  getColumns = memoizeOne(width => {
    const { gene, variants } = this.props
    return getColumns({
      context: 'gene',
      width,
      includeLofCuration: variants.some(variant => variant.lof_curation),
      includeHomozygoteAC: gene.chrom !== 'Y',
      includeHemizygoteAC: gene.chrom === 'X' || gene.chrom === 'Y',
      primaryTranscriptId: gene.mane_select_transcript
        ? gene.mane_select_transcript.ensembl_id
        : gene.canonical_transcript_id,
    })
  })

  onFilter = newFilter => {
    this.setState(state => {
      const { variants } = this.props
      const { sortKey, sortOrder } = state
      const renderedVariants = sortVariants(
        mergeExomeAndGenomeData(filterVariants(variants, newFilter)),
        {
          sortKey,
          sortOrder,
        }
      )
      return {
        filter: newFilter,
        renderedVariants,
      }
    })
  }

  onSort = newSortKey => {
    this.setState(state => {
      const { renderedVariants, sortKey } = state

      let newSortOrder = 'descending'
      if (newSortKey === sortKey) {
        newSortOrder = state.sortOrder === 'ascending' ? 'descending' : 'ascending'
      }

      // Since the filter hasn't changed, sort the currently rendered variants instead
      // of filtering the input variants.
      const sortedVariants = sortVariants(renderedVariants, {
        sortKey: newSortKey,
        sortOrder: newSortOrder,
      })

      return {
        renderedVariants: sortedVariants,
        sortKey: newSortKey,
        sortOrder: newSortOrder,
      }
    })
  }

  onHoverVariantInTable = variantId => {
    this.setState({ variantHoveredInTable: variantId })
  }

  onHoverVariantsInTrack = throttle(variants => {
    this.setState({
      variantHoveredInTrack: variants.length > 0 ? variants[0].variant_id : null,
    })
  }, 100)

  onVisibleRowsChange = throttle(({ startIndex, stopIndex }) => {
    this.setState({ visibleVariantWindow: [startIndex, stopIndex] })
  }, 100)

  onNavigatorClick = position => {
    const { renderedVariants } = this.state
    const sortedVariants = sortVariants(renderedVariants, {
      sortKey: 'variant_id',
      sortOrder: 'ascending',
    })

    let index
    if (sortedVariants.length === 0 || position < sortedVariants[0].pos) {
      index = 0
    }

    index = sortedVariants.findIndex(
      (variant, i) =>
        sortedVariants[i + 1] && position >= variant.pos && position <= sortedVariants[i + 1].pos
    )

    if (index === -1) {
      index = sortedVariants.length - 1
    }

    this.setState({
      renderedVariants: sortedVariants,
      rowIndexLastClickedInNavigator: index,
      sortKey: 'variant_id',
      sortOrder: 'ascending',
    })
  }

  render() {
    const {
      clinvarVariants,
      datasetId,
      gene,
      includeNonCodingTranscripts,
      includeUTRs,
      width,
    } = this.props
    const {
      filter,
      isTranscriptsModalOpen,
      renderedVariants,
      rowIndexLastClickedInNavigator,
      sortKey,
      sortOrder,
      variantHoveredInTable,
      variantHoveredInTrack,
      visibleVariantWindow,
    } = this.state

    const datasetLabel = labelForDataset(datasetId)

    return (
      <div>
        {clinvarVariants && (
          <ClinvarVariantTrack
            selectedGnomadVariants={renderedVariants}
            variants={clinvarVariants}
            variantFilter={filter}
          />
        )}

        <VariantTrack
          title={`${datasetLabel}\n(${renderedVariants.length})`}
          variants={renderedVariants}
        />

        <Cursor onClick={this.onNavigatorClick}>
          <VariantTrack
            title="Viewing in table"
            variants={renderedVariants
              .slice(visibleVariantWindow[0], visibleVariantWindow[1] + 1)
              .map(variant => ({
                ...variant,
                isHighlighted: variant.variant_id === variantHoveredInTable,
              }))}
            onHoverVariants={this.onHoverVariantsInTrack}
          />
        </Cursor>

        <PositionAxisTrack />

        <TrackPageSection style={{ fontSize: '14px', marginTop: '1em' }}>
          <VariantFilterControls onChange={this.onFilter} value={filter} />
          <div>
            <ExportVariantsButton
              datasetId={datasetId}
              exportFileName={`${datasetLabel}_${gene.gene_id}`}
              variants={renderedVariants}
            />
          </div>
          <p>
            <Badge level={includeNonCodingTranscripts || includeUTRs ? 'warning' : 'info'}>
              {includeNonCodingTranscripts || includeUTRs ? 'Warning' : 'Note'}
            </Badge>{' '}
            Only variants located in or within 75 base pairs of a coding exon are shown here. To see
            variants in UTRs or introns, use the{' '}
            <Link to={`/region/${gene.chrom}-${gene.start}-${gene.stop}`}>region view</Link>.
          </p>
          <p>
            The table below shows the HGVS consequence and VEP annotation for each variant&apos;s
            most severe consequence across all transcripts in this gene. Cases where the most severe
            consequence occurs in a{' '}
            {gene.reference_genome === 'GRCh37'
              ? 'non-canonical transcript'
              : 'non-MANE Select transcript (or non-canonical transcript if no MANE Select transcript exists)'}{' '}
            are denoted with †. To see consequences in a specific transcript, use the{' '}
            <TextButton
              onClick={() => {
                this.setState({ isTranscriptsModalOpen: true })
              }}
            >
              transcript view
            </TextButton>
            .
          </p>
          {datasetId.startsWith('gnomad_r3') && (
            <p>
              <Badge level="error">Warning</Badge> We have identified an issue in gnomAD v3.1 where
              some variants are missing VEP annotations. As a result, some variants in this gene may
              be missing from the table below. We are working on a resolution for this issue.
            </p>
          )}
          {isTranscriptsModalOpen && (
            <TranscriptsModal
              gene={gene}
              onRequestClose={() => {
                this.setState({ isTranscriptsModalOpen: false })
              }}
            />
          )}
          <VariantTable
            columns={this.getColumns(width)}
            highlightText={filter.searchText}
            highlightedVariantId={variantHoveredInTrack}
            onHoverVariant={this.onHoverVariantInTable}
            onRequestSort={this.onSort}
            onVisibleRowsChange={this.onVisibleRowsChange}
            rowIndexLastClickedInNavigator={rowIndexLastClickedInNavigator}
            sortKey={sortKey}
            sortOrder={sortOrder}
            variants={renderedVariants}
          />
        </TrackPageSection>
      </div>
    )
  }
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
      variant_id: variantId
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
