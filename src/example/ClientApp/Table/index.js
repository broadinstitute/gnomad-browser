import React, { PropTypes } from 'react'
import { throttle } from 'throttle-debounce'
import { connect } from 'react-redux'
// import R from 'ramda'
import {
  VariantTable,
  getTableIndexByPosition,
} from 'react-gnomad'

import { getGene } from '../../../reducers'
import * as actions from '../../../actions'

import css from './styles.css'

const sortVariants = (variants, { key, ascending }) => (
  ascending ?
  variants.sort((a, b) => a[key] - b[key]) :
  variants.sort((a, b) => b[key] - a[key])
)

const GnomadVariantTable = ({
  variants,
  variantSort,
  setVariantSort,
  // setVisibleInTable,
  setCurrentVariant,
  currentNavigatorPosition,
  setNavigationPosition,
}) => {
  const broadcastCurrentIndex = (index) => {
    const frame = [index - 28, index - 13]
    // setVisibleInTable(frame)
  }

  const sortedVariants = sortVariants(variants, variantSort)

  const tableDataConfig = {
    fields: [
      {
        dataKey: 'variant_id',
        title: 'Variant ID',
        dataType: 'variantId',
        width: 125,
        onHeaderClick: setVariantSort,
      },
      {
        dataKey: 'filters',
        title: 'Filters',
        dataType: 'filter',
        width: 70,
        onHeaderClick: setVariantSort,
      },
      {
        dataKey: 'rsid',
        title: 'RSID',
        dataType: 'string',
        width: 70,
        onHeaderClick: setVariantSort,
      },
      {
        dataKey: 'hgvsp',
        title: 'HGVSp',
        dataType: 'string',
        width: 100,
        onHeaderClick: setVariantSort,
      },
      {
        dataKey: 'hgvsc',
        title: 'HGVSc',
        dataType: 'string',
        width: 100,
        onHeaderClick: setVariantSort,
      },
      {
        dataKey: 'consequence',
        title: 'Consequence',
        dataType: 'string',
        width: 100,
        onHeaderClick: setVariantSort,
      },
      {
        dataKey: 'allele_count',
        title: 'AC',
        dataType: 'integer',
        width: 40,
        onHeaderClick: setVariantSort,
      },
      {
        dataKey: 'allele_num',
        title: 'AN',
        dataType: 'integer',
        width: 40,
        onHeaderClick: setVariantSort,
      },
      {
        dataKey: 'allele_freq',
        title: 'AF',
        dataType: 'float',
        width: 40,
        onHeaderClick: setVariantSort,
      },
      {
        dataKey: 'hom_count',
        title: 'Hom',
        dataType: 'integer',
        width: 20,
        onHeaderClick: setVariantSort,
      },
    ],
  }

  const scrollBarWidth = 40
  const paddingWidth = tableDataConfig.fields.length * 40
  const cellContentWidth = tableDataConfig.fields.reduce((acc, field) =>
    acc + field.width, 0)
  const calculatedWidth = scrollBarWidth + paddingWidth + cellContentWidth

  const tablePosition = getTableIndexByPosition(
    currentNavigatorPosition,
    sortedVariants,
  )

  const onScrollCallback = (tableIndex) => {
    setNavigationPosition(sortedVariants[tableIndex].pos)
  }

  return (
    <div className={css.component}>
      <VariantTable
        css={css}
        title={''}
        height={400}
        width={calculatedWidth}
        tableConfig={tableDataConfig}
        tableData={sortedVariants}
        remoteRowCount={variants.length}
        loadMoreRows={() => {}}
        overscan={10}
        loadLookAhead={1000}
        broadcastCurrentIndex={broadcastCurrentIndex}
        onRowClick={setCurrentVariant}
        scrollToRow={tablePosition}
        scrollCallback={onScrollCallback}
      />
    </div>
  )
}
GnomadVariantTable.propTypes = {
  variants: PropTypes.array.isRequired,
  variantSort: PropTypes.object.isRequired,
  setVariantSort: PropTypes.func.isRequired,
  setCurrentVariant: PropTypes.func.isRequired,
  currentNavigatorPosition: PropTypes.number.isRequired,
  setNavigationPosition: PropTypes.func.isRequired,
  // setVisibleInTable: PropTypes.func.isRequired,
}

const mapStateToProps = (state) => {
  return {
    variants: getGene(state, state.selections.currentGene).minimal_gnomad_variants,
    variantSort: state.table.variantSort,
    currentNavigatorPosition: state.selections.currentNavigatorPosition,
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    setVariantSort: sortKey => dispatch(actions.setVariantSort(sortKey)),
    setCurrentVariant: variantId => dispatch(actions.setCurrentVariant(variantId)),
    setNavigationPosition: index => dispatch(actions.setNavigationPosition(index)),
    // setVisibleInTable: range => dispatch(actions.setVisibleInTable(range)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(GnomadVariantTable)
