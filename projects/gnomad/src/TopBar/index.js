import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Link } from 'react-router-dom'
import { connect } from 'react-redux'

import { currentGene, actions as geneActions } from '@broad/redux-genes'

const TopBarContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
  height: 40px;
  padding-top: 20px;
  margin-bottom: 20px;
  border-bottom: 1px solid #000;
  background-color: black;
  box-shadow: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23);
`

const Logo = styled.div`
  color: white;
  font-size: 20px;
  margin-left: 40px;
  font-weight: bold;
  @media (max-width: 900px) {
    font-size: 15px;
    margin-left: 30px;
  }
`

const Search = styled.div`
  position: relative;
  left: 7px;
  font-size: 15px;
`

const SearchIconContainer = styled.span`
  position: absolute;
  left: 7px;
  font-size: 15px;
`

const SearchInput = styled.input`
  height: 20px;
  width: 275px;
  /*margin-top: 2px;*/
  /*margin-right: 100px;*/
  text-indent: 30px;
  -webkit-transition: width 0.4s ease-in-out;
  transition: width 0.4s ease-in-out;
`

const Menu = styled.div`
  display: flex;
  flex-direction: row;
  padding-top: 3px;
`

const MenuItem = styled.a`
  font-size: 16px;
  font-weight: bold;
  margin-right: 20px;
  color: white;
  text-decoration: none;
  @media (max-width: 900px) {
    font-size: 12px;
    margin-right: 4px;
  }
`

const TopBar = ({ setCurrentGene }) => {
  return (
    <TopBarContainer>
      <Logo>
        gnomAD browser
      </Logo>
      <Search>
        <SearchIconContainer>
          {/* <SearchIcon /> */}
        </SearchIconContainer>
        <form onSubmit={(event) => {
          event.preventDefault()
          setCurrentGene(event.target.elements[0].value)
        }}
        >
          <SearchInput
            type="text"
            name="search"
            placeholder="Search by gene, transcript, region, or variant"
            list="genes"
          />
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
      </Search>
      <Menu>
        <MenuItem href="/about" >About</MenuItem>
        <MenuItem href="/downloads" >Downloads</MenuItem>
        <MenuItem href="/terms" >Terms</MenuItem>
        <MenuItem href="/contact" >Contact</MenuItem>
        <MenuItem href="https://macarthurlab.org/jobs/" >Jobs</MenuItem>
        <MenuItem href="/faq" >FAQ</MenuItem>
      </Menu>
    </TopBarContainer>
  )
}

const mapStateToProps = (state) => {
  return {
    currentGene: currentGene(state),
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    setCurrentGene: geneName => dispatch(geneActions.setCurrentGene(geneName)),
  }
}

TopBar.propTypes = {
  setCurrentGene: PropTypes.func.isRequired,
}

export default connect(mapStateToProps, mapDispatchToProps)(TopBar)
