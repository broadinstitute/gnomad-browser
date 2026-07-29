export const createHaplotypeWorker = () => new Worker(
  // Webpack requires import.meta for a statically analyzable worker chunk.
  // @ts-expect-error The repository-wide CommonJS typecheck cannot model this webpack expression.
  new URL('./haplotypeWorker.ts', import.meta.url)
)
