import fetch from 'graphql-fetch'

const API_URL = process.env.API_URL

export const test = () => 'this is a test'

export const fetchAllByGeneName = (geneName, url = API_URL) => {
  const query = `
  {
    gene(gene_name: "${geneName}") {
      gene_id
      gene_name
      start
      stop
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
  }
}`
  return new Promise((resolve, reject) => {
    fetch(url)(query)
      .then(data => resolve(data.data.gene))
      .catch((error) => {
        console.log(error)
        reject(error)
      })
  })
}

export const fetchTranscriptsByGeneName = (geneName, url = API_URL) => {
  const query = `
  {
    gene(gene_name: "${geneName}") {
      gene_id
      gene_name
      start
      stop
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
      transcript {
        exons {
          feature_type
          start
          stop
          strand
        }
      }
  }
}`
  return new Promise((resolve, reject) => {
    fetch(url)(query)
      .then(data => resolve(data.data.gene))
      .catch((error) => {
        console.log(error)
        reject(error)
      })
  })
}
