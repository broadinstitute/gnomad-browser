import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { connect } from 'react-redux'
import { Link, withRouter } from 'react-router-dom'
import { currentGene, actions as activeActions } from '@broad/redux-genes'

import 'datalist-polyfill'

import {
  DataSelectionContainer,
} from '@broad/ui'

import {
  uniqueGeneDiseaseNames,
  currentDisease,
  actions as variantFxActions,
} from './redux'

const GENES = [
  "ACTC1",
  "CSRP3",
  "LMNA",
  "MYBPC3",
  "MYH7",
  "MYL2",
  "MYL3",
  "PLN",
  "TNNC1",
  "TNNI3",
  "TNNT2",
  "TPM1",
  "TTN",
]

const TopBarContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
  height: 40px;
  padding-top: 20px;
  margin-bottom: 20px;
  border-bottom: 1px solid #000;
  background-color: #B71C1C;
`

const Logo = styled.div`
  color: white;
  font-size: 23px;
  margin-left: 40px;
  font-weight: bold;
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

function Input({
  history,
  currentGene,
  setCurrentGene,
}) {
  function onChoose(e) {
    const geneName = e.target.value.toUpperCase()
    if (currentGene !== geneName && GENES.includes(geneName)) {
      e.target.blur()
      if (currentGene) {
        setCurrentGene(geneName)
      }
      history.push(`/gene/${geneName}`)
    }
  }

  return (
    <input
      onChange={onChoose}
      onSelect={onChoose}
      type="text"
      name="search"
      placeholder="Search gene"
      list="genes"
    />
  )
}

const SearchInput = styled(Input)`
  height: 20px;
  width: 275px;
  background-color: white;
  text-indent: 30px;
  -webkit-transition: width 0.4s ease-in-out;
  transition: width 0.4s ease-in-out;
`

const Menu = styled.div`
  display: flex;
  flex-direction: row;
  padding-top: 3px;
`

const MenuItem = styled.div`
  font-size: 18px;
  font-weight: bold;
  margin-right: 20px;
  color: white;
`

const StyledLink = styled(Link)`
  text-decoration: none;
`

const TopBar = ({
  history,
  currentGene,
  setCurrentGene,
  uniqueGeneDiseaseNames,
  currentDisease,
  setCurrentDisease,
}) => {
  return (
    <TopBarContainer>
      <StyledLink to={'/'}>
        <Logo>
          VariantFX
        </Logo>
      </StyledLink>
      <DataSelectionContainer>
        <select
          onChange={event => setCurrentDisease(event.target.value)}
          value={currentDisease}
        >
          <option value="DCM">Dilated cardiomyopathy</option>
          <option value="HCM">Hypertrophic cardiomyopathy</option>
        </select>
      </DataSelectionContainer>
      <Search>
        <form>
          <SearchInput
            history={history}
            currentGene={currentGene}
            setCurrentGene={setCurrentGene}
          />
          <datalist id="genes">
            {GENES.map(gene => <option value={gene} key={gene}/>)}
          </datalist>
        </form>
      </Search>
      <Menu>
        <StyledLink to={'/about'}><MenuItem>About</MenuItem></StyledLink>
        <StyledLink to={'/terms'}><MenuItem>Terms</MenuItem></StyledLink>
        <StyledLink to={'/contact'}><MenuItem>Contact</MenuItem></StyledLink>
        <StyledLink to={'/faq'}><MenuItem>FAQ</MenuItem></StyledLink>
      </Menu>
    </TopBarContainer>
  )
}

const mapStateToProps = (state) => {
  return {
    currentGene: currentGene(state),
    uniqueGeneDiseaseNames: uniqueGeneDiseaseNames(state),
    currentDisease: currentDisease(state),
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    setCurrentGene: geneName => dispatch(activeActions.setCurrentGene(geneName)),
    setCurrentDisease: disease => dispatch(variantFxActions.setCurrentDisease(disease)),
  }
}

TopBar.propTypes = {
  setCurrentGene: PropTypes.func.isRequired,
  setCurrentDisease: PropTypes.func.isRequired,
  uniqueGeneDiseaseNames: PropTypes.any.isRequired,
  currentDisease: PropTypes.string.isRequired,
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(TopBar))
