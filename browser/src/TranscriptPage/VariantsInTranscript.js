import throttle from 'lodash.throttle'
import memoizeOne from 'memoize-one'
import PropTypes from 'prop-types'
import React, { Component } from 'react'

import { Cursor, PositionAxisTrack } from '@gnomad/region-viewer'
import { Badge } from '@gnomad/ui'

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

class VariantsInTranscript extends Component {
  static propTypes = {
    clinvarVariants: PropTypes.arrayOf(PropTypes.object),
    datasetId: PropTypes.string.isRequired,
    includeNonCodingTranscripts: PropTypes.bool.isRequired,
    includeUTRs: PropTypes.bool.isRequired,
    transcript: PropTypes.shape({
      transcript_id: PropTypes.string.isRequired,
      chrom: PropTypes.string.isRequired,
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
    }).isRequired,
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
      hoveredVariant: null,
      rowIndexLastClickedInNavigator: 0,
      renderedVariants,
      sortKey: defaultSortKey,
      sortOrder: defaultSortOrder,
      visibleVariantWindow: [0, 19],
    }
  }

  getColumns = memoizeOne((width, chrom) =>
    getColumns({
      context: 'transcript',
      width,
      includeHomozygoteAC: chrom !== 'Y',
      includeHemizygoteAC: chrom === 'X' || chrom === 'Y',
    })
  )

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

  onHoverVariant = variantId => {
    this.setState({ hoveredVariant: variantId })
  }

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
      includeNonCodingTranscripts,
      includeUTRs,
      transcript,
      width,
    } = this.props
    const {
      filter,
      hoveredVariant,
      renderedVariants,
      rowIndexLastClickedInNavigator,
      sortKey,
      sortOrder,
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
                isHighlighted: variant.variant_id === hoveredVariant,
              }))}
          />
        </Cursor>

        <PositionAxisTrack />

        <TrackPageSection style={{ fontSize: '14px', marginTop: '1em' }}>
          <VariantFilterControls onChange={this.onFilter} value={filter} />
          <div>
            <ExportVariantsButton
              datasetId={datasetId}
              exportFileName={`${datasetLabel}_${transcript.transcript_id}`}
              variants={renderedVariants}
            />
          </div>
          <p>
            <Badge level={includeNonCodingTranscripts || includeUTRs ? 'warning' : 'info'}>
              {includeNonCodingTranscripts || includeUTRs ? 'Warning' : 'Note'}
            </Badge>{' '}
            Only variants located in or within 75 base pairs of a coding exon are shown here. To see
            variants in UTRs or introns, use the{' '}
            <Link to={`/region/${transcript.chrom}-${transcript.start}-${transcript.stop}`}>
              region view
            </Link>
            .
          </p>
          {datasetId.startsWith('gnomad_r3') && (
            <p>
              <Badge level="error">Warning</Badge> We have identified an issue in gnomAD v3.1 where
              some variants are missing VEP annotations. As a result, some variants in this
              transcript may be missing from the table below. We are working on a resolution for
              this issue.
            </p>
          )}
          <VariantTable
            columns={this.getColumns(width, transcript.chrom)}
            highlightText={filter.searchText}
            onHoverVariant={this.onHoverVariant}
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
