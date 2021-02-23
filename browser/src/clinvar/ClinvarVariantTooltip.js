import React from 'react'
import styled from 'styled-components'

import { getLabelForConsequenceTerm } from '../vepConsequences'

import ClinvarVariantPropType from './ClinvarVariantPropType'

const ClinvarVariantAttributeList = styled.dl`
  margin: 0.5em 0;

  div {
    margin-bottom: 0.25em;
  }

  dt,
  dd {
    display: inline;
  }

  dt {
    font-weight: bold;
  }

  dd {
    margin: 0 0 0 0.5em;
  }
`

const ClinvarVariantTooltip = ({ variant }) => (
  <div>
    <strong>{variant.variant_id}</strong>
    <ClinvarVariantAttributeList>
      <div>
        <dt>Clinical significance</dt>
        <dd>{variant.clinical_significance}</dd>
      </div>
      <div>
        <dt>HGVS consequence</dt>
        <dd>{variant.hgvsp || variant.hgvsc || '–'}</dd>
      </div>
      <div>
        <dt>VEP annotation</dt>
        <dd>{getLabelForConsequenceTerm(variant.major_consequence)}</dd>
      </div>
      <div>
        <dt>Review status</dt>
        <dd>
          {variant.review_status} ({variant.gold_stars}{' '}
          {variant.gold_stars === 1 ? 'star' : 'stars'})
        </dd>
      </div>
    </ClinvarVariantAttributeList>
    Click to view in ClinVar
  </div>
)

ClinvarVariantTooltip.propTypes = {
  variant: ClinvarVariantPropType.isRequired,
}

export default ClinvarVariantTooltip
