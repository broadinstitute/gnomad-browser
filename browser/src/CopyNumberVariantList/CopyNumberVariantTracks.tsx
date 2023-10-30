import React from 'react'
import { FixedSizeList } from 'react-window'

// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { Track } from '@gnomad/region-viewer'

import Link from '../Link'
import CopyNumberVariantPlot from './CopyNumberVariantPlot'
import CopyNumberVariantPropType from './CopyNumberVariantPropType'

type RowProps = {
  data: {
    highlightedVariant?: string
    isPositionDefined: (...args: any[]) => any
    onHover: (...args: any[]) => any
    scalePosition: (...args: any[]) => any
    trackColor: (...args: any[]) => any
    variants: CopyNumberVariantPropType[]
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
        <CopyNumberVariantPlot
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

type OwnCopyNumberVariantTracksProps = {
  highlightedVariant?: string
  numTracksRendered: number
  onHover: (...args: any[]) => any
  onScroll: (...args: any[]) => any
  trackColor: (...args: any[]) => any
  trackHeight: number
  variants: CopyNumberVariantPropType[]
}

// @ts-expect-error TS(2456) FIXME: Type alias 'OwnCopyNumberVariantTracksProps' circular... Remove this comment to see the full error message
type CopyNumberVariantTracksProps = OwnCopyNumberVariantTracksProps &
  typeof CopyNumberVariantTracks.defaultProps

// @ts-expect-error TS(7022) FIXME: 'CopyNumberVariantTracks' implicitly has type 'any... Remove this comment to see the full error message
const CopyNumberVariantTracks = ({
  forwardedRef, // eslint-disable-line react/prop-types
  highlightedVariant,
  numTracksRendered,
  onHover,
  onScroll,
  trackColor,
  trackHeight,
  variants,
}: CopyNumberVariantTracksProps) => (
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
            highlightedVariant,
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

CopyNumberVariantTracks.defaultProps = {
  highlightedVariant: null,
}

export default React.forwardRef((props, ref) => (
  <CopyNumberVariantTracks {...props} forwardedRef={ref} />
))
