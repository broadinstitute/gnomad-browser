import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import HaplotypeVariantTable from './HaplotypeVariantTable'

jest.mock('../Link', () => ({ children, to, onClick }: any) => (
  <a href={to} onClick={onClick}>
    {children}
  </a>
))

beforeEach(() => {
  Object.defineProperty(window, 'scroll', { configurable: true, value: jest.fn() })
})

const variant = (variantId: string, pos: number, alleleLength = 0) => ({
  variant_id: variantId,
  chrom: 'chr22',
  pos,
  end: null,
  ref: 'A',
  alt: variantId.split('-')[3] || (alleleLength < 0 ? '' : `A${'T'.repeat(alleleLength)}`),
  allele_type: alleleLength === 0 ? 'snv' : 'ins',
  allele_length: alleleLength,
  freq: { af: 0.1, ac: 1, an: 6 },
  populations: [],
  rsid: '',
  major_consequence: null,
  cadd_phred: null,
  phylop: null,
})

const group = (hash: number, sampleId: string, variants: any[]) => ({
  hash,
  start: 100,
  stop: 300,
  samples: [
    {
      sample_id: sampleId,
      vcf_strand: 1,
      phase_set: null,
      variant_sets: [{ readable_id: '', variants }],
    },
  ],
  variants: { readable_id: '', variants },
  below_threshold: { readable_id: '', variants: [] },
})

const diplotypeGroup = (sampleId: string, variants: any[]) => ({
  is_diplotype: true,
  hash: 1,
  start: 100,
  stop: 300,
  samples: [
    {
      sample_id: sampleId,
      strand_mapping: { strandA: 1, strandB: 2 },
      phase_set_mapping: { phaseSetA: null, phaseSetB: null },
      haplotypeA: { readable_id: '', variants },
      haplotypeB: { readable_id: '', variants: [] },
      below_thresholdA: { readable_id: '', variants: [] },
      below_thresholdB: { readable_id: '', variants: [] },
    },
  ],
  haplotypeA: { readable_id: '', variants },
  haplotypeB: { readable_id: '', variants: [] },
  below_thresholdA: { readable_id: '', variants: [] },
  below_thresholdB: { readable_id: '', variants: [] },
})

const rowIds = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('tbody tr[data-position]')).map(
    (row) => row.querySelector('a')?.textContent
  )

describe('variant-table count columns', () => {
  test('uses Groups with help, distinguishes carriers, and preserves sorting', () => {
    const common = variant('22-100-A-T', 100)
    const rare = variant('22-200-A-G', 200)
    const { container } = render(
      <HaplotypeVariantTable
        mode="haplotype"
        haplotypeGroups={{
          groups: [group(1, 'sample-1', [common, rare]), group(2, 'sample-2', [common])],
        }}
      />
    )

    const groupsHeader = screen.getByRole('columnheader', { name: /^Groups/ })
    expect(groupsHeader).not.toBeNull()
    expect(screen.queryByText('Haplotypes')).toBeNull()
    expect(screen.getByText('Carriers').closest('th')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'About Groups and Carriers' }))
    const helpText = screen.getByRole('dialog', {
      name: 'About Groups and Carriers',
    }).textContent
    expect(helpText).toMatch(/Groups counts displayed haplotype patterns containing the variant/)
    expect(helpText).toMatch(/Carriers counts unique individuals containing the variant/)
    expect(helpText).toMatch(/not an allele-copy or haplotype denominator/)
    expect(rowIds(container)).toEqual(['22-100-A-T', '22-200-A-G'])

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.click(groupsHeader)
    expect(rowIds(container)).toEqual(['22-200-A-G', '22-100-A-T'])
  })

  test('uses Clusters and sorts by active cluster count', () => {
    const common = variant('22-100-A-T', 100)
    const rare = variant('22-200-A-G', 200)
    const groups = [group(1, 'sample-1', [common, rare]), group(2, 'sample-2', [common])]
    const { container } = render(
      <HaplotypeVariantTable
        mode="haplotype"
        isClusteredView
        haplotypeGroups={{
          groups,
          clusters: [
            {
              cluster_id: '1',
              sample_count: 1,
              member_group_hashes: ['1'],
              consensus_variants: [
                { variant: common, cluster_af: 1 },
                { variant: rare, cluster_af: 1 },
              ],
            },
            {
              cluster_id: '2',
              sample_count: 1,
              member_group_hashes: ['2'],
              consensus_variants: [{ variant: common, cluster_af: 1 }],
            },
          ],
        }}
      />
    )

    expect(screen.getByText('Clusters').closest('th')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'About Clusters and Carriers' })).not.toBeNull()
    fireEvent.click(screen.getByText('Clusters'))
    expect(rowIds(container)).toEqual(['22-200-A-G', '22-100-A-T'])
  })

  test('omits the redundant count from Diploid rows and preserves display/machine identity in CSV', () => {
    const item = {
      ...variant('source-record~2', 100),
      source_variant_id: 'source-record',
      alt_index: 2,
      alt_count: 3,
      alt: 'T',
    }
    const { container } = render(
      <HaplotypeVariantTable
        mode="haplotype"
        haplotypeGroups={{ groups: [diplotypeGroup('sample-1', [item])] as any }}
      />
    )

    expect(screen.queryByText('Groups')).toBeNull()
    expect(screen.queryByText('Clusters')).toBeNull()
    expect(screen.queryByText('Haplotypes')).toBeNull()
    expect(screen.getByText('Carriers').closest('th')).not.toBeNull()

    const headers = container.querySelectorAll('thead th')
    const cells = container.querySelectorAll('tbody tr[data-position] td')
    expect(cells).toHaveLength(headers.length)
    const carrierIndex = Array.from(headers).findIndex((header) =>
      header.textContent?.includes('Carriers')
    )
    expect(cells[carrierIndex].textContent).toBe('1 / 1')

    let csv = ''
    const blobSpy = jest.spyOn(global, 'Blob').mockImplementation(((parts: BlobPart[]) => {
      csv = String(parts[0])
      return {} as Blob
    }) as typeof Blob)
    const createObjectURL = jest.fn(() => 'blob:variant-table')
    const revokeObjectURL = jest.fn()
    Object.defineProperties(URL, {
      createObjectURL: { configurable: true, value: createObjectURL },
      revokeObjectURL: { configurable: true, value: revokeObjectURL },
    })
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }))

    const [header, row] = csv.split('\n').map((line) => line.split(','))
    expect(header).toContain('carriers')
    expect(header).not.toContain('groups')
    expect(header).not.toContain('clusters')
    expect(row).toHaveLength(header.length)
    expect(row[header.indexOf('carriers')]).toBe('1/1')
    expect(row[header.indexOf('variant_id')]).toBe('source-record~2')
    expect(row[header.indexOf('display_id')]).toBe('22-100-A-T — Allele 2 of 3')
    expect(row[header.indexOf('source_variant_id')]).toBe('source-record')
    expect(row[header.indexOf('alt_index')]).toBe('2')
    expect(row[header.indexOf('alt_count')]).toBe('3')

    clickSpy.mockRestore()
    blobSpy.mockRestore()
  })
})

describe('variant-table Length documentation', () => {
  test('opens accessible semantics without sorting and leaves the header area sortable', () => {
    const long = variant('22-100-A-ATTTTTTTTTT', 100, 10)
    const short = variant('22-200-A-AT', 200, 1)
    const { container } = render(
      <HaplotypeVariantTable
        mode="haplotype"
        haplotypeGroups={{ groups: [group(1, 'sample-1', [long, short])] }}
      />
    )

    const lengthHeader = screen.getByRole('columnheader', { name: /^Length/ })
    expect(screen.queryByRole('dialog', { name: 'About Length' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'About Length' }))

    const dialog = screen.getByRole('dialog', { name: 'About Length' })
    expect(dialog.textContent).toContain(
      'For ordinary SNVs, indels, and structural variants, Length is the signed or represented allele length used by this table.'
    )
    expect(dialog.textContent).toContain(
      '-13..0 bp means observed alleles range from 13 bp shorter than the reference to the reference length.'
    )
    expect(dialog.textContent).toContain(
      'Negative means shorter, zero means reference length, and positive means longer.'
    )
    expect(dialog.textContent).toContain(
      'ALT minus REF length, not the reference locus or base span.'
    )
    expect(rowIds(container)).toEqual(['22-100-A-ATTTTTTTTTT', '22-200-A-AT'])

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.click(lengthHeader)
    expect(lengthHeader.textContent).toContain('▲')
    expect(rowIds(container)).toEqual(['22-200-A-AT', '22-100-A-ATTTTTTTTTT'])
  })

  test('renders a TR range as signed ALT-minus-REF differences rather than a span', () => {
    const summaryTr = (altIndex: number, length: number) => ({
      ...variant(`chr22-300-TRV-10~${altIndex}`, 300, length),
      source_variant_id: 'chr22-300-TRV-10',
      alt_index: altIndex,
      alt_count: 2,
      tr_locus_id: '22-299-309-A',
      allele_type: 'trv',
      length,
      ref: 'A'.repeat(14),
      alt: 'A'.repeat(14 + length),
      motifs: ['A'],
      rsids: [],
      freq: {
        all: { af: 0.1, ac: 1, an: 20 },
        populations: [],
      },
    })

    render(
      <HaplotypeVariantTable
        mode="summary"
        summaryVariants={[summaryTr(1, -13), summaryTr(2, 0)]}
      />
    )

    expect(screen.getByText('-13..0 bp')).not.toBeNull()
  })
})
