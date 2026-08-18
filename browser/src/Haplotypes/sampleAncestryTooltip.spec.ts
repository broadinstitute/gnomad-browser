import { formatSampleAncestryTooltip } from './sampleAncestryTooltip'

const samples = (...sampleIds: string[]) => sampleIds.map((sample_id) => ({ sample_id }))

const metadata = (entries: [string, { superpopulation: string; subpopulation: string }][]) =>
  new Map(entries)

describe('formatSampleAncestryTooltip', () => {
  test('reports broad and fine ancestry metadata with normalized display IDs', () => {
    expect(
      formatSampleAncestryTooltip(
        samples('HG03874'),
        metadata([['HG03874', { superpopulation: 'sas', subpopulation: 'gih' }]])
      )
    ).toBe(
      ['Sample ID: HG03874', 'Genetic ancestry group: SAS', 'Genetic ancestry subgroup: GIH'].join(
        '\n'
      )
    )
  })

  test('reports an unavailable subgroup for HG00731-style broad-only metadata', () => {
    expect(
      formatSampleAncestryTooltip(
        samples('HG00731'),
        metadata([['HG00731', { superpopulation: 'AMR', subpopulation: 'N/A' }]])
      )
    ).toBe(
      [
        'Sample ID: HG00731',
        'Genetic ancestry group: AMR',
        'Genetic ancestry subgroup: unavailable',
      ].join('\n')
    )
  })

  test('reports fully unavailable metadata honestly', () => {
    expect(formatSampleAncestryTooltip(samples('sample-without-metadata'), new Map())).toBe(
      [
        'Sample ID: sample-without-metadata',
        'Genetic ancestry group: unavailable',
        'Genetic ancestry subgroup: unavailable',
      ].join('\n')
    )
  })

  test('keeps ancestry attributed per sample for a composite row', () => {
    expect(
      formatSampleAncestryTooltip(
        samples('sample-amr', 'sample-rmi'),
        metadata([
          ['sample-amr', { superpopulation: 'AMR', subpopulation: 'PEL' }],
          ['sample-rmi', { superpopulation: 'oth', subpopulation: 'N/A' }],
        ])
      )
    ).toBe(
      [
        'Sample ID: sample-amr',
        'Genetic ancestry group: AMR',
        'Genetic ancestry subgroup: PEL',
        '',
        'Sample ID: sample-rmi',
        'Genetic ancestry group: RMI',
        'Genetic ancestry subgroup: unavailable',
      ].join('\n')
    )
  })

  test('marks an unrecognized broad ancestry ID instead of presenting it as known', () => {
    expect(
      formatSampleAncestryTooltip(
        samples('sample-unknown'),
        metadata([['sample-unknown', { superpopulation: 'unexpected', subpopulation: 'N/A' }]])
      )
    ).toContain('Genetic ancestry group: unrecognized (UNEXPECTED)')
  })
})
