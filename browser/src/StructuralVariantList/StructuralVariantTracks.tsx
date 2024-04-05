import React from 'react'
import { FixedSizeList } from 'react-window'

// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { Track } from '@gnomad/region-viewer'

import Link from '../Link'
import StructuralVariantPlot from './StructuralVariantPlot'
import { StructuralVariant } from '../StructuralVariantPage/StructuralVariantPage'

type RowProps = {
  data: {
    highlightedVariant?: string
    isPositionDefined: (...args: any[]) => any
    onHover: (...args: any[]) => any
    scalePosition: (...args: any[]) => any
    trackColor: (...args: any[]) => any
    variants: StructuralVariant[]
    width: number
  }
  index: number
  style: {
    [key: string]: string | number
  }
}

const Row = ({
  data: {
    highlightedVariant,
    isPositionDefined,
    onHover,
    scalePosition,
    trackColor,
    variants,
    width,
  },
  index,
  style,
}: RowProps) => {
  const variant = variants[index]
  return (
    <div style={style}>
      <Link
        target="_blank"
        to={`/variant/${variant.variant_id}`}
        onMouseEnter={() => {
          onHover(variant.variant_id)
        }}
      >
        <StructuralVariantPlot
          color={trackColor(variant)}
          isHighlighted={variant.variant_id === highlightedVariant}
          isPositionDefined={isPositionDefined}
          scalePosition={scalePosition}
          variant={variant}
          width={width}
        />
      </Link>
    </div>
  )
}

type StructuralVariantTracksProps = {
  forwardedRef: React.ForwardedRef<any> | null
  highlightedVariant: string | null
  numTracksRendered: number
  onHover: (...args: any[]) => any
  onScroll: (...args: any[]) => any
  trackColor: (...args: any[]) => any
  trackHeight: number
  variants: StructuralVariant[]
}

const StructuralVariantTracks = ({
  forwardedRef,
  highlightedVariant = null,
  numTracksRendered,
  onHover,
  onScroll,
  trackColor,
  trackHeight,
  variants,
}: StructuralVariantTracksProps) => (
  <div
    onMouseLeave={() => {
      onHover(null)
    }}
  >
    <Track>
      {({ isPositionDefined, scalePosition, width }: any) => (
        <FixedSizeList
          ref={forwardedRef}
          height={numTracksRendered * trackHeight}
          itemCount={variants.length}
          itemData={{
            highlightedVariant: highlightedVariant || undefined,
            isPositionDefined,
            onHover,
            scalePosition,
            trackColor,
            variants,
            width,
          }}
          itemKey={(rowIndex: any) => variants[rowIndex].variant_id}
          itemSize={trackHeight}
          onScroll={onScroll}
          overscanCount={10}
          width="100%"
        >
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          {Row}
        </FixedSizeList>
      )}
    </Track>
  </div>
)

export default React.forwardRef(
  (props: Omit<StructuralVariantTracksProps, 'forwardedRef'>, ref) => (
    <StructuralVariantTracks {...props} forwardedRef={ref} />
  )
)
