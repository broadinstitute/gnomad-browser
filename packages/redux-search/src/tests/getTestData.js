import path from 'path'
import fs from 'fs'
import R from 'ramda'
import fetch from 'graphql-fetch'

const TEST_DATA_DIRECTORY = '/Users/msolomon/gnomadjs/resources'
const API_URL = 'http://localhost:8006'

const makeVariantQuery = geneName => (`{
    gene(gene_name: "${geneName}") {
      variants: minimal_gnomad_variants {
        variant_id
        rsid
        pos
        hgvsc
        hgvsp
        allele_count
        allele_freq
        allele_num
        filters
        pass
        hom_count
        consequence
        lof
      }

  }
}`)

const fetchTestData = (
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

const testGenes = ['PCSK9']

const fetchAll = (geneList) => {
  const gene = R.head(geneList)
  fetchTestData(makeVariantQuery(gene), `search-test-${gene}.json`)
    .then(() => {
      if (R.tail(geneList).length > 0) {
        fetchAll(R.tail(geneList))
      }
    })
}

fetchAll(testGenes)
