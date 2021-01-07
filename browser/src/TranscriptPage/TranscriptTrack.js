import LeftArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-circle-left.svg'
import RightArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-circle-right.svg'
import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

import { Track } from '@gnomad/region-viewer'
import { RegionsPlot } from '@gnomad/track-regions'

const LeftPanel = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  padding-right: 5px;

  svg {
    fill: #424242;
  }
`

const transcriptFeatureAttributes = {
  exon: {
    fill: '#bdbdbd',
    height: 8,
  },
  CDS: {
    fill: '#424242',
    height: 20,
  },
  UTR: {
    fill: '#424242',
    height: 8,
  },
  start_pad: {
    fill: '#5A5E5C',
    height: 2,
  },
  end_pad: {
    fill: '#5A5E5C',
    height: 2,
  },
  intron: {
    fill: '#5A5E5C',
    height: 2,
  },
  default: {
    fill: 'grey',
    height: 2,
  },
}

const transcriptRegionAttributes = region =>
  transcriptFeatureAttributes[region.feature_type] || transcriptFeatureAttributes.default

const featureTypeOrder = {
  exon: 0,
  UTR: 1,
  CDS: 2,
}
const featureTypeCompareFn = (r1, r2) =>
  featureTypeOrder[r1.feature_type] - featureTypeOrder[r2.feature_type]

const transcriptRegionKey = region => `${region.feature_type}-${region.start}-${region.stop}`

const TranscriptsTrack = ({ transcript, showUTRs }) => {
  const isCodingTranscript = transcript.exons.some(exon => exon.feature_type === 'CDS')

  return (
    <Track
      renderLeftPanel={({ width }) => (
        <LeftPanel width={width}>
          <img
            src={transcript.strand === '-' ? LeftArrow : RightArrow}
            alt=""
            aria-hidden="true"
            height={20}
            width={20}
          />
        </LeftPanel>
      )}
    >
      {({ scalePosition, width }) => (
        <RegionsPlot
          height={20}
          regions={transcript.exons
            .filter(
              exon =>
                exon.feature_type === 'CDS' ||
                (exon.feature_type === 'UTR' && showUTRs) ||
                (exon.feature_type === 'exon' && !isCodingTranscript)
            )
            // Sort by feature type to ensure that when regions overlap, the most important
            // region is at the front.
            .sort(featureTypeCompareFn)}
          regionAttributes={transcriptRegionAttributes}
          regionKey={transcriptRegionKey}
          scalePosition={scalePosition}
          width={width}
        />
      )}
    </Track>
  )
}

TranscriptsTrack.propTypes = {
  transcript: PropTypes.shape({
    exons: PropTypes.arrayOf(
      PropTypes.shape({
        feature_type: PropTypes.string.isRequired,
        start: PropTypes.number.isRequired,
        stop: PropTypes.number.isRequired,
      })
    ).isRequired,
    strand: PropTypes.oneOf(['+', '-']).isRequired,
  }).isRequired,
  showUTRs: PropTypes.bool,
}

TranscriptsTrack.defaultProps = {
  showUTRs: false,
}

export default TranscriptsTrack
