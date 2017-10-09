import fetch from 'graphql-fetch'
import { writefetched } from '@broad/utilities/src/tests'

const API_URL = 'http://localhost:8007'

export const fetchRegion = (regionId, url = API_URL) => {
  const [chrom, start, stop] = regionId.split('-')
  const query = `{
  region(start: ${start}, stop: ${stop}, chrom: ${chrom}) {
    start
    stop
    xstart
    xstop
    chrom
    gnomad_consequence_buckets {
      total_consequence_counts {
        consequence
        count
      }
      buckets {
        pos
        bucket_consequence_counts {
          consequence
          count
        }
      }
    }
  }
}

`
  return new Promise((resolve, reject) => {
    fetch(url)(query)
      .then((data) => {
        resolve(data.data.region)
      })
      .catch((error) => {
        reject(error)
      })
  })
}

fetchRegion('2-179390717-179695530')
  .then(data => writefetched(data, '2-179390717-179695530.json'))
  .catch(console.log)
