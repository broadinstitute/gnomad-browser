import queryString from 'query-string'
import React from 'react'
import { withRouter } from 'react-router-dom'
import styled from 'styled-components'

import { Button } from '@gnomad/ui'

const Wrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;

  ${Button} {
    margin-left: 0.5em;

    &:first-child {
      margin-left: 0;
    }
  }
`

const ZoomLabel = styled.span`
  margin: 0 0.5em;

  @media (max-width: 600px) {
    margin-bottom: 0.5em;
  }
`

const ZoomControlsWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-left: 1em;

  @media (max-width: 600px) {
    flex-direction: column;
    margin-bottom: 1em;

    &:first-child {
      margin-left: 0;
    }
  }
`

const zoomedRegion = (region: any, zoom: any) => {
  const { chrom, start, stop } = region
  const center = (start + stop) / 2
  const size = stop - start + 1

  const newSize = size / zoom

  return {
    chrom,
    start: Math.max(1, Math.floor(center - newSize / 2)),
    stop: Math.floor(center + newSize / 2),
  }
}

type RegionControlsProps = {
  region: {
    chrom: string
    start: number
    stop: number
  }
  onChange: (...args: any[]) => any
}

const RegionControls = ({ region, onChange, ...otherProps }: RegionControlsProps) => (
  <Wrapper {...otherProps}>
    <ZoomControlsWrapper>
      <ZoomLabel>Zoom in</ZoomLabel>
      <span>
        <Button
          aria-label="Zoom in 1.5x"
          onClick={() => {
            onChange(zoomedRegion(region, 1.5))
          }}
        >
          1.5x
        </Button>

        <Button
          aria-label="Zoom in 3x"
          onClick={() => {
            onChange(zoomedRegion(region, 3))
          }}
        >
          3x
        </Button>
        <Button
          aria-label="Zoom in 10x"
          onClick={() => {
            onChange(zoomedRegion(region, 10))
          }}
        >
          10x
        </Button>
      </span>
    </ZoomControlsWrapper>

    <ZoomControlsWrapper>
      <ZoomLabel>Zoom out</ZoomLabel>
      <span>
        <Button
          aria-label="Zoom out 1.5x"
          onClick={() => {
            onChange(zoomedRegion(region, 1 / 1.5))
          }}
        >
          1.5x
        </Button>
        <Button
          aria-label="Zoom out 3x"
          onClick={() => {
            onChange(zoomedRegion(region, 1 / 3))
          }}
        >
          3x
        </Button>
        <Button
          aria-label="Zoom out 10x"
          onClick={() => {
            onChange(zoomedRegion(region, 1 / 10))
          }}
        >
          10x
        </Button>
      </span>
    </ZoomControlsWrapper>
  </Wrapper>
)

const GnomadRegionControls = withRouter(({ history, location, match, ...otherProps }: any) => (
  <RegionControls
    {...otherProps}
    onChange={(region) => {
      const regionId = `${region.chrom}-${region.start}-${region.stop}`
      const currentParams = queryString.parse(location.search)
      const next = {
        pathname: `/region/${regionId}`,
        search: queryString.stringify({ dataset: currentParams.dataset }),
      }
      history.push(next)
    }}
  />
))

export default GnomadRegionControls
