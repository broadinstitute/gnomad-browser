import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { Track } from '@gnomad/region-viewer'
import { TooltipAnchor } from '@gnomad/ui'

import InfoButton from './help/InfoButton'

export const regionIntersections = regionArrays => {
  const sortedRegionsArrays = regionArrays.map(regions =>
    [...regions].sort((a, b) => a.start - b.start)
  )

  const intersections = []

  const indices = sortedRegionsArrays.map(() => 0)

  while (sortedRegionsArrays.every((regions, i) => indices[i] < regions.length)) {
    const maxStart = Math.max(...sortedRegionsArrays.map((regions, i) => regions[indices[i]].start))
    const minStop = Math.min(...sortedRegionsArrays.map((regions, i) => regions[indices[i]].stop))

    if (maxStart < minStop) {
      const next = Object.assign(
        ...[
          {},
          ...sortedRegionsArrays.map((regions, i) => regions[indices[i]]),
          {
            start: maxStart,
            stop: minStop,
          },
        ]
      )

      intersections.push(next)
    }

    sortedRegionsArrays.forEach((regions, i) => {
      if (regions[indices[i]].stop === minStop) {
        indices[i] += 1
      }
    })
  }

  return intersections
}

const Wrapper = styled.div`
  display: flex;
  margin-bottom: 1em;
`

const PlotWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
`

const RegionAttributeList = styled.dl`
  margin: 0;

  div {
    margin-bottom: 0.25em;
  }

  dt {
    display: inline;
    font-weight: bold;
  }

  dd {
    display: inline;
    margin-left: 0.5em;
  }
`

function regionColor(region) {
  // https://colorbrewer2.org/#type=diverging&scheme=Spectral&n=5
  let color
  if (region.obs_exp > 0.8) {
    color = '#2b83ba'
  } else if (region.obs_exp > 0.6) {
    color = '#abdda4'
  } else if (region.obs_exp > 0.4) {
    color = '#ffffbf'
  } else if (region.obs_exp > 0.2) {
    color = '#fdae61'
  } else {
    color = '#d7191c'
  }

  return region.chisq_diff_null < 10.8 ? '#e2e2e2' : color
}

const renderNumber = number =>
  number === undefined || number === null ? '-' : number.toPrecision(4)

const RegionTooltip = ({ region }) => (
  <RegionAttributeList>
    <div>
      <dt>O/E missense:</dt>
      <dd>{renderNumber(region.obs_exp)}</dd>
    </div>
    <div>
      <dt>
        &chi;
        <sup>2</sup>:
      </dt>
      <dd>
        {renderNumber(region.chisq_diff_null)}
        {region.chisq_diff_null !== null && region.chisq_diff_null < 10.8 && ' (not significant)'}
      </dd>
    </div>
  </RegionAttributeList>
)

RegionTooltip.propTypes = {
  region: PropTypes.shape({
    obs_exp: PropTypes.number,
    chisq_diff_null: PropTypes.number,
  }).isRequired,
}

const SidePanel = styled.div`
  display: flex;
  align-items: center;
`

const RegionalConstraintTrack = ({ constrainedRegions, exons }) => {
  const constrainedExons = regionIntersections([
    constrainedRegions,
    exons.filter(exon => exon.feature_type === 'CDS'),
  ])
  return (
    <Wrapper>
      <Track
        renderLeftPanel={() => (
          <SidePanel>
            <span>Regional missense constraint</span>
            <InfoButton topic="regional-constraint" />
          </SidePanel>
        )}
      >
        {({ scalePosition, width }) => (
          <PlotWrapper>
            <svg height={35} width={width}>
              {constrainedExons.map(region => {
                const startX = scalePosition(region.start)
                const stopX = scalePosition(region.stop)
                const regionWidth = stopX - startX

                return (
                  <TooltipAnchor
                    key={`${region.start}-${region.stop}`}
                    region={region}
                    tooltipComponent={RegionTooltip}
                  >
                    <g>
                      <rect
                        x={startX}
                        y={0}
                        width={regionWidth}
                        height={15}
                        fill={regionColor(region)}
                        stroke="black"
                      />
                    </g>
                  </TooltipAnchor>
                )
              })}
              <g transform="translate(0,20)">
                {constrainedRegions.map(region => {
                  const startX = scalePosition(region.start)
                  const stopX = scalePosition(region.stop)
                  const regionWidth = stopX - startX
                  const midX = (startX + stopX) / 2

                  return (
                    <g key={`${region.start}-${region.stop}`}>
                      <line x1={startX} y1={2} x2={startX} y2={11} stroke="#424242" />
                      <line x1={startX} y1={7} x2={midX - 15} y2={7} stroke="#424242" />
                      <line x1={midX + 15} y1={7} x2={stopX} y2={7} stroke="#424242" />
                      <line x1={stopX} y1={2} x2={stopX} y2={11} stroke="#424242" />
                      {regionWidth > 30 && (
                        <text x={midX} y={8} dy="0.33em" textAnchor="middle">
                          {region.obs_exp.toFixed(2)}
                        </text>
                      )}
                    </g>
                  )
                })}
              </g>
            </svg>
          </PlotWrapper>
        )}
      </Track>
    </Wrapper>
  )
}

RegionalConstraintTrack.propTypes = {
  exons: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
    })
  ).isRequired,
  constrainedRegions: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
      obs_exp: PropTypes.number.isRequired,
      chisq_diff_null: PropTypes.number.isRequired,
    })
  ).isRequired,
}

export default RegionalConstraintTrack
