import fetch from 'graphql-fetch'

const LOCAL_API_URL = 'http://gnomad-api.broadinstitute.org/'
const API_URL = 'http://localhost:8007'

export const fetchGene = (geneName, url = API_URL) => {
  const query = `{
    gene(gene_name: "${geneName}") {
      gene_id
      gene_name
      omim_accession
      full_gene_name
      start
      stop
      xstart
      xstop
      gnomadExomeVariants {
        variant_id
        rsid
        pos
        xpos
        hgvsc
        hgvsp
        allele_count
        allele_freq
        allele_num
        filters
        hom_count
        consequence
        lof
      }
      gnomadGenomeVariants {
        variant_id
        rsid
        pos
        xpos
        hgvsc
        hgvsp
        allele_count
        allele_freq
        allele_num
        filters
        hom_count
        consequence
        lof
      }
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
  }
}
`
  return new Promise((resolve, reject) => {
    fetch(url)(query)
      .then(data => resolve(data.data.gene))
      .catch((error) => {
        reject(error)
      })
  })
}


