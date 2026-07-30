import React from 'react'
import { Track } from '@gnomad/region-viewer'

export type SourcePhasedMethylationRecord = {
  chr: string
  pos1: number
  pos2: number
  methylation: number
  sample: 'HG00097'
  coverage: number | null
  data_layer: 'SOURCE_PHASED'
  source_haplotype: 'HAP1' | 'HAP2'
  vcf_strand: null
  phase_set: null
}

type Props = {
  records: SourcePhasedMethylationRecord[]
}

const colors = { HAP1: '#7b3294', HAP2: '#008837' } as const

const SourcePhasedMethylationTrack = ({ records }: Props) => (
  <section aria-label="HG00097 source-phased methylation tracks">
    {(['HAP1', 'HAP2'] as const).map((sourceHaplotype) => {
      const points = records.filter((record) => record.source_haplotype === sourceHaplotype)
      const label = sourceHaplotype === 'HAP1' ? 'source hap1' : 'source hap2'
      return (
        <Track
          key={sourceHaplotype}
          renderLeftPanel={() => (
            <div style={{ padding: '10px 8px', fontSize: 12, lineHeight: 1.3 }}>
              <strong>HG00097 {label}</strong>
              <div style={{ color: '#666' }}>orientation unconfirmed</div>
            </div>
          )}
        >
          {({ scalePosition, width }: { scalePosition: (position: number) => number; width: number }) => (
            <svg
              width={width}
              height={58}
              role="img"
              aria-label={`HG00097 ${label} methylation aligned by genomic coordinate`}
            >
              <line x1={0} x2={width} y1={52} y2={52} stroke="#ddd" />
              {points.map((point) => (
                <circle
                  key={`${sourceHaplotype}-${point.pos1}`}
                  cx={scalePosition(point.pos1)}
                  cy={52 - (Math.max(0, Math.min(100, point.methylation)) * 0.44)}
                  r={2.5}
                  fill={colors[sourceHaplotype]}
                >
                  <title>
                    {`${point.chr}:${point.pos1.toLocaleString()} ${label}: ${point.methylation}% (${point.coverage ?? 'unknown'} reads)`}
                  </title>
                </circle>
              ))}
            </svg>
          )}
        </Track>
      )
    })}
  </section>
)

export default SourcePhasedMethylationTrack
