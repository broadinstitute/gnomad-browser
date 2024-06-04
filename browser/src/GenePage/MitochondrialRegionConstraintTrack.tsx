import React from 'react'
import { Exon } from '../TranscriptPage/TranscriptPage'
import ConstraintTrack, { regionsInExons, RegionAttributeList } from '../ConstraintTrack'

export type MitochondrialConstraintRegion = {
  start: number
  stop: number
  oe: number
  oe_upper: number
  oe_lower: number
}

type Props = {
  geneSymbol: string
  constraintRegions: MitochondrialConstraintRegion[] | null
  exons: Exon[]
}

const constraintColor = '#fd8d3c'

const Legend = () => (
  <>
    <span>Regionally constrained interval</span>
    <svg width={50} height={25}>
      <rect x={10} y={3} width={30} height={10} stroke="#000" fill={constraintColor} />
    </svg>
  </>
)

type TooltipProps = {
  region: MitochondrialConstraintRegion
}

const Tooltip = ({ region }: TooltipProps) => {
  return (
    <RegionAttributeList>
      <div>
        <dt>Coordinates:</dt>
        <dd>{`M:${region.start}-${region.stop}`}</dd>
      </div>
      <div>
        <dt>Missense observed/expected:</dt>
        <dd>
          {region.oe.toFixed(3)} ({region.oe_lower.toFixed(3)}-{region.oe_upper.toFixed(3)})
        </dd>
      </div>
    </RegionAttributeList>
  )
}

const formattedOE = (region: MitochondrialConstraintRegion) => region.oe.toFixed(3)

const MitochondrialConstraintRegionTrack = ({ geneSymbol, constraintRegions, exons }: Props) => {
  if (constraintRegions === null) {
    return null
  }

  const isRNAGene = geneSymbol.startsWith('MT-R')
  const trackTitle = isRNAGene ? 'Regional constraint' : 'Regional missense constraint'

  return (
    <ConstraintTrack
      trackTitle={trackTitle}
      infobuttonTopic="TK-mitochondrial-gene-constraint"
      legend={<Legend />}
      valueFn={formattedOE}
      colorFn={() => constraintColor}
      tooltipComponent={Tooltip}
      allRegions={null}
      constrainedRegions={regionsInExons(constraintRegions, exons)}
    />
  )
}

export default MitochondrialConstraintRegionTrack
