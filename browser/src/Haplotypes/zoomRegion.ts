export type GenomicWindow = { start: number; stop: number }

export const clampRegionToOverview = (
  region: GenomicWindow,
  overview: GenomicWindow
): GenomicWindow => {
  const overviewSpan = Math.max(1, overview.stop - overview.start)
  const requestedSpan = Math.min(
    overviewSpan,
    Math.max(1, Math.round(region.stop - region.start))
  )

  if (requestedSpan >= overviewSpan) return { ...overview }

  let start = Math.round(region.start)
  let stop = start + requestedSpan
  if (start < overview.start) {
    start = overview.start
    stop = start + requestedSpan
  }
  if (stop > overview.stop) {
    stop = overview.stop
    start = stop - requestedSpan
  }

  return { start, stop }
}

export const zoomRegionWithinOverview = (
  current: GenomicWindow,
  overview: GenomicWindow,
  factor: number,
  minimumSpan = 100
): GenomicWindow => {
  const overviewSpan = Math.max(1, overview.stop - overview.start)
  const currentSpan = Math.max(1, current.stop - current.start)
  const requestedSpan = Math.min(
    overviewSpan,
    Math.max(Math.min(minimumSpan, overviewSpan), Math.round(currentSpan / factor))
  )
  const center = (current.start + current.stop) / 2
  const start = Math.round(center - requestedSpan / 2)

  return clampRegionToOverview({ start, stop: start + requestedSpan }, overview)
}
