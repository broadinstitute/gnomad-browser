export const localTargetBandBounds = ({
  rawStart,
  rawStop,
  canvasWidth,
  minimumBandFraction = 0,
}: {
  rawStart: number
  rawStop: number
  canvasWidth: number
  minimumBandFraction?: number
}) => {
  const rawLeft = Math.min(rawStart, rawStop)
  const rawRight = Math.max(rawStart, rawStop)
  const center = Math.max(0, Math.min(canvasWidth, (rawLeft + rawRight) / 2))
  const minimumWidth = Math.max(60, canvasWidth * Math.max(0, Math.min(1, minimumBandFraction)))
  const desiredWidth = Math.max(rawRight - rawLeft, minimumWidth)
  const bandWidth = Math.min(canvasWidth, desiredWidth)
  const unclampedLeft = center - bandWidth / 2
  const bandLeft = Math.max(0, Math.min(canvasWidth - bandWidth, unclampedLeft))
  return { bandLeft, bandRight: bandLeft + bandWidth }
}
