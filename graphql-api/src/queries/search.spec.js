const { fetchSearchResults } = require('./search')

describe('fetchSearchResults', () => {
  let esClient

  beforeEach(() => {
    esClient = {
      search: jest.fn(),
    }
  })

  it('should return a variant page link for structural variant IDs', async () => {
    expect(await fetchSearchResults(esClient, 'gnomad_sv_r2_1', 'MCNV_4_185')).toEqual([
      {
        label: 'MCNV_4_185',
        value: '/variant/MCNV_4_185?dataset=gnomad_sv_r2_1',
      },
    ])
  })

  it('should return a variant page link for variant IDs', async () => {
    expect(await fetchSearchResults(esClient, 'gnomad_r3', '1-55516888-G-GA')).toEqual([
      {
        url: '/variant/1-55516888-G-GA?dataset=gnomad_r3',
        label: '1-55516888-G-GA',
      },
    ])
  })

  it('should return a variant page link for rsIDs', async () => {
    expect(await fetchSearchResults(esClient, 'gnomad_r3', 'rs527413419')).toEqual([
      {
        url: '/variant/rs527413419?dataset=gnomad_r3',
        label: 'rs527413419',
      },
    ])
  })

  it('should return a gene page link for Ensembl gene IDs', async () => {
    expect(await fetchSearchResults(esClient, 'gnomad_r3', 'ENSG00000169174')).toEqual([
      {
        url: '/gene/ENSG00000169174?dataset=gnomad_r3',
        label: 'ENSG00000169174',
      },
    ])
  })

  it('should return a transcript page link for Ensembl transcript IDs', async () => {
    expect(await fetchSearchResults(esClient, 'gnomad_r3', 'ENST00000302118')).toEqual([
      {
        url: '/transcript/ENST00000302118?dataset=gnomad_r3',
        label: 'ENST00000302118',
      },
    ])
  })

  it('should return a region page link for region IDs', async () => {
    expect(await fetchSearchResults(esClient, 'gnomad_r3', '1:55039447-55064852')).toEqual([
      {
        url: '/region/1-55039447-55064852?dataset=gnomad_r3',
        label: '1-55039447-55064852',
      },
    ])
  })

  it('should return region page links for a window and a position for position IDs', async () => {
    expect(await fetchSearchResults(esClient, 'gnomad_r3', '1:55039447')).toEqual([
      {
        url: '/region/1-55039427-55039467?dataset=gnomad_r3',
        label: '1-55039427-55039467',
      },
      {
        url: '/region/1-55039447-55039447?dataset=gnomad_r3',
        label: '1-55039447-55039447',
      },
    ])
  })

  it('should search for gene symbols', async () => {
    esClient.search.mockReturnValue(
      Promise.resolve({
        body: {
          hits: {
            total: 1,
            hits: [
              {
                _source: {
                  gene_id: 'ENSG00000169174',
                  value: {
                    symbol: 'PCSK9',
                  },
                },
              },
            ],
          },
        },
      })
    )

    expect(await fetchSearchResults(esClient, 'gnomad_r3', 'PCSK9')).toEqual([
      {
        url: '/gene/ENSG00000169174?dataset=gnomad_r3',
        label: 'PCSK9',
      },
    ])
  })
})
