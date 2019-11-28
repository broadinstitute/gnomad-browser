const fs = require('fs')
const path = require('path')

const gqlFetch = require('graphql-fetch')

const API_URL = 'http://gnomad-api.broadinstitute.org'

const query = `{
  region(start: 175000717, stop: 180995530, chrom: "2") {
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
        start
        transcript_id
        strand
        stop
        xstart
        chrom
        gene_id
        xstop
        exons {
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
  }
}`

gqlFetch(API_URL)(query).then(response => {
  fs.writeFileSync(
    path.resolve(__dirname, '../../../../resources/2-175000717-180995530.json'),
    JSON.stringify(response.data.region)
  )
})
