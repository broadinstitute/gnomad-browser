import React from 'react'
import Highlighter from 'react-highlight-words'

import Link from '../Link'
import SampleSourceIcon from '../VariantList/SampleSourceIcon'
import VariantCategoryMarker from '../VariantList/VariantCategoryMarker'
import {
  svConsequenceCategories,
  svConsequenceCategoryColors,
  svConsequenceLabels,
} from './structuralVariantConsequences'
import { svTypeColors, svTypeLabels } from './structuralVariantTypes'

const renderExponentialNumber = number => {
  if (number === null || number === undefined) {
    return ''
  }
  const truncated = Number(number.toPrecision(3))
  if (truncated === 0) {
    return '0'
  }
  return truncated.toExponential()
}

const renderConsequence = (variant, key, { colorKey, highlightWords }) => {
  const { consequence } = variant
  let renderedConsequence = ''
  if (consequence) {
    renderedConsequence = svConsequenceLabels[consequence]
  } else if (variant.intergenic) {
    renderedConsequence = 'intergenic'
  }
  return (
    <span className="grid-cell-content">
      {consequence && colorKey === 'consequence' && (
        <VariantCategoryMarker
          color={svConsequenceCategoryColors[svConsequenceCategories[consequence] || 'other']}
        />
      )}
      <Highlighter searchWords={highlightWords} textToHighlight={renderedConsequence} />
    </span>
  )
}

const renderType = (variant, key, { colorKey, highlightWords }) => (
  <span className="grid-cell-content">
    {colorKey === 'type' && (
      <VariantCategoryMarker color={svTypeColors[variant.type] || svTypeColors.OTH} />
    )}
    <Highlighter
      searchWords={highlightWords}
      textToHighlight={svTypeLabels[variant.type] || variant.type}
    />
  </span>
)

export const getColumns = ({ includeHomozygoteAC, width }) => {
  const columns = [
    {
      key: 'variant_id',
      heading: 'Variant ID',
      isRowHeader: true,
      isSortable: true,
      minWidth: 110,
      render: (variant, key, { highlightWords }) => (
        <Link className="grid-cell-content" target="_blank" to={`/variant/${variant.variant_id}`}>
          <Highlighter searchWords={highlightWords} textToHighlight={variant.variant_id} />
        </Link>
      ),
    },
    {
      key: 'source',
      heading: 'Source',
      grow: 0,
      minWidth: 70,
      render: variant => <SampleSourceIcon source="genome" filters={variant.filters} />,
    },
    {
      key: 'consequence',
      heading: 'Consequence',
      isSortable: true,
      minWidth: 160,
      render: renderConsequence,
    },
    {
      key: 'type',
      heading: 'Class',
      isSortable: true,
      minWidth: 130,
      render: renderType,
    },
    {
      key: 'pos',
      heading: 'Position',
      isSortable: true,
      minWidth: 200,
      render: variant => {
        let position
        if (variant.type === 'INS') {
          position = `${variant.pos}`
        } else if (variant.type === 'BND' || variant.type === 'CTX') {
          // Only show pos because end == pos + 1 for BNDs and CTXs
          position = `${variant.chrom}:${variant.pos}} | ${variant.chrom2}:${variant.pos2}`
        } else {
          position = `${variant.pos} - ${variant.end}`
        }

        return <span className="grid-cell-content">{position}</span>
      },
    },
    {
      key: 'length',
      heading: 'Size',
      isSortable: true,
      minWidth: 100,
      render: variant => {
        if (variant.type === 'CTX' || variant.type === 'BND' || variant.length === -1) {
          return '—'
        }

        const size = variant.length
        if (size >= 1e6) {
          return `${(size / 1e6).toPrecision(3)} Mb`
        }
        if (size >= 1e3) {
          return `${(size / 1e3).toPrecision(3)} kb`
        }
        return `${size} bp`
      },
    },
    {
      key: 'ac',
      heading: 'Allele Count',
      isSortable: true,
      minWidth: 110,
    },
    {
      key: 'an',
      heading: width < 600 ? 'AN' : 'Allele Number',
      isSortable: true,
      minWidth: width < 600 ? 75 : 110,
    },
    {
      key: 'af',
      heading: 'Allele Frequency',
      isSortable: true,
      minWidth: 110,
      render: (row, key) => renderExponentialNumber(row[key]),
    },
  ]

  if (includeHomozygoteAC) {
    columns.push({
      key: 'ac_hom',
      heading: width < 600 ? 'No. Hom' : 'Number of Homozygotes',
      isSortable: true,
      minWidth: width < 600 ? 75 : 100,
      render: (row, key) => (row[key] === null ? '—' : row[key]),
    })
  }

  return columns
}
