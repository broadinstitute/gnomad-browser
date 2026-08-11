type SampleLabel = { sample_id: string }

export const formatDiploidSampleLabel = (samples: SampleLabel[]): string => {
  const firstSampleId = samples[0]?.sample_id
  if (!firstSampleId) return ''
  return samples.length === 1 ? firstSampleId : `${firstSampleId} +${samples.length - 1}`
}

export const getCollapsedClusterLabelLayout = (leftPanelWidth: number) => {
  const barX = 20
  const countX = Math.max(barX, leftPanelWidth - 4)
  const reservedCountWidth = 24
  const barWidth = Math.max(0, countX - reservedCountWidth - barX)

  return { barX, barWidth, countX, countTextAnchor: 'end' as const }
}
