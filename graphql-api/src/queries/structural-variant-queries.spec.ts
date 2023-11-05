import { describe, expect, test } from '@jest/globals'

import {
  fetchStructuralVariantById,
  fetchStructuralVariantsByGene,
  fetchStructuralVariantsByRegion,
} from './structural-variant-queries'

const datasetIds = [
  'gnomad_sv_r2_1',
  'gnomad_sv_r2_1_controls',
  'gnomad_sv_r2_1_non_neuro',
  'gnomad_sv_r4',
] as const
type SvDatasetId = (typeof datasetIds)[number]

const subsets: Record<SvDatasetId, string> = {
  gnomad_sv_r2_1: 'all',
  gnomad_sv_r2_1_controls: 'controls',
  gnomad_sv_r2_1_non_neuro: 'non_neuro',
  gnomad_sv_r4: 'all',
}

const responseWithHits = (hits: any[]) => {
  const formattedHits = hits.map((hit) => ({ _source: { value: hit } }))
  return {
    body: {
      hits: {
        hits: formattedHits,
        total: {
          value: hits.length,
        },
      },
    },
  }
}

const minimalResponse = responseWithHits([])

const minimalHit = (freq: any) => ({
  freq,
  age_distribution: {},
  genotype_quality: {
    alt: {},
    all: {},
  },
  consequences: [],
})

const makeMockClient = (response: any) => {
  const mockSearch = jest.fn()
  mockSearch.mockReturnValue(response)
  return { search: mockSearch, clearScroll: () => {}, scroll: () => minimalResponse }
}

const expectedIndex = (datasetId: SvDatasetId) =>
  datasetId === 'gnomad_sv_r4' ? 'gnomad_structural_variants_v3' : 'gnomad_structural_variants_v2'

describe('fetchStructuralVariantById', () => {
  const variantId = 'dummy-variant'

  describe.each(datasetIds)('with datasetId %s', (datasetId) => {
    test('constructs the correct ES query', async () => {
      const expectedVariantIdParams =
        datasetId === 'gnomad_sv_r4'
          ? { variant_id_upper_case: 'DUMMY-VARIANT' }
          : { variant_id: 'dummy-variant' }

      const mockClient = makeMockClient(minimalResponse)
      await fetchStructuralVariantById(mockClient, datasetId, variantId)

      expect(mockClient.search).toHaveBeenCalledWith({
        index: expectedIndex(datasetId),
        type: '_doc',
        body: {
          query: {
            bool: {
              filter: { term: expectedVariantIdParams },
            },
          },
        },
        size: 1,
      })
    })

    test('returns null if no hits', async () => {
      const mockClient = makeMockClient(minimalResponse)
      expect(await fetchStructuralVariantById(mockClient, datasetId, variantId)).toBeNull()
    })

    test('returns null if no frequencies in the subset for the variant', async () => {
      const response = responseWithHits([
        {
          freq: {
            [subsets[datasetId]]: {},
            [`${subsets[datasetId]}_but_wrong`]: {
              ac: 10000,
            },
          },
        },
      ])
      const mockClient = makeMockClient(response)
      expect(await fetchStructuralVariantById(mockClient, datasetId, variantId)).toBeNull()
    })

    test('age_distribution translates empty hom to null if het set', async () => {
      const hit = {
        ...minimalHit({
          [subsets[datasetId]]: {
            ac: 100,
          },
        }),
        age_distribution: {
          het: 'dummy het value',
          hom: {},
        },
      }
      const response = responseWithHits([hit])
      const mockClient = makeMockClient(response)
      const processedResponse = await fetchStructuralVariantById(mockClient, datasetId, variantId)
      expect(processedResponse.age_distribution.het).toEqual('dummy het value')
      expect(processedResponse.age_distribution.hom).toBeNull()
    })

    test('age_distribution translates empty het to null if hom set', async () => {
      const hit = {
        ...minimalHit({
          [subsets[datasetId]]: {
            ac: 100,
          },
        }),
        age_distribution: {
          het: {},
          hom: 'dummy hom value',
        },
      }
      const response = responseWithHits([hit])
      const mockClient = makeMockClient(response)
      const processedResponse = await fetchStructuralVariantById(mockClient, datasetId, variantId)
      expect(processedResponse.age_distribution.het).toBeNull()
      expect(processedResponse.age_distribution.hom).toEqual('dummy hom value')
    })

    test('age_distribution is null if neither het nor hom set', async () => {
      const hit = minimalHit({
        [subsets[datasetId]]: {
          ac: 100,
        },
      })
      const response = responseWithHits([hit])
      const mockClient = makeMockClient(response)
      const processedResponse = await fetchStructuralVariantById(mockClient, datasetId, variantId)
      expect(processedResponse.age_distribution).toBeNull()
    })

    test('genotype_quality translates empty alt to null if all set', async () => {
      const hit = {
        ...minimalHit({
          [subsets[datasetId]]: {
            ac: 100,
          },
        }),

        genotype_quality: {
          alt: {},
          all: 'dummy-all',
        },
      }

      const response = responseWithHits([hit])
      const mockClient = makeMockClient(response)
      const processedResponse = await fetchStructuralVariantById(mockClient, datasetId, variantId)
      expect(processedResponse.genotype_quality.alt).toBeNull()
      expect(processedResponse.genotype_quality.all).toEqual('dummy-all')
    })

    test('genotype_quality translates empty all to null if alt set', async () => {
      const hit = {
        ...minimalHit({
          [subsets[datasetId]]: {
            ac: 100,
          },
        }),
        genotype_quality: {
          alt: 'dummy-alt',
          all: {},
        },
      }

      const response = responseWithHits([hit])
      const mockClient = makeMockClient(response)
      const processedResponse = await fetchStructuralVariantById(mockClient, datasetId, variantId)
      expect(processedResponse.genotype_quality.alt).toEqual('dummy-alt')
      expect(processedResponse.genotype_quality.all).toBeNull()
    })

    test('genotype_quality is null if neither alt nor all set', async () => {
      const response = responseWithHits([
        minimalHit({
          [subsets[datasetId]]: {
            ac: 100,
          },
        }),
      ])
      const mockClient = makeMockClient(response)
      const processedResponse = await fetchStructuralVariantById(mockClient, datasetId, variantId)
      expect(processedResponse.genotype_quality).toBeNull()
    })
  })
})

describe('fetchStructuralVariantsByGene', () => {
  const gene = { symbol: 'dummy-gene' }

  describe.each(datasetIds)('with dataset %s', (datasetId) => {
    test('constructs the correct ES query', async () => {
      const mockClient = makeMockClient(responseWithHits([]))
      const subset = subsets[datasetId]
      await fetchStructuralVariantsByGene(mockClient, datasetId, gene)

      expect(mockClient.search).toHaveBeenCalledWith({
        index: expectedIndex(datasetId),
        type: '_doc',
        size: 10000,
        scroll: '30s',
        _source: [
          'value.chrom',
          'value.chrom2',
          'value.consequences',
          'value.end',
          'value.end2',
          'value.filters',
          `value.freq.${subset}`,
          'value.intergenic',
          'value.length',
          'value.pos',
          'value.pos2',
          'value.reference_genome',
          'value.type',
          'value.variant_id',
        ],
        body: {
          query: {
            bool: {
              filter: {
                term: { genes: 'dummy-gene' },
              },
            },
          },
          sort: [{ xpos: { order: 'asc' } }],
        },
      })
    })

    test('rejects variants with AC of 0', async () => {
      const hitWithNonzeroAc = minimalHit({
        [subsets[datasetId]]: {
          ac: 100,
        },
      })
      const hitWithZeroAc = {
        ...hitWithNonzeroAc,
        freq: {
          [subsets[datasetId]]: {
            ac: 0,
          },
        },
      }

      const response = responseWithHits([hitWithNonzeroAc, hitWithZeroAc])
      const mockClient = makeMockClient(response)
      const processedResponse = await fetchStructuralVariantsByGene(mockClient, datasetId, gene)
      expect(processedResponse.length).toEqual(1)
      expect(processedResponse[0].ac).toEqual(100)
    })

    test('uses first consequence in gene as major consequence, when present', async () => {
      const hit = {
        ...minimalHit({
          [subsets[datasetId]]: {
            ac: 100,
          },
        }),
        consequences: [
          { consequence: 'csq-a', genes: [`${gene.symbol}NOTME`] },
          { consequence: 'csq-b', genes: [gene.symbol] },
          { consequence: 'csq-c', genes: [gene.symbol] },
        ],
      }

      const response = responseWithHits([hit])
      const mockClient = makeMockClient(response)
      const processedResponse = await fetchStructuralVariantsByGene(mockClient, datasetId, gene)
      expect(processedResponse[0].major_consequence).toEqual('csq-b')
    })

    test('uses "intergenic" for major consequence if no consequences but variant is intergenic', async () => {
      const hit = {
        ...minimalHit({
          [subsets[datasetId]]: {
            ac: 100,
          },
        }),
        intergenic: true,
      }

      const response = responseWithHits([hit])
      const mockClient = makeMockClient(response)
      const processedResponse = await fetchStructuralVariantsByGene(mockClient, datasetId, gene)
      expect(processedResponse[0].major_consequence).toEqual('intergenic')
    })
  })
})

describe('fetchStructuralVariantsByRegion', () => {
  describe.each(datasetIds)('with dataset %s', (datasetId) => {
    const region = {
      chrom: 12,
      start: 123,
      xstart: 126,
      stop: 456,
      xstop: 453,
    }

    describe.each(datasetIds)('with datasetId %s', () => {
      const subset = subsets[datasetId]

      test('constructs the proper ES query', async () => {
        const mockClient = makeMockClient(minimalResponse)
        await fetchStructuralVariantsByRegion(mockClient, datasetId, region)

        expect(mockClient.search).toHaveBeenCalledWith({
          index: expectedIndex(datasetId),
          type: '_doc',
          size: 10000,
          scroll: '30s',
          _source: [
            'value.chrom',
            'value.chrom2',
            'value.consequences',
            'value.end',
            'value.end2',
            'value.filters',
            `value.freq.${subset}`,
            'value.intergenic',
            'value.length',
            'value.pos',
            'value.pos2',
            'value.reference_genome',
            'value.type',
            'value.variant_id',
          ],
          body: {
            query: {
              bool: {
                should: [
                  {
                    bool: {
                      must: [{ range: { xpos: { lte: 453 } } }, { range: { xend: { gte: 126 } } }],
                    },
                  },
                  {
                    bool: {
                      must: [
                        { range: { xpos2: { lte: 453 } } },
                        { range: { xend2: { gte: 126 } } },
                      ],
                    },
                  },
                ],
              },
            },
            sort: [{ xpos: { order: 'asc' } }],
          },
        })
      })
      test('rejects variants with AC of 0', async () => {
        const hitWithNonzeroAc = minimalHit({
          [subsets[datasetId]]: {
            ac: 100,
          },
        })

        const hitWithZeroAc = minimalHit({
          [subsets[datasetId]]: {
            ac: 0,
          },
        })

        const response = responseWithHits([hitWithNonzeroAc, hitWithZeroAc])
        const mockClient = makeMockClient(response)
        const processedResponse = await fetchStructuralVariantsByRegion(
          mockClient,
          datasetId,
          region
        )
        expect(processedResponse.length).toEqual(1)
        expect(processedResponse[0].ac).toEqual(100)
      })

      test('includes insertions only if start point within region', async () => {
        const insertionWithValidStartPoint1 = {
          ...minimalHit({
            [subsets[datasetId]]: {
              ac: 100,
            },
          }),
          type: 'INS',
          chrom: region.chrom,
          pos: region.start,
        }
        const insertionWithValidStartPoint2 = { ...insertionWithValidStartPoint1, pos: region.stop }
        const insertionWithInvalidStartPoint1 = {
          ...insertionWithValidStartPoint1,
          pos: region.start - 1,
        }
        const insertionWithInvalidStartPoint2 = {
          ...insertionWithValidStartPoint1,
          pos: region.stop + 1,
        }

        const response = responseWithHits([
          insertionWithValidStartPoint1,
          insertionWithInvalidStartPoint1,
          insertionWithValidStartPoint2,
          insertionWithInvalidStartPoint2,
        ])
        const mockClient = makeMockClient(response)
        const processedResponse = await fetchStructuralVariantsByRegion(
          mockClient,
          datasetId,
          region
        )
        expect(processedResponse.length).toEqual(2)
        expect(processedResponse[0].pos).toEqual(region.start)
        expect(processedResponse[1].pos).toEqual(region.stop)
      })

      describe.each(['BND', 'CTX'])('and interchromosomal variant type "%s"', (type) => {
        test(`include ${type} only if one endpoint within region`, async () => {
          const variantWithQualifyingStart1 = {
            ...minimalHit({
              [subsets[datasetId]]: {
                ac: 100,
              },
            }),
            type,
            chrom: region.chrom,
            chrom2: region.chrom + 1,
            pos: region.start,
            pos2: region.start,
          }
          const variantWithQualifyingStart2 = {
            ...variantWithQualifyingStart1,
            pos: region.stop,
          }
          const variantWithQualifyingEnd1 = {
            ...variantWithQualifyingStart1,
            chrom: region.chrom - 1,
            chrom2: region.chrom,
            pos2: region.start,
          }
          const variantWithQualifyingEnd2 = {
            ...variantWithQualifyingEnd1,
            pos2: region.stop,
          }
          const variantBeforeRegion = {
            ...variantWithQualifyingEnd1,
            pos2: region.start - 1,
          }
          const variantAfterRegion = {
            ...variantWithQualifyingStart1,
            pos: region.stop + 1,
          }

          const response = responseWithHits([
            variantWithQualifyingStart1,
            variantWithQualifyingEnd1,
            variantBeforeRegion,
            variantAfterRegion,
            variantWithQualifyingStart2,
            variantWithQualifyingEnd2,
          ])
          const mockClient = makeMockClient(response)
          const processedResponse = await fetchStructuralVariantsByRegion(
            mockClient,
            datasetId,
            region
          )

          const expectedEndpoints = [
            variantWithQualifyingStart1,
            variantWithQualifyingEnd1,
            variantWithQualifyingStart2,
            variantWithQualifyingEnd2,
          ].map((variant) => [variant.chrom, variant.pos, variant.chrom2, variant.pos2])
          const actualEndpoints = processedResponse.map((variant: any) => [
            variant.chrom,
            variant.pos,
            variant.chrom2,
            variant.pos2,
          ])
          expect(actualEndpoints).toEqual(expectedEndpoints)
        })
      })

      test('uses first consequence as major consequence, when present', async () => {
        const hit = {
          ...minimalHit({
            [subsets[datasetId]]: {
              ac: 100,
            },
          }),
          consequences: [
            { consequence: 'csq-a' },
            { consequence: 'csq-b' },
            { consequence: 'csq-c' },
          ],
        }

        const response = responseWithHits([hit])
        const mockClient = makeMockClient(response)
        const processedResponse = await fetchStructuralVariantsByRegion(
          mockClient,
          datasetId,
          region
        )
        expect(processedResponse.length).toEqual(1)
        expect(processedResponse[0].major_consequence).toEqual('csq-a')
      })

      test('uses "intergenic" for major consequence if no consequences but variant is intergenic', async () => {
        const hit = {
          ...minimalHit({
            [subsets[datasetId]]: {
              ac: 100,
            },
          }),
          intergenic: true,
        }

        const response = responseWithHits([hit])
        const mockClient = makeMockClient(response)
        const processedResponse = await fetchStructuralVariantsByRegion(
          mockClient,
          datasetId,
          region
        )
        expect(processedResponse.length).toEqual(1)
        expect(processedResponse[0].major_consequence).toEqual('intergenic')
      })
    })
  })
})
