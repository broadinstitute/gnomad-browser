import React, { PropTypes } from 'react'
import { throttle } from 'throttle-debounce'
import { connect } from 'react-redux'
import VariantTable from 'lens-variant-table'
import { getTableIndexByPosition } from 'lens-utilities/lib/variant'

import { getVisibleVariants } from '../../../selectors'
import * as actions from '../../../actions'

import css from './styles.css'

const sortVariants = (variants, { key, ascending }) => (
  ascending ?
  variants.sort((a, b) => a[key] - b[key]) :
  variants.sort((a, b) => b[key] - a[key])
)

const GnomadVariantTable = ({
  visibleVariants,
  variantSort,
  setVariantSort,
  setCurrentVariant,
  currentNavigatorPosition,
  setCurrentTableIndex,
}) => {
  const sortedVariants = sortVariants(visibleVariants, variantSort)

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

  return (
    <div className={css.component}>
      <VariantTable
        css={css}
        title={''}
        height={400}
        width={calculatedWidth}
        tableConfig={tableDataConfig}
        tableData={sortedVariants}
        remoteRowCount={visibleVariants.length}
        loadMoreRows={() => {}}
        overscan={10}
        loadLookAhead={1000}
        onRowClick={setCurrentVariant}
        scrollToRow={tablePosition}
        scrollCallback={setCurrentTableIndex}
      />
    </div>
  )
}
GnomadVariantTable.propTypes = {
  visibleVariants: PropTypes.array.isRequired,
  variantSort: PropTypes.object.isRequired,
  setVariantSort: PropTypes.func.isRequired,
  setCurrentVariant: PropTypes.func.isRequired,
  currentNavigatorPosition: PropTypes.number.isRequired,
  setCurrentTableIndex: PropTypes.func.isRequired,
  // setVisibleInTable: PropTypes.func.isRequired,
}

const mapStateToProps = (state) => {
  return {
    visibleVariants: getVisibleVariants(state),
    variantSort: state.table.variantSort,
    currentNavigatorPosition: state.selections.currentNavigatorPosition,
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    setVariantSort: sortKey => dispatch(actions.setVariantSort(sortKey)),
    setCurrentVariant: variantId => dispatch(actions.setCurrentVariant(variantId)),
    setCurrentTableIndex: index => dispatch(actions.setCurrentTableIndex(index)),
    // setVisibleInTable: range => dispatch(actions.setVisibleInTable(range)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(GnomadVariantTable)
