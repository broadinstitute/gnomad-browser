import fetch from 'graphql-fetch'
import fs from 'fs'
import path from 'path'
import config from 'config'

const API_URL = config.get('API_URL')
const TEST_DATA_DIRECTORY = config.get('TEST_DATA_DIRECTORY')

const fetchData = (
  query,
  fileName,
) => {
  fetch(API_URL)(query)
    .then((data) => {
      fs.writeFile(path.resolve(TEST_DATA_DIRECTORY, fileName), JSON.stringify(data.data))
      console.log('fetched', fileName)
    }).catch(error => console.log(error))
}

const geneQuery = geneName => `{
    gene(gene_name: "${geneName}") {
      gene_id
      gene_name
      canonical_transcript
      transcript {
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
  }
}`

fetchData(geneQuery('CD33'), 'transcript-tools-CD33.json')
