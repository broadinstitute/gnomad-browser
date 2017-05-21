import React, { PropTypes } from 'react'
import R from 'ramda'

import {
  VariantTable,
} from 'react-gnomad'

import css from './styles.css'

const tableDataConfig = {
  fields: [
    { dataKey: 'variant_id', title: 'Variant ID', dataType: 'variantId', width: 200 },
    { dataKey: 'rsid', title: 'RSID', dataType: 'string', width: 100 },
    { dataKey: 'filter', title: 'Filter', dataType: 'filter', width: 100 },
    { dataKey: 'allele_count', title: 'AC', dataType: 'integer', width: 100 },
    { dataKey: 'allele_num', title: 'AN', dataType: 'integer', width: 100 },
    { dataKey: 'allele_freq', title: 'AF', dataType: 'float', width: 100 },
  ],
}

const GnomadVariantTable = ({ variants }) => {
  return (
    <div className={css.component}>
      <VariantTable
        title={'Exome variants'}
        height={300}
        width={1100}
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
