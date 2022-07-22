import React from 'react'

import { Badge } from '@gnomad/ui'

import AttributeList from '../AttributeList'
import InfoButton from '../help/InfoButton'
import Link from '../Link'
import { svTypeLabels } from '../StructuralVariantList/structuralVariantTypes'
import StructuralVariantDetailPropType from './StructuralVariantDetailPropType'

const FILTER_LABELS = {
  LOW_CALL_RATE: 'Low Call Rate',
  PCRPLUS_ENRICHED: 'PCR+ Enriched',
  UNRESOLVED: 'Unresolved',
  UNSTABLE_AF_PCRMINUS: 'Unstable AF PCR-',
}

const FILTER_DESCRIPTIONS = {
  LOW_CALL_RATE:
    'Site does not meet minimum requirements for fraction of PCR- samples with non-null genotypes. Flags sites more prone to false discoveries.',
  PCRPLUS_ENRICHED:
    'Site enriched for non-reference genotypes among PCR+ samples. Likely reflects technical batch effects. All PCR- samples have been assigned null GTs for these sites.',
  UNRESOLVED: 'Variant is unresolved',
  UNSTABLE_AF_PCRMINUS:
    'Allele frequency for this variant in PCR- samples is sensitive to choice of GQ filtering thresholds. All PCR- samples have been assigned null GTs for these sites.',
}

const EVIDENCE_LABELS = {
  BAF: 'Normalized B-allele frequency',
  PE: 'Anomalous paired-end reads',
  RD: 'Read depth',
  SR: 'Split reads',
}

const ALGORITHM_LABELS = {
  delly: 'DELLY',
  depth: 'Depth',
  manta: 'Manta',
  melt: 'MELT',
}

const COMPLEX_TYPE_LABELS = {
  CCR: 'Complex chromosomal rearrangement',
  dDUP: 'Dispersed duplication',
  dDUP_iDEL: 'Dispersed duplication with insert site deletion',
  delINV: 'Deletion-flanked inversion',
  delINVdel: 'Paired-deletion inversion',
  delINVdup: 'Inversion with flanking deletion and duplication',
  dupINV: 'Duplication-flanked inversion',
  dupINVdup: 'Paired-duplication inversion',
  dupINVdel: 'Inversion with flanking duplication and deletion',
  INVdel: 'Deletion-flanked inversion',
  INVdup: 'Duplication-flanked inversion',
  INS_iDEL: 'Insertion with insert site deletion',
  piDUP_FR: 'Palindromic inverted duplication',
  piDUP_RF: 'Palindromic inverted duplication',
}

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

type StructuralVariantAttributeListProps = {
  variant: StructuralVariantDetailPropType
}

const StructuralVariantAttributeList = ({ variant }: StructuralVariantAttributeListProps) => (
  <AttributeList style={{ marginTop: '1.25em' }}>
    {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
    <AttributeList.Item label="Filter">
      {/* @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'. */}
      {variant.filters.length > 0 ? (
        // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
        variant.filters.map((filter) => (
          // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          <Badge key={filter} level="warning" tooltip={FILTER_DESCRIPTIONS[filter]}>
            {/* @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
            {FILTER_LABELS[filter] || filter}
          </Badge>
        ))
      ) : (
        <Badge level="success">Pass</Badge>
      )}
    </AttributeList.Item>
    {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
    <AttributeList.Item label={variant.type === 'MCNV' ? 'Non-Diploid Samples' : 'Allele Count'}>
      {variant.ac}
    </AttributeList.Item>
    {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
    <AttributeList.Item label={variant.type === 'MCNV' ? 'Total Samples' : 'Allele Number'}>
      {variant.an}
    </AttributeList.Item>
    {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
    <AttributeList.Item
      label={variant.type === 'MCNV' ? 'Non-diploid CN Frequency' : 'Allele Frequency'}
    >
      {(variant.an === 0 ? 0 : variant.ac / variant.an).toPrecision(4)}
    </AttributeList.Item>
    {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
    <AttributeList.Item label="Quality score">{variant.qual}</AttributeList.Item>
    {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
    <AttributeList.Item label="Position">
      {variant.type === 'BND' || variant.type === 'CTX' || variant.type === 'INS' ? (
        <PointLink chrom={variant.chrom} pos={variant.pos} />
      ) : (
        <Link to={`/region/${variant.chrom}-${variant.pos}-${variant.end}`}>
          {variant.chrom}:{variant.pos}-{variant.end}
        </Link>
      )}
    </AttributeList.Item>
    {(variant.type === 'BND' || variant.type === 'CTX') && (
      // @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message
      <AttributeList.Item label="Second Position">
        <PointLink chrom={variant.chrom2} pos={variant.pos2} />
      </AttributeList.Item>
    )}
    {variant.type !== 'BND' && variant.type !== 'CTX' && (
      // @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message
      <AttributeList.Item label="Size">
        {variant.length === -1 ? '—' : `${variant.length.toLocaleString()} bp`}
      </AttributeList.Item>
    )}
    {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
    <AttributeList.Item label="Class">
      {/* @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
      {svTypeLabels[variant.type]}{' '}
      {variant.type === 'INS' &&
        variant.alts &&
        `(${variant.alts
          .map((alt) => alt.replace(/^</, '').replace(/>$/, '').replace(/^INS:/, ''))
          .join(', ')})`}
      <InfoButton topic={`sv-class_${variant.type}`} />
    </AttributeList.Item>
    {variant.type === 'CPX' && (
      <React.Fragment>
        {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
        <AttributeList.Item label="Complex SV Class">
          {/* @ts-expect-error TS(2538) FIXME: Type 'undefined' cannot be used as an index type. */}
          {variant.cpx_type} ({COMPLEX_TYPE_LABELS[variant.cpx_type]}){' '}
          <ComplexTypeHelpButton complexType={variant.cpx_type} />
        </AttributeList.Item>
        {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
        <AttributeList.Item label="Rearranged Segments">
          {/* @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'. */}
          {variant.cpx_intervals.join(', ')}
        </AttributeList.Item>
      </React.Fragment>
    )}
    {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
    <AttributeList.Item label="Evidence">
      {/* @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
      {variant.evidence.map((e) => EVIDENCE_LABELS[e]).join(', ')}
    </AttributeList.Item>
    {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
    <AttributeList.Item label="Algorithms">
      {/* @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'. */}
      {variant.algorithms.map((a) => ALGORITHM_LABELS[a]).join(', ')}
    </AttributeList.Item>
  </AttributeList>
)

export default StructuralVariantAttributeList
