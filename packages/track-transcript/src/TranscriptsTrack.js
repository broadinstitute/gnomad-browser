import LeftArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-circle-left.svg'
import RightArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-circle-right.svg'
import CaretDown from '@fortawesome/fontawesome-free/svgs/solid/caret-down.svg'
import CaretRight from '@fortawesome/fontawesome-free/svgs/solid/caret-right.svg'
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

import { trackPropTypes } from '@broad/region-viewer'
import { RegionsPlot } from '@broad/track-regions'
import { Button } from '@broad/ui'

import { TissueIsoformExpressionPlot, TissueIsoformExpressionPlotHeader } from './GTEx'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
`

const DomainRegionsWrapper = styled.div`
  display: flex;
`

const Panel = styled.div`
  display: flex;
  align-items: center;
  width: ${props => props.width}px;
`

const FanOutAndStrandPanel = styled(Panel)`
  justify-content: space-between;
  box-sizing: border-box;
  height: 50px;
  padding: 0 10px;
  font-size: 16px;

  svg {
    fill: #424242;
  }
`

const DomainRegionsCenterPanel = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`

const DomainRegionsPlotWrapper = styled.div`
  display: flex;
  align-items: center;
  height: 50px;
`

const ControlPanel = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: ${props => props.width}px;
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

const featureAttributes = {
  CDS: {
    fill: '#424242',
  },
  start_pad: {
    fill: '#5A5E5C',
    height: 3,
  },
  end_pad: {
    fill: '#5A5E5C',
    height: 3,
  },
  intron: {
    fill: '#5A5E5C',
    height: 3,
  },
  default: {
    fill: 'grey',
    height: 3,
  },
}

const regionAttributes = region =>
  featureAttributes[region.feature_type] || featureAttributes.default

export class TranscriptsTrack extends Component {
  static propTypes = {
    ...trackPropTypes,
    canonicalTranscript: PropTypes.string.isRequired,
    currentGene: PropTypes.string,
    currentTissue: PropTypes.string,
    currentTranscript: PropTypes.string,
    filenameForExport: PropTypes.string,
    maxTissueExpressions: PropTypes.object.isRequired, // eslint-disable-line
    onTissueChange: PropTypes.func.isRequired,
    positionOffset: PropTypes.func.isRequired,
    renderTranscriptId: PropTypes.func,
    strand: PropTypes.string.isRequired,
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

  exportPlot() {
    const { filenameForExport, leftPanelWidth, width } = this.props

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

  renderRegionViewerDomain() {
    const {
      currentGene,
      currentTissue,
      leftPanelWidth,
      maxTissueExpressions,
      offsetRegions,
      onTissueChange,
      positionOffset,
      rightPanelWidth,
      strand,
      toggleTranscriptFanOut,
      transcriptFanOut,
      width,
      xScale,
    } = this.props

    const FanOutIcon = transcriptFanOut ? CaretDown : CaretRight
    const fanOutLabel = `${transcriptFanOut ? 'Hide' : 'Show'} all transcripts`

    const StrandIcon = strand === '-' ? LeftArrow : RightArrow

    return (
      <DomainRegionsWrapper>
        <FanOutAndStrandPanel width={leftPanelWidth}>
          <Button aria-label={fanOutLabel} title={fanOutLabel} onClick={toggleTranscriptFanOut}>
            <FanOutIcon />
          </Button>
          <StrandIcon height={20} width={20} />
        </FanOutAndStrandPanel>

        <DomainRegionsCenterPanel>
          <DomainRegionsPlotWrapper>
            <RegionsPlot
              height={20}
              regions={offsetRegions}
              regionAttributes={regionAttributes}
              width={width}
              xScale={pos => xScale(positionOffset(pos).offsetPosition)}
            />
          </DomainRegionsPlotWrapper>

          {transcriptFanOut && (
            <ControlPanel marginLeft={leftPanelWidth} width={width}>
              <Button onClick={() => this.exportPlot()}>Save plot</Button>
            </ControlPanel>
          )}
        </DomainRegionsCenterPanel>

        {!!rightPanelWidth &&
          transcriptFanOut && (
            <TissueIsoformExpressionPlotHeader
              currentGene={currentGene}
              currentTissue={currentTissue}
              maxTissueExpressions={maxTissueExpressions}
              onTissueChange={onTissueChange}
              width={rightPanelWidth}
            />
          )}
      </DomainRegionsWrapper>
    )
  }

  renderTranscripts() {
    const {
      canonicalTranscript,
      currentTissue,
      currentTranscript,
      leftPanelWidth,
      maxTissueExpressions,
      positionOffset,
      rightPanelWidth,
      transcriptFanOut,
      renderTranscriptId,
      transcripts,
      width,
      xScale,
    } = this.props

    const renderedTranscripts = transcripts.filter(transcript =>
      transcript.exons.some(exon => exon.feature_type === 'CDS')
    )

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

    const combinedXScale = pos => xScale(positionOffset(pos).offsetPosition)

    return (
      <TranscriptsWrapper innerRef={this.transcriptsContainerRef}>
        {sortedTranscripts.map(transcript => (
          <TranscriptWrapper key={transcript.transcript_id}>
            {leftPanelWidth && (
              <Panel width={leftPanelWidth}>
                {renderTranscriptId(transcript.transcript_id, {
                  isCanonical: canonicalTranscript === transcript.transcript_id,
                  isSelected: currentTranscript === transcript.transcript_id,
                })}
              </Panel>
            )}
            <Panel width={width}>
              <RegionsPlot
                className="transcript-plot"
                data-transcript-id={transcript.transcript_id}
                height={10}
                regions={transcript.exons.filter(exon => exon.feature_type === 'CDS')}
                regionAttributes={regionAttributes}
                width={width}
                xScale={combinedXScale}
              />
            </Panel>
            {!!rightPanelWidth &&
              transcriptFanOut && (
                <Panel width={rightPanelWidth}>
                  {
                    <TissueIsoformExpressionPlot
                      currentTissue={currentTissue}
                      height={10}
                      maxTissueExpressions={maxTissueExpressions}
                      transcript={transcript}
                      width={rightPanelWidth}
                    />
                  }
                </Panel>
              )}
          </TranscriptWrapper>
        ))}
      </TranscriptsWrapper>
    )
  }

  render() {
    const { transcriptFanOut } = this.props
    return (
      <Wrapper>
        {this.renderRegionViewerDomain()}
        {transcriptFanOut && this.renderTranscripts()}
      </Wrapper>
    )
  }
}
