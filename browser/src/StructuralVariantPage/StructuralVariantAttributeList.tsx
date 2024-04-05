import React from 'react'

import { Badge } from '@gnomad/ui'

import AttributeList, { AttributeListItem } from '../AttributeList'
import InfoButton from '../help/InfoButton'
import Link from '../Link'
import { svTypeLabels } from '../StructuralVariantList/structuralVariantTypes'
import { StructuralVariant } from './StructuralVariantPage'
import { textOrMissingTextWarning } from '../missingContent'

const FILTER_LABELS = {
  LOW_CALL_RATE: 'Low Call Rate',
  PCRPLUS_ENRICHED: 'PCR+ Enriched',
  UNRESOLVED: 'Unresolved',
  UNSTABLE_AF_PCRMINUS: 'Unstable AF PCR-',
  OUTLIER_SAMPLE_ENRICHED: 'Outlier Sample Enriched',
  LOWQUAL_WHAM_SR_DEL: 'Wham And Split-Read Evidence Only',

  IGH_MCH_OVERLAP: 'Overlaps Somatic Recombination Site',
  FAIL_MANUAL_REVIEW: 'Failed Manual Review',
  HIGH_NCR: 'High No-Call Rate',
}

const FILTER_DESCRIPTIONS = {
  LOW_CALL_RATE:
    'Site does not meet minimum requirements for fraction of PCR- samples with non-null genotypes. Flags sites more prone to false discoveries.',
  PCRPLUS_ENRICHED:
    'Site enriched for non-reference genotypes among PCR+ samples. Likely reflects technical batch effects. All PCR- samples have been assigned null GTs for these sites.',
  UNRESOLVED: 'Variant is unresolved',
  UNSTABLE_AF_PCRMINUS:
    'Allele frequency for this variant in PCR- samples is sensitive to choice of GQ filtering thresholds. All PCR- samples have been assigned null GTs for these sites.',
  OUTLIER_SAMPLE_ENRICHED:
    'SV was enriched for non-reference genotypes in outlier samples prior to filtering; may indicate a noisier or less reliable locus.',
  LOWQUAL_WHAM_SR_DEL:
    'SV was detected exclusively by Wham and only has split-read evidence, which usually correlates with lower-quality variants with elevated false discovery rates.',
  IGH_MCH_OVERLAP:
    'SV overlaps sites of known somatic recombination, such as immunoglobulin gene and/or major hisocompatability complex loci, making germline SV detecting and genotyping especially difficult.',
  FAIL_MANUAL_REVIEW: 'Variant failed manual review of evidence by a gnomAD analyst.',
  HIGH_NCR: 'Variant has excessively high rate of no-call (i.e., missing) genotypes.',
}

const EVIDENCE_LABELS: Record<string, string> = {
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
  wham: 'Wham',
  depth_manual: 'Manual curation in known genomic disorder region',
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
  'CTX_PQ/QP': 'Reciprocal translocation of P:Q and Q:P arms',
  CTX_INV: 'Reciprocal translocation with derivative junction inversion',
  'CTX_PP/QQ': 'Reciprocal translocation of P:P and Q:Q arms',
}

const algorithmLabel = (algorithm: string) =>
  textOrMissingTextWarning('algorithm label', ALGORITHM_LABELS, algorithm)

const complexTypeLabel = (complexType: string) =>
  textOrMissingTextWarning('complex type label', COMPLEX_TYPE_LABELS, complexType)

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

type StructuralVariantAttributeListProps = {
  variant: StructuralVariant
}

const StructuralVariantAttributeList = ({ variant }: StructuralVariantAttributeListProps) => {
  const filters = variant.filters || []
  const algorithms = variant.algorithms || []
  const length = variant.length || variant.end - variant.pos
  const evidence = variant.evidence || []
  const cpx_intervals = variant.cpx_intervals || []

  return (
    <AttributeList style={{ marginTop: '1.25em' }}>
      <AttributeListItem label="Filter">
        {filters.length > 0 ? (
          filters.map((filter) => (
            <Badge key={filter} level="warning" tooltip={filterDescription(filter)}>
              {filterLabel(filter)}
            </Badge>
          ))
        ) : (
          <Badge level="success">Pass</Badge>
        )}
      </AttributeListItem>
      <AttributeListItem label={variant.type === 'MCNV' ? 'Non-Diploid Samples' : 'Allele Count'}>
        {variant.ac}
      </AttributeListItem>
      <AttributeListItem label={variant.type === 'MCNV' ? 'Total Samples' : 'Allele Number'}>
        {variant.an}
      </AttributeListItem>
      <AttributeListItem
        label={variant.type === 'MCNV' ? 'Non-diploid CN Frequency' : 'Allele Frequency'}
      >
        {(variant.an === 0 ? 0 : variant.ac / variant.an).toPrecision(4)}
      </AttributeListItem>
      <AttributeListItem label="Quality score">{variant.qual}</AttributeListItem>
      <AttributeListItem label="Position">
        {variant.type === 'BND' || variant.type === 'CTX' || variant.type === 'INS' ? (
          <PointLink chrom={variant.chrom} pos={variant.pos} />
        ) : (
          <Link to={`/region/${variant.chrom}-${variant.pos}-${variant.end}`}>
            {variant.chrom}:{variant.pos}-{variant.end}
          </Link>
        )}
      </AttributeListItem>
      {(variant.type === 'BND' || variant.type === 'CTX') && (
        <AttributeListItem label="Second Position">
          <PointLink chrom={variant.chrom2} pos={variant.pos2} />
        </AttributeListItem>
      )}
      {variant.type !== 'BND' && variant.type !== 'CTX' && (
        <AttributeListItem label="Size">
          {length === -1 ? '—' : `${length.toLocaleString()} bp`}
        </AttributeListItem>
      )}
      {variant.type && (
        <AttributeListItem label="Class">
          {svTypeLabels[variant.type]}{' '}
          {variant.type === 'INS' &&
            variant.alts &&
            `(${variant.alts
              .map((alt) => alt.replace(/^</, '').replace(/>$/, '').replace(/^INS:/, ''))
              .join(', ')})`}
          <InfoButton topic={`sv-class_${variant.type}`} />
        </AttributeListItem>
      )}
      {variant.type === 'CPX' && variant.cpx_type && (
        <React.Fragment>
          <AttributeListItem label="Complex SV Class">
            {variant.cpx_type} ({complexTypeLabel(variant.cpx_type)}){' '}
            <ComplexTypeHelpButton complexType={variant.cpx_type} />
          </AttributeListItem>
          <AttributeListItem label="Rearranged Segments">
            {cpx_intervals.join(', ')}
          </AttributeListItem>
        </React.Fragment>
      )}
      <AttributeListItem label="Evidence">
        {evidence.map((e) => EVIDENCE_LABELS[e]).join(', ')}
      </AttributeListItem>
      <AttributeListItem label="Algorithms">
        {algorithms.map((a) => algorithmLabel(a)).join(', ')}
      </AttributeListItem>
    </AttributeList>
  )
}

export default StructuralVariantAttributeList
