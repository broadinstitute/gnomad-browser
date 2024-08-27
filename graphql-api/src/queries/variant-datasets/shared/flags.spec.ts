import { describe, it, expect } from '@jest/globals'

const { getLofteeFlagsForContext } = require('./flags')

describe('LOFTEE', () => {
  describe('lc_lof', () => {
    describe('gene context', () => {
      const variant = {
        transcript_consequences: [
          { gene_id: 'G1', lof: 'LC' },
          { gene_id: 'G1', lof: 'LC' },
          { gene_id: 'G2', lof: 'LC' },
          { gene_id: 'G2', lof: '' },
          { gene_id: 'G3', lof: 'LC' },
          { gene_id: 'G3', lof: 'OS' },
          { gene_id: 'G4', lof: 'LC' },
          { gene_id: 'G4', lof: 'HC' },
          { gene_id: 'G5', lof: 'HC' },
          { gene_id: 'G6', lof: '' },
          // This can happen for non-coding transcripts where LOFTEE
          // does not annotate a transcript that VEP marks as pLoF
          { gene_id: 'G7', lof: '' },
          { gene_id: 'G7', lof: 'LC' },
          // This should not flag OS as lc_lof because it's rare enough that there
          //   is effectively no confidence
          { gene_id: 'G8', lof: 'OS' },
          { gene_id: 'G8', lof: 'OS' },
          { gene_id: 'G8', lof: '' },
        ],
      }

      it.each([
        ['G1', true],
        ['G2', true],
        ['G3', true],
        ['G4', false],
        ['G5', false],
        ['G6', false],
        ['G7', false],
        ['G8', false],
      ])(
        'should be included only if there are LOFTEE annotated consequences in the specified gene, none of them are annotated HC, the highest ranked transcript is LOFTEE annotated, and the highest ranked transcript is not OS',
        (geneId, expected) => {
          expect(
            getLofteeFlagsForContext({ type: 'gene', geneId })(variant).includes('lc_lof')
          ).toBe(expected)
        }
      )

      it('should not be included for variants without consequences', () => {
        expect(
          getLofteeFlagsForContext({ type: 'gene', geneId: 'G1' })({}).includes('lc_lof')
        ).toBe(false)
      })
    })

    describe('region context', () => {
      it.each([
        [
          {
            transcript_consequences: [{ lof: 'LC' }, { lof: 'LC' }, { lof: '' }],
          },
          true,
        ],
        [
          {
            transcript_consequences: [{ lof: 'LC' }, { lof: 'OS' }],
          },
          true,
        ],
        [
          {
            transcript_consequences: [{ lof: 'LC' }, { lof: 'HC' }],
          },
          false,
        ],
        [
          {
            transcript_consequences: [{ lof: '' }, { lof: '' }],
          },
          false,
        ],
        [{ transcript_consequences: [] }, false],
        [{}, false],
        [
          {
            transcript_consequences: [
              // This can happen for non-coding transcripts where LOFTEE
              // does not annotate a transcript that VEP marks as pLoF
              { lof: '' },
              { lof: 'LC' },
            ],
          },
          false,
        ],
        [
          {
            transcript_consequences: [
              // This should not flag OS as lc_lof because it's rare enough that there
              //   is effectively no confidence
              { lof: 'OS' },
              { lof: 'OS' },
              { lof: '' },
            ],
          },
          false,
        ],
      ])(
        'should be included only if there are LOFTEE annotated consequences, none of them are annotated HC, the highest ranked transcript is LOFTEE annotated, and the highest ranked transcript is not OS',
        (variant, expected) => {
          expect(getLofteeFlagsForContext({ type: 'region' })(variant).includes('lc_lof')).toBe(
            expected
          )
        }
      )
    })

    describe('transcript context', () => {
      const variant = {
        transcript_consequences: [
          { transcript_id: 'T1', lof: 'LC' },
          { transcript_id: 'T2', lof: 'OS' },
          { transcript_id: 'T3', lof: 'HC' },
          { transcript_id: 'T4', lof: '' },
        ],
      }

      it.each([
        ['T1', true],
        ['T2', false],
        ['T3', false],
        ['T4', false],
        ['T5', false],
      ])(
        'should be included only if the consequence in the specified transcript is LOFTEE annotated LC',
        (transcriptId, expected) => {
          expect(
            getLofteeFlagsForContext({ type: 'transcript', transcriptId })(variant).includes(
              'lc_lof'
            )
          ).toBe(expected)
        }
      )

      it('should not be included for variants without consequences', () => {
        expect(
          getLofteeFlagsForContext({ type: 'transcript', transcriptId: 'T1' })({}).includes(
            'lc_lof'
          )
        ).toBe(false)
      })
    })
  })

  describe('lof_flag', () => {
    describe('gene context', () => {
      const variant = {
        transcript_consequences: [
          { gene_id: 'G1', lof: 'HC', lof_flags: 'SOME_FLAG' },
          { gene_id: 'G1', lof: 'HC', lof_flags: 'SOME_FLAG' },
          { gene_id: 'G2', lof: 'LC', lof_flags: 'SOME_FLAG' },
          { gene_id: 'G2', lof: 'OS', lof_flags: 'SOME_FLAG' },
          { gene_id: 'G3', lof: 'LC', lof_flags: 'SOME_FLAG' },
          { gene_id: 'G3', lof: '', lof_flags: '' },
          { gene_id: 'G4', lof: 'HC', lof_flags: 'SOME_FLAG' },
          { gene_id: 'G4', lof: 'HC', lof_flags: '' },
          { gene_id: 'G5', lof: 'HC', lof_flags: '' },
          { gene_id: 'G6', lof: '', lof_flags: '' },
        ],
      }

      it.each([
        ['G1', true],
        ['G2', true],
        ['G3', true],
        ['G4', false],
        ['G5', false],
        ['G6', false],
        ['G7', false],
      ])(
        'should be included only if there are LOFTEE annotated consequences in the specified gene and all of them are LOFTEE flagged',
        (geneId, expected) => {
          expect(
            getLofteeFlagsForContext({ type: 'gene', geneId })(variant).includes('lof_flag')
          ).toBe(expected)
        }
      )

      it('should not be included for variants without consequences', () => {
        expect(
          getLofteeFlagsForContext({ type: 'gene', geneId: 'G1' })({}).includes('lof_flag')
        ).toBe(false)
      })
    })

    describe('region context', () => {
      it.each([
        [
          {
            transcript_consequences: [
              { lof: 'LC', lof_flags: 'SOME_FLAG' },
              { lof: 'LC', lof_flags: 'SOME_FLAG' },
              { lof: '', lof_flags: '' },
            ],
          },
          true,
        ],
        [
          {
            transcript_consequences: [
              { lof: 'HC', lof_flags: '' },
              { lof: 'HC', lof_flags: 'SOME_FLAG' },
            ],
          },
          false,
        ],
        [
          {
            transcript_consequences: [
              { lof: 'HC', lof_flags: '' },
              { lof: 'LC', lof_flags: '' },
            ],
          },
          false,
        ],
        [
          {
            transcript_consequences: [
              { lof: '', lof_flags: '' },
              { lof: '', lof_flags: '' },
            ],
          },
          false,
        ],
        [{ transcript_consequences: [] }, false],
        [{}, false],
      ])(
        'should be included only if there are LOFTEE annotated consequences and all of them are LOFTEE flagged',
        (variant, expected) => {
          expect(getLofteeFlagsForContext({ type: 'region' })(variant).includes('lof_flag')).toBe(
            expected
          )
        }
      )
    })

    describe('transcript context', () => {
      const variant = {
        transcript_consequences: [
          { transcript_id: 'T1', lof: 'HC', lof_flags: 'SOME_FLAG' },
          { transcript_id: 'T2', lof: 'LC', lof_flags: 'SOME_FLAG' },
          { transcript_id: 'T3', lof: '', lof_flags: '' },
        ],
      }

      it.each([
        ['T1', true],
        ['T2', true],
        ['T3', false],
        ['T4', false],
      ])(
        'should be included only if the consequence in the specified transcript is LOFTEE annotated and LOFTEE flagged',
        (transcriptId, expected) => {
          expect(
            getLofteeFlagsForContext({ type: 'transcript', transcriptId })(variant).includes(
              'lof_flag'
            )
          ).toBe(expected)
        }
      )

      it('should not be included for variants without consequences', () => {
        expect(
          getLofteeFlagsForContext({ type: 'transcript', transcriptId: 'T1' })({}).includes(
            'lof_flag'
          )
        ).toBe(false)
      })
    })
  })

  describe('nc_transcript', () => {
    describe('gene context', () => {
      const variant = {
        transcript_consequences: [
          { gene_id: 'G1', lof: '', major_consequence: 'frameshift_variant' },
          { gene_id: 'G2', lof: 'HC', major_consequence: 'frameshift_variant' },
          // This can happen when a coding consequence is sorted above a non-coding consequence
          { gene_id: 'G3', lof: '', major_consequence: 'missense_variant' },
          { gene_id: 'G3', lof: '', major_consequence: 'frameshift_variant' },
          { gene_id: 'G4', lof: '', major_consequence: 'missense_variant' },
        ],
      }

      it.each([
        ['G1', true],
        ['G2', false],
        ['G3', false],
        ['G4', false],
        ['G5', false],
      ])(
        'it should be included only if the most severe consequence in the specified gene is pLoF according to VEP but not LOFTEE annotated',
        (geneId, expected) => {
          expect(
            getLofteeFlagsForContext({ type: 'gene', geneId })(variant).includes('nc_transcript')
          ).toBe(expected)
        }
      )

      it('should not be included for variants without consequences', () => {
        expect(
          getLofteeFlagsForContext({ type: 'gene', geneId: 'G1' })({}).includes('nc_transcript')
        ).toBe(false)
      })
    })

    describe('region context', () => {
      it.each([
        [
          {
            transcript_consequences: [
              { lof: '', major_consequence: 'frameshift_variant', category: 'lof' },
              { lof: 'HC', major_consequence: 'frameshift_variant', category: 'lof' },
            ],
          },
          true,
        ],
        [
          {
            transcript_consequences: [
              { lof: 'HC', major_consequence: 'frameshift_variant', category: 'lof' },
              { lof: '', major_consequence: 'missense_variant', category: 'missense' },
            ],
          },
          false,
        ],
        [
          {
            transcript_consequences: [
              { lof: '', major_consequence: 'synonymous_variant', category: 'synonymous' },
            ],
          },
          false,
        ],
        [{ transcript_consequences: [] }, false],
        [{}, false],
      ])(
        'it should be included only if the most severe consequence is pLoF according to VEP but not LOFTEE annotated',
        (variant, expected) => {
          expect(
            getLofteeFlagsForContext({ type: 'region' })(variant).includes('nc_transcript')
          ).toBe(expected)
        }
      )
    })

    describe('transcript context', () => {
      const variant = {
        transcript_consequences: [
          {
            transcript_id: 'T1',
            lof: '',
            major_consequence: 'frameshift_variant',
            category: 'lof',
          },
          {
            transcript_id: 'T2',
            lof: 'HC',
            major_consequence: 'frameshift_variant',
            category: 'lof',
          },
          {
            transcript_id: 'T3',
            lof: '',
            major_consequence: 'missense_variant',
            category: 'missense',
          },
        ],
      }

      it.each([
        ['T1', true],
        ['T2', false],
        ['T3', false],
        ['T4', false],
      ])(
        'it should be included only if the consequence in the specified transcript is pLoF according to VEP but not LOFTEE annotated',
        (transcriptId, expected) => {
          expect(
            getLofteeFlagsForContext({ type: 'transcript', transcriptId })(variant).includes(
              'nc_transcript'
            )
          ).toBe(expected)
        }
      )

      it('should not be included for variants without consequences', () => {
        expect(
          getLofteeFlagsForContext({ type: 'transcript', transcriptId: 'T1' })({}).includes(
            'nc_transcript'
          )
        ).toBe(false)
      })
    })
  })

  describe('os_lof', () => {
    describe('gene context', () => {
      const variant = {
        transcript_consequences: [
          { gene_id: 'G1', lof: 'OS' },
          { gene_id: 'G1', lof: 'LC' },
          { gene_id: 'G2', lof: 'LC' },
          { gene_id: 'G2', lof: 'OS' },
          { gene_id: 'G3', lof: '' },
          { gene_id: 'G3', lof: 'OS' },
          { gene_id: 'G4', lof: 'HC' },
          { gene_id: 'G5', lof: '' },
        ],
      }

      it.each([
        ['G1', true],
        ['G2', false],
        ['G3', false],
        ['G4', false],
        ['G5', false],
        ['G6', false],
      ])(
        'it should be included only if the most severe consequence in the specified gene is LOFTEE annotated OS',
        (geneId, expected) => {
          expect(
            getLofteeFlagsForContext({ type: 'gene', geneId })(variant).includes('os_lof')
          ).toBe(expected)
        }
      )

      it('should not be included for variants without consequences', () => {
        expect(
          getLofteeFlagsForContext({ type: 'gene', geneId: 'G1' })({}).includes('os_lof')
        ).toBe(false)
      })
    })

    describe('region context', () => {
      it.each([
        [
          {
            transcript_consequences: [{ lof: 'OS' }, { lof: 'HC' }],
          },
          true,
        ],
        [
          {
            transcript_consequences: [{ lof: 'HC' }, { lof: 'OS' }],
          },
          false,
        ],
        [
          {
            transcript_consequences: [{ lof: '' }],
          },
          false,
        ],
        [{ transcript_consequences: [] }, false],
        [{}, false],
      ])(
        'it should be included only if the most severe consequence is LOFTEE annotated OS',
        (variant, expected) => {
          expect(getLofteeFlagsForContext({ type: 'region' })(variant).includes('os_lof')).toBe(
            expected
          )
        }
      )
    })

    describe('transcript context', () => {
      const variant = {
        transcript_consequences: [
          { transcript_id: 'T1', lof: 'OS' },
          { transcript_id: 'T2', lof: 'HC' },
          { transcript_id: 'T3', lof: 'LC' },
          { transcript_id: 'T4', lof: '' },
        ],
      }

      it.each([
        ['T1', true],
        ['T2', false],
        ['T3', false],
        ['T4', false],
        ['T5', false],
      ])(
        'it should be included only if the consequence in the specified transcript is LOFTEE annotated OS',
        (transcriptId, expected) => {
          expect(
            getLofteeFlagsForContext({ type: 'transcript', transcriptId })(variant).includes(
              'os_lof'
            )
          ).toBe(expected)
        }
      )

      it('should not be included for variants without consequences', () => {
        expect(
          getLofteeFlagsForContext({ type: 'transcript', transcriptId: 'T1' })({}).includes(
            'os_lof'
          )
        ).toBe(false)
      })
    })
  })
})
