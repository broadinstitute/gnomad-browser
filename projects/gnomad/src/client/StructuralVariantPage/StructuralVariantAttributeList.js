import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { QuestionMark } from '@broad/help'
import { Badge } from '@broad/ui'

import Link from '../Link'
import { svTypeLabels } from '../StructuralVariantList/structuralVariantTypes'
import StructuralVariantDetailPropType from './StructuralVariantDetailPropType'

const Attribute = styled.div`
  display: flex;
  flex-direction: row;
  margin-bottom: 3px;

  @media (max-width: 600px) {
    flex-direction: column;
  }
`

const AttributeList = styled.dl`
  dt,
  dd {
    box-sizing: border-box;
    line-height: 1.5;
  }

  dt {
    flex-shrink: 0;
    width: ${props => props.labelWidth}px;
    font-weight: bold;
    text-align: right;
  }

  dd {
    margin-left: 1em;
  }

  @media (max-width: 600px) {
    dt {
      width: auto;
      text-align: left;
    }
  }
`

const FILTER_DESCRIPTIONS = {
  PCRPLUS_ENRICHED: undefined,
  PREDICTED_GENOTYPING_ARTIFACT: undefined,
  UNRESOLVED: undefined,
  VARIABLE_ACROSS_BATCHES: undefined,
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

const VariantPosition = ({ variant }) => {
  if (variant.type === 'INS') {
    return (
      <Link to={`/region/${variant.chrom}:${variant.pos}`}>
        {variant.chrom}:{variant.pos}
      </Link>
    )
  }

  if (variant.type === 'BND' || variant.type === 'CTX' || variant.chrom !== variant.end_chrom) {
    return (
      <span>
        <Link to={`/region/${variant.chrom}:${variant.pos}`}>
          {variant.chrom}:{variant.pos}
        </Link>{' '}
        |{' '}
        <Link to={`/region/${variant.end_chrom}:${variant.end_pos}`}>
          {variant.end_chrom}:{variant.end_pos}
        </Link>
      </span>
    )
  }

  return (
    <Link to={`/region/${variant.chrom}:${variant.pos}-${variant.end_pos}`}>
      {variant.chrom}:{variant.pos}-{variant.end_pos}
    </Link>
  )
}

VariantPosition.propTypes = {
  variant: StructuralVariantDetailPropType.isRequired,
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

  return <QuestionMark display="inline" topic={`SV_docs/${helpTopic}`} />
}

ComplexTypeHelpButton.propTypes = {
  complexType: PropTypes.string,
}

ComplexTypeHelpButton.defaultProps = {
  complexType: null,
}

const StructuralVariantAttributeList = ({ variant }) => (
  <AttributeList labelWidth={variant.type === 'MCNV' ? 180 : 140}>
    <Attribute>
      <dt>Filter</dt>
      <dd>
        {variant.filters.length > 0 ? (
          variant.filters.map(filter => (
            <Badge level="warning" tooltip={FILTER_DESCRIPTIONS[filter]}>
              {filter
                .split('_')
                .map(s => `${s.charAt(0)}${s.slice(1).toLowerCase()}`)
                .join(' ')}
            </Badge>
          ))
        ) : (
          <Badge level="success">Pass</Badge>
        )}
      </dd>
    </Attribute>
    <Attribute>
      <dt>{variant.type === 'MCNV' ? 'Non-Diploid Samples' : 'Allele Count'}</dt>
      <dd>{variant.ac}</dd>
    </Attribute>
    <Attribute>
      <dt>{variant.type === 'MCNV' ? 'Total Samples' : 'Allele Number'}</dt>
      <dd>{variant.an}</dd>
    </Attribute>
    <Attribute>
      <dt>{variant.type === 'MCNV' ? 'Non-diploid CN Frequency' : 'Allele Frequency'}</dt>
      <dd>{(variant.an === 0 ? 0 : variant.ac / variant.an).toPrecision(4)}</dd>
    </Attribute>
    <Attribute>
      <dt>Quality score</dt>
      <dd>{variant.qual}</dd>
    </Attribute>
    <Attribute>
      <dt>Position</dt>
      <dd>
        <VariantPosition variant={variant} />
      </dd>
    </Attribute>
    {variant.type !== 'BND' &&
      variant.type !== 'CTX' && (
        <Attribute>
          <dt>Size</dt>
          <dd>{variant.length === -1 ? '—' : `${variant.length.toLocaleString()} bp`}</dd>
        </Attribute>
      )}
    <Attribute>
      <dt>Type</dt>
      <dd>
        {svTypeLabels[variant.type]}{' '}
        <QuestionMark display="inline" topic={`SV_docs/sv-class_${variant.type}`} />
      </dd>
    </Attribute>
    {variant.type === 'CPX' && (
      <React.Fragment>
        <Attribute>
          <dt>Complex SV Class</dt>
          <dd>
            {variant.cpx_type} ({COMPLEX_TYPE_LABELS[variant.cpx_type]}){' '}
            <ComplexTypeHelpButton complexType={variant.cpx_type} />
          </dd>
        </Attribute>
        <Attribute>
          <dt>Rearranged Segments</dt>
          <dd>{variant.cpx_intervals.join(', ')}</dd>
        </Attribute>
      </React.Fragment>
    )}
    <Attribute>
      <dt>Evidence</dt>
      <dd>{variant.evidence.map(e => EVIDENCE_LABELS[e]).join(', ')}</dd>
    </Attribute>
    <Attribute>
      <dt>Algorithms</dt>
      <dd>{variant.algorithms.map(a => ALGORITHM_LABELS[a]).join(', ')}</dd>
    </Attribute>
  </AttributeList>
)

StructuralVariantAttributeList.propTypes = {
  variant: StructuralVariantDetailPropType.isRequired,
}

export default StructuralVariantAttributeList
