import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

export const Page = styled.div`
  box-sizing: border-box;
  width: 100%;
  max-width: 1200px;
  padding: 0 15px;
  margin: 0 auto 40px;
  font-size: 14px;
`

const PageHeadingWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding-bottom: 0.5em;
  border-bottom: 1px solid #ccc;
  margin: 0.67em 0;
  font-size: 36px;

  @media (max-width: 900px) {
    flex-direction: column;
    align-items: center;
    border-bottom: none;
  }
`
const PageHeadingText = styled.h1`
  margin: 0;
  font-size: 1em;

  @media (max-width: 900px) {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-bottom: 0.5em;
    border-bottom: 1px solid #ccc;
    margin-bottom: 0.5em;
  }
`

const PageControlsWrapper = styled.div`
  display: flex;
  align-items: center;
  font-size: 14px;
`

export const PageHeading = ({ children, renderPageControls }) => (
  <PageHeadingWrapper>
    <PageHeadingText>{children}</PageHeadingText>
    {renderPageControls && <PageControlsWrapper>{renderPageControls()}</PageControlsWrapper>}
  </PageHeadingWrapper>
)

PageHeading.propTypes = {
  children: PropTypes.node.isRequired,
  renderPageControls: PropTypes.func,
}

PageHeading.defaultProps = {
  renderPageControls: undefined,
}

export const SectionHeading = styled.h2`
  margin: 0 0 0.5em;
  font-size: 18px;
`

export const TrackPage = Page.extend`
  max-width: none;
`

// Margins have to be kept in sync with region viewer width, which is currently based on screen size
export const TrackPageSection = styled.section`
  margin: 0 160px 1em 100px;

  @media (max-width: 900px) {
    margin: 0 15px 1em;
  }
`
