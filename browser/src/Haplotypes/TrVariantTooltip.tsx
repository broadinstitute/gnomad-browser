import React from 'react'

import { formatLongReadVariantId } from '../LongReadVariantPage/formatLongReadVariantId'

export type TrTooltipVariant = {
  variant_id?: string
  chrom: string
  pos: number
  end?: number | null
  ref: string
  alt: string
  allele_type: string
  allele_length: number
  freq: { af: number }
  rsid?: string | null
}

const formatSignedBp = (value: number) => `${value > 0 ? '+' : ''}${value.toLocaleString()} bp`

export const HaplotypeVariantTooltipContent = ({
  variant,
  phantomExpanded = false,
}: {
  variant: TrTooltipVariant
  phantomExpanded?: boolean
}) => {
  const isTr = (variant.allele_type || '').toLowerCase() === 'trv'
  const referenceSpan = variant.end == null ? variant.ref.length : variant.end - variant.pos + 1

  return (
    <>
      {variant.variant_id && (
        <div>
          <strong>Variant ID:</strong> {formatLongReadVariantId(variant.variant_id)}
        </div>
      )}
      <div>
        <strong>Position:</strong> {variant.pos}
      </div>
      {isTr && variant.end != null && (
        <div>
          <strong>Reference locus:</strong> {variant.chrom}:{variant.pos}-{variant.end}
        </div>
      )}
      <div>
        <strong>Ref:</strong>{' '}
        {variant.ref.length > 10 ? `${variant.ref.substring(0, 10)}...` : variant.ref}
      </div>
      <div>
        <strong>Alt:</strong>{' '}
        {variant.alt.length > 10 ? `${variant.alt.substring(0, 10)}...` : variant.alt}
      </div>
      {isTr && (
        <>
          <div><strong>Reference allele:</strong> {referenceSpan.toLocaleString()} bp</div>
          <div><strong>Carrier ALT allele:</strong> {variant.alt.length.toLocaleString()} bp</div>
          <div><strong>ALT−REF length:</strong> {formatSignedBp(variant.allele_length)}</div>
          <div style={{ color: '#666', marginTop: 2 }}>
            {phantomExpanded
              ? 'The synthetic bar shows the absolute length difference, subject to display caps; added bases have no GRCh38 coordinates.'
              : 'The bar spans the reference locus; its width does not encode this carrier’s ALT length.'}
          </div>
        </>
      )}
      <div>
        <strong>AF:</strong> {variant.freq.af.toFixed(4)}
      </div>
      {variant.rsid && (
        <div>
          <strong>RSID:</strong> {variant.rsid}
        </div>
      )}
      {variant.allele_type && (
        <div>
          <strong>Type:</strong> {variant.allele_type}
        </div>
      )}
    </>
  )
}
