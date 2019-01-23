import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { QuestionMark } from '@broad/help'
import { actions as variantActions, variantFilter, variantIndelFilter, variantQcFilter, variantSnpFilter } from '@broad/redux-variants'
import { Checkbox, ConsequenceCategoriesControl, SearchInput } from '@broad/ui'

const SettingsWrapper = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 1em;

  @media (max-width: 1300px) and (min-width: 1101px) {
    > div {
      &:nth-child(2) {
        order: 3;
        width: 50%;
        margin-top: 1em;
      }
    }
  }

  @media (max-width: 1100px) {
    flex-direction: column;
    align-items: center;

    > div {
      margin-bottom: 1.5em;
    }
  }
`
const CheckboxWrapper = styled.span`
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (max-width: 700px) {
    margin: 0.5em;
  }
`

const GeneSettings = ({
  searchVariants,
  setVariantFilter,
  variantFilter,
  toggleVariantIndelFilter,
  toggleVariantQcFilter,
  toggleVariantSnpFilter,
  variantIndelFilter,
  variantQcFilter,
  variantSnpFilter,
}) => (
  <SettingsWrapper>
    <div>
      <ConsequenceCategoriesControl
        categorySelections={variantFilter}
        id="variant-filter"
        onChange={setVariantFilter}
      />
    </div>

    <CheckboxWrapper>
      <span>
        <Checkbox
          checked={!variantQcFilter}
          id="qcFilter2"
          label="Include filtered variants"
          onChange={toggleVariantQcFilter}
        />
        <QuestionMark topic="include-filtered-variants" display="inline" />
      </span>
      <Checkbox
        checked={variantSnpFilter}
        id="snpfilter"
        label="SNPs"
        onChange={toggleVariantSnpFilter}
      />
      <Checkbox
        checked={variantIndelFilter}
        id="indelfilter"
        label="Indels"
        onChange={toggleVariantIndelFilter}
      />
    </CheckboxWrapper>

    <div>
      <SearchInput
        placeholder="Search variant table"
        onChange={searchVariants}
        withKeyboardShortcuts
      />
    </div>
  </SettingsWrapper>
)

GeneSettings.propTypes = {
  searchVariants: PropTypes.func.isRequired,
  setVariantFilter: PropTypes.func.isRequired,
  toggleVariantIndelFilter: PropTypes.func.isRequired,
  toggleVariantQcFilter: PropTypes.func.isRequired,
  toggleVariantSnpFilter: PropTypes.func.isRequired,
  variantFilter: PropTypes.shape({
    lof: PropTypes.bool.isRequired,
    missense: PropTypes.bool.isRequired,
    synonymous: PropTypes.bool.isRequired,
    other: PropTypes.bool.isRequired,
  }).isRequired,
  variantIndelFilter: PropTypes.bool.isRequired,
  variantQcFilter: PropTypes.bool.isRequired,
  variantSnpFilter: PropTypes.bool.isRequired,
}

const mapStateToProps = state => ({
  variantIndelFilter: variantIndelFilter(state),
  variantQcFilter: variantQcFilter(state),
  variantSnpFilter: variantSnpFilter(state),
  variantFilter: variantFilter(state),
})

const mapDispatchToProps = dispatch => ({
  setVariantFilter: filter => dispatch(variantActions.setVariantFilter(filter)),
  searchVariants: searchText => dispatch(variantActions.searchVariants(searchText)),
  toggleVariantIndelFilter: () => dispatch(variantActions.toggleVariantIndelFilter()),
  toggleVariantQcFilter: () => dispatch(variantActions.toggleVariantQcFilter()),
  toggleVariantSnpFilter: () => dispatch(variantActions.toggleVariantSnpFilter()),
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(GeneSettings)
