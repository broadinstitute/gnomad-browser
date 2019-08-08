import LeftArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-circle-left.svg'
import RightArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-circle-right.svg'
import React, { useRef, useState } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

import { Track } from '@broad/region-viewer'
import { RegionsPlot } from '@broad/track-regions'
import { Button } from '@broad/ui'

const ToggleTranscriptsPanel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  height: 50px;
  padding-right: 5px;

  button {
    width: 70px;
    padding-right: 0.25em;
    padding-left: 0.25em;
  }

  svg {
    fill: #424242;
  }
`

const ActiveTranscriptPlotWrapper = styled.div`
  display: flex;
  align-items: center;
  height: 50px;
`

const ControlPanel = styled.div`
  display: flex;
  justify-content: flex-end;
`

const TranscriptsWrapper = styled.div`
  margin-bottom: 1em;
`

const TranscriptWrapper = styled.div`
  display: flex;
  margin-bottom: 5px;
  font-size: 11px;
`

const transcriptFeatureAttributes = {
  exon: {
    fill: '#bdbdbd',
    height: 4,
  },
  CDS: {
    fill: '#424242',
    height: 10,
  },
  UTR: {
    fill: '#424242',
    height: 4,
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

const activeTranscriptFeatureAttributes = {
  ...transcriptFeatureAttributes,
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
}

const featureTypeOrder = {
  exon: 0,
  UTR: 1,
  CDS: 2,
}
const featureTypeCompareFn = (r1, r2) =>
  featureTypeOrder[r1.feature_type] - featureTypeOrder[r2.feature_type]

const activeTranscriptRegionAttributes = region =>
  activeTranscriptFeatureAttributes[region.feature_type] ||
  activeTranscriptFeatureAttributes.default

const isTranscriptCoding = transcript => transcript.exons.some(exon => exon.feature_type === 'CDS')

const transcriptRegionKey = region => `${region.feature_type}-${region.start}-${region.stop}`

const exportTranscriptsPlot = (containerElement, filename) => {
  const transcriptPlots = containerElement.querySelectorAll('.transcript-plot')
  const { width } = containerElement.getBoundingClientRect()

  const svgNS = 'http://www.w3.org/2000/svg'
  const plot = document.createElementNS(svgNS, 'svg')
  plot.setAttribute('width', width)
  plot.setAttribute('height', 15 * transcriptPlots.length)

  Array.from(transcriptPlots).forEach((plotElement, i) => {
    const transcriptGroup = document.createElementNS(svgNS, 'g')
    transcriptGroup.setAttribute('transform', `translate(0,${i * 15})`)
    plot.appendChild(transcriptGroup)

    const plotGroup = document.createElementNS(svgNS, 'g')
    plotGroup.setAttribute('transform', `translate(100 , 0)`)
    plotGroup.innerHTML = plotElement.innerHTML
    transcriptGroup.appendChild(plotGroup)

    const transcriptIdLabel = document.createElementNS(svgNS, 'text')
    transcriptIdLabel.textContent = plotElement.getAttribute('data-transcript-id')
    transcriptIdLabel.setAttribute('font-family', 'sans-serif')
    transcriptIdLabel.setAttribute('font-size', 11)
    transcriptIdLabel.setAttribute('dy', '0.7em')
    transcriptIdLabel.setAttribute('x', 0)
    transcriptIdLabel.setAttribute('y', 0)
    transcriptGroup.appendChild(transcriptIdLabel)
  })

  const serializer = new XMLSerializer()
  const data = serializer.serializeToString(plot)

  const blob = new Blob(['<?xml version="1.0" standalone="no"?>\r\n', data], {
    type: 'image/svg+xml;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.svg`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

export const TranscriptsTrack = ({
  activeTranscript,
  exportFilename,
  renderActiveTranscriptRightPanel,
  renderTranscriptLeftPanel,
  renderTranscriptRightPanel,
  transcripts,
  showUTRs,
  showNonCodingTranscripts,
}) => {
  const transcriptsContainer = useRef(null)
  const [isExpanded, setIsExpanded] = useState(false)

  const StrandIcon = activeTranscript.strand === '-' ? LeftArrow : RightArrow

  return (
    <div>
      <TranscriptsWrapper>
        <Track
          renderLeftPanel={({ width }) => (
            <ToggleTranscriptsPanel width={width}>
              <Button
                onClick={() => {
                  setIsExpanded(expanded => !expanded)
                }}
              >
                {isExpanded ? 'Hide' : 'Show'} transcripts
              </Button>
              <StrandIcon height={20} width={20} />
            </ToggleTranscriptsPanel>
          )}
          renderRightPanel={
            isExpanded && renderActiveTranscriptRightPanel
              ? ({ width }) => renderActiveTranscriptRightPanel({ activeTranscript, width })
              : null
          }
        >
          {({ scalePosition, width }) => (
            <React.Fragment>
              <ActiveTranscriptPlotWrapper>
                <RegionsPlot
                  height={20}
                  // Sort by feature type to ensure that when regions overlap, the most important
                  // region is at the front.
                  regions={activeTranscript.exons
                    .filter(
                      exon =>
                        exon.feature_type === 'CDS' ||
                        (exon.feature_type === 'UTR' && showUTRs) ||
                        (exon.feature_type === 'exon' && showNonCodingTranscripts)
                    )
                    .sort(featureTypeCompareFn)}
                  regionAttributes={activeTranscriptRegionAttributes}
                  regionKey={transcriptRegionKey}
                  scalePosition={scalePosition}
                  width={width}
                />
              </ActiveTranscriptPlotWrapper>

              {isExpanded && (
                <ControlPanel>
                  <Button
                    onClick={() =>
                      exportTranscriptsPlot(transcriptsContainer.current, exportFilename, { width })
                    }
                  >
                    Save plot
                  </Button>
                </ControlPanel>
              )}
            </React.Fragment>
          )}
        </Track>
      </TranscriptsWrapper>
      {isExpanded && (
        <TranscriptsWrapper ref={transcriptsContainer}>
          {(showNonCodingTranscripts ? transcripts : transcripts.filter(isTranscriptCoding)).map(
            transcript => (
              <TranscriptWrapper key={transcript.transcript_id}>
                <Track
                  renderLeftPanel={
                    renderTranscriptLeftPanel
                      ? ({ width }) => renderTranscriptLeftPanel({ transcript, width })
                      : undefined
                  }
                  renderRightPanel={
                    renderTranscriptRightPanel
                      ? ({ width }) => renderTranscriptRightPanel({ transcript, width })
                      : undefined
                  }
                >
                  {({ scalePosition, width }) => (
                    <RegionsPlot
                      className="transcript-plot"
                      data-transcript-id={transcript.transcript_id}
                      height={10}
                      // Sort by feature type to ensure that when regions overlap, the most important
                      // region is at the front.
                      regions={transcript.exons
                        .filter(
                          exon =>
                            exon.feature_type === 'CDS' ||
                            (exon.feature_type === 'UTR' && showUTRs) ||
                            (exon.feature_type === 'exon' && showNonCodingTranscripts)
                        )
                        .sort(featureTypeCompareFn)}
                      regionKey={transcriptRegionKey}
                      regionAttributes={transcriptRegionAttributes}
                      scalePosition={scalePosition}
                      width={width}
                    />
                  )}
                </Track>
              </TranscriptWrapper>
            )
          )}
        </TranscriptsWrapper>
      )}
    </div>
  )
}

TranscriptsTrack.propTypes = {
  activeTranscript: PropTypes.shape({
    exons: PropTypes.arrayOf(
      PropTypes.shape({
        feature_type: PropTypes.string.isRequired,
        start: PropTypes.number.isRequired,
        stop: PropTypes.number.isRequired,
      })
    ).isRequired,
    strand: PropTypes.oneOf(['+', '-']).isRequired,
  }).isRequired,
  exportFilename: PropTypes.string,
  renderActiveTranscriptRightPanel: PropTypes.func,
  renderTranscriptLeftPanel: PropTypes.func,
  renderTranscriptRightPanel: PropTypes.func,
  showNonCodingTranscripts: PropTypes.bool,
  showUTRs: PropTypes.bool,
  transcripts: PropTypes.arrayOf(
    PropTypes.shape({
      transcript_id: PropTypes.string.isRequired,
      exons: PropTypes.arrayOf(
        PropTypes.shape({
          feature_type: PropTypes.string.isRequired,
          start: PropTypes.number.isRequired,
          stop: PropTypes.number.isRequired,
        })
      ).isRequired,
    })
  ).isRequired,
}

TranscriptsTrack.defaultProps = {
  exportFilename: 'transcripts',
  renderActiveTranscriptRightPanel: undefined,
  // eslint-disable-next-line react/prop-types
  renderTranscriptLeftPanel: ({ transcript }) => <span>{transcript.transcript_id}</span>,
  renderTranscriptRightPanel: undefined,
  showNonCodingTranscripts: false,
  showUTRs: false,
}
