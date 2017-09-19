import fetch from 'graphql-fetch'

const LOCAL_API_URL = 'http://gnomad-api.broadinstitute.org/'
const API_URL = 'http://localhost:8007'

export const fetchSchzExomes = (geneName, url = API_URL) => {
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
      schzGeneResults {
        geneName
        dnmLof
        caseLof
        ctrlLof
        caseMis
        ctrlMis
        pCaco
        pMeta
      }
      variants: schiz_exome_variants {
        chrom
        pos
        xpos
        ref
        alt
        rsid
        qual
        variantId
        geneIds
        transcriptIds
        transcriptConsequenceTerms
        sortedTranscriptConsequences
        AC
        AF
        AC_cases
        AC_ctrls
        AC_UK_cases
        AC_UK_ctrls
        AC_FIN_cases
        AC_FIN_ctrls
        AC_SWE_cases
        AC_SWE_ctrls
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
}`

  return new Promise((resolve, reject) => {
    fetch(url)(query)
      .then(data => resolve(data.data.gene))
      .catch((error) => {
        reject(error)
      })
  })
}
