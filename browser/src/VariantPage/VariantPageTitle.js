import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { TooltipAnchor } from '@gnomad/ui'

import { referenceGenomeForDataset } from '../datasets'

const TitleWrapper = styled.span`
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  overflow: hidden;
  max-width: 100%;

  @media (max-width: 900px) {
    flex-direction: column;
  }
`

const Separator = styled.span`
  @media (max-width: 900px) {
    display: none;
  }
`

const TitleAlleles = styled.span`
  flex-shrink: 1;
  overflow: hidden;
  max-width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const VariantPageTitle = ({ datasetId, variantId }) => {
  const [chrom, pos, ref, alt] = variantId.split('-')

  let variantDescription = 'Variant'
  if (ref.length === 1 && alt.length === 1) {
    variantDescription = 'Single nucleotide variant'
  }
  if (ref.length < alt.length) {
    const insertionLength = alt.length - ref.length
    variantDescription = `Insertion (${insertionLength} base${insertionLength > 1 ? 's' : ''})`
  }
  if (ref.length > alt.length) {
    const deletionLength = ref.length - alt.length
    variantDescription = `Deletion (${deletionLength} base${deletionLength > 1 ? 's' : ''})`
  }

  return (
    <TitleWrapper>
      <span>{variantDescription}</span>
      <Separator style={{ width: '1ch' }}>:</Separator>
      <TooltipAnchor tooltip={variantId}>
        <TitleWrapper>
          <span>
            {chrom}-{pos}
          </span>
          <Separator>-</Separator>
          <TitleAlleles>
            {ref}-{alt}
          </TitleAlleles>
        </TitleWrapper>
      </TooltipAnchor>
      <Separator> </Separator>
      <span>({referenceGenomeForDataset(datasetId)})</span>
    </TitleWrapper>
  )
}

VariantPageTitle.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variantId: PropTypes.string.isRequired,
}

export default VariantPageTitle
