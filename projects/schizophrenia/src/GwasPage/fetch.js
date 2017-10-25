import fetch from 'graphql-fetch'

// const API_URL = process.env.GNOMAD_API_URL
const API_URL = 'http://localhost:8007'
export const fetchRegion = (regionId, url = API_URL) => {
  const [chrom, start, stop] = regionId.split('-')
  const query = `{
  region(start: ${Number(start)}, stop: ${Number(stop)}, chrom: ${Number(chrom)}) {
    start
    stop
    xstop
    xstart
    chrom
    genes {
      gene_id
      gene_name
      start
      stop
      transcript {
        _id
        start
        transcript_id
        strand
        stop
        xstart
        chrom
        gene_id
        xstop
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
    schizophreniaExomeVariants {
      variant_id
      chrom
      pos
      xpos
      ref
      alt
      rsid
      qual
      geneIds
      transcriptIds
      consequence
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
    schizophreniaGwasVariants {
      variant_id
      chr
      pos
      ref
      alt
      n_study
      study
      p_value
      scz_af
      hc_af
      odds_ratio
      se
      qp
      i_squared
      mhtp
      comment
    }
  }

}
`
  return new Promise((resolve, reject) => {
    fetch(url)(query)
      .then(data => {
        resolve(data.data.region)
      })
      .catch((error) => {
        reject(error)
      })
  })
}


