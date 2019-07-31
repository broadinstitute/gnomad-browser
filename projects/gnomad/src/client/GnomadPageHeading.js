import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { QuestionMark } from '@broad/help'

import DatasetSelector from './DatasetSelector'

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
  flex-direction: row;
  align-items: center;

  @media (max-width: 900px) {
    display: flex;
    flex-direction: column;
  }
`

const CenterPanel = styled.div`
  flex-grow: 1;

  @media (max-width: 900px) {
    margin-bottom: 0.25em;
  }
`

const PageHeadingText = styled.h1`
  margin: 0;

  @media (max-width: 900px) {
    display: flex;
    flex-direction: column;
    text-align: center;
  }
`

const PageControlsWrapper = styled.div`
  display: flex;
  align-items: center;
`

const Label = styled.span`
  margin-right: 0.5em;
`

const GnomadPageHeading = ({ children, extra, datasetOptions, selectedDataset }) => (
  <PageHeadingWrapper>
    <PageHeadingInnerWrapper>
      <PageHeadingText>{children}</PageHeadingText>
      {extra && <CenterPanel>{extra}</CenterPanel>}
    </PageHeadingInnerWrapper>
    <PageControlsWrapper>
      <Label>Dataset</Label>
      <DatasetSelector datasetOptions={datasetOptions} selectedDataset={selectedDataset} />
      <span>
        <QuestionMark topic="dataset-selection" />
      </span>
    </PageControlsWrapper>
  </PageHeadingWrapper>
)

GnomadPageHeading.propTypes = {
  ...DatasetSelector.propTypes,
  children: PropTypes.node.isRequired,
  extra: PropTypes.node,
}

GnomadPageHeading.defaultProps = {
  extra: undefined,
}

export default GnomadPageHeading
