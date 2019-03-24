import { scaleLinear } from 'd3-scale'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { QuestionMark } from '@broad/help'
import { Track } from '@broad/region-viewer'
import { RegionsPlot } from '@broad/track-regions'
import { Button } from '@broad/ui'

import { GTEX_TISSUE_COLORS, GTEX_TISSUE_NAMES } from './gtex'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
`

const InnerWrapper = styled.div`
  margin-bottom: 1em;
`

const TissueName = styled.div`
  display: flex;
  align-items: center;
  height: 31px;
  margin-right: 5px;
  font-size: 10px;
`

const PlotWrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin: 5px 0;
`

const NotExpressedMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 21px;
  margin: 5px 0;
  color: gray;
  font-size: 10px;
`

const renderProportionAxis = ({ width }) =>
  width > 20 && (
    <svg width={width} height={31}>
      <line x1={0} y1={6} x2={0} y2={25} stroke="#333" />
      <g transform="translate(0, 6)">
        <line x1={0} y1={0} x2={3} y2={0} stroke="#333" />
        <text x={5} y={0} dy="0.3em" fill="#000" fontSize={10} textAnchor="start">
          1
        </text>
      </g>
      <g transform="translate(0, 24)">
        <line x1={0} y1={0} x2={3} y2={0} stroke="#333" />
        <text x={5} y={0} dy="0.2em" fill="#000" fontSize={10} textAnchor="start">
          0
        </text>
      </g>
    </svg>
  )

const IndividualTissueTrack = ({ exons, expressionRegions, tissue }) => (
  <Track
    renderLeftPanel={() => <TissueName>{GTEX_TISSUE_NAMES[tissue]}</TissueName>}
    renderRightPanel={renderProportionAxis}
  >
    {({ scalePosition, width }) => {
      const isExpressed = expressionRegions.some(region => region.tissues[tissue] !== 0)

      if (!isExpressed) {
        return <NotExpressedMessage>Gene is not expressed in this tissue</NotExpressedMessage>
      }

      const heightScale = scaleLinear()
        .domain([0, 1])
        .range([0, 20])
        .clamp(true)

      return (
        <PlotWrapper key={tissue}>
          <RegionsPlot
            axisColor="rgba(0,0,0,0)"
            height={20}
            regionAttributes={region => {
              const height = heightScale(region.tissues[tissue])
              return {
                fill: GTEX_TISSUE_COLORS[tissue],
                stroke: GTEX_TISSUE_COLORS[tissue],
                height,
                y: 20 - height,
              }
            }}
            regions={expressionRegions}
            scalePosition={scalePosition}
            width={width}
          />
          <RegionsPlot
            axisColor="rgba(0,0,0,0)"
            height={1}
            regions={exons}
            scalePosition={scalePosition}
            width={width}
          />
        </PlotWrapper>
      )
    }}
  </Track>
)

IndividualTissueTrack.propTypes = {
  exons: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
    })
  ).isRequired,
  expressionRegions: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
      mean: PropTypes.number,
      tissues: PropTypes.objectOf(PropTypes.number).isRequired,
    })
  ).isRequired,
  tissue: PropTypes.string.isRequired,
}

class TissueExpressionTrack extends Component {
  static propTypes = {
    exons: PropTypes.arrayOf(
      PropTypes.shape({
        start: PropTypes.number.isRequired,
        stop: PropTypes.number.isRequired,
      })
    ).isRequired,
    expressionRegions: PropTypes.arrayOf(
      PropTypes.shape({
        start: PropTypes.number.isRequired,
        stop: PropTypes.number.isRequired,
        mean: PropTypes.number,
        tissues: PropTypes.objectOf(PropTypes.number).isRequired,
      })
    ).isRequired,
  }

  state = {
    isExpanded: false,
  }

  toggleExpanded = () => {
    this.setState(state => ({ ...state, isExpanded: !state.isExpanded }))
  }

  render() {
    const { exons, expressionRegions } = this.props
    const { isExpanded } = this.state

    const tissues = Object.keys(GTEX_TISSUE_NAMES).sort((t1, t2) =>
      GTEX_TISSUE_NAMES[t1].localeCompare(GTEX_TISSUE_NAMES[t2])
    )

    const isExpressed = expressionRegions.some(region => region.mean !== 0)

    const heightScale = scaleLinear()
      .domain([0, 1])
      .range([0, 20])
      .clamp(true)

    return (
      <Wrapper>
        <InnerWrapper>
          <Track
            renderLeftPanel={() => (
              <TissueName
                style={{ fontSize: '12px', justifyContent: 'space-between', marginRight: 0 }}
              >
                <Button
                  disabled={!isExpressed}
                  style={{ width: '70px', paddingLeft: '0.25em', paddingRight: '0.25em' }}
                  onClick={this.toggleExpanded}
                >
                  {isExpanded ? 'Hide' : 'Show'} tissues
                </Button>
                <span style={{ marginRight: '0.25em', textAlign: 'right' }}>Mean pext</span>
                <QuestionMark topic="pext" style={{ display: 'inline' }} />
              </TissueName>
            )}
            renderRightPanel={renderProportionAxis}
          >
            {({ scalePosition, width }) => {
              if (!isExpressed) {
                return (
                  <NotExpressedMessage>Gene is not expressed in GTEx tissues</NotExpressedMessage>
                )
              }

              return (
                <PlotWrapper>
                  <RegionsPlot
                    axisColor="rgba(0,0,0,0)"
                    height={20}
                    regionAttributes={region => {
                      const height = heightScale(region.mean)
                      return {
                        fill: '#428bca',
                        stroke: '#428bca',
                        height,
                        y: 20 - height,
                      }
                    }}
                    scalePosition={scalePosition}
                    regions={expressionRegions}
                    width={width}
                  />
                  <RegionsPlot
                    axisColor="rgba(0,0,0,0)"
                    height={1}
                    regions={exons}
                    scalePosition={scalePosition}
                    width={width}
                  />
                </PlotWrapper>
              )
            }}
          </Track>
        </InnerWrapper>
        {isExpanded &&
          tissues.map(tissue => (
            <IndividualTissueTrack
              key={tissue}
              exons={exons}
              expressionRegions={expressionRegions}
              tissue={tissue}
            />
          ))}
      </Wrapper>
    )
  }
}

export default TissueExpressionTrack
