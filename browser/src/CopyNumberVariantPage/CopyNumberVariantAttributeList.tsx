import React from 'react'

import { Badge } from '@gnomad/ui'

import AttributeList, { AttributeListItem } from '../AttributeList'
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
    <AttributeListItem label="Filter">
      {variant.filters.length > 0 ? (
        variant.filters.map((filter) => (
          <Badge key={filter} level="warning" tooltip={filterDescription(filter)}>
            {filterLabel(filter)}
          </Badge>
        ))
      ) : (
        <Badge level="success">Pass</Badge>
      )}
    </AttributeListItem>

    <AttributeListItem label="Site Count">{variant.sc}</AttributeListItem>
    <AttributeListItem label="Site Number">{variant.sn}</AttributeListItem>
    <AttributeListItem label="Site Frequency">
      {(variant.sn === 0 ? 0 : variant.sc / variant.sn).toPrecision(4)}
    </AttributeListItem>
    <AttributeListItem label="Position">
      <Link to={`/region/${variant.chrom}-${variant.pos}-${variant.end}`}>
        {variant.chrom}:{variant.pos}-{variant.end}
      </Link>
    </AttributeListItem>
    <AttributeListItem label="Size">
      {variant.length === -1 ? '—' : `${variant.length.toLocaleString()} bp`}
    </AttributeListItem>
    <AttributeListItem label="Class">
      {/* @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
      {cnvTypeLabels[variant.type]}
    </AttributeListItem>
  </AttributeList>
)

export default CopyNumberVariantAttributeList
