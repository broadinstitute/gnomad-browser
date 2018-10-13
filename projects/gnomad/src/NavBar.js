import React from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import Searchbox from './Searchbox'

const NavBarWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  padding: 0.5em 30px;
  margin-bottom: 20px;
  background-color: black;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.23);
`

const Logo = styled.div`
  color: white;
  font-size: 1.5em;
  font-weight: bold;
`

const Menu = styled.ul`
  display: flex;
  flex-direction: row;
  padding: 0;
  margin: 0;
  list-style-type: none;
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

const NavBar = () => (
  <NavBarWrapper>
    <MenuLink to="/">
      <Logo>gnomAD browser</Logo>
    </MenuLink>
    <Searchbox id="navbar-search" width="320px" />
    <Menu>
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

export default NavBar
