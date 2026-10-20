import { describe, expect, jest, test } from '@jest/globals'

jest.mock('../elasticsearch', () => ({ catchNotFound: (error: unknown) => error }))

// The Elasticsearch mock must be installed before this query module initializes.
// eslint-disable-next-line import/first
import {
  fetchShortTandemRepeatsByGene,
  summarizeManualReviewGenotypeQuality,
  withManualReviewGenotypeQualitySummary,
} from './short-tandem-repeat-queries'

const genotypeCountsFromLowToHigh = (
  low: number,
  mediumLow: number,
  medium: number,
  mediumHigh: number,
  high: number
) => [
  { quality_description: 'low', genotype_count: low },
  { quality_description: 'medium-low', genotype_count: mediumLow },
  { quality_description: 'medium', genotype_count: medium },
  { quality_description: 'medium-high', genotype_count: mediumHigh },
  { quality_description: 'high', genotype_count: high },
]

describe('summarizeManualReviewGenotypeQuality', () => {
  test('weights each quality by its genotype count and skips unreviewed genotypes', () => {
    expect(
      summarizeManualReviewGenotypeQuality([
        // 3 low genotypes (score 1)
        { quality_description: 'low', distribution: [{ frequency: 2 }, { frequency: 1 }] },
        // 1 medium-low genotype (score 2), spelled the way older indexes spell it
        { quality_description: 'medium-Low', distribution: [{ frequency: 1 }] },
        // 4 high genotypes (score 5)
        { quality_description: 'high', distribution: [{ frequency: 4 }] },
        { quality_description: 'not-reviewed', distribution: [{ frequency: 1000 }] },
      ])
    ).toEqual({
      // (3 * 1 + 1 * 2 + 4 * 5) / 8
      average_quality_of_manually_reviewed_genotypes: 3.125,
      manually_reviewed_genotype_counts_by_quality: genotypeCountsFromLowToHigh(3, 1, 0, 0, 4),
    })
  })

  test('returns no average when no genotypes were reviewed', () => {
    expect(
      summarizeManualReviewGenotypeQuality([
        { quality_description: 'not-reviewed', distribution: [{ frequency: 25 }] },
      ])
    ).toEqual({
      average_quality_of_manually_reviewed_genotypes: null,
      manually_reviewed_genotype_counts_by_quality: genotypeCountsFromLowToHigh(0, 0, 0, 0, 0),
    })
  })

  test('throws on an unexpected quality', () => {
    expect(() =>
      summarizeManualReviewGenotypeQuality([
        { quality_description: 'excellent', distribution: [{ frequency: 1 }] },
      ])
    ).toThrow('Unexpected genotype quality "excellent"')
  })
})

describe('withManualReviewGenotypeQualitySummary', () => {
  test('replaces the partial genotype distribution with its summary', () => {
    expect(
      withManualReviewGenotypeQualitySummary({
        id: 'ATN1',
        reference_repeat_unit: 'CAG',
        genotype_distribution: [{ quality_description: 'high', distribution: [{ frequency: 2 }] }],
      })
    ).toEqual({
      id: 'ATN1',
      reference_repeat_unit: 'CAG',
      average_quality_of_manually_reviewed_genotypes: 5,
      manually_reviewed_genotype_counts_by_quality: genotypeCountsFromLowToHigh(0, 0, 0, 0, 2),
    })
  })
})

describe('fetchShortTandemRepeatsByGene', () => {
  test('reads only the genotype counts the summary needs and returns the summary', async () => {
    const search = jest.fn(async (_request: any) => ({
      body: {
        hits: {
          hits: [
            {
              _source: {
                value: {
                  id: 'ATN1',
                  genotype_distribution: [
                    { quality_description: 'medium', distribution: [{ frequency: 3 }] },
                  ],
                },
              },
            },
          ],
        },
      },
    }))

    await expect(
      fetchShortTandemRepeatsByGene({ search }, 'gnomad_r4', 'ENSG00000111676')
    ).resolves.toEqual([
      {
        id: 'ATN1',
        average_quality_of_manually_reviewed_genotypes: 3,
        manually_reviewed_genotype_counts_by_quality: genotypeCountsFromLowToHigh(0, 0, 3, 0, 0),
      },
    ])
    const requestedSourceFields = (search.mock.calls[0][0] as any)._source
    expect(requestedSourceFields).toEqual(
      expect.arrayContaining([
        'value.genotype_distribution.quality_description',
        'value.genotype_distribution.distribution.frequency',
      ])
    )
    expect(requestedSourceFields).not.toContain('value.genotype_distribution')
  })
})
