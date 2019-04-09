import React from 'react'
import Highlighter from 'react-highlight-words'

import { getCategoryFromConsequence, getLabelForConsequenceTerm } from '@broad/utilities'

import Link from '../Link'
import DatasetIcon from './DatasetIcon'
import VariantCategoryMarker from './VariantCategoryMarker'
import VariantFlag from './VariantFlag'

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

export const getColumns = ({ datasetId, width, includeHomozygoteAC, includeHemizygoteAC }) => {
  const columns = [
    {
      key: 'variant_id',
      heading: 'Variant ID',
      isRowHeader: true,
      isSortable: true,
      minWidth: 150,
      grow: 1,
      render: (row, key, { highlightWords }) => (
        <Link className="grid-cell-content" target="_blank" to={`/variant/${row.variant_id}`}>
          <Highlighter searchWords={highlightWords} textToHighlight={row.variant_id} />
        </Link>
      ),
    },
    {
      key: 'datasets',
      heading: 'Source',
      grow: 0,
      minWidth: 100,
      render:
        datasetId === 'exac'
          ? variant =>
              variant.exome && (
                <DatasetIcon dataset="exac" isFiltered={variant.exome.filters.length > 0} />
              )
          : variant => (
              <React.Fragment>
                {variant.exome && (
                  <DatasetIcon
                    dataset="gnomadExome"
                    isFiltered={variant.exome.filters.length > 0}
                  />
                )}
                {variant.genome && (
                  <DatasetIcon
                    dataset="gnomadGenome"
                    isFiltered={variant.genome.filters.length > 0}
                  />
                )}
              </React.Fragment>
            ),
    },
    {
      key: 'hgvs',
      heading: 'Consequence',
      grow: 1,
      isSortable: true,
      minWidth: 160,
      render: (variant, key, { highlightWords }) => (
        <span className="grid-cell-content">
          <Highlighter searchWords={highlightWords} textToHighlight={variant.hgvs || ''} />
          {variant.isCanon === false && ' †'}
        </span>
      ),
    },
    {
      key: 'consequence',
      heading: 'Annotation',
      grow: 0,
      isSortable: true,
      minWidth: 140,
      render: (row, key, { highlightWords }) => (
        <span className="grid-cell-content">
          <VariantCategoryMarker color={getConsequenceColor(row[key])} />
          <Highlighter
            searchWords={highlightWords}
            textToHighlight={getConsequenceName(row[key])}
          />
        </span>
      ),
    },
    {
      key: 'flags',
      heading: 'Flags',
      grow: 0,
      isSortable: true,
      minWidth: 120,
      render: (row, key) =>
        row[key]
          .filter(flag => flag !== 'segdup')
          .map(flag => <VariantFlag key={flag} type={flag} />),
    },
    {
      key: 'ac',
      heading: width < 600 ? 'AC' : 'Allele Count',
      grow: 0,
      isSortable: true,
      minWidth: width < 600 ? 75 : 110,
    },
    {
      key: 'an',
      heading: width < 600 ? 'AN' : 'Allele Number',
      grow: 0,
      isSortable: true,
      minWidth: width < 600 ? 75 : 110,
    },
    {
      key: 'af',
      heading: width < 600 ? 'AF' : 'Allele Frequency',
      grow: 0,
      isSortable: true,
      minWidth: width < 600 ? 75 : 110,
      render: renderExponentialNumberCell,
    },
  ]

  if (includeHomozygoteAC) {
    columns.push({
      key: 'ac_hom',
      heading: width < 600 ? 'No. Hom' : 'Number of Homozygotes',
      grow: 0,
      isSortable: true,
      minWidth: width < 600 ? 75 : 100,
    })
  }

  if (includeHemizygoteAC) {
    columns.push({
      key: 'ac_hemi',
      heading: width < 600 ? 'No. Hem' : 'Number of Hemizygotes',
      grow: 0,
      isSortable: true,
      minWidth: width < 600 ? 75 : 100,
    })
  }

  return columns
}
