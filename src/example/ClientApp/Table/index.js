import React, { PropTypes } from 'react'
import R from 'ramda'

import {
  VariantTable,
} from 'react-gnomad'

import { processVariantsList } from 'react-gnomad'

import css from './styles.css'

const onHeaderClick = console.log

const GnomadVariantTable = ({ variants }) => {
  const tableDataConfig = {
    fields: [
      {
        dataKey: 'variant_id',
        title: 'Variant ID',
        dataType: 'variantId',
        width: 150,
        onHeaderClick,
      },
      {
        dataKey: 'rsid',
        title: 'RSID',
        dataType: 'string',
        width: 100,
        onHeaderClick,
      },
      {
        dataKey: 'filter',
        title: 'Filter',
        dataType: 'filter',
        width: 100,
        onHeaderClick,
      },
      {
        dataKey: 'consequence',
        title: 'Consequence',
        dataType: 'string',
        width: 120,
        onHeaderClick,
      },
      {
        dataKey: 'allele_count',
        title: 'AC',
        dataType: 'integer',
        width: 80,
        onHeaderClick,
      },
      {
        dataKey: 'allele_num',
        title: 'AN',
        dataType: 'integer',
        width: 80,
        onHeaderClick,
      },
      {
        dataKey: 'allele_freq',
        title: 'AF',
        dataType: 'float',
        width: 80,
        onHeaderClick,
      },
      {
        dataKey: 'hom_count',
        title: 'Hom',
        dataType: 'integer',
        width: 40,
        onHeaderClick,
      },
    ],
  }

  const scrollBarWidth = 20
  const paddingWidth = tableDataConfig.fields.length * 40
  const cellContentWidth = tableDataConfig.fields.reduce((acc, field) =>
    acc + field.width, 0)
  const calculatedWidth = scrollBarWidth + paddingWidth + cellContentWidth

  return (
    <div className={css.component}>
      <VariantTable
        title={''}
        height={700}
        width={calculatedWidth}
        tableConfig={tableDataConfig}
        tableData={variants}
        remoteRowCount={variants.length}
        loadMoreRows={() => {}}
        overscan={60}
        loadLookAhead={1000}
      />
    </div>
  )
}
GnomadVariantTable.propTypes = {
  variants: PropTypes.array.isRequired,
}
export default GnomadVariantTable
