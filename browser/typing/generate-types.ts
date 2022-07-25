import { writeTypeForTable } from './quicktype'

import gene_v2_1_1 from './exampleData/gene_v2_1_1.json'
import gene_v3_1_2 from './exampleData/gene_v2_1_1.json'
import variant_summary_v2_1_1 from './exampleData/variant_summary_v2_1_1.json'
import variant_summary_v3_1_2 from './exampleData/variant_summary_v2_1_1.json'
import variant_detail_v2_1_1 from './exampleData/variant_detail_v2_1_1.json'
import variant_detail_v3_1_2 from './exampleData/variant_detail_v2_1_1.json'

const quicktypeOutputPath = `${__dirname}/types/generated`

const apiResponses = [
  {
    typeName: 'GeneResponseV211',
    dataSample: gene_v2_1_1
  },
  {
    typeName: 'GeneResponseV312',
    dataSample: gene_v3_1_2
  },
  {
    typeName: 'VariantSummaryResponseV211',
    dataSample: variant_summary_v2_1_1
  },
  {
    typeName: 'VariantSummaryResponseV312',
    dataSample: variant_summary_v3_1_2
  },
  {
    typeName: 'VariantDetailResponseV211',
    dataSample: variant_detail_v2_1_1
  },
  {
    typeName: 'VariantDetailResponseV312',
    dataSample: variant_detail_v3_1_2
  }
].map(query => ({
  ...query,
  lang: 'typescript',
  filePath: `${quicktypeOutputPath}/${query.typeName}.ts`
}))

async function main() {
  await Promise.all(
    apiResponses.map(async query => {
      try {
        const { dataSample, ...rest } = query
        const data = dataSample as any
        return writeTypeForTable({ data, ...rest })
      } catch (err) {
        console.log(err)
        return null
      }
    })
  )
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
