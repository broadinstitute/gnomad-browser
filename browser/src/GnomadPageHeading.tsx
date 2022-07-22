import React from 'react'
import styled from 'styled-components'

import DatasetSelector from './DatasetSelector'
import InfoButton from './help/InfoButton'

const PageHeadingWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.5em;
  border-bottom: 1px solid #ccc;
  margin: 0.67em 0;

  @media (max-width: 1200px) {
    flex-direction: column;
    align-items: flex-start;
    padding-bottom: 0.25em;
  }

  @media (max-width: 900px) {
    align-items: center;
  }
`

const PageHeadingInnerWrapper = styled.div`
  display: flex;
  flex-shrink: 1;
  flex-direction: row;
  align-items: center;
  overflow: hidden;
  max-width: 100%;
  padding: 3px 0;

  @media (max-width: 1200px) {
    margin-bottom: 1em;
  }

  @media (max-width: 900px) {
    flex-direction: column;
  }
`

const CenterPanel = styled.div`
  flex-shrink: 0;

  @media (max-width: 900px) {
    margin: 0.25em 0;
  }
`

const PageHeadingText = styled.h1`
  overflow: hidden;
  max-width: 100%;
  margin: 0;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 900px) {
    display: flex;
    flex-direction: column;
    text-align: center;
  }
`

const PageControlsWrapper = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;

  @media (min-width: 900px) {
    margin-left: 1ch;
  }
`

const Label = styled.span`
  margin-right: 0.5em;
`

/*
(ts-migrate) TODO: Migrate the remaining prop types
...DatasetSelector.propTypes
*/
type OwnProps = {
  children: React.ReactNode
  extra?: React.ReactNode
}

// @ts-expect-error TS(2456) FIXME: Type alias 'Props' circularly references itself.
type Props = OwnProps & typeof GnomadPageHeading.defaultProps

// @ts-expect-error TS(7022) FIXME: 'GnomadPageHeading' implicitly has type 'any' beca... Remove this comment to see the full error message
const GnomadPageHeading = ({ children, extra, datasetOptions, selectedDataset }: Props) => (
  <PageHeadingWrapper>
    <PageHeadingInnerWrapper>
      <PageHeadingText>{children}</PageHeadingText>
      {extra && <CenterPanel>{extra}</CenterPanel>}
    </PageHeadingInnerWrapper>
    <PageControlsWrapper>
      <Label>Dataset</Label>
      <DatasetSelector datasetOptions={datasetOptions} selectedDataset={selectedDataset} />
      <span>
        <InfoButton topic="dataset-selection" />
      </span>
    </PageControlsWrapper>
  </PageHeadingWrapper>
)

GnomadPageHeading.defaultProps = {
  extra: undefined,
}

export default GnomadPageHeading
