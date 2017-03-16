import fetch from 'graphql-fetch'

const API_URL = process.env.API_URL

export const test = () => 'this is a test'

export const fetchGene = geneName => {
  const query = `{
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
        }
      }
    }
  }`
  return new Promise((resolve, reject) => {
    fetch(API_URL)(query)
      .then(data => resolve(data.data.gene))
      .catch((error) => {
        console.log(error)
        reject(error)
      })
  })
}
