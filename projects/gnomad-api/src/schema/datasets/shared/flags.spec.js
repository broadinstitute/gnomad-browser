import { getBaseFlags, getFlagsForContext } from './flags'

describe('lcr', () => {
  it.each([[{ flags: { lcr: true } }, true], [{ flags: { lcr: false } }, false], [{}, false]])(
    'should be included only if variant.flags.lcr is true',
    (variant, expected) => {
      expect(getBaseFlags(variant).includes('lcr')).toBe(expected)
    }
  )
})

describe('segdup', () => {
  it.each([
    [{ flags: { segdup: true } }, true],
    [{ flags: { segdup: false } }, false],
    [{}, false],
  ])('should be included only if variant.flags.segdup is true', (variant, expected) => {
    expect(getBaseFlags(variant).includes('segdup')).toBe(expected)
  })
})

describe('LOFTEE', () => {
  describe('lc_lof', () => {
    describe('gene context', () => {
      const variant = {
        sortedTranscriptConsequences: [
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
        'should be included only if there are LOFTEE annotated consequences in the specified gene, none of them are annotated HC, and the highest ranked transcript is LOFTEE annotated',
        (geneId, expected) => {
          expect(getFlagsForContext({ type: 'gene', geneId })(variant).includes('lc_lof')).toBe(
            expected
          )
        }
      )

      it('should not be included for variants without consequences', () => {
        expect(getFlagsForContext({ type: 'gene', geneId: 'G1' })({}).includes('lc_lof')).toBe(
          false
        )
      })
    })

    describe('region context', () => {
      it.each([
        [
          {
            sortedTranscriptConsequences: [{ lof: 'LC' }, { lof: 'LC' }, { lof: '' }],
          },
          true,
        ],
        [
          {
            sortedTranscriptConsequences: [{ lof: 'LC' }, { lof: 'OS' }],
          },
          true,
        ],
        [
          {
            sortedTranscriptConsequences: [{ lof: 'LC' }, { lof: 'HC' }],
          },
          false,
        ],
        [
          {
            sortedTranscriptConsequences: [{ lof: '' }, { lof: '' }],
          },
          false,
        ],
        [{ sortedTranscriptConsequences: [] }, false],
        [{}, false],
        [
          {
            sortedTranscriptConsequences: [
              // This can happen for non-coding transcripts where LOFTEE
              // does not annotate a transcript that VEP marks as pLoF
              { lof: '' },
              { lof: 'LC' },
            ],
          },
          false,
        ],
      ])(
        'should be included only if there are LOFTEE annotated consequences, none of them are annotated HC, and the highest ranked transcript is LOFTEE annotated',
        (variant, expected) => {
          expect(getFlagsForContext({ type: 'region' })(variant).includes('lc_lof')).toBe(expected)
        }
      )
    })

    describe('transcript context', () => {
      const variant = {
        sortedTranscriptConsequences: [
          { transcript_id: 'T1', lof: 'LC' },
          { transcript_id: 'T2', lof: 'OS' },
          { transcript_id: 'T3', lof: 'HC' },
          { transcript_id: 'T4', lof: '' },
        ],
      }

      it.each([['T1', true], ['T2', false], ['T3', false], ['T4', false], ['T5', false]])(
        'should be included only if the consequence in the specified transcript is LOFTEE annotated LC',
        (transcriptId, expected) => {
          expect(
            getFlagsForContext({ type: 'transcript', transcriptId })(variant).includes('lc_lof')
          ).toBe(expected)
        }
      )

      it('should not be included for variants without consequences', () => {
        expect(
          getFlagsForContext({ type: 'transcript', transcriptId: 'T1' })({}).includes('lc_lof')
        ).toBe(false)
      })
    })
  })

  describe('lof_flag', () => {
    describe('gene context', () => {
      const variant = {
        sortedTranscriptConsequences: [
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
          expect(getFlagsForContext({ type: 'gene', geneId })(variant).includes('lof_flag')).toBe(
            expected
          )
        }
      )

      it('should not be included for variants without consequences', () => {
        expect(getFlagsForContext({ type: 'gene', geneId: 'G1' })({}).includes('lof_flag')).toBe(
          false
        )
      })
    })

    describe('region context', () => {
      it.each([
        [
          {
            sortedTranscriptConsequences: [
              { lof: 'LC', lof_flags: 'SOME_FLAG' },
              { lof: 'LC', lof_flags: 'SOME_FLAG' },
              { lof: '', lof_flags: '' },
            ],
          },
          true,
        ],
        [
          {
            sortedTranscriptConsequences: [
              { lof: 'HC', lof_flags: '' },
              { lof: 'HC', lof_flags: 'SOME_FLAG' },
            ],
          },
          false,
        ],
        [
          {
            sortedTranscriptConsequences: [
              { lof: 'HC', lof_flags: '' },
              { lof: 'LC', lof_flags: '' },
            ],
          },
          false,
        ],
        [
          {
            sortedTranscriptConsequences: [{ lof: '', lof_flags: '' }, { lof: '', lof_flags: '' }],
          },
          false,
        ],
        [{ sortedTranscriptConsequences: [] }, false],
        [{}, false],
      ])(
        'should be included only if there are LOFTEE annotated consequences and all of them are LOFTEE flagged',
        (variant, expected) => {
          expect(getFlagsForContext({ type: 'region' })(variant).includes('lof_flag')).toBe(
            expected
          )
        }
      )
    })

    describe('transcript context', () => {
      const variant = {
        sortedTranscriptConsequences: [
          { transcript_id: 'T1', lof: 'HC', lof_flags: 'SOME_FLAG' },
          { transcript_id: 'T2', lof: 'LC', lof_flags: 'SOME_FLAG' },
          { transcript_id: 'T3', lof: '', lof_flags: '' },
        ],
      }

      it.each([['T1', true], ['T2', true], ['T3', false], ['T4', false]])(
        'should be included only if the consequence in the specified transcript is LOFTEE annotated and LOFTEE flagged',
        (transcriptId, expected) => {
          expect(
            getFlagsForContext({ type: 'transcript', transcriptId })(variant).includes('lof_flag')
          ).toBe(expected)
        }
      )

      it('should not be included for variants without consequences', () => {
        expect(
          getFlagsForContext({ type: 'transcript', transcriptId: 'T1' })({}).includes('lof_flag')
        ).toBe(false)
      })
    })
  })

  describe('nc_transcript', () => {
    describe('gene context', () => {
      const variant = {
        sortedTranscriptConsequences: [
          { gene_id: 'G1', lof: '', consequence: 'frameshift_variant', category: 'lof' },
          { gene_id: 'G2', lof: 'HC', consequence: 'frameshift_variant', category: 'lof' },
          // This can happen when a coding consequence is sorted above a non-coding consequence
          { gene_id: 'G3', lof: '', consequence: 'missense_variant', category: 'missense' },
          { gene_id: 'G3', lof: '', consequence: 'frameshift_variant', category: 'lof' },
          { gene_id: 'G4', lof: '', consequence: 'missense_variant', category: 'missense' },
        ],
      }

      it.each([['G1', true], ['G2', false], ['G3', false], ['G4', false], ['G5', false]])(
        'it should be included only if the most severe consequence in the specified gene is pLoF according to VEP but not LOFTEE annotated',
        (geneId, expected) => {
          expect(
            getFlagsForContext({ type: 'gene', geneId })(variant).includes('nc_transcript')
          ).toBe(expected)
        }
      )

      it('should not be included for variants without consequences', () => {
        expect(
          getFlagsForContext({ type: 'gene', geneId: 'G1' })({}).includes('nc_transcript')
        ).toBe(false)
      })
    })

    describe('region context', () => {
      it.each([
        [
          {
            sortedTranscriptConsequences: [
              { lof: '', consequence: 'frameshift_variant', category: 'lof' },
              { lof: 'HC', consequence: 'frameshift_variant', category: 'lof' },
            ],
          },
          true,
        ],
        [
          {
            sortedTranscriptConsequences: [
              { lof: 'HC', consequence: 'frameshift_variant', category: 'lof' },
              { lof: '', consequence: 'missense_variant', category: 'missense' },
            ],
          },
          false,
        ],
        [
          {
            sortedTranscriptConsequences: [
              { lof: '', consequence: 'synonymous_variant', category: 'synonymous' },
            ],
          },
          false,
        ],
        [{ sortedTranscriptConsequences: [] }, false],
        [{}, false],
      ])(
        'it should be included only if the most severe consequence is pLoF according to VEP but not LOFTEE annotated',
        (variant, expected) => {
          expect(getFlagsForContext({ type: 'region' })(variant).includes('nc_transcript')).toBe(
            expected
          )
        }
      )
    })

    describe('transcript context', () => {
      const variant = {
        sortedTranscriptConsequences: [
          { transcript_id: 'T1', lof: '', consequence: 'frameshift_variant', category: 'lof' },
          { transcript_id: 'T2', lof: 'HC', consequence: 'frameshift_variant', category: 'lof' },
          { transcript_id: 'T3', lof: '', consequence: 'missense_variant', category: 'missense' },
        ],
      }

      it.each([['T1', true], ['T2', false], ['T3', false], ['T4', false]])(
        'it should be included only if the consequence in the specified transcript is pLoF according to VEP but not LOFTEE annotated',
        (transcriptId, expected) => {
          expect(
            getFlagsForContext({ type: 'transcript', transcriptId })(variant).includes(
              'nc_transcript'
            )
          ).toBe(expected)
        }
      )

      it('should not be included for variants without consequences', () => {
        expect(
          getFlagsForContext({ type: 'transcript', transcriptId: 'T1' })({}).includes(
            'nc_transcript'
          )
        ).toBe(false)
      })
    })
  })

  describe('os_lof', () => {
    describe('gene context', () => {
      const variant = {
        sortedTranscriptConsequences: [
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
          expect(getFlagsForContext({ type: 'gene', geneId })(variant).includes('os_lof')).toBe(
            expected
          )
        }
      )

      it('should not be included for variants without consequences', () => {
        expect(getFlagsForContext({ type: 'gene', geneId: 'G1' })({}).includes('os_lof')).toBe(
          false
        )
      })
    })

    describe('region context', () => {
      it.each([
        [
          {
            sortedTranscriptConsequences: [{ lof: 'OS' }, { lof: 'HC' }],
          },
          true,
        ],
        [
          {
            sortedTranscriptConsequences: [{ lof: 'HC' }, { lof: 'OS' }],
          },
          false,
        ],
        [
          {
            sortedTranscriptConsequences: [{ lof: '' }],
          },
          false,
        ],
        [{ sortedTranscriptConsequences: [] }, false],
        [{}, false],
      ])(
        'it should be included only if the most severe consequence is LOFTEE annotated OS',
        (variant, expected) => {
          expect(getFlagsForContext({ type: 'region' })(variant).includes('os_lof')).toBe(expected)
        }
      )
    })

    describe('transcript context', () => {
      const variant = {
        sortedTranscriptConsequences: [
          { transcript_id: 'T1', lof: 'OS' },
          { transcript_id: 'T2', lof: 'HC' },
          { transcript_id: 'T3', lof: 'LC' },
          { transcript_id: 'T4', lof: '' },
        ],
      }

      it.each([['T1', true], ['T2', false], ['T3', false], ['T4', false], ['T5', false]])(
        'it should be included only if the consequence in the specified transcript is LOFTEE annotated OS',
        (transcriptId, expected) => {
          expect(
            getFlagsForContext({ type: 'transcript', transcriptId })(variant).includes('os_lof')
          ).toBe(expected)
        }
      )

      it('should not be included for variants without consequences', () => {
        expect(
          getFlagsForContext({ type: 'transcript', transcriptId: 'T1' })({}).includes('os_lof')
        ).toBe(false)
      })
    })
  })
})
