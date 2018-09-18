import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { QuestionMark } from '@broad/help'
import { actions as variantActions, variantFilter, variantQcFilter } from '@broad/redux-variants'
import { Checkbox, ConsequenceCategoriesControl, Search } from '@broad/ui'

const SettingsWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;

  @media (max-width: 900px) {
    flex-direction: column;
    align-items: center;

    > div {
      margin-bottom: 1.5em;
    }
  }
`

const GeneSettings = ({
  searchVariants,
  setVariantFilter,
  variantFilter,
  toggleVariantQcFilter,
  variantQcFilter,
}) => (
  <SettingsWrapper>
    <div>
      <ConsequenceCategoriesControl
        categorySelections={variantFilter}
        id="variant-filter"
        onChange={setVariantFilter}
      />
    </div>

    <div>
      <Checkbox
        checked={!variantQcFilter}
        id="qcFilter2"
        label="Include filtered variants"
        onChange={toggleVariantQcFilter}
      />
      <QuestionMark topic="include-filtered-variants" display="inline" />
    </div>

    <div>
      <Search placeholder="Search variant table" onChange={searchVariants} withKeyboardShortcuts />
    </div>
  </SettingsWrapper>
)

GeneSettings.propTypes = {
  searchVariants: PropTypes.func.isRequired,
  setVariantFilter: PropTypes.func.isRequired,
  toggleVariantQcFilter: PropTypes.func.isRequired,
  variantFilter: PropTypes.shape({
    lof: PropTypes.bool.isRequired,
    missense: PropTypes.bool.isRequired,
    synonymous: PropTypes.bool.isRequired,
    other: PropTypes.bool.isRequired,
  }).isRequired,
  variantQcFilter: PropTypes.bool.isRequired,
}

const mapStateToProps = state => ({
  variantQcFilter: variantQcFilter(state),
  variantFilter: variantFilter(state),
})

const mapDispatchToProps = dispatch => ({
  setVariantFilter: filter => dispatch(variantActions.setVariantFilter(filter)),
  searchVariants: searchText => dispatch(variantActions.searchVariants(searchText)),
  toggleVariantQcFilter: () => dispatch(variantActions.toggleVariantQcFilter()),
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(GeneSettings)
