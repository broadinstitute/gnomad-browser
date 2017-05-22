import React, { PropTypes } from 'react'
import R from 'ramda'

import {
  VariantTable,
} from 'react-gnomad'

import { processVariantsList } from 'react-gnomad'

import css from './styles.css'

const tableDataConfig = {
  fields: [
    { dataKey: 'variant_id', title: 'Variant ID', dataType: 'variantId', width: 180 },
    { dataKey: 'rsid', title: 'RSID', dataType: 'string', width: 100 },
    { dataKey: 'filter', title: 'Filter', dataType: 'filter', width: 100 },
    // { dataKey: 'consequence', title: 'Consequence', dataType: 'string', width: 200 },
    // { dataKey: 'first_lof_flag', title: 'LoF', dataType: 'string', width: 20 },
    { dataKey: 'allele_count', title: 'AC', dataType: 'integer', width: 100 },
    { dataKey: 'allele_num', title: 'AN', dataType: 'integer', width: 100 },
    { dataKey: 'allele_freq', title: 'AF', dataType: 'float', width: 100 },
    { dataKey: 'hom_count', title: 'Hom', dataType: 'integer', width: 50 },
  ],
}

const GnomadVariantTable = ({ variants }) => {
  // const variantsProcessed = processVariantsList(variants)
  return (
    <div className={css.component}>
      <VariantTable
        title={''}
        height={700}
        width={1000}
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
