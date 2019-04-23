import React from 'react'
import Highlighter from 'react-highlight-words'
import styled from 'styled-components'

import { TextButton } from '@broad/ui'
import { getCategoryFromConsequence, getLabelForConsequenceTerm } from '@broad/utilities'

import browserConfig from '@browser/config'

const VariantIdButton = styled(TextButton)`
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

const VariantCategoryMarker = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 0.5em;

  &::before {
    content: '';
    display: inline-block;
    box-sizing: border-box;
    width: 10px;
    height: 10px;
    border: 1px solid #000;
    border-radius: 5px;
    background: ${props => props.color};
  }
`

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

const columns = [
  {
    key: 'variant_id',
    heading: 'Variant ID',
    tooltip: 'Chromosome-position-reference-alternate',
    isRowHeader: true,
    isSortable: true,
    minWidth: 130,
    grow: 2,
    render: (row, key, { highlightWords, onClickVariant }) => (
      <VariantIdButton onClick={() => onClickVariant(row)} tabIndex={-1}>
        <Highlighter searchWords={highlightWords} textToHighlight={row[key]} />
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
    render: (row, key, { highlightWords }) => (
      <Highlighter
        className="grid-cell-content"
        searchWords={highlightWords}
        textToHighlight={row[key] || ''}
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
    render: (row, key, { highlightWords }) => (
      <Highlighter
        className="grid-cell-content"
        searchWords={highlightWords}
        textToHighlight={row[key] || ''}
      />
    ),
  },
  {
    key: 'consequence',
    heading: 'Consequence',
    tooltip: 'Predicted functional consequence',
    isSortable: true,
    minWidth: 140,
    render: (row, key, { highlightWords }) => (
      <span className="grid-cell-content">
        <VariantCategoryMarker color={getConsequenceColor(row[key])} />
        <Highlighter searchWords={highlightWords} textToHighlight={getConsequenceName(row[key])} />
      </span>
    ),
    renderForCSV: (row, key) => getConsequenceName(row[key]),
  },
  {
    key: 'ac_case',
    heading: 'AC Case',
    tooltip: 'Allele count in cases',
    isSortable: true,
    minWidth: 75,
  },
  {
    key: 'an_case',
    heading: 'AN Case',
    tooltip: 'Allele number in cases',
    isSortable: true,
    minWidth: 75,
  },
  {
    key: 'ac_ctrl',
    heading: 'AC Control',
    tooltip: 'Allele count in controls',
    isSortable: true,
    minWidth: 75,
  },
  {
    key: 'an_ctrl',
    heading: 'AN Control',
    tooltip: 'Allele number in controls',
    isSortable: true,
    minWidth: 75,
  },
  {
    key: 'af_case',
    heading: 'AF Case',
    tooltip: 'Allele frequency in cases',
    isSortable: true,
    minWidth: 80,
    render: renderExponentialNumberCell,
  },
  {
    key: 'af_ctrl',
    heading: 'AF Control',
    tooltip: 'Allele frequency in controls',
    isSortable: true,
    minWidth: 80,
    render: renderExponentialNumberCell,
  },
  {
    key: 'est',
    heading: 'Estimate',
    tooltip: browserConfig.variantTable.tooltips.est,
    isSortable: true,
    minWidth: 80,
    render: renderNumberCell,
  },
  {
    key: 'p',
    heading: 'P-Val',
    tooltip: browserConfig.variantTable.tooltips.p,
    isSortable: true,
    minWidth: 65,
    render: renderNumberCell,
  },
  {
    key: 'in_analysis',
    heading: 'In Analysis',
    tooltip: browserConfig.variantTable.tooltips.in_analysis,
    isSortable: true,
    minWidth: 85,
    render: (row, key) => (row[key] ? 'yes' : ''),
    renderForCSV: (row, key) => (row[key] ? 'yes' : ''),
  },
]

export default columns
