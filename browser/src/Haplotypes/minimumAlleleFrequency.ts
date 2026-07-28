const SLIDER_MIN = 0
const SLIDER_MAX = 100
const LOG_SCALE_START = 1
const DEFAULT_POSITIVE_AF_FLOOR = 0.0001

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

export const minimumAlleleFrequencyOrDefault = (
  value: number | null | undefined,
  fallback = 0
) => value ?? fallback

export const parseMinimumAlleleFrequency = (
  value: string | string[] | null | undefined,
  fallback = 0
) => {
  const rawValue = Array.isArray(value) ? value[0] : value
  if (rawValue == null || rawValue === '') return fallback

  const parsedValue = Number(rawValue)
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : fallback
}

export const createMinimumAlleleFrequencyScale = (floor: number, ceiling: number) => {
  const positiveFloor = Math.max(floor, DEFAULT_POSITIVE_AF_FLOOR)
  const positiveCeiling = Math.max(ceiling, 0.001)
  const minLog = Math.log10(positiveFloor)
  const maxLog = Math.log10(positiveCeiling)

  const afToSlider = (alleleFrequency: number) => {
    if (alleleFrequency <= 0) return SLIDER_MIN
    if (maxLog === minLog) return (LOG_SCALE_START + SLIDER_MAX) / 2

    const logPosition =
      (Math.log10(Math.max(alleleFrequency, positiveFloor)) - minLog) / (maxLog - minLog)
    return LOG_SCALE_START + clamp(logPosition, 0, 1) * (SLIDER_MAX - LOG_SCALE_START)
  }

  const sliderToAf = (sliderValue: number) => {
    if (sliderValue <= SLIDER_MIN) return 0
    if (maxLog === minLog) return positiveFloor

    const logPosition =
      (clamp(sliderValue, LOG_SCALE_START, SLIDER_MAX) - LOG_SCALE_START) /
      (SLIDER_MAX - LOG_SCALE_START)
    return 10 ** (minLog + logPosition * (maxLog - minLog))
  }

  return { afToSlider, sliderToAf }
}
