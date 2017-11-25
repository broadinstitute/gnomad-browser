/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import {
  actions as activeActions,
  // currentTableIndex,
  screenSize,
} from '@broad/gene-page/src/resources/active'

import {
  actions as variantActions,
  variantSearchText,
  filteredIdList,
  finalFilteredVariants,
  finalFilteredVariantsCount,
} from '@broad/gene-page/src/resources/variants'

import Table from './index'

class VariantTable extends PureComponent {
  componentDidMount() {
    this.props.fetchVariantsByGene(
      this.props.currentGene,
      this.props.fetchFunction,
    )
  }

  render() {
    const {
      variants,
      setVariantSort,
      setFocusedVariant,
      setHoveredVariant,
      setCurrentTableScrollData,
      tablePosition,
      searchText,
      title,
      height,
      tableConfig,
      history,
      screenSize,
      filteredIdList,
    } = this.props

    const scrollBarWidth = 40
    const tableWidth = (screenSize.width * 0.85) + scrollBarWidth
    const tConfig = tableConfig(setVariantSort, tableWidth)
    console.log(this.props)
    if (!variants) {
      return <div className=""></div>
    }
    return (
      <div>
        <Table
          title={title}
          height={500}
          width={tableWidth}
          tableConfig={tConfig}
          tableData={variants}
          remoteRowCount={variants.size}
          loadMoreRows={() => {}}
          overscan={5}
          loadLookAhead={0}
          onRowClick={setFocusedVariant(history)}
          onRowHover={setHoveredVariant}
          scrollToRow={tablePosition}
          onScroll={setCurrentTableScrollData}
          searchText={searchText}
          filteredIdList={filteredIdList}
        />
      </div>
    )
  }
}
VariantTable.propTypes = {
  variants: PropTypes.any.isRequired,
  setVariantSort: PropTypes.func.isRequired,
  setHoveredVariant: PropTypes.func.isRequired,
  setFocusedVariant: PropTypes.func.isRequired,
  setCurrentTableScrollData: PropTypes.func.isRequired,
  tablePosition: PropTypes.number.isRequired,
  searchText: PropTypes.string.isRequired,
  title: PropTypes.string,
  height: PropTypes.number,
  tableConfig: PropTypes.func.isRequired,
  history: PropTypes.object.isRequired,
  screenSize: PropTypes.object.isRequired,
  filteredIdList: PropTypes.any.isRequired,
  // setVisibleInTable: PropTypes.func.isRequired,
}

VariantTable.defaultProps = {
  title: '',
  height: 400,
}

const mapStateToProps = (state) => {
  return {
    variants: finalFilteredVariants(state),
    variantCount: finalFilteredVariantsCount(state),
    // tablePosition: currentTableIndex(state),
    searchText: variantSearchText(state),
    currentNavigatorPosition: state.active.currentNavigatorPosition,
    screenSize: screenSize(state),
    filteredIdList: filteredIdList(state),
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    fetchVariantsByGene: (geneName, fetchFunction) =>
      dispatch(variantActions.fetchVariantsByGene(geneName, fetchFunction)),
    setVariantSort: sortKey => dispatch(variantActions.setVariantSort(sortKey)),
    // setFocusedVariant: history => variantId =>
    //   dispatch(variantActions.setFocusedVariant(variantId, history)),
    setFocusedVariant: history => (variantId, dataset) => {
      console.log(dataset)
      if (dataset === 'exacVariants') {
        window.open(`http://exac.broadinstitute.org/variant/${variantId}`)
      } else {
        window.open(`http://gnomad.broadinstitute.org/variant/${variantId}`)
      }
    },
    setHoveredVariant: variantId => dispatch(variantActions.setHoveredVariant(variantId)),
    setCurrentTableScrollData: scrollData =>
      dispatch(activeActions.setCurrentTableScrollData(scrollData)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(VariantTable)
