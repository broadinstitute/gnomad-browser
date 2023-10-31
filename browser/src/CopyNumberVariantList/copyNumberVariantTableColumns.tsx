import React from 'react'
import Highlighter from 'react-highlight-words'

import Link from '../Link'
import { Cell, NumericCell, renderAlleleCountCell, renderAlleleFrequencyCell } from '../tableCells'
import SampleSourceIcon from '../VariantList/SampleSourceIcon'
import { makeNumericCompareFunction, makeStringCompareFunction } from '../VariantList/sortUtilities'
import VariantCategoryMarker from '../VariantList/VariantCategoryMarker'

import { cnvTypeColors, cnvTypeLabels } from './copyNumberVariantTypes'
import { Context } from './CopyNumberVariants'
import { CopyNumberVariant } from '../CopyNumberVariantPage/CopyNumberVariantPage'

const renderType = (variant: CopyNumberVariant, _: any, { colorKey, highlightWords }: any) => {
  return (
    <Cell>
      {colorKey === 'type' && (
        // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        <VariantCategoryMarker color={cnvTypeColors[variant.type]} />
      )}
      <Highlighter
        autoEscape
        searchWords={highlightWords}
        // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        textToHighlight={cnvTypeLabels[variant.type] || variant.type}
      />
    </Cell>
  )
}

const copyNumberVariantTableColumns = [
  {
    key: 'sc',
    heading: 'Site Count',
    minWidth: 110,
    compareFunction: makeNumericCompareFunction('sc'),
    render: renderAlleleCountCell,
  },

  {
    key: 'sn',
    heading: 'Site Number',
    minWidth: 110,
    compareFunction: makeNumericCompareFunction('sn'),
    render: renderAlleleCountCell,
  },

  {
    key: 'sf',
    heading: 'Site Frequency',
    minWidth: 110,
    compareFunction: makeNumericCompareFunction('sf'),
    render: renderAlleleFrequencyCell,
    shouldShowInContext: (context: Context) => context.chrom !== 'Y',
  },

  {
    key: 'class',
    heading: 'Class',
    minWidth: 130,
    compareFunction: makeStringCompareFunction('type'),
    getSearchTerms: (variant: any) => {
      const variantType = variant.type
      if (variantType === 'DEL') {
        return 'deletion'
      }
      return 'duplication'
    },
    render: renderType,
  },

  {
    key: 'length',
    heading: 'Size',
    minWidth: 100,
    compareFunction: makeNumericCompareFunction('length'),
    render: (variant: CopyNumberVariant) => {
      let s
      if (variant.length === -1) {
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
      const position = `${variant.chrom}:${variant.pos} - ${variant.end}`
      return <Cell>{position}</Cell>
    },
  },

  {
    key: 'source',
    heading: 'Source',
    grow: 0,
    minWidth: 70,
    render: (variant: any) => <SampleSourceIcon source="exome" filters={variant.filters} />,
  },

  {
    key: 'variant_id',
    heading: 'Variant ID',
    isRowHeader: true,
    minWidth: 110,
    compareFunction: makeStringCompareFunction('variant_id'),
    getSearchTerms: (variant: any) => [variant.variant_id],
    render: (variant: any, _: any, { highlightWords }: any) => {
      return (
        <Cell>
          <Link target="_blank" to={`/variant/${variant.variant_id}`}>
            <Highlighter
              autoEscape
              searchWords={highlightWords}
              textToHighlight={variant.variant_id}
            />
          </Link>
        </Cell>
      )
    },
  },
]

export default copyNumberVariantTableColumns

export const getColumnsForContext = (context: Context) => {
  const columns = copyNumberVariantTableColumns
    .filter(
      (column) => column.shouldShowInContext === undefined || column.shouldShowInContext(context)
    )
    .reduce((acc, column) => ({ ...acc, [column.key]: column }), {})

  return columns
}
