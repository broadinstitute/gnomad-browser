import React from 'react'
import { render, screen } from '@testing-library/react'

import HaplotypeTrack from './index'

jest.mock('./ChromosomePainterTrack', () => () => null)
jest.mock('./DeckGLLollipopTrack', () => {
  const ReactModule = jest.requireActual('react') as typeof React
  return ReactModule.forwardRef(({
    displayGroups,
    clusters,
    scientificClusters,
    showPerCopyMethylation,
    joinedMethylationSourceSampleIds,
    methylationViewMode,
    methylationVisualGroups,
    populationMeanByPos,
    summaryByPos,
  }: any, _ref: React.ForwardedRef<unknown>) => (
    <>
      <output aria-label="rendered haplotype rows">
        {displayGroups.map((group: any) => group.hash).join(',')}
      </output>
      <output aria-label="rendered clusters">
        {(clusters || []).map((cluster: any) => `${cluster.cluster_id}:${cluster.member_group_hashes.join('+')}:${cluster.sample_count}`).join(',')}
      </output>
      <output aria-label="scientific cluster membership">
        {(scientificClusters || []).map((cluster: any) => cluster.member_group_hashes.join('+')).join(',')}
      </output>
      <output aria-label="cluster methylation enabled">
        {String(showPerCopyMethylation)}:{joinedMethylationSourceSampleIds.join('+')}
      </output>
      <output aria-label="cluster methylation display contract">
        {methylationViewMode}:{methylationVisualGroups.length}:
        {[...populationMeanByPos.entries()].map(([pos, mean]) => `${pos}=${mean}`).join(',')}:
        {[...summaryByPos.entries()].map(([pos, value]) => `${pos}=${value.mean}/${value.std}`).join(',')}
      </output>
    </>
  ))
})

const variant = (variant_id: string) => ({
  variant_id,
  chrom: '22',
  pos: Number(variant_id.split('-')[1]),
  ref: 'A',
  alt: 'T',
  allele_type: 'snv',
  allele_length: 0,
  freq: { af: 0.1, ac: 1, an: 10 },
  populations: [],
  rsid: '',
})

const groups: any[] = [
  {
    hash: 1,
    start: 100,
    stop: 100,
    variants: { variants: [variant('22-100-A-T')], readable_id: '' },
    below_threshold: { variants: [], readable_id: '' },
    samples: [{ sample_id: 'S1', vcf_strand: 1, phase_set: null, variant_sets: [] }],
  },
  {
    hash: 2,
    start: 200,
    stop: 200,
    variants: { variants: [variant('22-200-A-T')], readable_id: '' },
    below_threshold: { variants: [], readable_id: '' },
    samples: [{ sample_id: 'S2', vcf_strand: 1, phase_set: null, variant_sets: [] }],
  },
]

const requiredProps = {
  start: 1,
  stop: 300,
  haplotypeGroups: groups,
  methylationData: [],
}

const populationSummary = [
  {
    chrom: 'chr22', pos1: 100, pos2: 101, mean_methylation: 40,
    mean_coverage: 20, num_samples: 231, std_methylation: null,
  },
  {
    chrom: 'chr22', pos1: 110, pos2: 111, mean_methylation: 60,
    mean_coverage: 20, num_samples: 231, std_methylation: 5,
  },
]

beforeEach(() => window.sessionStorage.clear())

describe('show only matching haplotypes mode', () => {
  test('retains all rows by default and restores them after the explicit mode is cleared', () => {
    const matchesSecond = (candidate: any) => candidate.variant_id === '22-200-A-T'
    const { rerender } = render(
      <HaplotypeTrack {...requiredProps} variantMatchesSearch={matchesSecond} />
    )
    expect(screen.getByLabelText('rendered haplotype rows').textContent).toBe('1,2')

    rerender(
      <HaplotypeTrack
        {...requiredProps}
        variantMatchesSearch={matchesSecond}
        showOnlyMatchingHaplotypes
      />
    )
    expect(screen.getByLabelText('rendered haplotype rows').textContent).toBe('2')

    rerender(
      <HaplotypeTrack {...requiredProps} variantMatchesSearch={matchesSecond} />
    )
    expect(screen.getByLabelText('rendered haplotype rows').textContent).toBe('1,2')
  })

  test.each([
    ['groups', 'CpG groups'],
    ['both', 'Both'],
  ] as const)('honors persisted %s cluster methylation without sample-total context', (mode, controlLabel) => {
    window.sessionStorage.setItem('gnomad-lr-methylation-view', mode)
    render(
      <HaplotypeTrack
        {...requiredProps}
        clusters={[{
          cluster_id: 'C1', member_group_hashes: ['1', '2'], sample_count: 2,
          consensus_variants: [],
        }]}
        groupingMode="similarity"
        showPerCopyMethylation
        showMethylation={false}
        joinedMethylationSourceSampleIds={['S1', 'S2']}
        methylationSummary={populationSummary}
      />
    )

    expect(screen.queryByLabelText('Population methylation context')).toBeNull()
    expect(screen.getByLabelText('Cluster methylation view')).not.toBeNull()
    expect((screen.getByRole('radio', { name: controlLabel }) as HTMLInputElement).checked).toBe(true)
    expect(screen.getByText('Purple: cluster copies · gray: population mean')).not.toBeNull()
    expect(screen.getByLabelText('cluster methylation display contract').textContent).toBe(
      `${mode}:1:100=40,110=60:110=60/5`
    )
  })

  test('filters clustered rows and their expanded member hashes to matching groups', () => {
    const matchesSecond = (candidate: any) => candidate.variant_id === '22-200-A-T'
    render(
      <HaplotypeTrack
        {...requiredProps}
        clusters={[{
          cluster_id: 'C1',
          member_group_hashes: ['1', '2'],
          sample_count: 2,
          consensus_variants: [],
        }]}
        groupingMode="similarity"
        variantMatchesSearch={matchesSecond}
        showOnlyMatchingHaplotypes
        showPerCopyMethylation
        joinedMethylationSourceSampleIds={['S1', 'S2']}
      />
    )

    expect(screen.getByLabelText('rendered clusters').textContent).toBe('C1:2:1')
    expect(screen.getByLabelText('scientific cluster membership').textContent).toBe('1+2')
    expect(screen.getByLabelText('cluster methylation enabled').textContent).toBe('true:S1+S2')
  })
})
