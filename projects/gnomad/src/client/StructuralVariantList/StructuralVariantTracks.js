import PropTypes from 'prop-types'
import React from 'react'
import { FixedSizeList } from 'react-window'

import { Track } from '@broad/region-viewer'

import Link from '../Link'
import StructuralVariantPlot from './StructuralVariantPlot'
import StructuralVariantPropType from './StructuralVariantPropType'

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
}) => {
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

Row.propTypes = {
  data: PropTypes.shape({
    highlightedVariant: PropTypes.string,
    onHover: PropTypes.func.isRequired,
    variants: PropTypes.arrayOf(StructuralVariantPropType).isRequired,
  }).isRequired,
  index: PropTypes.number.isRequired,
  style: PropTypes.objectOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])).isRequired,
}

const StructuralVariantTracks = ({
  forwardedRef, // eslint-disable-line react/prop-types
  highlightedVariant,
  numTracksRendered,
  onHover,
  onScroll,
  trackColor,
  trackHeight,
  variants,
}) => (
  <div
    onMouseLeave={() => {
      onHover(null)
    }}
  >
    <Track>
      {({ isPositionDefined, scalePosition, width }) => (
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
          itemKey={rowIndex => variants[rowIndex].variant_id}
          itemSize={trackHeight}
          onScroll={onScroll}
          overscanCount={10}
          width="100%"
        >
          {Row}
        </FixedSizeList>
      )}
    </Track>
  </div>
)

StructuralVariantTracks.propTypes = {
  highlightedVariant: PropTypes.string,
  numTracksRendered: PropTypes.number.isRequired,
  onHover: PropTypes.func.isRequired,
  onScroll: PropTypes.func.isRequired,
  trackColor: PropTypes.func.isRequired,
  trackHeight: PropTypes.number.isRequired,
  variants: PropTypes.arrayOf(StructuralVariantPropType).isRequired,
}

StructuralVariantTracks.defaultProps = {
  forwardedRef: undefined,
  highlightedVariant: null,
}

export default React.forwardRef((props, ref) => (
  <StructuralVariantTracks {...props} forwardedRef={ref} />
))
