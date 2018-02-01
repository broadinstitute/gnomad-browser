import fetch from 'graphql-fetch'
const API_URL = process.env.GNOMAD_API_URL

const query = `
  query getTopics ($index: String!, $query: String, $getDefaults: Boolean) {
   help(index: $index query: $query getDefaults: $getDefaults) {
     index
    topics {
      id
      title
      vcfKey
      score
      htmlString
    }
   }
  }
`

export function fetchHelpTopics(index, helpQuery, getDefaults) {
  return new Promise((resolve, reject) => {
    fetch(API_URL)(query, { index, query: helpQuery, getDefaults })
      .then(response => resolve(response.data.help))
      .catch((error) => {
        console.log(error)
        reject('Could not get the help topics')
      })
  })
}
