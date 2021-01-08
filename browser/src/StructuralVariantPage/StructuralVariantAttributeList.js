import PropTypes from 'prop-types'
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

const PointLink = ({ chrom, pos, windowSize }) => (
  <Link to={`/region/${chrom}-${Math.max(pos - windowSize / 2, 0)}-${pos + windowSize / 2}`}>
    {chrom}:{pos}
  </Link>
)

PointLink.propTypes = {
  chrom: PropTypes.string.isRequired,
  pos: PropTypes.number.isRequired,
  windowSize: PropTypes.number,
}

PointLink.defaultProps = {
  windowSize: 10000,
}

const ComplexTypeHelpButton = ({ complexType }) => {
  if (!complexType) {
    return null
  }

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

ComplexTypeHelpButton.propTypes = {
  complexType: PropTypes.string,
}

ComplexTypeHelpButton.defaultProps = {
  complexType: null,
}

const StructuralVariantAttributeList = ({ variant }) => (
  <AttributeList style={{ marginTop: '1.25em' }}>
    <AttributeList.Item label="Filter">
      {variant.filters.length > 0 ? (
        variant.filters.map(filter => (
          <Badge key={filter} level="warning" tooltip={FILTER_DESCRIPTIONS[filter]}>
            {FILTER_LABELS[filter] || filter}
          </Badge>
        ))
      ) : (
        <Badge level="success">Pass</Badge>
      )}
    </AttributeList.Item>
    <AttributeList.Item label={variant.type === 'MCNV' ? 'Non-Diploid Samples' : 'Allele Count'}>
      {variant.ac}
    </AttributeList.Item>
    <AttributeList.Item label={variant.type === 'MCNV' ? 'Total Samples' : 'Allele Number'}>
      {variant.an}
    </AttributeList.Item>
    <AttributeList.Item
      label={variant.type === 'MCNV' ? 'Non-diploid CN Frequency' : 'Allele Frequency'}
    >
      {(variant.an === 0 ? 0 : variant.ac / variant.an).toPrecision(4)}
    </AttributeList.Item>
    <AttributeList.Item label="Quality score">{variant.qual}</AttributeList.Item>
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
      <AttributeList.Item label="Second Position">
        <PointLink chrom={variant.chrom2} pos={variant.pos2} />
      </AttributeList.Item>
    )}
    {variant.type !== 'BND' && variant.type !== 'CTX' && (
      <AttributeList.Item label="Size">
        {variant.length === -1 ? '—' : `${variant.length.toLocaleString()} bp`}
      </AttributeList.Item>
    )}
    <AttributeList.Item label="Class">
      {svTypeLabels[variant.type]}{' '}
      {variant.type === 'INS' &&
        variant.alts &&
        `(${variant.alts
          .map(alt => alt.replace(/^</, '').replace(/>$/, '').replace(/^INS:/, ''))
          .join(', ')})`}
      <InfoButton topic={`sv-class_${variant.type}`} />
    </AttributeList.Item>
    {variant.type === 'CPX' && (
      <React.Fragment>
        <AttributeList.Item label="Complex SV Class">
          {variant.cpx_type} ({COMPLEX_TYPE_LABELS[variant.cpx_type]}){' '}
          <ComplexTypeHelpButton complexType={variant.cpx_type} />
        </AttributeList.Item>
        <AttributeList.Item label="Rearranged Segments">
          {variant.cpx_intervals.join(', ')}
        </AttributeList.Item>
      </React.Fragment>
    )}
    <AttributeList.Item label="Evidence">
      {variant.evidence.map(e => EVIDENCE_LABELS[e]).join(', ')}
    </AttributeList.Item>
    <AttributeList.Item label="Algorithms">
      {variant.algorithms.map(a => ALGORITHM_LABELS[a]).join(', ')}
    </AttributeList.Item>
  </AttributeList>
)

StructuralVariantAttributeList.propTypes = {
  variant: StructuralVariantDetailPropType.isRequired,
}

export default StructuralVariantAttributeList
