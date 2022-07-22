import { beforeEach, describe, expect, jest, it } from '@jest/globals'

import { fetchSearchResults } from './search'

describe('fetchSearchResults', () => {
  beforeEach(() => {
    // @ts-expect-error TS(2322) FIXME: Type 'Mock<UnknownFunction>' is not assignable to ... Remove this comment to see the full error message
    global.fetch = jest.fn()
  })

  it('should return a variant page link for structural variant IDs', async () => {
    expect(await fetchSearchResults('gnomad_sv_r2_1', 'MCNV_4_185')).toEqual([
      {
        label: 'MCNV_4_185',
        value: '/variant/MCNV_4_185?dataset=gnomad_sv_r2_1',
      },
    ])
  })

  it('should return a variant page link for variant IDs', async () => {
    expect(await fetchSearchResults('gnomad_r3', '1-55516888-G-GA')).toEqual([
      {
        label: '1-55516888-G-GA',
        value: '/variant/1-55516888-G-GA?dataset=gnomad_r3',
      },
    ])
  })

  it('should return a variant page link for rsIDs', async () => {
    expect(await fetchSearchResults('gnomad_r3', 'rs527413419')).toEqual([
      {
        label: 'rs527413419',
        value: '/variant/rs527413419?dataset=gnomad_r3',
      },
    ])
  })

  it('should return a gene page link for Ensembl gene IDs', async () => {
    expect(await fetchSearchResults('gnomad_r3', 'ENSG00000169174')).toEqual([
      {
        label: 'ENSG00000169174',
        value: '/gene/ENSG00000169174?dataset=gnomad_r3',
      },
    ])
  })

  it('should return a transcript page link for Ensembl transcript IDs', async () => {
    expect(await fetchSearchResults('gnomad_r3', 'ENST00000302118')).toEqual([
      {
        label: 'ENST00000302118',
        value: '/transcript/ENST00000302118?dataset=gnomad_r3',
      },
    ])
  })

  it('should return a region page link for region IDs', async () => {
    expect(await fetchSearchResults('gnomad_r3', '1:55039447-55064852')).toEqual([
      {
        label: '1-55039447-55064852',
        value: '/region/1-55039447-55064852?dataset=gnomad_r3',
      },
    ])
  })

  it('should return region page links for a window and a position for position IDs', async () => {
    expect(await fetchSearchResults('gnomad_r3', '1:55039447')).toEqual([
      {
        label: '1-55039427-55039467',
        value: '/region/1-55039427-55039467?dataset=gnomad_r3',
      },
      {
        label: '1-55039447-55039447',
        value: '/region/1-55039447-55039447?dataset=gnomad_r3',
      },
    ])
  })

  it('should search for gene symbols', async () => {
    // @ts-expect-error TS(2339) FIXME: Property 'mockReturnValue' does not exist on type ... Remove this comment to see the full error message
    global.fetch.mockReturnValue(
      Promise.resolve({
        json: () =>
          Promise.resolve({
            data: {
              gene_search: [{ ensembl_id: 'ENSG00000169174', symbol: 'PCSK9' }],
            },
          }),
      })
    )

    expect(await fetchSearchResults('gnomad_r3', 'PCSK9')).toEqual([
      {
        label: 'PCSK9',
        value: '/gene/ENSG00000169174?dataset=gnomad_r3',
      },
    ])
  })

  it('should return a link to variant co-occurrence for two variant IDs', async () => {
    expect(await fetchSearchResults('gnomad_r2_1', '1-55505647-G-T and 1-55523855-G-A')).toEqual([
      {
        label: '1-55505647-G-T and 1-55523855-G-A co-occurrence',
        value:
          '/variant-cooccurrence?dataset=gnomad_r2_1&variant=1-55505647-G-T&variant=1-55523855-G-A',
      },
    ])
  })
})
