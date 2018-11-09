import R from 'ramda'

import {
  addPadding,
  applyExonSubset,
  assignAttributes,
  calculateOffset,
  filterRegions,
} from './coordinates'

const REGIONS = [
  {
    feature_type: 'exon',
    start: 46546500,
    stop: 46546556,
  },
  {
    feature_type: 'exon',
    start: 46547792,
    stop: 46547957,
  },
  {
    feature_type: 'exon',
    start: 46594240,
    stop: 46594489,
  },
  {
    feature_type: 'CDS',
    start: 46594282,
    stop: 46594489,
  },
  {
    feature_type: 'exon',
    start: 46611071,
    stop: 46611231,
  },
  {
    feature_type: 'CDS',
    start: 46611071,
    stop: 46611231,
  },
  {
    feature_type: 'exon',
    start: 46614161,
    stop: 46614299,
  },
  {
    feature_type: 'CDS',
    start: 46614161,
    stop: 46614299,
  },
  {
    feature_type: 'exon',
    start: 46615710,
    stop: 46615912,
  },
  {
    feature_type: 'CDS',
    start: 46615710,
    stop: 46615912,
  },
  {
    feature_type: 'exon',
    start: 46627690,
    stop: 46628137,
  },
  {
    feature_type: 'CDS',
    start: 46627690,
    stop: 46628137,
  },
  {
    feature_type: 'exon',
    start: 46631031,
    stop: 46639654,
  },
  {
    feature_type: 'CDS',
    start: 46631031,
    stop: 46631275,
  },
  {
    feature_type: 'UTR',
    start: 46546500,
    stop: 46546556,
  },
  {
    feature_type: 'UTR',
    start: 46547792,
    stop: 46547957,
  },
  {
    feature_type: 'UTR',
    start: 46594240,
    stop: 46594281,
  },
  {
    feature_type: 'UTR',
    start: 46631276,
    stop: 46639654,
  },
]

describe('filterRegions', () => {
  it('returns only regions included in a list', () => {
    expect(filterRegions(['CDS'], REGIONS).length).toBe(6)
    expect(filterRegions(['CDS', 'UTR'], REGIONS).length).toBe(10)
    expect(
      R.pipe(
        R.pluck('feature_type'),
        R.all(feature => feature === 'CDS')
      )(filterRegions(['CDS'], REGIONS))
    ).toBe(true)
  })
})

describe('applyExonSubset', () => {
  it('returns a subset of exons, given an array', () => {
    const func = R.pipe(
      filterRegions(['CDS']),
      applyExonSubset([2, 5])
    )
    const result = func(REGIONS)
    expect(result.length).toBe(3)
  })
})

describe('calculateOffset', () => {
  const filteredRegions = filterRegions(['CDS'], REGIONS)
  const offsetRegions = calculateOffset(filteredRegions)
  it('adds 0 offset attribute to first region', () => {
    expect(offsetRegions[0].offset).toBe(0)
  })
  it('adds offset attribute, first region', () => {
    expect(offsetRegions[0]).toEqual({
      feature_type: 'CDS',
      offset: 0,
      start: 46594282,
      stop: 46594489,
    })
  })
  it('adds offset attribute, second region', () => {
    expect(offsetRegions[1]).toEqual({
      feature_type: 'CDS',
      offset: 16582,
      start: 46611071,
      stop: 46611231,
    })
  })
  it('adds offset attribute, third region', () => {
    expect(offsetRegions[2]).toEqual({
      feature_type: 'CDS',
      offset: 19512,
      start: 46614161,
      stop: 46614299,
    })
  })
  it('second region offset equal to second region start - first region stop', () => {
    expect(offsetRegions[1].offset).toBe(offsetRegions[1].start - offsetRegions[0].stop)
  })
  it('third region offset equal to third region start - second region stop + second region offset', () => {
    expect(offsetRegions[3].offset).toBe(
      offsetRegions[3].start - offsetRegions[2].stop + offsetRegions[2].offset
    )
  })
})

describe('assignAttributes', () => {
  const filteredRegions = filterRegions(['CDS'], REGIONS)
  const offsetRegions = calculateOffset(filteredRegions)

  const defaultAttributeConfig = {
    CDS: {
      color: '#FFB33D',
      thickness: '30px',
    },
    start_pad: {
      color: '#28BCCC',
      thickness: '5px',
    },
    end_pad: {
      color: '#BEEB9F',
      thickness: '5px',
    },
    intron: {
      color: '#FF9559',
      thickness: '5px',
    },
    default: {
      color: '#grey',
      thickness: '5px',
    },
  }

  it('has keys', () => {
    expect(Object.keys(assignAttributes(defaultAttributeConfig, offsetRegions)[0])).toEqual([
      'feature_type',
      'start',
      'stop',
      'offset',
      'color',
      'thickness',
    ])
  })
})

describe('addPadding', () => {
  const filteredRegions = filterRegions(['CDS'], REGIONS)
  const add50Bases = addPadding(50)
  it('adds padding regions', () => {
    expect(
      R.pipe(
        add50Bases,
        R.pluck('feature_type')
      )(filteredRegions)
    ).toEqual([
      'start_pad',
      'CDS',
      'end_pad',
      'start_pad',
      'CDS',
      'end_pad',
      'start_pad',
      'CDS',
      'end_pad',
      'start_pad',
      'CDS',
      'end_pad',
      'start_pad',
      'CDS',
      'end_pad',
      'start_pad',
      'CDS',
      'end_pad',
    ])
  })
  it('offset added', () => {
    R.pipe(
      add50Bases,
      calculateOffset,
      assignAttributes
    )(filteredRegions)
  })
})
