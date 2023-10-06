import React from 'react'

import { Badge } from '@gnomad/ui'

import AttributeList from '../AttributeList'
import InfoButton from '../help/InfoButton'
import Link from '../Link'
import { cnvTypeLabels } from '../CopyNumberVariantList/copyNumberVariantTypes'
import { CopyNumberVariant } from './CopyNumberVariantPage'
import { textOrMissingTextWarning } from '../missingContent'

const FILTER_LABELS = {
    TRUE: 'TRUE',
}

const FILTER_DESCRIPTIONS = {
  TRUE: 'TRUE',
}



const filterLabel = (filter: string) =>
  textOrMissingTextWarning('filter label', FILTER_LABELS, filter)

const filterDescription = (filter: string) =>
  textOrMissingTextWarning('filter description', FILTER_DESCRIPTIONS, filter)

type OwnPointLinkProps = {
  chrom: string
  pos: number
  windowSize?: number
}

// @ts-expect-error TS(2456) FIXME: Type alias 'PointLinkProps' circularly references ... Remove this comment to see the full error message
type PointLinkProps = OwnPointLinkProps & typeof PointLink.defaultProps

// @ts-expect-error TS(7022) FIXME: 'PointLink' implicitly has type 'any' because it d... Remove this comment to see the full error message
const PointLink = ({ chrom, pos, windowSize }: PointLinkProps) => (
  <Link to={`/region/${chrom}-${Math.max(pos - windowSize / 2, 0)}-${pos + windowSize / 2}`}>
    {chrom}:{pos}
  </Link>
)

PointLink.defaultProps = {
  windowSize: 10000,
}

type OwnComplexTypeHelpButtonProps = {
  complexType?: string
}

// @ts-expect-error TS(2456) FIXME: Type alias 'ComplexTypeHelpButtonProps' circularly... Remove this comment to see the full error message
type ComplexTypeHelpButtonProps = OwnComplexTypeHelpButtonProps &
  typeof ComplexTypeHelpButton.defaultProps

// @ts-expect-error TS(7022) FIXME: 'ComplexTypeHelpButton' implicitly has type 'any' ... Remove this comment to see the full error message
const ComplexTypeHelpButton = ({ complexType }: ComplexTypeHelpButtonProps) => {
  if (!complexType) {
    return null
  }

  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const helpTopic = {
    CCR: null,
    dDUP: 'sv-class_CPX_dDUP_dDUP-iDEL',
    dDUP_iDEL: 'sv-class_CPX_dDUP_dDUP-iDEL',
    delINV: 'sv-class_CPX_delINV_INVdel',
    delINVdel: 'sv-class_CPX_delINVdel',
    delINVdup: 'sv-class_CPX_delINVdup_dupINVdel',
    dupINV: 'sv-class_CPX_dupINV_INVdup',
    dupINVdel: 'sv-class_CPX_delINVdup_dupINVdel',
    dupINVdup: 'sv-class_CPX_dupINVdup',
    INS_iDEL: 'sv-class_CPX_INS-iDEL',
    INVdel: 'sv-class_CPX_delINV_INVdel',
    INVdup: 'sv-class_CPX_dupINV_INVdup',
    piDUP_FR: 'sv-class_CPX_piDUP-FR_piDUP-RF',
    piDUP_RF: 'sv-class_CPX_piDUP-FR_piDUP-RF',
  }[complexType]

  if (!helpTopic) {
    return null
  }

  return <InfoButton topic={helpTopic} />
}

ComplexTypeHelpButton.defaultProps = {
  complexType: null,
}

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
    <AttributeList.Item label={'SC'}>
      {variant.sc}
    </AttributeList.Item>
    {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
    <AttributeList.Item label={'SN'}>
      {variant.sn}
    </AttributeList.Item>
    {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
    <AttributeList.Item
      label='SF'
    >
      {(variant.sn === 0 ? 0 : variant.sc / variant.sn).toPrecision(4)}
    </AttributeList.Item>
    {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
    <AttributeList.Item label="Quality score">{variant.qual}</AttributeList.Item>
    {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
    <AttributeList.Item label="Position">
      {variant.type === 'DUP' || variant.type === 'DEL' ? (
        <PointLink chrom={variant.chrom} pos={variant.pos} />
      ) : (
        <Link to={`/region/${variant.chrom}-${variant.pos}-${variant.end}`}>
          {variant.chrom}:{variant.pos}-{variant.end}
        </Link>
      )}
    </AttributeList.Item>
    {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
      <AttributeList.Item label="Size">
        {variant.length === -1 ? '—' : `${variant.length.toLocaleString()} bp`}
      </AttributeList.Item>
    {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
    <AttributeList.Item label="Class">
      {/* @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
      {cnvTypeLabels[variant.type]} <InfoButton topic={`cnv-class_${variant.type}`} />
    </AttributeList.Item>
  </AttributeList>
  
)

export default CopyNumberVariantAttributeList
