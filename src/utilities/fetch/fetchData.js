import fetch from 'graphql-fetch'

const API_URL = process.env.API_URL

export const test = () => 'this is a test'

export const fetchAllByGeneName = geneName => {
  const query = `
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

export const fetchTranscriptsByGeneName = geneName => {
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
    fetch(API_URL)(query)
      .then(data => resolve(data.data.gene))
      .catch((error) => {
        console.log(error)
        reject(error)
      })
  })
}
