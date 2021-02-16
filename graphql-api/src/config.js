const { env } = process

// The behavior of Express' trust proxy setting varies based on the type of the argument.
// Parse the environment variable string into the appropriate type.
// https://expressjs.com/en/guide/behind-proxies.html
const parseProxyConfig = (config) => {
  if (config.toLowerCase() === 'true') {
    return true
  }
  if (config.toLowerCase() === 'false') {
    return false
  }

  const isNumber = !Number.isNaN(Number(config))
  if (isNumber) {
    return Number(config)
  }

  return config
}

const config = {
  // Elasticsearch
  ELASTICSEARCH_URL: env.ELASTICSEARCH_URL,
  ELASTICSEARCH_USERNAME: env.ELASTICSEARCH_USERNAME,
  ELASTICSEARCH_PASSWORD: env.ELASTICSEARCH_PASSWORD,
  ELASTICSEARCH_QUEUE_TIMEOUT: JSON.parse(env.ELASTICSEARCH_QUEUE_TIMEOUT || '30') * 1000,
  ELASTICSEARCH_REQUEST_TIMEOUT: JSON.parse(env.ELASTICSEARCH_REQUEST_TIMEOUT || '30') * 1000,
  // Cache
  CACHE_REDIS_URL: env.CACHE_REDIS_URL,
  CACHE_REQUEST_TIMEOUT: JSON.parse(env.CACHE_REQUEST_TIMEOUT || '15') * 1000,
  // Web server
  PORT: JSON.parse(env.PORT || '8000'),
  TRUST_PROXY: parseProxyConfig(env.TRUST_PROXY || 'false'),
  // Rate limiting
  MAX_CONCURRENT_ELASTICSEARCH_REQUESTS: JSON.parse(env.MAX_CONCURRENT_ES_REQUESTS || '100'),
  MAX_QUEUED_ELASTICSEARCH_REQUESTS: JSON.parse(env.MAX_QUEUED_ES_REQUESTS || '250'),
  MAX_QUERY_COST: JSON.parse(env.MAX_QUERY_COST || '25'),
  MAX_QUERY_COST_PER_MINUTE: JSON.parse(env.MAX_QUERY_COST_PER_MINUTE || '100'),
  MAX_REQUESTS_PER_MINUTE: JSON.parse(env.MAX_REQUESTS_PER_MINUTE || '30'),
  RATE_LIMITER_REDIS_URL: env.RATE_LIMITER_REDIS_URL,
}

const requiredConfig = ['ELASTICSEARCH_URL', 'RATE_LIMITER_REDIS_URL']

for (const setting of requiredConfig) {
  if (!config[setting]) {
    throw Error(`Missing required configuration: ${setting}`)
  }
}

module.exports = config
