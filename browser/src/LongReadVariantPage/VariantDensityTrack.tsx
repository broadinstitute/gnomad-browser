import React, { useMemo } from 'react'
import styled from 'styled-components'
import { Track } from '@gnomad/region-viewer'
import {
  getVariantCategory,
  VARIANT_CATEGORY_COLORS,
  type VariantCategory,
} from './variantUtils'

const TRACK_HEIGHT = 50
const CATEGORIES: VariantCategory[] = ['snv', 'insertion', 'deletion', 'sv', 'tr']

const SidePanel = styled.div`
  display: flex;
  align-items: center;
  height: 100%;
  font-size: 11px;
  color: #555;
  padding-left: 4px;
`

type DensityVariant = {
  pos: number
  allele_type: string
  length?: number | null
}

type VariantDensityTrackProps = {
  variants: DensityVariant[]
}

type Bin = Record<VariantCategory, number> & { total: number }

const VariantDensityTrack = ({ variants }: VariantDensityTrackProps) => (
  <Track renderLeftPanel={() => <SidePanel>Density</SidePanel>}>
    {({
      scalePosition,
      width,
    }: {
      scalePosition: (pos: number) => number
      width: number
    }) => (
      <DensityBars variants={variants} scalePosition={scalePosition} width={width} />
    )}
  </Track>
)

const DensityBars = ({
  variants,
  scalePosition,
  width,
}: {
  variants: DensityVariant[]
  scalePosition: (pos: number) => number
  width: number
}) => {
  const { bins, maxDensity, numBins, binWidth } = useMemo(() => {
    const numBins = Math.max(Math.floor(width / 4), 50)
    const binWidth = width / numBins

    if (variants.length === 0) {
      return { bins: [] as Bin[], maxDensity: 0, numBins, binWidth }
    }

    const bins: Bin[] = Array.from({ length: numBins }, () => ({
      snv: 0,
      deletion: 0,
      insertion: 0,
      sv: 0,
      tr: 0,
      total: 0,
    }))

    // Use scalePosition to map each variant's genomic position to pixel x,
    // then assign to the correct bin. This ensures alignment with all other tracks.
    for (const v of variants) {
      const cat = getVariantCategory(v.allele_type, v.length)
      const px = scalePosition(v.pos)
      const idx = Math.min(Math.max(Math.floor(px / binWidth), 0), numBins - 1)
      bins[idx][cat]++
      bins[idx].total++
    }

    let maxDensity = 0
    for (const b of bins) {
      if (b.total > maxDensity) maxDensity = b.total
    }

    return { bins, maxDensity, numBins, binWidth }
  }, [variants, width, scalePosition])

  if (maxDensity === 0) return <svg height={TRACK_HEIGHT} width={width} />

  return (
    <svg height={TRACK_HEIGHT} width={width} style={{ overflow: 'hidden' }}>
      {bins.map((bin, i) => {
        if (bin.total === 0) return null
        const x = i * binWidth
        let yOffset = 0
        return (
          <g key={i}>
            {CATEGORIES.map((cat) => {
              const count = bin[cat]
              if (count === 0) return null
              const barHeight = (count / maxDensity) * TRACK_HEIGHT
              const y = TRACK_HEIGHT - yOffset - barHeight
              yOffset += barHeight
              return (
                <rect
                  key={cat}
                  x={x}
                  y={y}
                  width={Math.max(binWidth - 0.5, 1)}
                  height={barHeight}
                  fill={VARIANT_CATEGORY_COLORS[cat]}
                />
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

export default VariantDensityTrack

