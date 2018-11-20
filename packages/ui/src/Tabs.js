import { transparentize } from 'polished'
import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { Tab, TabList, TabPanel, Wrapper } from 'react-aria-tabpanel'

const TabListWrapper = styled.ul`
  display: inline-flex;
  flex-direction: row;
  width: 100%;
  padding: 0;
  border-bottom: 1px solid #e0e0e0;
  margin: 0;
  list-style-type: none;
`

const StyledTab = styled(Tab)`
  border-top-left-radius: 0.5em;
  border-top-right-radius: 0.5em;
  outline: none;
  cursor: pointer;

  &:focus {
    box-shadow: 0 0 0 0.2em ${transparentize(0.5, '#428bca')};
  }
`

const TabLabel = styled.div`
  box-sizing: border-box;
  padding: 0.375em 0.75em;
  border-color: ${props => (props.isActive ? '#428bca' : '#e0e0e0')};
  border-style: solid;
  border-top-left-radius: 0.5em;
  border-top-right-radius: 0.5em;
  border-width: 1px 1px 0 1px;
  color: ${props => (props.isActive ? '#428bca' : 'inherit')};
`

const StyledTabPanel = styled(TabPanel)`
  padding: 0.5em;
`

export const Tabs = ({ tabs }) => (
  <Wrapper>
    <TabList>
      <TabListWrapper>
        {tabs.map(tab => {
          const { id, label } = tab
          return (
            <li key={id}>
              <StyledTab id={id}>
                {({ isActive }) => <TabLabel isActive={isActive}>{label}</TabLabel>}
              </StyledTab>
            </li>
          )
        })}
      </TabListWrapper>
    </TabList>
    <div>
      {tabs.map(tab => {
        const { id, render } = tab
        return (
          <StyledTabPanel key={id} tabId={id}>
            {render()}
          </StyledTabPanel>
        )
      })}
    </div>
  </Wrapper>
)

Tabs.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      render: PropTypes.func.isRequired,
    })
  ).isRequired,
}
