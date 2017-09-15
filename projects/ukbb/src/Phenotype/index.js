import React from 'react'
import ManhattanPlot from '@broad/manhattan'
import VariantTable from '@broad/table'

import css from './styles.css'

import data from '/Users/msolomon/lens/resources/gwas-eg.json'

const tableConfig = {
  fields: [
    { dataKey: 'chromosome', title: 'chrom', dataType: 'string', width: 50 },
    { dataKey: 'snp', title: 'RSID', dataType: 'string', width: 50 },
    { dataKey: '-log10p', title: 'log10p', dataType: 'float', width: 100 },
    { dataKey: 'pvalue', title: 'p-value', dataType: 'integer', width: 100 },
  ],
}

const Phenotype = () => {
  console.log(data)
  return (
    <div className={css.phenotype}>
      <h1>Phenotype: Hit by Duck!</h1>
      <ManhattanPlot data={data} />
      <VariantTable
        title={''}
        height={400}
        width={500}
        tableConfig={tableConfig}
        tableData={data}
        remoteRowCount={data.length}
      />
    </div>
  )
}

export default Phenotype
