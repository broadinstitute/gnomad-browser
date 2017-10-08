import fetch from 'graphql-fetch'

// const LOCAL_API_URL = 'http://gnomad-api.broadinstitute.org/'
const API_URL = 'http://localhost:8007'
// const API_URL = 'http://35.185.9.245'

export const fetchRegion = (regionId, url = API_URL) => {
  const [chrom, start, stop] = regionId.split('-')
  console.log([chrom, start, stop])

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
    exome_coverage {
      xpos
      pos
      mean
    }
    genome_coverage {
      xpos
      pos
      mean
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
  }
}
`
  return new Promise((resolve, reject) => {
    fetch(url)(query)
      .then(data => {
        console.log(data)
        resolve(data.data.region)
      })
      .catch((error) => {
        reject(error)
      })
  })
}


