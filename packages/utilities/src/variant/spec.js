import { getPositionsToFetch } from './index'


describe('getPositionsToFetch', () => {
  const initialPositionsWithData = [
    1055505222,
    1055505223,
    1055505224,
    1055505225,
    1055505226,
    1055505227,
    1055505228,
    1055505229,
    1055505230,
    1055505231,
    1055505232,
    1055505233,
    1055505234,
    1055505235,
    1055505236,
    1055505237,
  ]
  it('returns empty array if all data is fetched', () => {
    const position = 1055505228
    const padding = 5
    expect(
      getPositionsToFetch(position, padding, initialPositionsWithData),
    ).toEqual([])
  })

  it('return higher positions missing from data already fetched', () => {
    const position = 1055505236
    const padding = 5
    expect(
      getPositionsToFetch(position, padding, initialPositionsWithData),
    ).toEqual([
      1055505238,
      1055505239,
      1055505240,
    ])
  })
  it('return lower positions missing from data already fetched', () => {
    const position = 1055505223
    const padding = 5
    expect(
      getPositionsToFetch(position, padding, initialPositionsWithData),
    ).toEqual([
      1055505218,
      1055505219,
      1055505220,
      1055505221,
    ])
  })
  it('fetch all data if none available', () => {
    const position = 1055505500
    const padding = 5
    expect(
      getPositionsToFetch(position, padding, initialPositionsWithData),
    ).toEqual([
      1055505495,
      1055505496,
      1055505497,
      1055505498,
      1055505499,
      1055505500,
      1055505501,
      1055505502,
      1055505503,
      1055505504,
    ])
  })
  it('handles discontinuous position list', () => {
    const discontinuousPositionList = [
      1055505222,
      1055505223,
      1055505224,
      1055505230,
      1055505231,
      1055505232,
      1055505236,
      1055505237,
    ]
    const position = 1055505231
    const padding = 5
    expect(
      getPositionsToFetch(position, padding, discontinuousPositionList),
    ).toEqual([
      1055505226,
      1055505227,
      1055505228,
      1055505229,
      1055505233,
      1055505234,
      1055505235,
    ])
  })
})
