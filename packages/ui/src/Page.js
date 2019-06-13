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
  font-size: 14px;

  @media (max-width: 900px) {
    flex-direction: column;
    align-items: center;
    border-bottom: none;
  }
`
const PageHeadingText = styled.h1`
  margin: 0;

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
`

export const PageHeading = ({ children, className, renderPageControls }) => (
  <PageHeadingWrapper className={className}>
    <PageHeadingText>{children}</PageHeadingText>
    {renderPageControls && <PageControlsWrapper>{renderPageControls()}</PageControlsWrapper>}
  </PageHeadingWrapper>
)

PageHeading.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  renderPageControls: PropTypes.func,
}

PageHeading.defaultProps = {
  className: undefined,
  renderPageControls: undefined,
}
