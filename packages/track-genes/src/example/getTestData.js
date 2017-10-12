import fetch from 'graphql-fetch'
import { writefetched } from '@broad/utilities/src/tests'

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

fetchRegion('2-175000717-180995530')
  .then(data => writefetched(data, '2-175000717-180995530.json'))
  .catch(console.log)
