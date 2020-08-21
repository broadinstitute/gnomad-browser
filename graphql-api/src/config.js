const { env } = process

const config = {
  // Internal API
  INTERNAL_API_URL: env.INTERNAL_API_URL,
  CACHE_REDIS_URL: env.CACHE_REDIS_URL,
  // Web server
  PORT: JSON.parse(env.PORT || '8000'),
  TRUST_PROXY: JSON.parse(env.TRUST_PROXY || 'false'),
  // Rate limiting
  MAX_CONCURRENT_INTERNAL_API_QUERIES: JSON.parse(env.MAX_CONCURRENT_INTERNAL_API_QUERIES || '32'),
  MAX_QUEUED_INTERNAL_API_QUERIES: JSON.parse(env.MAX_QUEUED_INTERNAL_API_QUERIES || '100'),
  MAX_QUERY_COST: JSON.parse(env.MAX_QUERY_COST || '25'),
  MAX_QUERY_COST_PER_MINUTE: JSON.parse(env.MAX_QUERY_COST_PER_MINUTE || '100'),
  MAX_REQUESTS_PER_MINUTE: JSON.parse(env.MAX_REQUESTS_PER_MINUTE || '30'),
  RATE_LIMITER_REDIS_URL: env.RATE_LIMITER_REDIS_URL,
}

const requiredConfig = ['INTERNAL_API_URL', 'RATE_LIMITER_REDIS_URL']

for (const setting of requiredConfig) {
  if (!config[setting]) {
    throw Error(`Missing required configuration: ${setting}`)
  }
}

module.exports = config
