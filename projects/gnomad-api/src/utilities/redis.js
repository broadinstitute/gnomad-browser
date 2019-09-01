export const withCache = async (ctx, cacheKey, fn) => {
  const cachedValue = await ctx.database.redis.get(cacheKey)
  if (cachedValue) {
    return cachedValue
  }

  const value = await fn()

  await ctx.database.redis.set(cacheKey, value)

  return value
}
