type SampleLabel = { sample_id?: string | null } | null | undefined

export const formatDiploidSampleLabel = (samples: SampleLabel[]): string => {
  const firstSampleId = samples[0]?.sample_id
  if (!firstSampleId) return ''
  return samples.length === 1 ? firstSampleId : `${firstSampleId} +${samples.length - 1}`
}

export const formatExpandedMemberSampleTooltip = (samples: SampleLabel[]): string => {
  const sampleIds = Array.from(
    new Set(
      samples
        .map((sample) => sample?.sample_id?.trim())
        .filter((sampleId): sampleId is string => Boolean(sampleId))
    )
  )

  if (sampleIds.length === 0) return 'Sample ID unavailable'
  if (sampleIds.length === 1) return `Sample ID: ${sampleIds[0]}`
  return `Sample IDs: ${sampleIds.join(', ')}`
}

export const getCollapsedClusterLabelLayout = (leftPanelWidth: number) => {
  const barX = 20
  const countX = Math.max(barX, leftPanelWidth - 4)
  const reservedCountWidth = 24
  const barWidth = Math.max(0, countX - reservedCountWidth - barX)

  return { barX, barWidth, countX, countTextAnchor: 'end' as const }
}

export const getExpandedMemberBarLayout = (leftPanelWidth: number, indent: number) => {
  const barX = 5 + indent
  const barWidth = Math.max(0, leftPanelWidth - 4 - barX)

  return { barX, barWidth }
}

export const getStandaloneGroupLabelLayout = (
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
