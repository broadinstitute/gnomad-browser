import React from 'react'
import Highlighter from 'react-highlight-words'

import Link from '../Link'
import { Cell, NumericCell, renderAlleleCountCell, renderAlleleFrequencyCell } from '../tableCells'
import SampleSourceIcon from '../VariantList/SampleSourceIcon'
import VariantCategoryMarker from '../VariantList/VariantCategoryMarker'
import {
  svConsequenceCategories,
  svConsequenceCategoryColors,
  svConsequenceLabels,
} from './structuralVariantConsequences'
import { svTypeColors, svTypeLabels } from './structuralVariantTypes'

const renderConsequence = (variant, key, { colorKey, highlightWords }) => {
  const { consequence } = variant
  let renderedConsequence = ''
  if (consequence) {
    renderedConsequence = svConsequenceLabels[consequence]
  } else if (variant.intergenic) {
    renderedConsequence = 'intergenic'
  }
  return (
    <Cell>
      {consequence && colorKey === 'consequence' && (
        <VariantCategoryMarker
          color={svConsequenceCategoryColors[svConsequenceCategories[consequence] || 'other']}
        />
      )}
      <Highlighter searchWords={highlightWords} textToHighlight={renderedConsequence} />
    </Cell>
  )
}

const renderType = (variant, key, { colorKey, highlightWords }) => (
  <Cell>
    {colorKey === 'type' && (
      <VariantCategoryMarker color={svTypeColors[variant.type] || svTypeColors.OTH} />
    )}
    <Highlighter
      searchWords={highlightWords}
      textToHighlight={svTypeLabels[variant.type] || variant.type}
    />
  </Cell>
)

export const getColumns = ({ includeHomozygoteAC }) => {
  const columns = [
    {
      key: 'variant_id',
      heading: 'Variant ID',
      isRowHeader: true,
      isSortable: true,
      minWidth: 110,
      render: (variant, key, { highlightWords }) => (
        <Cell>
          <Link target="_blank" to={`/variant/${variant.variant_id}`}>
            <Highlighter searchWords={highlightWords} textToHighlight={variant.variant_id} />
          </Link>
        </Cell>
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

        return <Cell>{position}</Cell>
      },
    },
    {
      key: 'length',
      heading: 'Size',
      isSortable: true,
      minWidth: 100,
      render: variant => {
        let s
        if (variant.type === 'CTX' || variant.type === 'BND' || variant.length === -1) {
          s = '—'
        } else {
          const size = variant.length
          if (size >= 1e6) {
            s = `${(size / 1e6).toPrecision(3)} Mb`
          } else if (size >= 1e3) {
            s = `${(size / 1e3).toPrecision(3)} kb`
          } else {
            s = `${size} bp`
          }
        }

        return <NumericCell>{s}</NumericCell>
      },
    },
    {
      key: 'ac',
      heading: 'Allele Count',
      isSortable: true,
      minWidth: 110,
      render: renderAlleleCountCell,
    },
    {
      key: 'an',
      heading: 'Allele Number',
      isSortable: true,
      minWidth: 110,
      render: renderAlleleCountCell,
    },
    {
      key: 'af',
      heading: 'Allele Frequency',
      isSortable: true,
      minWidth: 110,
      render: renderAlleleFrequencyCell,
    },
  ]

  if (includeHomozygoteAC) {
    columns.push({
      key: 'ac_hom',
      heading: 'Number of Homozygotes',
      isSortable: true,
      minWidth: 100,
      render: renderAlleleCountCell,
    })
  }

  return columns
}
