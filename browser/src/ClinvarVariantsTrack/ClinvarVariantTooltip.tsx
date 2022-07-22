import React from 'react'
import styled from 'styled-components'

import { getLabelForConsequenceTerm } from '../vepConsequences'

import ClinvarVariantPropType from './ClinvarVariantPropType'

const ClinvarVariantTooltipWrapper = styled.div`
  max-width: 100%;
`

const ClinvarVariantAttributeList = styled.dl`
  margin: 0.5em 0;

  div {
    overflow: hidden;
    margin-bottom: 0.5em;
    text-overflow: ellipsis;
    white-space: nowrap;
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

const renderInGnomad = (variant: any) => {
  if (variant.gnomad) {
    if (variant.gnomad.exome && variant.gnomad.genome) {
      return `Yes - exomes${variant.gnomad.exome.filters.length ? ' (filtered)' : ''} and genomes${
        variant.gnomad.genome.filters.length ? ' (filtered)' : ''
      }`
    }
    if (variant.gnomad.exome) {
      return `Yes - exomes${variant.gnomad.exome.filters.length ? ' (filtered)' : ''}`
    }
    if (variant.gnomad.genome) {
      return `Yes - genomes${variant.gnomad.genome.filters.length ? ' (filtered)' : ''}`
    }
  }
  return 'No'
}

const renderGnomadAF = (variant: any) => {
  if (!variant.gnomad) {
    return '–'
  }

  const ac = ((variant.gnomad.exome || {}).ac || 0) + ((variant.gnomad.genome || {}).ac || 0)
  const an = ((variant.gnomad.exome || {}).an || 0) + ((variant.gnomad.genome || {}).an || 0)
  const af = an === 0 ? 0 : ac / an

  const truncated = Number(af.toPrecision(3))
  return truncated === 0 || truncated === 1 ? af.toFixed(0) : af.toExponential(2)
}

type ClinvarVariantTooltipProps = {
  variant: ClinvarVariantPropType
}

const ClinvarVariantTooltip = ({ variant }: ClinvarVariantTooltipProps) => (
  <ClinvarVariantTooltipWrapper>
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
      <div>
        <dt>In gnomAD?</dt>
        <dd>{renderInGnomad(variant)}</dd>
      </div>
      {variant.in_gnomad && (
        <>
          <div>
            <dt>gnomAD allele count</dt>
            <dd>
              {/* @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'. */}
              {((variant.gnomad.exome || {}).ac || 0) + ((variant.gnomad.genome || {}).ac || 0)}
            </dd>
          </div>
          <div>
            <dt>gnomAD allele frequency</dt>
            <dd>{renderGnomadAF(variant)}</dd>
          </div>
        </>
      )}
    </ClinvarVariantAttributeList>
    Click for more information
  </ClinvarVariantTooltipWrapper>
)

export default ClinvarVariantTooltip
