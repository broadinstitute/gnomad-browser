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

const renderConsequence = (variant: any, key: any, { colorKey, highlightWords }: any) => {
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
          // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          color={svConsequenceCategoryColors[svConsequenceCategories[consequence] || 'other']}
        />
      )}
      <Highlighter autoEscape searchWords={highlightWords} textToHighlight={renderedConsequence} />
    </Cell>
  )
}

const renderType = (variant: any, key: any, { colorKey, highlightWords }: any) => (
  <Cell>
    {colorKey === 'type' && (
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      <VariantCategoryMarker color={svTypeColors[variant.type] || svTypeColors.OTH} />
    )}
    <Highlighter
      autoEscape
      searchWords={highlightWords}
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
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
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    getSearchTerms: (variant: any) => [svTypeLabels[variant.type]],
    render: renderType,
  },

  {
    key: 'consequence',
    heading: 'Consequence',
    minWidth: 160,
    compareFunction: makeStringCompareFunction('consequence'),
    getSearchTerms: (variant: any) => [svConsequenceLabels[variant.consequence] || ''],
    render: renderConsequence,
  },

  {
    key: 'homozygote_count',
    heading: 'Number of Homozygotes',
    contextNotes: 'Not shown when viewing Y chromosome',
    minWidth: 100,
    compareFunction: makeNumericCompareFunction('ac_hom'),
    render: (variant: any) => renderAlleleCountCell(variant, 'ac_hom'),
    shouldShowInContext: (context: any) => context.chrom !== 'Y',
  },

  {
    key: 'length',
    heading: 'Size',
    minWidth: 100,
    compareFunction: makeNumericCompareFunction('length'),
    render: (variant: any) => {
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
    render: (variant: any) => {
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
    render: (variant: any) => <SampleSourceIcon source="genome" filters={variant.filters} />,
  },

  {
    key: 'variant_id',
    heading: 'Variant ID',
    isRowHeader: true,
    minWidth: 110,
    compareFunction: makeStringCompareFunction('variant_id'),
    getSearchTerms: (variant: any) => [variant.variant_id],
    render: (variant: any, key: any, { highlightWords }: any) => (
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

const getContextType = (context: any) => {
  if (context.transcript_id) {
    return 'transcript'
  }
  if (context.gene_id) {
    return 'gene'
  }
  return 'region'
}

export const getColumnsForContext = (context: any) => {
  const contextType = getContextType(context)
  const columns = structuralVariantTableColumns
    .filter(
      (column) =>
        // @ts-expect-error TS(2554) FIXME: Expected 1 arguments, but got 2.
        column.shouldShowInContext === undefined || column.shouldShowInContext(context, contextType)
    )
    .map((column) => ({
      ...column,
      description: (column as any).descriptionInContext
        ? (column as any).descriptionInContext(context, contextType)
        : (column as any).description,
    }))
    .reduce((acc, column) => ({ ...acc, [column.key]: column }), {})

  return columns
}
