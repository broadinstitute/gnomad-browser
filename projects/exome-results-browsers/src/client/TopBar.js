import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { withRouter } from 'react-router-dom'
import styled from 'styled-components'

import { Button } from '@broad/ui'

import Link from './Link'

const TopBarWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 15px 30px;
  background-color: ${BROWSER_CONFIG.navBarColor || '#000'};

  @media (max-width: 900px) {
    flex-direction: column;
  }

  ${Link} {
    padding: 0.5em;
    color: white;
    text-decoration: none;
  }
`

const TitleWrapper = styled.div`
  color: #fff;

  @media (max-width: 900px) {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
`

const Title = styled.span`
  font-size: 1.5em;
`

const SearchInput = styled.input`
  width: 275px;
  padding: 0.375em 0;
  background-color: white;
  font-size: 14px;
`

const ToggleMenuButton = Button.extend`
  border: 1px solid #fafafa;
  background: transparent;
  color: inherit;

  @media (min-width: 900px) {
    display: none;
  }
`

const Menu = styled.ul`
  display: flex;
  flex-direction: row;
  overflow: hidden;
  padding: 0;
  margin: 0;
  list-style-type: none;

  @media (max-width: 900px) {
    flex-direction: column;
    width: 100%;
    height: ${props => (props.isExpanded ? 'auto' : 0)};

    ${Link} {
      display: inline-block;
      width: 100%;
      padding: 1em 0;
    }
  }
`

class TopBar extends Component {
  static propTypes = {
    history: PropTypes.shape({
      push: PropTypes.func.isRequired,
    }).isRequired,
  }

  state = {
    isMenuExpanded: false,
  }

  toggleMenu = () => {
    this.setState(state => ({ ...state, isMenuExpanded: !state.isMenuExpanded }))
  }

  render() {
    const { isMenuExpanded } = this.state
    return (
      <TopBarWrapper>
        <TitleWrapper>
          <Link to="/">
            <Title>{BROWSER_CONFIG.navBarTitle}</Title>
          </Link>
          <ToggleMenuButton onClick={this.toggleMenu}>☰</ToggleMenuButton>
        </TitleWrapper>

        <form
          onSubmit={event => {
            const { history } = this.props
            event.preventDefault()
            const geneName = event.target.elements[0].value
            history.push(`/gene/${geneName}`)
          }}
        >
          <SearchInput type="text" name="search" placeholder="Search genes" list="genes" />
          <datalist id="genes">
            <option value="PCSK9" />
            <option value="ZNF658" />
            <option value="MYH9" />
            <option value="FMR1" />
            <option value="BRCA2" />
            <option value="CFTR" />
            <option value="FBN1" />
            <option value="TP53" />
            <option value="SCN5A" />
            <option value="MYH7" />
            <option value="MYBPC3" />
            <option value="ARSF" />
            <option value="CD33" />
            <option value="DMD" />
            <option value="TTN" />
            <option value="USH2A" />
          </datalist>
        </form>

        <Menu isExpanded={isMenuExpanded}>
          <li>
            <Link to="/results">Results</Link>
          </li>
        </Menu>
      </TopBarWrapper>
    )
  }
}

export default withRouter(TopBar)
