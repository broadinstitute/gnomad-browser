import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'

import {
  actions as variantActions,
  variantDeNovoFilter,
  variantFilter,
} from '@broad/redux-variants'
import { Checkbox, ConsequenceCategoriesControl, Search } from '@broad/ui'

const SettingsWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1em;
`

const GeneSettings = ({
  consequenceFilter,
  deNovoFilter,
  searchVariants,
  setConsequenceFilter,
  toggleDeNovoFilter,
}) => (
  <SettingsWrapper>
    <ConsequenceCategoriesControl
      categorySelections={consequenceFilter}
      id="variant-filter"
      onChange={setConsequenceFilter}
    />
    <Checkbox
      checked={deNovoFilter}
      id="denovo-filter"
      label="Show only de novo variants"
      onChange={toggleDeNovoFilter}
    />
    <Search placeholder="Search variant table" onChange={searchVariants} withKeyboardShortcuts />
  </SettingsWrapper>
)

GeneSettings.propTypes = {
  consequenceFilter: PropTypes.shape({
    lof: PropTypes.bool.isRequired,
    missense: PropTypes.bool.isRequired,
    synonymous: PropTypes.bool.isRequired,
    other: PropTypes.bool.isRequired,
  }).isRequired,
  deNovoFilter: PropTypes.bool.isRequired,
  searchVariants: PropTypes.func.isRequired,
  setConsequenceFilter: PropTypes.func.isRequired,
  toggleDeNovoFilter: PropTypes.func.isRequired,
}

const mapStateToProps = state => ({
  consequenceFilter: variantFilter(state),
  deNovoFilter: variantDeNovoFilter(state),
  variantDeNovoFilter: variantDeNovoFilter(state),
})

const mapDispatchToProps = dispatch => ({
  searchVariants: searchText => dispatch(variantActions.searchVariants(searchText)),
  setConsequenceFilter: filter => dispatch(variantActions.setVariantFilter(filter)),
  toggleDeNovoFilter: () => dispatch(variantActions.toggleVariantDeNovoFilter()),
  toggleVariantDeNovoFilter: () => dispatch(variantActions.toggleVariantDeNovoFilter()),
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(GeneSettings)
