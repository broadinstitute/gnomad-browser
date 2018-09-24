import PropTypes from 'prop-types'
import React from 'react'
import { Link, withRouter } from 'react-router-dom'
import styled from 'styled-components'

const TopBarContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  padding: 0 40px;
  border-bottom: 1px solid #000;
  background-color: ${BROWSER_CONFIG.navBarColor || '#0a79bf'};
`

const Logo = styled.div`
  color: white;
  font-size: 24px;
`

const SearchInput = styled.input`
  width: 275px;
  padding: 0.375em 0.5em;
  background-color: white;
  font-size: 14px;
`

const Menu = styled.ul`
  padding: 0;
  margin: 0;
`

const MenuItem = styled.li`
  display: inline-block;
  list-style: none;
  margin-left: 20px;
  font-size: 18px;
`

const StyledLink = styled(Link)`
  color: white;
  text-decoration: none;
`

const TopBar = ({ history }) => (
  <TopBarContainer>
    <StyledLink to={'/'}>
      <Logo>{BROWSER_CONFIG.navBarTitle}</Logo>
    </StyledLink>

    <form
      onSubmit={event => {
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

    <Menu>
      <MenuItem>
        <StyledLink to={'/results'}>Results</StyledLink>
      </MenuItem>
    </Menu>
  </TopBarContainer>
)

TopBar.propTypes = {
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
}

export default withRouter(TopBar)
