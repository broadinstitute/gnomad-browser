import React, { useState, Dispatch, SetStateAction, ReactNode } from 'react'
import styled from 'styled-components'

import { BaseTable, TooltipAnchor, TooltipHint, Button } from '@gnomad/ui'

export const heterozygousVariantCooccurrenceSeverities = [
  'lof_lof',
  'lof_strong_revel_missense_or_worse',
  'lof_moderate_revel_missense_or_worse',
  'lof_supporting_revel_missense_or_worse',
  'strong_revel_missense_or_worse_strong_revel_missense_or_worse',
  'strong_revel_missense_or_worse_moderate_revel_missense_or_worse',
  'strong_revel_missense_or_worse_supporting_revel_missense_or_worse',
  'moderate_revel_missense_or_worse_moderate_revel_missense_or_worse',
  'missense_or_worse_missense_or_worse',
  'synonymous_or_worse_synonymous_or_worse',
  'supporting_revel_missense_or_worse_supporting_revel_missense_or_worse',
] as const

export const homozygousVariantCooccurrenceSeverities = [
  'lof',
  'strong_revel_missense_or_worse',
  'moderate_revel_missense_or_worse',
  'supporting_revel_missense_or_worse',
  'missense_or_worse',
  'synonymous_or_worse',
] as const

export const heterozygousVariantCooccurrenceAfCutoffs = [
  'af_cutoff_0_05',
  'af_cutoff_0_02',
  'af_cutoff_0_015',
  'af_cutoff_0_01',
  'af_cutoff_0_005',
] as const

export const homozygousVariantCooccurrenceAfCutoffs = [
  'af_cutoff_0_05',
  'af_cutoff_0_01',
  'af_cutoff_0_005',
] as const

export type VariantCooccurrenceCountsPerSeverityAndAf<
  Severities extends VariantCooccurrenceSeverity,
  AfCutoffs extends VariantCooccurrenceAfCutoff,
  CountCellSchema
> = Partial<Record<Severities, Partial<Record<AfCutoffs, CountCellSchema>>>>

export type HeterozygousVariantCooccurrenceAfCutoff =
  (typeof heterozygousVariantCooccurrenceAfCutoffs)[number]

export type HeterozygousVariantCooccurrenceSeverity =
  (typeof heterozygousVariantCooccurrenceSeverities)[number]

export type HeterozygousCountCellSchema = {
  in_cis: number
  in_trans: number
  unphased: number
  two_het_total: number
}

export type HeterozygousVariantCooccurrenceCountsPerSeverityAndAf =
  VariantCooccurrenceCountsPerSeverityAndAf<
    HeterozygousVariantCooccurrenceSeverity,
    HeterozygousVariantCooccurrenceAfCutoff,
    HeterozygousCountCellSchema
  >

export type HomozygousVariantCooccurrenceAfCutoff =
  (typeof homozygousVariantCooccurrenceAfCutoffs)[number]

export type HomozygousVariantCooccurrenceSeverity =
  (typeof homozygousVariantCooccurrenceSeverities)[number]

export type HomozygousCountCellSchema = {
  hom_total: number
}

export type HomozygousVariantCooccurrenceCountsPerSeverityAndAf =
  VariantCooccurrenceCountsPerSeverityAndAf<
    HomozygousVariantCooccurrenceSeverity,
    HomozygousVariantCooccurrenceAfCutoff,
    HomozygousCountCellSchema
  >

export type VariantCooccurrenceSeverity =
  | HeterozygousVariantCooccurrenceSeverity
  | HomozygousVariantCooccurrenceSeverity
export type VariantCooccurrenceAfCutoff =
  | HeterozygousVariantCooccurrenceAfCutoff
  | HomozygousVariantCooccurrenceAfCutoff

type TableMode = 'normal' | 'expanded'

const AF_CUTOFF_LABELS: Record<VariantCooccurrenceAfCutoff, string> = {
  af_cutoff_0_05: '5%',
  af_cutoff_0_02: '2%',
  af_cutoff_0_015: '1.5%',
  af_cutoff_0_01: '1%',
  af_cutoff_0_005: '0.5%',
} as const

const SEVERITY_LABELS: Record<VariantCooccurrenceSeverity, string> = {
  lof_lof: 'pLoF + pLoF',
  strong_revel_missense_or_worse_strong_revel_missense_or_worse:
    'strong missense or worse + strong missense or worse',
  moderate_revel_missense_or_worse_moderate_revel_missense_or_worse:
    'moderate missense or worse + moderate missense or worse',
  supporting_revel_missense_or_worse_supporting_revel_missense_or_worse:
    'weak missense or worse + weak missense or worse',
  missense_or_worse_missense_or_worse: 'missense or worse + missense or worse',
  synonymous_or_worse_synonymous_or_worse: 'synonymous or worse + synonymous or worse',
  lof_strong_revel_missense_or_worse: 'pLoF + strong missense or worse',
  lof_moderate_revel_missense_or_worse: 'pLoF + moderate missense or worse',
  lof_supporting_revel_missense_or_worse: 'pLoF + weak missense or worse',
  strong_revel_missense_or_worse_moderate_revel_missense_or_worse:
    'strong missense or worse + moderate missense or worse',
  strong_revel_missense_or_worse_supporting_revel_missense_or_worse:
    'strong missense or worse + weak missense or worse',
  lof: 'pLoF',
  strong_revel_missense_or_worse: 'strong missense or worse',
  moderate_revel_missense_or_worse: 'moderate missense or worse',
  supporting_revel_missense_or_worse: 'weak missense or worse',
  missense_or_worse: 'missense or worse',
  synonymous_or_worse: 'synonymous or worse',
}

const SEVERITY_TOOLTIPS: Record<VariantCooccurrenceSeverity, ReactNode> = {
  lof_lof: 'This category includes variant pairs where both variants were pLoF.',
  lof_strong_revel_missense_or_worse:
    'This category includes variant pairs where one variant was pLoF and the other variant was a pLoF variant or a missense variant with a REVEL score ≥ 0.932.',
  lof_moderate_revel_missense_or_worse:
    'This category includes variant pairs where one variant was pLoF and the other variant was a pLoF variant or a missense variant with a REVEL score ≥ 0.773.',
  lof_supporting_revel_missense_or_worse:
    'This category includes variant pairs where one variant was pLoF and the other variant was a pLoF variant or a missense variant with a REVEL score ≥ 0.644.',
  strong_revel_missense_or_worse_strong_revel_missense_or_worse:
    'This category includes variant pairs where both variants were either pLoFs or missense variants with a REVEL score ≥ 0.932.',
  strong_revel_missense_or_worse_moderate_revel_missense_or_worse:
    'This category includes variant pairs where one variant was either a pLoF variant or a missense variant with a REVEL score ≥ 0.932 and the other variant was either a pLoF variant or a missense variant with a REVEL score ≥ 0.773.',
  strong_revel_missense_or_worse_supporting_revel_missense_or_worse:
    'This category includes variant pairs where one variant was either a pLoF variant or a missense variant with a REVEL score ≥ 0.932 and the other variant was either a pLoF variant or a missense variant with a REVEL score ≥ 0.644.',
  moderate_revel_missense_or_worse_moderate_revel_missense_or_worse:
    'This category includes variant pairs where both variants were either pLoFs or missense variants with a REVEL score ≥ 0.773.',
  supporting_revel_missense_or_worse_supporting_revel_missense_or_worse:
    'This category includes variant pairs where both variants were either pLoFs or missense variants with a REVEL score ≥ 0.644.',
  missense_or_worse_missense_or_worse:
    'This category includes variant pairs where both variants were either pLoFs or missense variants (any REVEL score).',
  synonymous_or_worse_synonymous_or_worse:
    'This category includes variant pairs where both variants were either pLoFs, missense variants (any REVEL score), or synonymous variants.',
  lof: 'This category includes pLoF variants.',
  strong_revel_missense_or_worse:
    'This category includes pLoF variants and missense variants with a REVEL score of ≥ 0.932.',
  moderate_revel_missense_or_worse:
    'This category includes pLoF variants and missense variants with a REVEL score of ≥ 0.773.',
  supporting_revel_missense_or_worse:
    'This category includes pLoF variants and missense variants with a REVEL score of ≥ 0.644.',
  missense_or_worse:
    'This category includes pLoF variants and missense variants (any REVEL score).',
  synonymous_or_worse:
    'This category includes pLoF variants, missense variants (any REVEL score), and synonymous variants.',
}

const Table = styled(BaseTable)`
  width: 95%;
`

const ModeToggle = styled(Button)`
  margin: 1em 0 2em 0;
`

type DataCellProps<
  Severity extends VariantCooccurrenceSeverity,
  AfCutoff extends VariantCooccurrenceAfCutoff,
  CountCellSchema
> = JSX.IntrinsicAttributes & {
  variant_cooccurrence_counts: VariantCooccurrenceCountsPerSeverityAndAf<
    Severity,
    AfCutoff,
    CountCellSchema
  >
  severity: Severity
  afCutoff: AfCutoff
}

type DataCell<
  Severity extends VariantCooccurrenceSeverity,
  AfCutoff extends VariantCooccurrenceAfCutoff,
  CountCellSchema
> = React.FC<DataCellProps<Severity, AfCutoff, CountCellSchema>>

type HeterozygousDataCell = DataCell<
  HeterozygousVariantCooccurrenceSeverity,
  HeterozygousVariantCooccurrenceAfCutoff,
  HeterozygousCountCellSchema
>

type HomozygousDataCell = DataCell<
  HomozygousVariantCooccurrenceSeverity,
  HomozygousVariantCooccurrenceAfCutoff,
  HomozygousCountCellSchema
>

const HeterozygousCountCell: HeterozygousDataCell = ({
  variant_cooccurrence_counts,
  severity,
  afCutoff,
}) => {
  const counts: HeterozygousCountCellSchema = (variant_cooccurrence_counts[severity] &&
    variant_cooccurrence_counts[severity]![afCutoff]) || {
    in_cis: 0,
    in_trans: 0,
    unphased: 0,
    two_het_total: 0,
  }
  const tooltipContent = (
    <>
      <table>
        <tbody>
          <tr>
            <td>two het variants:</td>
            <td>{counts.two_het_total}</td>
          </tr>
          <tr>
            <td>
              in <i>trans</i>:
            </td>
            <td>{counts.in_trans}</td>
          </tr>
          <tr>
            <td>unphased:</td>
            <td> {counts.unphased}</td>
          </tr>
          <tr>
            <td>
              in <i>cis</i>:
            </td>
            <td> {counts.in_cis}</td>
          </tr>
        </tbody>
      </table>
    </>
  )
  return (
    <td key={afCutoff}>
      {/* @ts-expect-error */}
      <TooltipAnchor tooltip={tooltipContent}>
        {/* @ts-expect-error */}
        <TooltipHint>
          {counts.two_het_total} ({counts.in_trans})
        </TooltipHint>
      </TooltipAnchor>
    </td>
  )
}

const HomozygousCountCell: HomozygousDataCell = ({
  variant_cooccurrence_counts,
  severity,
  afCutoff,
}) => {
  const counts: HomozygousCountCellSchema = (variant_cooccurrence_counts[severity] &&
    variant_cooccurrence_counts[severity]![afCutoff]) || { hom_total: 0 }

  return <td key={afCutoff}>{counts.hom_total}</td>
}

const RowContent = <
  Severity extends VariantCooccurrenceSeverity,
  AfCutoff extends VariantCooccurrenceAfCutoff,
  CountCellSchema
>({
  variant_cooccurrence_counts,
  severity,
  afCutoffs,
  dataCellComponent,
}: {
  variant_cooccurrence_counts: VariantCooccurrenceCountsPerSeverityAndAf<
    Severity,
    AfCutoff,
    CountCellSchema
  >
  severity: Severity
  afCutoffs: readonly AfCutoff[]
  dataCellComponent: DataCell<Severity, AfCutoff, CountCellSchema>
}) => (
  <>
    {afCutoffs.map((afCutoff) =>
      dataCellComponent({
        variant_cooccurrence_counts,
        severity,
        afCutoff,
        key: `${afCutoff}`,
      })
    )}
  </>
)

const VariantCooccurrenceCountsTableContent = <
  Severity extends VariantCooccurrenceSeverity,
  AfCutoff extends VariantCooccurrenceAfCutoff,
  CountCellSchema
>({
  variant_cooccurrence_counts,
  afCutoffs,
  severities,
  dataCellComponent,
  caption,
}: {
  variant_cooccurrence_counts: VariantCooccurrenceCountsPerSeverityAndAf<
    Severity,
    AfCutoff,
    CountCellSchema
  >
  afCutoffs: readonly AfCutoff[]
  severities: readonly Severity[]
  dataCellComponent: DataCell<Severity, AfCutoff, CountCellSchema>
  caption: ReactNode
}) => {
  const afCutoffWidth = `${45.0 / afCutoffs.length}%`

  return (
    <>
      <colgroup>
        <col style={{ width: '45%' }} />
        {afCutoffs.map((afCutoff) => (
          <col key={afCutoff} style={{ width: afCutoffWidth }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th colSpan={afCutoffs.length + 1}>{caption}</th>
        </tr>
        <tr>
          <th>Consequence</th>
          <th colSpan={afCutoffs.length}>Allele frequency</th>
        </tr>
        <tr>
          {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
          <th />
          {afCutoffs.map((afCutoff) => (
            <th key={`${afCutoff}`}>&le;&nbsp;{AF_CUTOFF_LABELS[afCutoff]}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {severities.map((severity) => {
          const severityLabel = SEVERITY_LABELS[severity]
          const tooltipContent = SEVERITY_TOOLTIPS[severity]
          const severityTitle = tooltipContent ? (
            <>
              {/* @ts-expect-error */}
              <TooltipAnchor tooltip={tooltipContent}>
                {/* @ts-expect-error */}
                <TooltipHint>{severityLabel}</TooltipHint>
              </TooltipAnchor>
            </>
          ) : (
            severityLabel
          )

          return (
            <tr key={`${severity}`}>
              <td>{severityTitle}</td>
              <RowContent
                variant_cooccurrence_counts={variant_cooccurrence_counts}
                severity={severity}
                afCutoffs={afCutoffs}
                dataCellComponent={dataCellComponent}
                key={`${severity}`}
              />
            </tr>
          )
        })}
      </tbody>
    </>
  )
}

const HeterozygousVariantCooccurrenceCountsTable = ({
  variant_cooccurrence_counts,
}: {
  variant_cooccurrence_counts: HeterozygousVariantCooccurrenceCountsPerSeverityAndAf
}) => (
  <Table>
    <VariantCooccurrenceCountsTableContent
      variant_cooccurrence_counts={variant_cooccurrence_counts}
      afCutoffs={
        [
          'af_cutoff_0_05',
          'af_cutoff_0_01',
          'af_cutoff_0_005',
        ] as HeterozygousVariantCooccurrenceAfCutoff[]
      }
      severities={
        [
          'lof_lof',
          'strong_revel_missense_or_worse_strong_revel_missense_or_worse',
          'moderate_revel_missense_or_worse_moderate_revel_missense_or_worse',
          'supporting_revel_missense_or_worse_supporting_revel_missense_or_worse',
          'missense_or_worse_missense_or_worse',
          'synonymous_or_worse_synonymous_or_worse',
        ] as HeterozygousVariantCooccurrenceSeverity[]
      }
      dataCellComponent={HeterozygousCountCell}
      caption={<HeterozygousCaption />}
    />
  </Table>
)

const ExpandedHeterozygousVariantCooccurrenceCountsTable = ({
  variant_cooccurrence_counts,
}: {
  variant_cooccurrence_counts: HeterozygousVariantCooccurrenceCountsPerSeverityAndAf
}) => (
  <Table>
    <VariantCooccurrenceCountsTableContent
      variant_cooccurrence_counts={variant_cooccurrence_counts}
      afCutoffs={
        [
          'af_cutoff_0_05',
          'af_cutoff_0_02',
          'af_cutoff_0_015',
          'af_cutoff_0_01',
          'af_cutoff_0_005',
        ] as HeterozygousVariantCooccurrenceAfCutoff[]
      }
      severities={
        [
          'lof_lof',
          'lof_strong_revel_missense_or_worse',
          'lof_moderate_revel_missense_or_worse',
          'lof_supporting_revel_missense_or_worse',
          'strong_revel_missense_or_worse_strong_revel_missense_or_worse',
          'strong_revel_missense_or_worse_moderate_revel_missense_or_worse',
          'strong_revel_missense_or_worse_supporting_revel_missense_or_worse',
          'moderate_revel_missense_or_worse_moderate_revel_missense_or_worse',
          'supporting_revel_missense_or_worse_supporting_revel_missense_or_worse',
          'missense_or_worse_missense_or_worse',
          'synonymous_or_worse_synonymous_or_worse',
        ] as HeterozygousVariantCooccurrenceSeverity[]
      }
      dataCellComponent={HeterozygousCountCell}
      caption={<HeterozygousCaption />}
    />
  </Table>
)

const HomozygousVariantCooccurrenceCountsTable = ({
  variant_cooccurrence_counts,
}: {
  variant_cooccurrence_counts: HomozygousVariantCooccurrenceCountsPerSeverityAndAf
}) => (
  <Table>
    <VariantCooccurrenceCountsTableContent
      variant_cooccurrence_counts={variant_cooccurrence_counts}
      afCutoffs={homozygousVariantCooccurrenceAfCutoffs}
      severities={homozygousVariantCooccurrenceSeverities}
      dataCellComponent={HomozygousCountCell}
      caption={<HomozygousCaption />}
    />
  </Table>
)

const toggleTableMode = (
  currentTableMode: TableMode,
  setTableMode: Dispatch<SetStateAction<TableMode>>
) => {
  if (currentTableMode === 'normal') {
    setTableMode('expanded')
  } else {
    setTableMode('normal')
  }
}

const HeterozygousCaption = () => {
  const tooltipContent = (
    <>
      Variants predicted to be in <i>trans</i> by the gnomAD variant co-occurrence tool
      (gnomad.broadinstitute.org/variant-cooccurrence).
    </>
  )
  const tooltip = (
    <>
      {/* @ts-expect-error */}
      <TooltipAnchor tooltip={tooltipContent}>
        {/* @ts-expect-error */}
        <TooltipHint>
          (number predicted in <i>trans</i>)
        </TooltipHint>
      </TooltipAnchor>
    </>
  )

  return (
    <>
      Individuals with <strong>two heterozygous</strong> rare variants {tooltip}
    </>
  )
}

const HomozygousCaption = () => (
  <>
    Individuals with <strong>homozygous</strong> rare variants
  </>
)

const VariantCooccurrenceCountsTable = ({
  heterozygous_variant_cooccurrence_counts,
  homozygous_variant_cooccurrence_counts,
}: {
  heterozygous_variant_cooccurrence_counts: HeterozygousVariantCooccurrenceCountsPerSeverityAndAf
  homozygous_variant_cooccurrence_counts: HomozygousVariantCooccurrenceCountsPerSeverityAndAf
}) => {
  const [tableMode, setTableMode] = useState<TableMode>('normal')

  const buttonLabel = tableMode === 'normal' ? 'expand' : 'collapse'
  const clickCallback = () => toggleTableMode(tableMode, setTableMode)
  const toggleButton = <ModeToggle onClick={clickCallback}>{buttonLabel}</ModeToggle>

  return (
    <div>
      {tableMode === 'normal' ? (
        <>
          <HeterozygousVariantCooccurrenceCountsTable
            variant_cooccurrence_counts={heterozygous_variant_cooccurrence_counts}
          />
          {toggleButton}
          <HomozygousVariantCooccurrenceCountsTable
            variant_cooccurrence_counts={homozygous_variant_cooccurrence_counts}
          />
        </>
      ) : (
        <>
          <ExpandedHeterozygousVariantCooccurrenceCountsTable
            variant_cooccurrence_counts={heterozygous_variant_cooccurrence_counts}
          />
          {toggleButton}
        </>
      )}
    </div>
  )
}

export default VariantCooccurrenceCountsTable
