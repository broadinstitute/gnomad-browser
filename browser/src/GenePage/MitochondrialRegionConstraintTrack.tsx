import React from 'react'
// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { Track } from '@gnomad/region-viewer'
import { TrackPageSection } from '../TrackPage'
import { Exon } from '../TranscriptPage/TranscriptPage'
import { AxisBottom } from '@visx/axis'
import { Group } from '@visx/group'
import { scaleLinear } from 'd3-scale'
import { TooltipAnchor } from '@gnomad/ui'

const width = 1200
const padding = 20

export type ProteinMitochondrialRegionConstraint = {
  protein_residue_start: number
  protein_residue_end: number
  oe: number
  oe_upper: number
  oe_lower: number
}

export type RNAMitochondrialRegionConstraint = {
  mt_dna_start: number
  mt_dna_end: number
  oe: number
  oe_upper: number
  oe_lower: number
}

export type MitochondrialRegionConstraint =
  | ProteinMitochondrialRegionConstraint
  | RNAMitochondrialRegionConstraint

const isProteinMitochondrialGeneSymbol = (geneSymbol: string): boolean =>
  !geneSymbol.startsWith('MT-RNR') && !geneSymbol.startsWith('MT-T')

const proteinLength = (exons: Exon[]): number => {
  const cdses = exons.filter((exon) => exon.feature_type === 'CDS')
  const cdsLengths = cdses.map((cds) => cds.stop - cds.start)
  const overallLength = cdsLengths.reduce((result, n) => result + n, 0)
  // The overall length should always be divisible by 3 in theory, but in the
  // actual data there are cases where it doesn't
  return Math.round(overallLength / 3.0)
}

const proteinTooltipContent = (region: ProteinMitochondrialRegionConstraint) =>
  `p.${region.protein_residue_start}-p.${
    region.protein_residue_end
  } O/E missense: ${region.oe.toFixed(3)} (${region.oe_lower.toFixed(3)}-${region.oe_upper.toFixed(
    3
  )})`

type RegionConstraintParams<ConstraintRegionType> = {
  dataDomain: [number, number]
  unconstrainedColor: string
  constrainedColor: string
  constraintRegions: ConstraintRegionType[]
  regionStartFn: (constraint: ConstraintRegionType) => number
  regionEndFn: (constraint: ConstraintRegionType) => number
  axisLabel: string
  tooltipContentFn: (constraint: ConstraintRegionType) => string
}

const RegionConstraintPlot = <ConstraintRegionType,>({
  dataDomain,
  unconstrainedColor,
  constrainedColor,
  constraintRegions,
  regionStartFn,
  regionEndFn,
  axisLabel,
  tooltipContentFn,
}: RegionConstraintParams<ConstraintRegionType>) => {
  const scale = scaleLinear()
    .domain(dataDomain)
    .range([0, width - padding])

  return (
    <svg width={width} height={100} style={{ overflow: 'visible' }}>
      <rect height={30} width={width - padding} fill={unconstrainedColor} />
      {constraintRegions.map((region) => {
        return (
          // @ts-expect-error
          <TooltipAnchor tooltip={tooltipContentFn(region)}>
            <rect
              x={scale(regionStartFn(region))}
              width={scale(regionEndFn(region) - regionStartFn(region) + dataDomain[0])}
              height={30}
              fill={constrainedColor}
            />
          </TooltipAnchor>
        )
      })}
      <Group top={30} width={width}>
        <AxisBottom label={axisLabel} scale={scale} stroke="#333" tickValues={dataDomain} />
      </Group>
    </svg>
  )
}

const proteinRegionStart = (region: ProteinMitochondrialRegionConstraint) =>
  region.protein_residue_start
const proteinRegionEnd = (region: ProteinMitochondrialRegionConstraint) =>
  region.protein_residue_end

const ProteinRegionConstraintPlot = ({
  constraintRegions,
  exons,
}: {
  constraintRegions: ProteinMitochondrialRegionConstraint[]
  exons: Exon[]
}) => {
  const dataDomain: [number, number] = [1, proteinLength(exons)]
  return (
    <RegionConstraintPlot
      constraintRegions={constraintRegions}
      dataDomain={dataDomain}
      axisLabel="Residue number"
      unconstrainedColor="#377eb8"
      constrainedColor="#ff4040"
      regionStartFn={proteinRegionStart}
      regionEndFn={proteinRegionEnd}
      tooltipContentFn={proteinTooltipContent}
    />
  )
}

const mtDNAStart = (region: RNAMitochondrialRegionConstraint) => region.mt_dna_start
const mtDNAEnd = (region: RNAMitochondrialRegionConstraint) => region.mt_dna_end
const rnaTooltipContent = (region: RNAMitochondrialRegionConstraint) =>
  `m.${region.mt_dna_start}-m.${region.mt_dna_end} O/E: ${region.oe.toFixed(
    3
  )} (${region.oe_lower.toFixed(3)}-${region.oe_upper.toFixed(3)})`

const RNARegionConstraintPlot = ({
  constraintRegions,
  geneStart,
  geneStop,
}: {
  constraintRegions: RNAMitochondrialRegionConstraint[]
  geneStart: number
  geneStop: number
}) => {
  return (
    <RegionConstraintPlot
      constraintRegions={constraintRegions}
      dataDomain={[geneStart, geneStop]}
      axisLabel="mtDNA position"
      unconstrainedColor="#984ea3"
      constrainedColor="#ff4040"
      regionStartFn={mtDNAStart}
      regionEndFn={mtDNAEnd}
      tooltipContentFn={rnaTooltipContent}
    />
  )
}

const MitochondrialRegionConstraintPlot = ({
  geneSymbol,
  constraintRegions,
  exons,
  geneStart,
  geneStop,
}: {
  geneSymbol: string
  constraintRegions: MitochondrialRegionConstraint[]
  exons: Exon[]
  geneStart: number
  geneStop: number
}) =>
  isProteinMitochondrialGeneSymbol(geneSymbol) ? (
    <ProteinRegionConstraintPlot
      constraintRegions={constraintRegions as ProteinMitochondrialRegionConstraint[]}
      exons={exons}
    />
  ) : (
    <RNARegionConstraintPlot
      constraintRegions={constraintRegions as RNAMitochondrialRegionConstraint[]}
      geneStart={geneStart}
      geneStop={geneStop}
    />
  )

const MitochondrialRegionConstraintTrack = ({
  constraintRegions,
  exons,
  geneStart,
  geneStop,
  geneSymbol,
}: {
  constraintRegions: MitochondrialRegionConstraint[] | null
  exons: Exon[]
  geneStart: number
  geneStop: number
  geneSymbol: string
}) => {
  return (
    <>
      <TrackPageSection>
        <h2>Regional constraint</h2>
      </TrackPageSection>{' '}
      <Track>
        {() => {
          return constraintRegions === null ? (
            <div>Regional constraint is not available for this gene</div>
          ) : (
            <MitochondrialRegionConstraintPlot
              geneSymbol={geneSymbol}
              constraintRegions={constraintRegions}
              exons={exons}
              geneStart={geneStart}
              geneStop={geneStop}
            />
          )
        }}
      </Track>
    </>
  )
}

export default MitochondrialRegionConstraintTrack
