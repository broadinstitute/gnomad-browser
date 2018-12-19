import fetch from 'graphql-fetch'

export default geneName => {
  const query = `{
    gene(gene_name: "${geneName}") {
      gene_id
      gene_name
      full_gene_name
      canonical_transcript
      results {
        gene_id
        gene_name
        gene_description
        analysis_group
        categories {
          id
          xcase
          xctrl
          pval
        }
        pval_meta
      }
      transcript {
        strand
        exons {
          feature_type
          start
          stop
        }
      }
  }
}`

  return fetch('/api')(query)
}
