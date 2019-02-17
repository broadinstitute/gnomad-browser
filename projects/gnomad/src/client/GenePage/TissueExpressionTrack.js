import { scaleLinear } from 'd3-scale'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { trackPropTypes } from '@broad/region-viewer'
import { RegionsPlot } from '@broad/track-regions'
import { Button } from '@broad/ui'

import { GTEX_TISSUE_COLORS, GTEX_TISSUE_NAMES } from './gtex'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 5px;
`

const InnerWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: stretch;
`

const TopPanel = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: ${props => props.width}px;
  margin-bottom: 0.5em;
  margin-left: ${props => props.marginLeft}px;
`

const SidePanel = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  width: ${props => props.width}px;
`

const CenterPanel = styled.div`
  display: flex;
  flex-direction: column;
  width: ${props => props.width}px;
`

const TissueName = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  height: 31px;
  margin-right: 5px;
  font-size: 10px;
  text-align: right;
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

class TissueExpressionTrack extends Component {
  static propTypes = {
    ...trackPropTypes,
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
    const {
      leftPanelWidth,
      positionOffset,
      rightPanelWidth,
      exons,
      expressionRegions,
      width,
      xScale: regionViewerXScale,
    } = this.props
    const { isExpanded } = this.state

    const xScale = pos => regionViewerXScale(positionOffset(pos).offsetPosition)

    const tissues = Object.keys(GTEX_TISSUE_NAMES).sort((t1, t2) =>
      GTEX_TISSUE_NAMES[t1].localeCompare(GTEX_TISSUE_NAMES[t2])
    )

    const isExpressed = expressionRegions.some(region => region.mean !== 0)
    const isExpressedInTissue = tissues.reduce(
      (acc, tissue) => ({
        ...acc,
        [tissue]: expressionRegions.some(region => region.tissues[tissue] !== 0),
      }),
      {}
    )

    const heightScale = scaleLinear()
      .domain([0, 1])
      .range([0, 20])
      .clamp(true)

    return (
      <Wrapper>
        <TopPanel marginLeft={leftPanelWidth} width={width}>
          <Button disabled={!isExpressed} onClick={this.toggleExpanded}>
            {isExpanded ? 'Hide' : 'Show'} all tissues
          </Button>
        </TopPanel>
        <InnerWrapper>
          <SidePanel width={leftPanelWidth}>
            <TissueName style={{ fontSize: '12px' }}>Average pext across GTEx</TissueName>
            {isExpanded &&
              tissues.map(tissue => (
                <TissueName key={tissue}>{GTEX_TISSUE_NAMES[tissue]}</TissueName>
              ))}
          </SidePanel>
          <CenterPanel width={width}>
            {isExpressed ? (
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
                  regions={expressionRegions}
                  width={width}
                  xScale={xScale}
                />
                <RegionsPlot
                  axisColor="rgba(0,0,0,0)"
                  height={1}
                  regions={exons}
                  width={width}
                  xScale={xScale}
                />
              </PlotWrapper>
            ) : (
              <NotExpressedMessage>Gene is not expressed in GTEx tissues</NotExpressedMessage>
            )}
            {isExpanded &&
              tissues.map(tissue => {
                if (!isExpressedInTissue[tissue]) {
                  return (
                    <NotExpressedMessage key={tissue}>
                      Gene is not expressed in this tissue
                    </NotExpressedMessage>
                  )
                }

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
                      width={width}
                      xScale={xScale}
                    />
                    <RegionsPlot
                      axisColor="rgba(0,0,0,0)"
                      height={1}
                      regions={exons}
                      width={width}
                      xScale={xScale}
                    />
                  </PlotWrapper>
                )
              })}
          </CenterPanel>
          {rightPanelWidth > 20 && (
            <SidePanel width={rightPanelWidth}>
              {['mean'].concat(isExpanded ? tissues : []).map(tissue => (
                <svg key={tissue} width={rightPanelWidth} height={31}>
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
              ))}
            </SidePanel>
          )}
        </InnerWrapper>
      </Wrapper>
    )
  }
}

export default TissueExpressionTrack
