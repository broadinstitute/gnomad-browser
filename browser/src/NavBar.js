import React, { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { Button } from '@gnomad/ui'

import Searchbox from './Searchbox'

const Wrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
  padding: 10px 30px;
  background-color: black;

  a {
    color: white;
    text-decoration: none;
  }

  @media (max-width: 900px) {
    flex-direction: column;
    padding: 10px;
  }
`

const LogoWrapper = styled.div`
  @media (max-width: 900px) {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-bottom: 5px;
  }
`

const Logo = styled.div`
  color: white;
  font-size: 1.5em;
  font-weight: bold;
`

const ToggleMenuButton = styled(Button)`
  border: 1px solid #fafafa;
  background: black;
  color: white;

  @media (min-width: 901px) {
    display: none;
  }
`

const Menu = styled.ul`
  display: flex;
  flex-direction: row;
  padding: 0;
  margin: 0;
  list-style-type: none;

  a {
    padding: 0.5em;
  }

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

const NavBar = () => {
  const [isMenuExpanded, setIsMenuExpanded] = useState(false)
  const toggleMenu = useCallback(() => {
    setIsMenuExpanded(previousValue => !previousValue)
  }, [])
  const closeMenu = useCallback(() => {
    setIsMenuExpanded(false)
  }, [])

  return (
    <Wrapper>
      <LogoWrapper>
        <Link to="/" onClick={closeMenu}>
          <Logo>gnomAD browser</Logo>
        </Link>
        <ToggleMenuButton onClick={toggleMenu}>☰</ToggleMenuButton>
      </LogoWrapper>
      <Searchbox id="navbar-search" placeholder="Search" width="360px" />
      <Menu isExpanded={isMenuExpanded}>
        <li>
          <Link to="/about" onClick={closeMenu}>
            About
          </Link>
        </li>
        <li>
          <Link to="/team" onClick={closeMenu}>
            Team
          </Link>
        </li>
        <li>
          {/* a instead of Link because the blog is a separate application */}
          <a href="/news/">News</a>
        </li>
        <li>
          <Link to="/downloads" onClick={closeMenu}>
            Downloads
          </Link>
        </li>
        <li>
          <Link to="/policies" onClick={closeMenu}>
            Policies
          </Link>
        </li>
        <li>
          <Link to="/publications" onClick={closeMenu}>
            Publications
          </Link>
        </li>
        <li>
          <Link to="/feedback" onClick={closeMenu}>
            Feedback
          </Link>
        </li>
        <li>
          {/* a instead of Link because the blog is a separate application */}
          <a href="/news/changelog/">Changelog</a>
        </li>
        <li>
          <Link to="/help" onClick={closeMenu}>
            Help
          </Link>
        </li>
      </Menu>
    </Wrapper>
  )
}

export default NavBar
