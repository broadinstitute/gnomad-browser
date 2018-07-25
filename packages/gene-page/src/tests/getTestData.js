import { writefetched } from '@broad/utilities/src/tests'

import fetch from 'graphql-fetch'

const LOCAL_API_URL = 'http://gnomad-api.broadinstitute.org/'
const API_URL = 'http://localhost:8007'

export const fetchData = (geneName, url = API_URL) => {
  const query = `{
    gene(gene_name: "${geneName}") {
      gene_name
      xstart
      xstop
  }
}
`
  return new Promise((resolve, reject) => {
    fetch(url)(query)
      .then(data => resolve(data))
      .catch((error) => {
        reject(error)
      })
  })
}

writefetched(fetchData('MYH7'), '1506655474-gene-page-tests-arsf.json')
