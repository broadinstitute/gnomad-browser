// @ts-expect-error TS(2307) FIXME: Cannot find module '@fortawesome/fontawesome-free/... Remove this comment to see the full error message
import LeftArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-circle-left.svg'
// @ts-expect-error TS(2307) FIXME: Cannot find module '@fortawesome/fontawesome-free/... Remove this comment to see the full error message
import RightArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-circle-right.svg'
import React from 'react'
import styled from 'styled-components'

// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { Track } from '@gnomad/region-viewer'
// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
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

const transcriptRegionAttributes = (region: any) =>
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  transcriptFeatureAttributes[region.feature_type] || transcriptFeatureAttributes.default

const featureTypeOrder = {
  exon: 0,
  UTR: 1,
  CDS: 2,
}
const featureTypeCompareFn = (r1: any, r2: any) =>
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  featureTypeOrder[r1.feature_type] - featureTypeOrder[r2.feature_type]

const transcriptRegionKey = (region: any) => `${region.feature_type}-${region.start}-${region.stop}`

type OwnTranscriptsTrackProps = {
  transcript: {
    exons: {
      feature_type: string
      start: number
      stop: number
    }[]
    strand: '+' | '-'
  }
  showUTRs?: boolean
}

// @ts-expect-error TS(2456) FIXME: Type alias 'TranscriptsTrackProps' circularly refe... Remove this comment to see the full error message
type TranscriptsTrackProps = OwnTranscriptsTrackProps & typeof TranscriptsTrack.defaultProps

// @ts-expect-error TS(7022) FIXME: 'TranscriptsTrack' implicitly has type 'any' becau... Remove this comment to see the full error message
const TranscriptsTrack = ({ transcript, showUTRs }: TranscriptsTrackProps) => {
  const isCodingTranscript = transcript.exons.some((exon: any) => exon.feature_type === 'CDS')

  return (
    <Track
      renderLeftPanel={({ width }: any) => (
        // @ts-expect-error TS(2769) FIXME: No overload matches this call.
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
      {({ scalePosition, width }: any) => (
        <RegionsPlot
          height={20}
          regions={transcript.exons
            .filter(
              (exon: any) =>
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

TranscriptsTrack.defaultProps = {
  showUTRs: false,
}

export default TranscriptsTrack
