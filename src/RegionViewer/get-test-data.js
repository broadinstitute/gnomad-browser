// import { fetchTestData } from 'utilities'
import R from 'ramda'
import config from 'config'

const API_URL = config.get('API_URL')
const TEST_DATA_DIRECTORY = config.get('TEST_DATA_DIRECTORY')

const geneQuery = geneName => `
{
  gene(gene_name: "${geneName}") {
    gene_id
    gene_name
    start
    stop
    exome_coverage {
      pos
      mean
    }
    genome_coverage {
      pos
      mean
    }
    transcript {
      exons {
        feature_type
        start
        stop
        strand
      }
    }
    exons {
      _id
      start
      transcript_id
      feature_type
      strand
      stop
      chrom
      gene_id
    }
    exome_variants {
      chrom
      pos
      ref
      alt
      variant_id
      allele_num
      allele_freq
      allele_count
      hom_count
    }
    genome_variants {
      chrom
      pos
      ref
      alt
      variant_id
      allele_num
      allele_freq
      allele_count
      hom_count
    }
}}
`
export const testGenes = [
  'PCSK9',
  // 'DMD',
  'ZNF658',
  'MYH9',
  'FMR1',
  // 'BRCA1',
  'BRCA2',
  'CFTR',
  'FBN1',
  'TP53',
  'SCN5A',
  'MYH7',
  'MYBPC3',
  // 'TTN',
  'ARSF',
  'CD33',
]

export const fetchTestData = (
  query,
  fileName,
) => {
  return new Promise((resolve, reject) => {
    fetch(API_URL)(query)
      .then((data) => {
        fs.writeFile(path.resolve(TEST_DATA_DIRECTORY, fileName), JSON.stringify(data.data))
        console.log('fetched', fileName)
        resolve(fileName)
      }).catch(error => console.log(error))
 })
}

const fetchAll = (geneList) => {
  const gene = R.head(geneList)
  fetchTestData(geneQuery(gene), `region-viewer-full-${gene}.json`)
    .then(_ => fetchAll(R.tail(geneList)))
}

fetchAll(testGenes)
