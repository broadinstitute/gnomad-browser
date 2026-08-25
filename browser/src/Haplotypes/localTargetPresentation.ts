export const LOCAL_TARGET_LABEL_PANEL_WIDTH = 230
export const LOCAL_TARGET_NON_TR_OPACITY = 0.28
export const LOCAL_TARGET_MOTIF_STRIP_HEIGHT = 8
export const LOCAL_TARGET_COMPACT_MOTIF_STRIP_HEIGHT = 6
export const LOCAL_TARGET_MOTIF_SEPARATOR_STYLE = {
  color: [35, 35, 35, 220] as [number, number, number, number],
  width: 1,
}

// Local target emphasis is intentionally category-based: the selected TR and every
// other TR remain full strength; only non-TR evidence is faded.
export const localTargetVariantColor = (
  color: [number, number, number, number],
  alleleType: string | null | undefined,
  localTargetPresentation: boolean
): [number, number, number, number] => {
  if (!localTargetPresentation || (alleleType || '').trim().toLowerCase() === 'trv') return color
  return [color[0], color[1], color[2], Math.round(color[3] * LOCAL_TARGET_NON_TR_OPACITY)]
}

export const localTargetStripLayout = (displayStripCount: number) => {
  const stripHeight =
    displayStripCount > 3
      ? LOCAL_TARGET_COMPACT_MOTIF_STRIP_HEIGHT
      : LOCAL_TARGET_MOTIF_STRIP_HEIGHT
  return { stripHeight, stripSpacing: stripHeight }
}

export const truncateLocalTargetLabel = (label: string, maxCharacters = 32) => {
  if (label.length <= maxCharacters) return label
  return `${label.slice(0, Math.max(1, maxCharacters - 1)).trimEnd()}…`
}

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
