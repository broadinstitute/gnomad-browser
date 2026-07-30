import React, { useMemo, useState } from 'react'
import { Track } from '@gnomad/region-viewer'

import type { DiplotypeGroupRef, HaplotypeGroup, LRVariant } from './index'

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

type DisplayAlignment = 'direct' | 'swapped'
type VcfHaplotype = 1 | 2
type ComparisonGroup = HaplotypeGroup | DiplotypeGroupRef

type Props = {
  haplotypeGroups: ComparisonGroup[]
  records: SourcePhasedMethylationRecord[]
  orientationStatus: 'UNCONFIRMED'
}

const sourceColors = { HAP1: '#7b3294', HAP2: '#008837' } as const

const isDiplotypeGroup = (group: ComparisonGroup): group is DiplotypeGroupRef => (
  'is_diplotype' in group && group.is_diplotype === true
)

const sourceForDisplayRow = (
  vcfHaplotype: VcfHaplotype,
  alignment: DisplayAlignment
): SourcePhasedMethylationRecord['source_haplotype'] => {
  if (alignment === 'direct') return vcfHaplotype === 1 ? 'HAP1' : 'HAP2'
  return vcfHaplotype === 1 ? 'HAP2' : 'HAP1'
}

const variantsForVcfHaplotype = (
  groups: ComparisonGroup[],
  vcfHaplotype: VcfHaplotype
): LRVariant[] | null => {
  const matchingVariants = groups.map((group) => {
    if (isDiplotypeGroup(group)) {
      const sample = group.samples.find(({ sample_id }) => sample_id === 'HG00097')
      if (sample?.strand_mapping.strandA === vcfHaplotype) return group.haplotypeA.variants
      if (sample?.strand_mapping.strandB === vcfHaplotype) return group.haplotypeB.variants
      return undefined
    }

    return group.samples.some(
      ({ sample_id, vcf_strand }) => sample_id === 'HG00097' && vcf_strand === vcfHaplotype
    ) ? group.variants.variants : undefined
  }).find((variants) => variants !== undefined)

  return matchingVariants ?? null
}

const labelForSource = (sourceHaplotype: 'HAP1' | 'HAP2') => (
  sourceHaplotype === 'HAP1' ? 'source hap1' : 'source hap2'
)

const HG00097PhasedMethylationComparison = ({
  haplotypeGroups,
  records,
  orientationStatus,
}: Props) => {
  // Deliberately local display state: it is not written to the URL or sent to an API.
  const [displayAlignment, setDisplayAlignment] = useState<DisplayAlignment>('direct')
  const variantsByVcfHaplotype = useMemo(() => ({
    1: variantsForVcfHaplotype(haplotypeGroups, 1),
    2: variantsForVcfHaplotype(haplotypeGroups, 2),
  }), [haplotypeGroups])

  return (
    <section aria-label="HG00097 pinned phased methylation comparison">
      <div style={{ padding: '8px', border: '1px solid #ddd', background: '#fafafa' }}>
        <strong>Pinned HG00097 comparison</strong>
        <span style={{ marginLeft: 8, color: '#a33', fontSize: 12 }}>
          orientation {orientationStatus.toLowerCase()}
        </span>
        <fieldset
          aria-label="Exploratory source display alignment"
          style={{ display: 'inline-flex', gap: 12, margin: '0 0 0 16px', border: 0, padding: 0 }}
        >
          <legend style={{ float: 'left', marginRight: 8, fontSize: 12 }}>Display alignment only:</legend>
          {(['direct', 'swapped'] as const).map((alignment) => (
            <label key={alignment} style={{ fontSize: 12 }}>
              <input
                type="radio"
                name="hg00097-source-display-alignment"
                value={alignment}
                checked={displayAlignment === alignment}
                onChange={() => setDisplayAlignment(alignment)}
              />
              {' '}{alignment}
            </label>
          ))}
        </fieldset>
        <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
          Exploratory display only. This does not record a scientific mapping or enable the phased methylation join.
          The complete cohort view remains available below.
        </div>
      </div>

      {([1, 2] as const).map((vcfHaplotype) => {
        const sourceHaplotype = sourceForDisplayRow(vcfHaplotype, displayAlignment)
        const sourceLabel = labelForSource(sourceHaplotype)
        const variants = variantsByVcfHaplotype[vcfHaplotype]
        const points = records.filter((record) => record.source_haplotype === sourceHaplotype)

        return (
          <section
            key={vcfHaplotype}
            data-testid={`hg00097-vcf-haplotype-${vcfHaplotype}-comparison`}
            aria-label={`HG00097 VCF haplotype ${vcfHaplotype} pinned comparison rows`}
          >
            <Track
              renderLeftPanel={() => (
                <div style={{ padding: '8px', fontSize: 12, lineHeight: 1.3 }}>
                  <strong>HG00097 VCF haplotype {vcfHaplotype}</strong>
                  <div style={{ color: '#666' }}>pinned variant row</div>
                </div>
              )}
            >
              {({ scalePosition, width }: { scalePosition: (position: number) => number; width: number }) => (
                <svg
                  width={width}
                  height={42}
                  role="img"
                  aria-label={`HG00097 VCF haplotype ${vcfHaplotype} variants`}
                >
                  <line x1={0} x2={width} y1={30} y2={30} stroke="#aaa" />
                  {(variants || []).map((variant) => (
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
                  {variants === null && (
                    <text x={8} y={20} fill="#777" fontSize={11}>
                      HG00097 VCF haplotype row unavailable in the current cohort view
                    </text>
                  )}
                </svg>
              )}
            </Track>
            <div
              data-testid={`hg00097-source-row-under-vcf-${vcfHaplotype}`}
              data-source-haplotype={sourceHaplotype}
              data-display-vcf-haplotype={vcfHaplotype}
            >
              <Track
                renderLeftPanel={() => (
                  <div style={{ padding: '8px 8px 12px 24px', fontSize: 12, lineHeight: 1.3 }}>
                    <strong>HG00097 {sourceLabel}</strong>
                    <div style={{ color: '#666' }}>raw source label; display alignment only</div>
                  </div>
                )}
              >
                {({ scalePosition, width }: { scalePosition: (position: number) => number; width: number }) => (
                  <svg
                    width={width}
                    height={58}
                    role="img"
                    aria-label={`HG00097 ${sourceLabel} methylation displayed under VCF haplotype ${vcfHaplotype}`}
                  >
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
                          {`${point.chr}:${point.pos1.toLocaleString()} ${sourceLabel}: ${point.methylation}% (${point.coverage ?? 'unknown'} reads)`}
                        </title>
                      </circle>
                    ))}
                  </svg>
                )}
              </Track>
            </div>
          </section>
        )
      })}
    </section>
  )
}

export default HG00097PhasedMethylationComparison
