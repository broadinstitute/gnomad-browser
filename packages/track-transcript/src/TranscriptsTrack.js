import LeftArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-circle-left.svg'
import RightArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-circle-right.svg'
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

import { trackPropTypes } from '@broad/region-viewer'
import { RegionsPlot } from '@broad/track-regions'
import { Button, Checkbox } from '@broad/ui'

import { TissueIsoformExpressionPlot, TissueIsoformExpressionPlotHeader } from './GTEx'
import { Legend, LegendItem } from './Legend'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
`

const CompositeWrapper = styled.div`
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

const compositeTranscriptRegionAttributes = region =>
  compositeTranscriptFeatureAttributes[region.feature_type] ||
  compositeTranscriptFeatureAttributes.default

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

  state = {
    showNonCodingTranscripts: false,
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

  renderCompositeTranscript() {
    const {
      compositeExons,
      currentGene,
      currentTissue,
      leftPanelWidth,
      maxTissueExpressions,
      onTissueChange,
      positionOffset,
      rightPanelWidth,
      strand,
      toggleTranscriptFanOut,
      transcriptFanOut,
      width,
      xScale,
    } = this.props
    const { showNonCodingTranscripts } = this.state

    const StrandIcon = strand === '-' ? LeftArrow : RightArrow

    return (
      <CompositeWrapper>
        <FanOutAndStrandPanel width={leftPanelWidth}>
          <Button onClick={toggleTranscriptFanOut}>
            {transcriptFanOut ? 'Hide transcripts' : 'Show transcripts'}
          </Button>
          <StrandIcon height={20} width={20} />
        </FanOutAndStrandPanel>

        <CompositeCenterPanel>
          <CompositePlotWrapper>
            <RegionsPlot
              height={20}
              regions={compositeExons}
              regionAttributes={compositeTranscriptRegionAttributes}
              regionKey={region => `${region.feature_type}-${region.start}-${region.stop}`}
              width={width}
              xScale={pos => xScale(positionOffset(pos).offsetPosition)}
            />
          </CompositePlotWrapper>

          {transcriptFanOut && (
            <ControlPanel marginLeft={leftPanelWidth} width={width}>
              <Legend>
                <LegendItem
                  color="#424242"
                  label="CDS"
                  height={transcriptFeatureAttributes.CDS.height}
                />
                <LegendItem
                  color="#424242"
                  label="UTR"
                  height={transcriptFeatureAttributes.UTR.height}
                />
                <LegendItem
                  color="#bdbdbd"
                  label="Non-coding exon"
                  height={transcriptFeatureAttributes.exon.height}
                />
              </Legend>
              <Checkbox
                checked={showNonCodingTranscripts}
                id="transcript-track-show-non-coding"
                label="Show non-coding transcripts"
                onChange={checked => {
                  this.setState({ showNonCodingTranscripts: checked })
                }}
              />
              <Button onClick={() => this.exportPlot()}>Save plot</Button>
            </ControlPanel>
          )}
        </CompositeCenterPanel>

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
      </CompositeWrapper>
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
    const { showNonCodingTranscripts } = this.state

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
                regions={
                  transcript.exons.some(exon => exon.feature_type !== 'exon')
                    ? transcript.exons.filter(exon => exon.feature_type !== 'exon')
                    : transcript.exons
                }
                regionKey={region => `${region.feature_type}-${region.start}-${region.stop}`}
                regionAttributes={transcriptRegionAttributes}
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
        {this.renderCompositeTranscript()}
        {transcriptFanOut && this.renderTranscripts()}
      </Wrapper>
    )
  }
}
