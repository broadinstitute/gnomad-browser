import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { Button } from '@broad/ui'

import Searchbox from './Searchbox'

const NavBarWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
  padding: 0.5em 30px;
  margin-bottom: 20px;
  background-color: black;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.23);

  @media (max-width: 900px) {
    flex-direction: column;
  }
`

const LogoWrapper = styled.div`
  @media (max-width: 900px) {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
`

const Logo = styled.div`
  color: white;
  font-size: 1.5em;
  font-weight: bold;
`

const ToggleMenuButton = Button.extend`
  border: 1px solid #fafafa;
  background: black;
  color: white;

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

    a {
      display: inline-block;
      width: 100%;
      padding: 1em 0;
    }
  }
`

const MenuLink = styled(Link)`
  padding: 0.5em;
  color: white;
  text-decoration: none;
`

const MenuExternalLink = styled.a`
  padding: 0.5em;
  color: white;
  text-decoration: none;
`

class NavBar extends Component {
  state = {
    menuExpanded: false,
  }

  toggleMenu = () => {
    this.setState(state => ({ ...state, menuExpanded: !state.menuExpanded }))
  }

  render() {
    return (
      <NavBarWrapper>
        <LogoWrapper>
          <MenuLink to="/">
            <Logo>gnomAD browser</Logo>
          </MenuLink>
          <ToggleMenuButton onClick={this.toggleMenu}>☰</ToggleMenuButton>
        </LogoWrapper>
        <Searchbox id="navbar-search" width="320px" />
        <Menu isExpanded={this.state.menuExpanded}>
          <li>
            <MenuLink to="/about">About</MenuLink>
          </li>
          <li>
            <MenuLink to="/downloads">Downloads</MenuLink>
          </li>
          <li>
            <MenuLink to="/terms">Terms</MenuLink>
          </li>
          <li>
            <MenuLink to="/contact">Contact</MenuLink>
          </li>
          <li>
            <MenuExternalLink href="https://macarthurlab.org/jobs/">Jobs</MenuExternalLink>
          </li>
          <li>
            <MenuLink to="/faq">FAQ</MenuLink>
          </li>
        </Menu>
      </NavBarWrapper>
    )
  }
}

export default NavBar
