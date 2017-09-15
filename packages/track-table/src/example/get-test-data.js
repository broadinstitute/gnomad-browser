// import { fetchTestData } from 'utilities'
import R from 'ramda'
import config from 'config'
import fs from 'fs'
import path from 'path'
import fetch from 'graphql-fetch'

const VDS_URL = 'http://localhost:8004/graphql'

const TEST_DATA_DIRECTORY = config.get('TEST_DATA_DIRECTORY')

const clinVarGeneQuery = geneName => `
{
  gene(gene_name: "${geneName}") {
    gene_name
    gene_id
    chrom
    start
    stop
    clinvar_variants {
      contig
      start
      ref
      alt
      info {
        MEASURESET_TYPE
        MEASURESET_ID
        RCV
        ALLELE_ID
        SYMBOL
        HGVS_C
        HGVS_P
        MOLECULAR_CONSEQUENCE
        CLINICAL_SIGNIFICANCE
        PATHOGENIC
        BENIGN
        CONFLICTED
        REVIEW_STATUS
        GOLD_STARS
        ALL_SUBMITTERS
        ALL_TRAITS
        ALL_PMIDS
        INHERITANCE_MODES
        AGE_OF_ONSET
        PREVALENCE
        DISEASE_MECHANISM
        ORIGIN
        XREFS
      }
    }
  }
}`
export const testGenes = [
  'CHD7',
]

export const fetchTestData = (
  query,
  fileName,
) => {
  return new Promise((resolve, reject) => {
    fetch(VDS_URL)(query)
      .then((data) => {
        fs.writeFile(path.resolve(TEST_DATA_DIRECTORY, fileName), JSON.stringify(data.data))
        console.log('fetched', fileName)
        resolve(fileName)
      }).catch(error => console.log(error))
  })
}

const fetchAll = (geneList) => {
  const gene = R.head(geneList)
  fetchTestData(clinVarGeneQuery(gene), `clinvar-${gene}.json`)
    .then(_ => fetchAll(R.tail(geneList)))
}

fetchAll(testGenes)
