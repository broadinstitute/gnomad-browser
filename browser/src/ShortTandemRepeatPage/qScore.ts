export const qScoreKeys = [
  '0',
  '0.1',
  '0.2',
  '0.3',
  '0.4',
  '0.5',
  '0.6',
  '0.7',
  '0.8',
  '0.9',
  '1',
] as const

export type QScoreBin = (typeof qScoreKeys)[number]

export const qScoreLabels: Record<QScoreBin, string> = {
  '0': '0 to 0.05',
  '0.1': '0.05 to 0.15',
  '0.2': '0.15 to 0.25',
  '0.3': '0.25 to 0.35',
  '0.4': '0.35 to 0.45',
  '0.5': '0.45 to 0.55',
  '0.6': '0.55 to 0.65',
  '0.7': '0.65 to 0.75',
  '0.8': '0.75 to 0.85',
  '0.9': '0.85 to 0.95',
  '1': '0.95 to 1',
}

export type QScoreBinBounds = {
  min: number
  max: number
}

export const qScoreBinBounds: Record<QScoreBin, QScoreBinBounds> = {
  '0': { min: 0, max: 0.05 },
  '0.1': { min: 0.05, max: 0.15 },
  '0.2': { min: 0.15, max: 0.25 },
  '0.3': { min: 0.25, max: 0.35 },
  '0.4': { min: 0.35, max: 0.45 },
  '0.5': { min: 0.45, max: 0.55 },
  '0.6': { min: 0.55, max: 0.65 },
  '0.7': { min: 0.65, max: 0.75 },
  '0.8': { min: 0.75, max: 0.85 },
  '0.9': { min: 0.85, max: 0.95 },
  '1': { min: 0.95, max: 1 },
}
