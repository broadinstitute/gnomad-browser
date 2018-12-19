import PropTypes from 'prop-types'
import React, { Component } from 'react'
import Highlighter from 'react-highlight-words'
import { connect } from 'react-redux'
import styled from 'styled-components'

import {
  actions as variantActions,
  finalFilteredVariants,
  variantSearchQuery,
  variantSortKey,
  variantSortAscending,
} from '@broad/redux-variants'
import { actions as tableActions, currentTableIndex } from '@broad/table'
import { Grid, TextButton } from '@broad/ui'
import { getCategoryFromConsequence, getLabelForConsequenceTerm } from '@broad/utilities'

import browserConfig from '@browser/config'

const NoVariants = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: ${props => props.height}px;
  border: 1px dashed gray;
  margin-top: 20px;
  font-size: 20px;
  font-weight: bold;
`

const VariantIdButton = TextButton.extend`
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const categoryColors = {
  lof: '#DD2C00',
  missense: 'orange',
  synonymous: '#2E7D32',
  other: '#424242',
}

const getConsequenceColor = consequenceTerm => {
  if (!consequenceTerm) {
    return 'gray'
  }
  const category = getCategoryFromConsequence(consequenceTerm) || 'other'
  return categoryColors[category]
}

const getConsequenceName = consequenceTerm =>
  consequenceTerm ? getLabelForConsequenceTerm(consequenceTerm) : 'N/A'

const renderNumberCell = (row, key) => {
  const number = row[key]
  if (number === null || number === undefined) {
    return ''
  }
  const truncated = Number(number.toPrecision(3))
  if (truncated === 0) {
    return '0'
  }
  return truncated
}

const renderExponentialNumberCell = (row, key) => {
  const number = row[key]
  if (number === null || number === undefined) {
    return ''
  }
  const truncated = Number(number.toPrecision(3))
  if (truncated === 0) {
    return '0'
  }
  return truncated.toExponential()
}

class VariantTable extends Component {
  grid = null

  componentDidUpdate(prevProps) {
    const { rowIndexLastClickedInNavigator } = this.props
    if (rowIndexLastClickedInNavigator !== prevProps.rowIndexLastClickedInNavigator) {
      if (this.grid) {
        this.grid.scrollToDataRow(rowIndexLastClickedInNavigator)
      }
    }
  }

  gridRef = el => {
    this.grid = el
  }

  render() {
    const {
      /* eslint-disable no-shadow */
      highlightText,
      setCurrentTableScrollWindow,
      setFocusedVariant,
      setHoveredVariant,
      setVariantSortKey,
      variants,
      variantSortKey,
      variantSortOrder,
      /* eslint-enable no-shadow */
    } = this.props

    if (variants.size === 0) {
      return <NoVariants height={500}>No variants found</NoVariants>
    }

    const highlightWords = highlightText.split(/\s+/)
    const columns = [
      {
        key: 'variant_id',
        heading: 'Variant ID',
        tooltip: 'Chromosome-position-reference-alternate',
        isRowHeader: true,
        isSortable: true,
        minWidth: 130,
        grow: 2,
        render: row => (
          <VariantIdButton onClick={() => setFocusedVariant(row.variant_id)} tabIndex={-1}>
            <Highlighter searchWords={highlightWords} textToHighlight={row.variant_id} />
          </VariantIdButton>
        ),
      },
      {
        key: 'hgvsc_canonical',
        heading: 'HGVSc',
        tooltip: 'HGVS coding sequence',
        minWidth: 140,
        grow: 2,
        isSortable: true,
        render: row => (
          <Highlighter
            className="grid-cell-content"
            searchWords={highlightWords}
            textToHighlight={row.hgvsc_canonical || ''}
          />
        ),
      },
      {
        key: 'hgvsp_canonical',
        heading: 'HGVSp',
        tooltip: 'HGVS protein sequence',
        isSortable: true,
        minWidth: 140,
        grow: 2,
        render: row => (
          <Highlighter
            className="grid-cell-content"
            searchWords={highlightWords}
            textToHighlight={row.hgvsp_canonical || ''}
          />
        ),
      },
      {
        key: 'consequence',
        heading: 'Consequence',
        tooltip: 'Predicted functional consequence',
        isSortable: true,
        minWidth: 110,
        render: row => (
          <span
            className="grid-cell-content"
            style={{ color: getConsequenceColor(row.consequence) }}
          >
            <Highlighter
              searchWords={highlightWords}
              textToHighlight={getConsequenceName(row.consequence)}
            />
          </span>
        ),
      },
      {
        key: 'ac_case',
        heading: 'AC Case',
        tooltip: 'Allele count in cases',
        isSortable: true,
        minWidth: 60,
      },
      {
        key: 'an_case',
        heading: 'AN Case',
        tooltip: 'Allele number in cases',
        isSortable: true,
        minWidth: 60,
      },
      {
        key: 'ac_ctrl',
        heading: 'AC Control',
        tooltip: 'Allele count in controls',
        isSortable: true,
        minWidth: 60,
      },
      {
        key: 'an_ctrl',
        heading: 'AN Control',
        tooltip: 'Allele number in controls',
        isSortable: true,
        minWidth: 60,
      },
      {
        key: 'af_case',
        heading: 'AF Case',
        tooltip: 'Allele frequency in cases',
        isSortable: true,
        minWidth: 70,
        render: renderExponentialNumberCell,
      },
      {
        key: 'af_ctrl',
        heading: 'AF Control',
        tooltip: 'Allele frequency in controls',
        isSortable: true,
        minWidth: 70,
        render: renderExponentialNumberCell,
      },
      {
        key: 'estimate',
        heading: 'Estimate',
        tooltip: browserConfig.variantTable.tooltips.estimate,
        isSortable: true,
        minWidth: 60,
        render: renderNumberCell,
      },
      {
        key: 'pval_meta',
        heading: 'P-Val',
        tooltip: browserConfig.variantTable.tooltips.pval_meta,
        isSortable: true,
        minWidth: 60,
        render: renderNumberCell,
      },
      {
        key: 'in_analysis',
        heading: 'In Analysis',
        tooltip: browserConfig.variantTable.tooltips.in_analysis,
        isSortable: true,
        minWidth: 60,
        render: (row, key) => row[key] && 'yes',
      },
    ]

    return (
      <Grid
        columns={columns}
        data={variants.toJS()}
        numRowsRendered={20}
        onHoverRow={rowIndex => {
          setHoveredVariant(rowIndex === null ? null : variants.get(rowIndex).get('variant_id'))
        }}
        onRequestSort={setVariantSortKey}
        onVisibleRowsChange={setCurrentTableScrollWindow}
        ref={this.gridRef}
        rowKey={variant => variant.variant_id}
        sortKey={variantSortKey}
        sortOrder={variantSortOrder}
      />
    )
  }
}

VariantTable.propTypes = {
  highlightText: PropTypes.string,
  rowIndexLastClickedInNavigator: PropTypes.number,
  setCurrentTableScrollWindow: PropTypes.func.isRequired,
  setFocusedVariant: PropTypes.func.isRequired,
  setHoveredVariant: PropTypes.func.isRequired,
  setVariantSortKey: PropTypes.func.isRequired,
  variants: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  variantSortKey: PropTypes.string.isRequired,
  variantSortOrder: PropTypes.oneOf(['ascending', 'descending']).isRequired,
}

VariantTable.defaultProps = {
  highlightText: '',
  rowIndexLastClickedInNavigator: null,
}

const mapStateToProps = state => ({
  highlightText: variantSearchQuery(state),
  rowIndexLastClickedInNavigator: currentTableIndex(state),
  variantSortKey: variantSortKey(state),
  variantSortOrder: variantSortAscending(state) ? 'ascending' : 'descending',
  variants: finalFilteredVariants(state),
})

const mapDispatchToProps = dispatch => ({
  setCurrentTableScrollWindow: scrollWindow =>
    dispatch(tableActions.setCurrentTableScrollWindow(scrollWindow)),
  setFocusedVariant: variantId => dispatch(variantActions.setFocusedVariant(variantId)),
  setHoveredVariant: variantId => dispatch(variantActions.setHoveredVariant(variantId)),
  setVariantSortKey: sortKey => dispatch(variantActions.setVariantSort(sortKey)),
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(VariantTable)
