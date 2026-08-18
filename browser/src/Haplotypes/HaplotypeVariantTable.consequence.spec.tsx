import React from 'react'
import { render, screen } from '@testing-library/react'

import HaplotypeVariantTable from './HaplotypeVariantTable'
import { rehydrateVariants, type SoAVariants } from './haplotypeCompute'

jest.mock('../Link', () => ({ children, to }: any) => <a href={to}>{children}</a>)

describe('haplotype compact-payload consequences', () => {
  test('renders annotated SNV, indel, and SV consequences but not one for an unannotated TR', () => {
    const payload: SoAVariants = {
      variant_id: [
        'chr22-100-A-G~1',
        'chr22-200-DEL-1~2',
        'chr22-300-DUP-100~3',
        'chr22-400-TRV-2~4',
      ],
      chrom: ['chr22', 'chr22', 'chr22', 'chr22'],
      pos: [100, 200, 300, 400],
      end: [null, 201, 400, 402],
      ref: ['A', 'AT', 'N', 'A'],
      alt: ['G', 'A', '<DUP>', 'AAA'],
      allele_type: ['snv', 'del', 'dup', 'trv'],
      allele_length: [0, -1, 100, 2],
      freq_af: [0.1, 0.1, 0.1, 0.1],
      freq_ac: [1, 1, 1, 1],
      freq_an: [10, 10, 10, 10],
      rsid: ['', '', '', ''],
      major_consequence: ['missense_variant', 'frameshift_variant', 'transcript_ablation', null],
      cadd_phred: [null, null, null, null],
      phylop: [null, null, null, null],
      sv_consequences: [null, null, null, null],
      dbsnp_id: [null, null, null, null],
      tr_id: [null, null, null, 'TRV-2'],
      tr_motifs: [null, null, null, 'A'],
      gnomad_str: [null, null, null, null],
      allele_methylation: [null, null, null, null],
      motif_counts: [null, null, null, null],
      allele_purity: [null, null, null, null],
      short_read_match_id: [null, null, null, null],
      populations: [[], [], [], []],
    }
    const variants = rehydrateVariants(payload)

    render(
      <HaplotypeVariantTable
        mode="haplotype"
        haplotypeGroups={
          {
            groups: [
              {
                hash: 1,
                start: 100,
                stop: 402,
                samples: [
                  {
                    sample_id: 'sample-1',
                    vcf_strand: 1,
                    phase_set: null,
                    variant_sets: [{ readable_id: '', variants }],
                  },
                ],
                variants: { readable_id: '', variants },
                below_threshold: { readable_id: '', variants: [] },
              },
            ],
          } as any
        }
      />
    )

    expect(screen.getByText('missense')).not.toBeNull()
    expect(screen.getByText('frameshift')).not.toBeNull()
    expect(screen.getByText('transcript ablation')).not.toBeNull()

    const consequenceColumn = screen
      .getAllByRole('columnheader')
      .findIndex((header) => header.textContent === 'Consequence')
    const trRow = screen.getByText('22-400-TRV-2').closest('tr')!
    expect(consequenceColumn).toBeGreaterThan(-1)
    expect(trRow.querySelectorAll('td')[consequenceColumn].textContent).toBe('—')
  })
})
