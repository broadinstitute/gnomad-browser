import React, { useMemo } from 'react'
import styled from 'styled-components'
import { Track } from '@gnomad/region-viewer'
import HaplotypeHelpButton from '../Haplotypes/HelpButton'
import {
  filtersForLongReadVariantType,
  LONG_READ_VARIANT_TYPE_OPTIONS,
  passesLongReadVariantTypeFilters,
  selectedLongReadVariantType,
  type LongReadVariantTypeFilters,
  type LongReadVariantTypeSelection,
} from './longReadVariantTypes'

const TRACK_HEIGHT = 45

const SidePanel = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  font-size: 11px;
  color: #555;
  padding-left: 4px;
  line-height: 1.2;
  gap: 1px;
`

const SidePanelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`

const FilterSelect = styled.select`
  font-size: 9px;
  padding: 0 2px;
  border: 1px solid #ccc;
  border-radius: 3px;
  background: #fff;
  color: #555;
  max-width: 70px;
`

type LRUniqueVariant = {
  pos: number
  allele_type?: string
  length?: number | null
  short_read_match_id?: string | null
}

type LRUniqueDensityTrackProps = {
  variants: LRUniqueVariant[]
  typeFilters: LongReadVariantTypeFilters
  onTypeFiltersChange: (filters: LongReadVariantTypeFilters) => void
}

const LRUniqueDensityTrack = ({
  variants,
  typeFilters,
  onTypeFiltersChange,
}: LRUniqueDensityTrackProps) => {
  const selectedType = selectedLongReadVariantType(typeFilters)

  return (
    <Track
      renderLeftPanel={() => (
        <SidePanel>
          <SidePanelRow>
            <span style={{ whiteSpace: 'nowrap' }}>LR-unique</span>
            <HaplotypeHelpButton title="LR-Unique Variants">
              <p>
                This track highlights variants found in the long-read callset that have{' '}
                <strong>no matching variant</strong> in the gnomAD v4 short-read callset.
              </p>
              <h4 style={{ margin: '12px 0 6px' }}>Reading the track</h4>
              <p>
                <strong style={{ color: '#d4880e' }}>Amber bars</strong> show the density of
                LR-unique variants per genomic bin.{' '}
                <strong style={{ color: '#c8b894' }}>Faint bars</strong> behind them show total
                variant density (matched + unique) for context. Regions where amber dominates are
                &ldquo;blind spots&rdquo; where short-read sequencing systematically misses
                variants.
              </p>
              <h4 style={{ margin: '12px 0 6px' }}>Variant type filter</h4>
              <p>
                Select a long-read variant class to filter this density track, the summary tracks,
                and the haplotype variants together. Breakends and translocations are grouped under{' '}
                <strong>Other / BND / CTX</strong>, matching their shared display category.
              </p>
              <h4 style={{ margin: '12px 0 6px' }}>What causes LR-unique variants?</h4>
              <ul style={{ margin: '0 0 0 20px', lineHeight: 1.8 }}>
                <li>
                  <strong>Repetitive regions</strong> &mdash; segmental duplications, tandem
                  repeats, and low-complexity sequence where short reads can&rsquo;t map uniquely
                </li>
                <li>
                  <strong>Structural variants</strong> &mdash; large insertions, complex
                  rearrangements, and mobile element insertions that short reads can&rsquo;t span
                </li>
                <li>
                  <strong>GC-extreme regions</strong> &mdash; very high or low GC content causes SR
                  coverage dropouts
                </li>
                <li>
                  <strong>Rare variants</strong> &mdash; some variants are simply below detection
                  threshold in the short-read callset
                </li>
              </ul>
              <h4 style={{ margin: '12px 0 6px' }}>Matching method</h4>
              <p>
                Each long-read variant is matched to the gnomAD v4 short-read callset by position
                and allele. A null match means no corresponding short-read call was found at that
                locus.
              </p>
            </HaplotypeHelpButton>
          </SidePanelRow>
          <FilterSelect
            aria-label="Filter long-read variants by type"
            value={selectedType}
            onChange={(e) =>
              onTypeFiltersChange(
                filtersForLongReadVariantType(e.target.value as LongReadVariantTypeSelection)
              )
            }
          >
            {selectedType === 'custom' && (
              <option value="custom" disabled>
                Custom
              </option>
            )}
            {LONG_READ_VARIANT_TYPE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </FilterSelect>
        </SidePanel>
      )}
    >
      {({ scalePosition, width }: { scalePosition: (pos: number) => number; width: number }) => (
        <LRUniqueBars
          variants={variants}
          scalePosition={scalePosition}
          width={width}
          typeFilters={typeFilters}
        />
      )}
    </Track>
  )
}

const BAR_COLOR = '#d4880e'
const BAR_COLOR_FAINT = '#f0dbb8'

const LRUniqueBars = ({
  variants,
  scalePosition,
  width,
  typeFilters,
}: {
  variants: LRUniqueVariant[]
  scalePosition: (pos: number) => number
  width: number
  typeFilters: LongReadVariantTypeFilters
}) => {
  const { bins, maxTotal, numBins, binWidth } = useMemo(() => {
    const numBins = Math.max(Math.floor(width / 4), 50)
    const binWidth = width / numBins

    if (variants.length === 0) {
      return { bins: [] as { unique: number; total: number }[], maxTotal: 0, numBins, binWidth }
    }

    const bins = Array.from({ length: numBins }, () => ({ unique: 0, total: 0 }))

    for (const v of variants) {
      if (!passesLongReadVariantTypeFilters(v.allele_type || 'snv', typeFilters)) continue
      const px = scalePosition(v.pos)
      const idx = Math.min(Math.max(Math.floor(px / binWidth), 0), numBins - 1)
      bins[idx].total++
      if (!v.short_read_match_id) {
        bins[idx].unique++
      }
    }

    let maxTotal = 0
    for (const b of bins) {
      if (b.total > maxTotal) maxTotal = b.total
    }

    return { bins, maxTotal, numBins, binWidth }
  }, [variants, width, scalePosition, typeFilters])

  if (maxTotal === 0) return <svg height={TRACK_HEIGHT} width={width} />

  return (
    <svg height={TRACK_HEIGHT} width={width} style={{ overflow: 'hidden' }}>
      {bins.map((bin, i) => {
        if (bin.total === 0) return null
        const x = i * binWidth
        const totalHeight = (bin.total / maxTotal) * TRACK_HEIGHT
        const uniqueHeight = (bin.unique / maxTotal) * TRACK_HEIGHT
        return (
          <g key={i}>
            <rect
              x={x}
              y={TRACK_HEIGHT - totalHeight}
              width={Math.max(binWidth - 0.5, 1)}
              height={totalHeight}
              fill={BAR_COLOR_FAINT}
            />
            {bin.unique > 0 && (
              <rect
                x={x}
                y={TRACK_HEIGHT - uniqueHeight}
                width={Math.max(binWidth - 0.5, 1)}
                height={uniqueHeight}
                fill={BAR_COLOR}
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}

export default LRUniqueDensityTrack
