import LeftArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-circle-left.svg'
import RightArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-circle-right.svg'
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

import { Track } from '@broad/region-viewer'
import { RegionsPlot } from '@broad/track-regions'
import { Button } from '@broad/ui'

import { TissueIsoformExpressionPlot, TissueIsoformExpressionPlotHeader } from './GTEx'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 1em;
`

const CompositeWrapper = styled.div`
  display: flex;
`

const FanOutAndStrandPanel = styled.div`
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

const CompositeCenterPanel = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`

const CompositePlotWrapper = styled.div`
  display: flex;
  align-items: center;
  height: 50px;
`

const ControlPanel = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: ${props => props.width}px;

  > * {
    margin-left: 1em;
  }

  @media (max-width: 500px) {
    flex-direction: column;
    align-items: flex-end;

    > * {
      margin-bottom: 0.5em;
      margin-left: 0;
    }
  }
`

const TranscriptsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 1em;
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

const compositeTranscriptFeatureAttributes = {
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

const compositeTranscriptRegionAttributes = region =>
  compositeTranscriptFeatureAttributes[region.feature_type] ||
  compositeTranscriptFeatureAttributes.default

export class TranscriptsTrack extends Component {
  static propTypes = {
    canonicalTranscript: PropTypes.string.isRequired,
    compositeExons: PropTypes.arrayOf(
      PropTypes.shape({
        start: PropTypes.number.isRequired,
        stop: PropTypes.number.isRequired,
      })
    ).isRequired,
    currentGene: PropTypes.string,
    currentTissue: PropTypes.string,
    currentTranscript: PropTypes.string,
    filenameForExport: PropTypes.string,
    maxTissueExpressions: PropTypes.object.isRequired, // eslint-disable-line
    onTissueChange: PropTypes.func.isRequired,
    renderTranscriptId: PropTypes.func,
    showNonCodingTranscripts: PropTypes.bool.isRequired,
    showUTRs: PropTypes.bool.isRequired,
    strand: PropTypes.string.isRequired,
    toggleTranscriptFanOut: PropTypes.func.isRequired,
    transcriptFanOut: PropTypes.bool.isRequired,
    transcripts: PropTypes.arrayOf(PropTypes.object).isRequired,
  }

  static defaultProps = {
    currentGene: null,
    currentTissue: null,
    currentTranscript: null,
    filenameForExport: 'transcripts',
    renderTranscriptId: transcript => <span>{transcript.transcript_id}</span>,
  }

  transcriptsContainerRef = element => {
    this.transcriptsContainerElement = element
  }

  exportPlot({ leftPanelWidth, width }) {
    const { filenameForExport } = this.props

    const transcriptPlots = this.transcriptsContainerElement.querySelectorAll('.transcript-plot')

    const svgNS = 'http://www.w3.org/2000/svg'
    const exportPlot = document.createElementNS(svgNS, 'svg')
    exportPlot.setAttribute('width', leftPanelWidth + width)
    exportPlot.setAttribute('height', 15 * transcriptPlots.length)

    Array.from(transcriptPlots).forEach((plotElement, i) => {
      const transcriptGroup = document.createElementNS(svgNS, 'g')
      transcriptGroup.setAttribute('transform', `translate(0,${i * 15})`)
      exportPlot.appendChild(transcriptGroup)

      const plotGroup = document.createElementNS(svgNS, 'g')
      plotGroup.setAttribute('transform', `translate(${leftPanelWidth}, 0)`)
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
    const data = serializer.serializeToString(exportPlot)

    const blob = new Blob(['<?xml version="1.0" standalone="no"?>\r\n', data], {
      type: 'image/svg+xml;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filenameForExport}.svg`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  renderCompositeTranscript() {
    const {
      compositeExons,
      currentGene,
      currentTissue,
      maxTissueExpressions,
      onTissueChange,
      strand,
      toggleTranscriptFanOut,
      transcriptFanOut,
    } = this.props

    const StrandIcon = strand === '-' ? LeftArrow : RightArrow

    return (
      <CompositeWrapper>
        <Track
          renderLeftPanel={({ width }) => (
            <FanOutAndStrandPanel width={width}>
              <Button onClick={toggleTranscriptFanOut}>
                {transcriptFanOut ? 'Hide transcripts' : 'Show transcripts'}
              </Button>
              <StrandIcon height={20} width={20} />
            </FanOutAndStrandPanel>
          )}
          renderRightPanel={
            transcriptFanOut
              ? ({ width }) =>
                  width > 150 && (
                    <TissueIsoformExpressionPlotHeader
                      currentGene={currentGene}
                      currentTissue={currentTissue}
                      maxTissueExpressions={maxTissueExpressions}
                      onTissueChange={onTissueChange}
                      width={width}
                    />
                  )
              : null
          }
        >
          {({ leftPanelWidth, scalePosition, width }) => (
            <CompositeCenterPanel>
              <CompositePlotWrapper>
                <RegionsPlot
                  height={20}
                  // Sort by feature type to ensure that when regions overlap, the most important
                  // region is at the front.
                  regions={compositeExons.sort(featureTypeCompareFn)}
                  regionAttributes={compositeTranscriptRegionAttributes}
                  regionKey={region => `${region.feature_type}-${region.start}-${region.stop}`}
                  scalePosition={scalePosition}
                  width={width}
                />
              </CompositePlotWrapper>

              {transcriptFanOut && (
                <ControlPanel marginLeft={leftPanelWidth} width={width}>
                  <Button onClick={() => this.exportPlot({ leftPanelWidth, width })}>
                    Save plot
                  </Button>
                </ControlPanel>
              )}
            </CompositeCenterPanel>
          )}
        </Track>
      </CompositeWrapper>
    )
  }

  renderTranscripts() {
    const {
      canonicalTranscript,
      currentTissue,
      currentTranscript,
      maxTissueExpressions,
      transcriptFanOut,
      renderTranscriptId,
      transcripts,
      showUTRs,
      showNonCodingTranscripts,
    } = this.props

    const renderedTranscripts = showNonCodingTranscripts
      ? transcripts
      : transcripts.filter(transcript => transcript.exons.some(exon => exon.feature_type === 'CDS'))

    // Sort transcripts by isCanonical, mean expression, transcript ID
    const sortedTranscripts = renderedTranscripts.sort((t1, t2) => {
      if (t1.transcript_id === canonicalTranscript) {
        return -1
      }
      if (t2.transcript_id === canonicalTranscript) {
        return 1
      }

      const t1Mean = t1.gtexTissueExpression.aggregate.mean
      const t2Mean = t2.gtexTissueExpression.aggregate.mean

      if (t1Mean === t2Mean) {
        return t1.transcript_id.localeCompare(t2.transcript_id)
      }

      return t2Mean - t1Mean
    })

    return (
      <TranscriptsWrapper ref={this.transcriptsContainerRef}>
        {sortedTranscripts.map(transcript => (
          <TranscriptWrapper key={transcript.transcript_id}>
            <Track
              renderLeftPanel={() => (
                <span>
                  {renderTranscriptId(transcript.transcript_id, {
                    isCanonical: canonicalTranscript === transcript.transcript_id,
                    isSelected: currentTranscript === transcript.transcript_id,
                  })}
                </span>
              )}
              renderRightPanel={
                transcriptFanOut
                  ? ({ width }) =>
                      width > 150 && (
                        <TissueIsoformExpressionPlot
                          currentTissue={currentTissue}
                          height={10}
                          maxTissueExpressions={maxTissueExpressions}
                          transcript={transcript}
                          width={width}
                        />
                      )
                  : null
              }
            >
              {({ scalePosition, width }) => (
                <RegionsPlot
                  className="transcript-plot"
                  data-transcript-id={transcript.transcript_id}
                  height={10}
                  regions={
                    // Do not show "exon" regions for coding transcripts
                    (transcript.exons.some(exon => exon.feature_type !== 'exon')
                      ? transcript.exons.filter(exon => exon.feature_type !== 'exon')
                      : transcript.exons
                    ).filter(
                      exon =>
                        exon.feature_type === 'CDS' ||
                        (exon.feature_type === 'UTR' && showUTRs) ||
                        (exon.feature_type === 'exon' && showNonCodingTranscripts)
                    )
                  }
                  regionKey={region => `${region.feature_type}-${region.start}-${region.stop}`}
                  regionAttributes={transcriptRegionAttributes}
                  scalePosition={scalePosition}
                  width={width}
                />
              )}
            </Track>
          </TranscriptWrapper>
        ))}
      </TranscriptsWrapper>
    )
  }

  render() {
    const { transcriptFanOut } = this.props
    return (
      <Wrapper>
        {this.renderCompositeTranscript()}
        {transcriptFanOut && this.renderTranscripts()}
      </Wrapper>
    )
  }
}
