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

export const getExpandedMemberLabelLayout = (
  leftPanelWidth: number,
  indent: number,
  sampleCount: number,
  variantCount: number
) => {
  const barX = 5 + indent
  const countX = Math.max(barX, leftPanelWidth - 4)
  const sampleCountWidth = Math.max(6, String(sampleCount).length * 6)
  const variantCountWidth = Math.max(6, String(variantCount).length * 6)
  const variantCircleX = countX - variantCountWidth - 6
  const sampleCountX = variantCircleX - 6
  const barWidth = Math.min(80, Math.max(0, sampleCountX - sampleCountWidth - 4 - barX))

  return {
    barX,
    barWidth,
    sampleCountX,
    sampleCountWidth,
    sampleCountTextAnchor: 'end' as const,
    variantCircleX,
    variantCountX: countX,
    variantCountWidth,
    variantCountTextAnchor: 'end' as const,
  }
}
