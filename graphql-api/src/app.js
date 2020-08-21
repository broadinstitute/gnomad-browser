const compression = require('compression')
const cors = require('cors')
const express = require('express')
const morgan = require('morgan')

const config = require('./config')
const graphQLApi = require('./graphql/graphql-api')
const { queryInternalAPI } = require('./internal-api')
const PrefixTrie = require('./prefix-trie')

const app = express()
app.use(compression())
app.use(cors())

app.set('trust proxy', config.TRUST_PROXY)

// Health check endpoint for load balancer.
// GCE load balancers require a 200 response from the health check endpoint, so this must be
// registered before the HTTP=>HTTPS redirect middleware, which would return a 30x response.
app.get('/health/ready', (request, response) => {
  response.send('ok')
})

// Add logging here to avoid logging health checks
app.use(morgan('combined'))

const geneSearch = new PrefixTrie()

const indexGenes = async () => {
  const geneSearchTerms = await queryInternalAPI('/gene_search_terms/')
  for (const [geneId, searchTerms] of Object.entries(geneSearchTerms)) {
    for (const searchTerm of searchTerms) {
      geneSearch.add(searchTerm, geneId)
    }
  }
}

const context = { queryInternalAPI, geneSearch }

app.use('/api/', graphQLApi({ context }))

if (process.env.NODE_ENV === 'development') {
  indexGenes()
  app.listen(config.PORT)
} else {
  indexGenes().then(() => {
    app.listen(config.PORT)
  })
}
