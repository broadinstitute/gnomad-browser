import React from 'react'
import Highlighter from 'react-highlight-words'

import Link from '../Link'
import { Cell, NumericCell, renderAlleleCountCell, renderAlleleFrequencyCell } from '../tableCells'
import SampleSourceIcon from '../VariantList/SampleSourceIcon'
import { makeNumericCompareFunction, makeStringCompareFunction } from '../VariantList/sortUtilities'
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
      <Highlighter autoEscape searchWords={highlightWords} textToHighlight={renderedConsequence} />
    </Cell>
  )
}

const renderType = (variant, key, { colorKey, highlightWords }) => (
  <Cell>
    {colorKey === 'type' && (
      <VariantCategoryMarker color={svTypeColors[variant.type] || svTypeColors.OTH} />
    )}
    <Highlighter
      autoEscape
      searchWords={highlightWords}
      textToHighlight={svTypeLabels[variant.type] || variant.type}
    />
  </Cell>
)

const structuralVariantTableColumns = [
  {
    key: 'ac',
    heading: 'Allele Count',
    minWidth: 110,
    compareFunction: makeNumericCompareFunction('ac'),
    render: renderAlleleCountCell,
  },

  {
    key: 'an',
    heading: 'Allele Number',
    minWidth: 110,
    compareFunction: makeNumericCompareFunction('an'),
    render: renderAlleleCountCell,
  },

  {
    key: 'af',
    heading: 'Allele Frequency',
    minWidth: 110,
    compareFunction: makeNumericCompareFunction('af'),
    render: renderAlleleFrequencyCell,
  },

  {
    key: 'class',
    heading: 'Class',
    minWidth: 130,
    compareFunction: makeStringCompareFunction('type'),
    getSearchTerms: variant => [svTypeLabels[variant.type]],
    render: renderType,
  },

  {
    key: 'consequence',
    heading: 'Consequence',
    minWidth: 160,
    compareFunction: makeStringCompareFunction('consequence'),
    getSearchTerms: variant => [svConsequenceLabels[variant.consequence] || ''],
    render: renderConsequence,
  },

  {
    key: 'homozygote_count',
    heading: 'Number of Homozygotes',
    contextNotes: 'Not shown when viewing Y chromosome',
    minWidth: 100,
    compareFunction: makeNumericCompareFunction('ac_hom'),
    render: variant => renderAlleleCountCell(variant, 'ac_hom'),
    shouldShowInContext: context => context.chrom !== 'Y',
  },

  {
    key: 'length',
    heading: 'Size',
    minWidth: 100,
    compareFunction: makeNumericCompareFunction('length'),
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
    key: 'pos',
    heading: 'Position',
    minWidth: 200,
    compareFunction: makeNumericCompareFunction('pos'),
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
    key: 'source',
    heading: 'Source',
    grow: 0,
    minWidth: 70,
    render: variant => <SampleSourceIcon source="genome" filters={variant.filters} />,
  },

  {
    key: 'variant_id',
    heading: 'Variant ID',
    isRowHeader: true,
    minWidth: 110,
    compareFunction: makeStringCompareFunction('variant_id'),
    getSearchTerms: variant => [variant.variant_id],
    render: (variant, key, { highlightWords }) => (
      <Cell>
        <Link target="_blank" to={`/variant/${variant.variant_id}`}>
          <Highlighter
            autoEscape
            searchWords={highlightWords}
            textToHighlight={variant.variant_id}
          />
        </Link>
      </Cell>
    ),
  },
]

export default structuralVariantTableColumns

const getContextType = context => {
  if (context.transcript_id) {
    return 'transcript'
  }
  if (context.gene_id) {
    return 'gene'
  }
  return 'region'
}

export const getColumnsForContext = context => {
  const contextType = getContextType(context)
  const columns = structuralVariantTableColumns
    .filter(
      column =>
        column.shouldShowInContext === undefined || column.shouldShowInContext(context, contextType)
    )
    .map(column => ({
      ...column,
      description: column.descriptionInContext
        ? column.descriptionInContext(context, contextType)
        : column.description,
    }))
    .reduce((acc, column) => ({ ...acc, [column.key]: column }), {})

  return columns
}
