import React, { useMemo } from 'react'
import { Track } from '@gnomad/region-viewer'

import type { DiplotypeGroupRef, HaplotypeGroup, LRVariant } from './index'

export type SourcePhasedMethylationRecord = {
  chr: string
  pos1: number
  pos2: number
  methylation: number
  sample: string
  coverage: number | null
  data_layer: 'SOURCE_PHASED'
  source_haplotype: 'HAP1' | 'HAP2'
  vcf_strand: null
  phase_set: null
}

type VcfHaplotype = 1 | 2
type ComparisonGroup = HaplotypeGroup | DiplotypeGroupRef

type Props = {
  sampleId: string
  haplotypeGroups: ComparisonGroup[]
  records: SourcePhasedMethylationRecord[]
  orientationStatus: 'UNCONFIRMED'
}

const sourceColors = { HAP1: '#7b3294', HAP2: '#008837' } as const

const isDiplotypeGroup = (group: ComparisonGroup): group is DiplotypeGroupRef => (
  'is_diplotype' in group && group.is_diplotype === true
)

const vcfRowForSample = (
  groups: ComparisonGroup[],
  sampleId: string,
  vcfHaplotype: VcfHaplotype
): { variants: LRVariant[] | null; phaseSets: string[] } => {
  const row = groups.map((group) => {
    if (isDiplotypeGroup(group)) {
      const sample = group.samples.find(({ sample_id }) => sample_id === sampleId)
      if (sample?.strand_mapping.strandA === vcfHaplotype) {
        return {
          variants: group.haplotypeA.variants,
          phaseSets: sample.phase_set_mapping.phaseSetA ? [sample.phase_set_mapping.phaseSetA] : [],
        }
      }
      if (sample?.strand_mapping.strandB === vcfHaplotype) {
        return {
          variants: group.haplotypeB.variants,
          phaseSets: sample.phase_set_mapping.phaseSetB ? [sample.phase_set_mapping.phaseSetB] : [],
        }
      }
      return null
    }
    const memberships = group.samples.filter(
      ({ sample_id, vcf_strand }) => sample_id === sampleId && vcf_strand === vcfHaplotype
    )
    return memberships.length ? {
      variants: group.variants.variants,
      phaseSets: [...new Set(memberships.flatMap(({ phase_set }) => phase_set ? [phase_set] : []))],
    } : null
  }).find((candidate) => candidate !== null)
  return row || { variants: null, phaseSets: [] }
}

const sourceLabel = (sourceHaplotype: 'HAP1' | 'HAP2') => (
  sourceHaplotype === 'HAP1' ? 'source hap1' : 'source hap2'
)

const SourcePhasedMethylationComparison = ({
  sampleId,
  haplotypeGroups,
  records,
  orientationStatus,
}: Props) => {
  const vcfRows = useMemo(() => ({
    1: vcfRowForSample(haplotypeGroups, sampleId, 1),
    2: vcfRowForSample(haplotypeGroups, sampleId, 2),
  }), [haplotypeGroups, sampleId])

  return (
    <section aria-label={`${sampleId} source-labelled methylation comparison`}>
      <div style={{ padding: '8px', border: '1px solid #ddd', background: '#fafafa' }}>
        <strong>{sampleId} source-labelled hap1/hap2 methylation</strong>
        <span style={{ marginLeft: 8, color: '#a33', fontSize: 12 }}>
          browser VCF orientation {orientationStatus.toLowerCase()}
        </span>
        <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
          VCF GT rows and source methylation rows share genomic coordinates only. The source
          rows are not attached to GT1/GT2 or to a VCF phase block; their vcf_strand and
          phase_set values remain null.
        </div>
      </div>

      {([1, 2] as const).map((vcfHaplotype) => {
        const row = vcfRows[vcfHaplotype]
        return (
          <Track
            key={`vcf-${vcfHaplotype}`}
            renderLeftPanel={() => (
              <div style={{ padding: '8px', fontSize: 12, lineHeight: 1.3 }}>
                <strong>{sampleId} VCF GT position {vcfHaplotype}</strong>
                <div style={{ color: '#666' }}>
                  {row.phaseSets.length
                    ? `phase set${row.phaseSets.length === 1 ? '' : 's'} ${row.phaseSets.join(', ')}`
                    : 'phase set unavailable'}
                </div>
              </div>
            )}
          >
            {({ scalePosition, width }: { scalePosition: (position: number) => number; width: number }) => (
              <svg
                width={width}
                height={42}
                role="img"
                aria-label={`${sampleId} VCF GT position ${vcfHaplotype} variants`}
              >
                <line x1={0} x2={width} y1={30} y2={30} stroke="#aaa" />
                {(row.variants || []).map((variant) => (
                  <circle
                    key={`${variant.variant_id}-${variant.pos}`}
                    cx={scalePosition(variant.pos)}
                    cy={30}
                    r={4}
                    fill="#4c78a8"
                  >
                    <title>{variant.variant_id}</title>
                  </circle>
                ))}
                {row.variants === null && (
                  <text x={8} y={20} fill="#777" fontSize={11}>
                    VCF GT row unavailable in the current cohort view
                  </text>
                )}
              </svg>
            )}
          </Track>
        )
      })}

      <div style={{ padding: '5px 8px', borderTop: '1px solid #ddd', color: '#666', fontSize: 11 }}>
        Independent source BED tracks (no visual or data-contract alignment to the VCF rows above)
      </div>
      {(['HAP1', 'HAP2'] as const).map((sourceHaplotype) => {
        const points = records.filter(
          (record) => record.sample === sampleId && record.source_haplotype === sourceHaplotype
        )
        const label = sourceLabel(sourceHaplotype)
        return (
          <div
            key={sourceHaplotype}
            data-testid={`${sampleId}-${sourceHaplotype.toLowerCase()}-source-row`}
            data-source-haplotype={sourceHaplotype}
            data-vcf-strand=""
            data-phase-set=""
          >
            <Track
              renderLeftPanel={() => (
                <div style={{ padding: '8px 8px 12px 24px', fontSize: 12, lineHeight: 1.3 }}>
                  <strong>{sampleId} {label}</strong>
                  <div style={{ color: '#666' }}>raw source label; not a VCF side</div>
                </div>
              )}
            >
              {({ scalePosition, width }: { scalePosition: (position: number) => number; width: number }) => (
                <svg width={width} height={58} role="img" aria-label={`${sampleId} ${label} methylation`}>
                  <line x1={0} x2={width} y1={52} y2={52} stroke="#ddd" />
                  {points.map((point) => (
                    <circle
                      key={`${sourceHaplotype}-${point.pos1}`}
                      cx={scalePosition(point.pos1)}
                      cy={52 - (Math.max(0, Math.min(100, point.methylation)) * 0.44)}
                      r={2.5}
                      fill={sourceColors[sourceHaplotype]}
                    >
                      <title>
                        {`${point.chr}:${point.pos1.toLocaleString()} ${label}: ${point.methylation}% (${point.coverage ?? 'unknown'} reads)`}
                      </title>
                    </circle>
                  ))}
                </svg>
              )}
            </Track>
          </div>
        )
      })}
    </section>
  )
}

export default SourcePhasedMethylationComparison
