import fetch from 'graphql-fetch'

const variantsQuery = `
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
  lcr
  segdup
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
  lcr
  segdup
}
exacVariants {
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
`

export const fetchRegion = regionId => {
  const [chrom, start, stop] = regionId.split('-')
  const regionSize = Number(stop) - Number(start)
  const query = `{
  region(start: ${start}, stop: ${stop}, chrom: "${chrom}") {
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
    exome_coverage {
      pos
      mean
    }
    genome_coverage {
      pos
      mean
    }
    exacv1_coverage {
      pos
      mean
    }
    ${regionSize <= 10000 ? variantsQuery : ''}
  }

}
`

  return fetch(process.env.GNOMAD_API_URL)(query).then(data => data.data.region)
}
