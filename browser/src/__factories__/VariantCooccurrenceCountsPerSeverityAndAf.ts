import { Factory } from 'fishery'
import {
  HeterozygousVariantCooccurrenceCountsPerSeverityAndAf,
  HomozygousVariantCooccurrenceCountsPerSeverityAndAf,
  VariantCooccurrenceSeverity,
  HeterozygousCountCellSchema,
  HomozygousCountCellSchema,
  VariantCooccurrenceAfCutoff,
  heterozygousVariantCooccurrenceSeverities,
  heterozygousVariantCooccurrenceAfCutoffs,
  homozygousVariantCooccurrenceSeverities,
  homozygousVariantCooccurrenceAfCutoffs,
} from '../GenePage/VariantCooccurrenceCountsTable'

const simpleHash = (input: string) =>
  Math.abs(
    input.split('').reduce((prev, curr) => (Math.imul(15, prev) + curr.charCodeAt(0)) | 0, 0)
  )

const buildFakeHeterozygousCounts = (
  severity: VariantCooccurrenceSeverity,
  afCutoff: VariantCooccurrenceAfCutoff
): HeterozygousCountCellSchema => {
  const severityHash = simpleHash(severity)
  const afCutoffHash = simpleHash(afCutoff)
  const hashSum = severityHash + afCutoffHash
  const in_cis = hashSum % 12345
  const in_trans = hashSum % 23456
  const unphased = hashSum % 34567
  const two_het_total = in_cis + in_trans + unphased
  return { in_cis, in_trans, unphased, two_het_total }
}

const buildFakeHomozygousCounts = (
  severity: VariantCooccurrenceSeverity,
  afCutoff: VariantCooccurrenceAfCutoff
): HomozygousCountCellSchema => {
  const severityHash = simpleHash(severity)
  const afCutoffHash = simpleHash(afCutoff)
  const hashSum = severityHash + afCutoffHash
  const hom_total = hashSum % 45678
  return { hom_total }
}

const buildCounts = (
  severities: readonly VariantCooccurrenceSeverity[],
  afCutoffs: readonly VariantCooccurrenceAfCutoff[],
  cellBuilder: (severity: VariantCooccurrenceSeverity, afCutoff: VariantCooccurrenceAfCutoff) => any
) => {
  const result: any = {}
  severities.forEach((severity) => {
    result[severity] = {}
    afCutoffs.forEach((afCutoff) => {
      result[severity][afCutoff] = cellBuilder(severity, afCutoff)
    })
  })
  return result
}

export const HeterozygousVariantCooccurrenceCountsPerSeverityAndAfFactory =
  Factory.define<HeterozygousVariantCooccurrenceCountsPerSeverityAndAf>(() => {
    return buildCounts(
      heterozygousVariantCooccurrenceSeverities,
      heterozygousVariantCooccurrenceAfCutoffs,
      buildFakeHeterozygousCounts
    ) as HeterozygousVariantCooccurrenceCountsPerSeverityAndAf
  })

export const HomozygousVariantCooccurrenceCountsPerSeverityAndAfFactory =
  Factory.define<HomozygousVariantCooccurrenceCountsPerSeverityAndAf>(() => {
    return buildCounts(
      homozygousVariantCooccurrenceSeverities,
      homozygousVariantCooccurrenceAfCutoffs,
      buildFakeHomozygousCounts
    ) as HomozygousVariantCooccurrenceCountsPerSeverityAndAf
  })
