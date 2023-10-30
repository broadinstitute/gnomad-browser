import React from 'react'

import { Badge } from '@gnomad/ui'

import AttributeList from '../AttributeList'
import Link from '../Link'
import { cnvTypeLabels } from '../CopyNumberVariantList/copyNumberVariantTypes'
import { CopyNumberVariant } from './CopyNumberVariantPage'
import { textOrMissingTextWarning } from '../missingContent'

const FILTER_LABELS = {
  TRUE: 'TRUE',
}

const FILTER_DESCRIPTIONS = {
  TRUE: 'true',
}

const filterLabel = (filter: string) =>
  textOrMissingTextWarning('filter label', FILTER_LABELS, filter)

const filterDescription = (filter: string) =>
  textOrMissingTextWarning('filter description', FILTER_DESCRIPTIONS, filter)

type CopyNumberVariantAttributeListProps = {
  variant: CopyNumberVariant
}

const CopyNumberVariantAttributeList = ({ variant }: CopyNumberVariantAttributeListProps) => (
  <AttributeList style={{ marginTop: '1.25em' }}>
    {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
    <AttributeList.Item label="Filter">
      {variant.filters.length > 0 ? (
        variant.filters.map((filter) => (
          <Badge key={filter} level="warning" tooltip={filterDescription(filter)}>
            {filterLabel(filter)}
          </Badge>
        ))
      ) : (
        <Badge level="success">Pass</Badge>
      )}
    </AttributeList.Item>

    {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
    <AttributeList.Item label="Site Count">{variant.sc}</AttributeList.Item>
    {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
    <AttributeList.Item label="Site Number">{variant.sn}</AttributeList.Item>
    {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
    <AttributeList.Item label="Site Frequency">
      {(variant.sn === 0 ? 0 : variant.sc / variant.sn).toPrecision(4)}
    </AttributeList.Item>
    {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
    <AttributeList.Item label="Position">
      <Link to={`/region/${variant.chrom}-${variant.pos}-${variant.end}`}>
        {variant.chrom}:{variant.pos}-{variant.end}
      </Link>
    </AttributeList.Item>
    {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
    <AttributeList.Item label="Size">
      {variant.length === -1 ? '—' : `${variant.length.toLocaleString()} bp`}
    </AttributeList.Item>
    {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
    <AttributeList.Item label="Class">
      {/* @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
      {cnvTypeLabels[variant.type]} 
    </AttributeList.Item>
  </AttributeList>
)

export default CopyNumberVariantAttributeList
