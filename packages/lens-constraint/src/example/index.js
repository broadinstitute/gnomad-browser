import React, { PropTypes } from 'react'
import VariantTable from 'lens-variant-table'

import data from '/Users/msolomon/lens/resources/constraint_full_gene_multiple_regions_only.json'

const tableConfig = {
  fields: [
    { dataKey: 'transcript', title: 'transcript', dataType: 'string', width: 100 },
    { dataKey: 'gene', title: 'gene', dataType: 'string', width: 100 },
    { dataKey: 'amino_acids', title: '#residues', dataType: 'integer', width: 100 },
    { dataKey: 'obs_mis', title: 'obs_mis', dataType: 'integer', width: 100 },
    { dataKey: 'exp_mis', title: 'exp_mis', dataType: 'integer', width: 100 },
    { dataKey: 'obs_exp', title: 'obs/exp', dataType: 'integer', width: 100 },
    { dataKey: 'overall_chisq', title: 'overall_chisq', dataType: 'integer', width: 100 },
    { dataKey: 'n_regions', title: 'n_regions', dataType: 'integer', width: 100 },
  ],
}

const ConstraintPlotExample = () => {
  return (
    <div>
      <h1>Regional constraint</h1>
      <VariantTable
        title={''}
        height={400}

        tableConfig={tableConfig}
        tableData={data}
        remoteRowCount={data.length}
      />
    </div>
  )
}

export default ConstraintPlotExample
