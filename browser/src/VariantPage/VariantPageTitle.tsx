import React from 'react'
import styled from 'styled-components'

import { TooltipAnchor } from '@gnomad/ui'

import { DatasetId, isLongRead, referenceGenome } from '@gnomad/dataset-metadata/metadata'
import {
  formatLongReadAlleleDisplay,
  formatLongReadAlleleTypeLabel,
  formatLongReadVariantId,
  type LongReadAlleleIdentity,
} from '../LongReadVariantPage/formatLongReadVariantId'

export const TitleWrapper = styled.span`
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  overflow: hidden;
  max-width: 100%;

  @media (max-width: 900px) {
    flex-direction: column;
  }
`

export const Separator = styled.span`
  @media (max-width: 900px) {
    display: none;
  }
`

export const VariantIdWrapper = styled.span`
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  overflow: hidden;
  max-width: 100%;

  @media (max-width: 600px) {
    flex-direction: column;
  }
`

const VariantIdSeparator = styled.span`
  @media (max-width: 600px) {
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

type Props = {
  datasetId: DatasetId
  variantId: string
  longReadAllele?: LongReadAlleleIdentity | null
}

const VariantPageTitle = ({ datasetId, variantId, longReadAllele }: Props) => {
  if (isLongRead(datasetId)) {
    const display = longReadAllele
      ? formatLongReadAlleleDisplay(longReadAllele)
      : {
          label: formatLongReadVariantId(variantId),
          accessibleLabel: `Canonical long-read ID: ${variantId}`,
        }
    const alleleTypeLabel = longReadAllele?.allele_type
      ? formatLongReadAlleleTypeLabel(longReadAllele.allele_type)
      : 'long-read allele'
    return (
      <TitleWrapper>
        <span>{alleleTypeLabel.charAt(0).toUpperCase() + alleleTypeLabel.slice(1)}</span>
        <Separator style={{ width: '1ch' }}>:</Separator>
        {/* @ts-expect-error legacy TooltipAnchor typing */}
        <TooltipAnchor tooltip={display.accessibleLabel}>
          <VariantIdWrapper>
            <TitleAlleles>{display.label}</TitleAlleles>
          </VariantIdWrapper>
        </TooltipAnchor>
        <Separator> </Separator>
        <span>({referenceGenome(datasetId)})</span>
      </TitleWrapper>
    )
  }

  const displayVariantId = variantId
  const [chrom, pos, ref, alt] = displayVariantId.split('-')

  let variantDescription = 'Variant'
  if (ref.length === 1 && alt.length === 1) {
    variantDescription = 'SNV'
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
      {variantDescription === 'SNV' ? (
        // @ts-expect-error TS(2322) -- error from gnomad-browser-toolkit component
        <TooltipAnchor tooltip="Single nucleotide variant">
          <span>{variantDescription}</span>
        </TooltipAnchor>
      ) : (
        <span>{variantDescription}</span>
      )}

      <Separator style={{ width: '1ch' }}>:</Separator>
      {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
      <TooltipAnchor tooltip={displayVariantId}>
        <VariantIdWrapper>
          <span>
            {chrom}-{pos}
          </span>
          <VariantIdSeparator>-</VariantIdSeparator>
          <TitleAlleles>
            {ref}-{alt}
          </TitleAlleles>
        </VariantIdWrapper>
      </TooltipAnchor>
      <Separator> </Separator>
      <span>({referenceGenome(datasetId)})</span>
    </TitleWrapper>
  )
}

export default VariantPageTitle
