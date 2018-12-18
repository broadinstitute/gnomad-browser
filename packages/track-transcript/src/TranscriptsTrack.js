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
  align-items: center;
  height: 80px;
`

const Panel = styled.div`
  display: flex;
  align-items: center;
  width: ${props => props.width}px;
`

const FanOutAndStrandPanel = styled(Panel)`
  justify-content: space-between;
  box-sizing: border-box;
  padding: 0 10px;
  font-size: 16px;

  svg {
    fill: #424242;
  }
`

const TranscriptWrapper = styled.div`
  display: flex;
  padding: 2px 0;
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
    renderTranscriptId: transcript => <span>{transcript.transcript_id}</span>,
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

        <RegionsPlot
          height={20}
          regions={offsetRegions}
          regionAttributes={regionAttributes}
          width={width}
          xScale={pos => xScale(positionOffset(pos).offsetPosition)}
        />

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

    return sortedTranscripts.map(transcript => (
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
    ))
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
