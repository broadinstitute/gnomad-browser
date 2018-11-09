import testData from '@resources/region-viewer-full-BRCA2-v1.json'

import getMaxMeanFromCoverageDatasets from './getMaxMeanFromCoverageDatasets'

const {
  exome_coverage: exomeCoverage,
  genome_coverage: genomeCoverage,
  exacv1_coverage: exacCoverage,
} = testData.gene

describe('getMaxFromCoverageDatasets', () => {
  it('get maximum Y value from multiple coverage data sets', () => {
    const dataConfig1 = {
      datasets: [
        {
          name: 'exome',
          data: exomeCoverage,
          type: 'area',
          color: 'rgba(70, 130, 180, 1)',
          opacity: 0.5,
        },
        {
          name: 'genome',
          data: genomeCoverage,
          type: 'area',
          color: 'rgba(115, 171, 61,  1)',
          strokeWidth: 4,
          opacity: 0.5,
        },
      ],
    }

    expect(getMaxMeanFromCoverageDatasets(dataConfig1)).toBe(90.57)

    const dataConfig2 = {
      datasets: [
        {
          name: 'exacv1',
          data: exacCoverage,
          type: 'area',
          color: 'yellow',
          opacity: 0.5,
        },
        {
          name: 'exome',
          data: exomeCoverage,
          type: 'area',
          color: 'rgba(70, 130, 180, 1)',
          opacity: 0.5,
        },
        {
          name: 'genome',
          data: genomeCoverage,
          type: 'area',
          color: 'rgba(115, 171, 61,  1)',
          strokeWidth: 4,
          opacity: 0.5,
        },
      ],
    }

    expect(getMaxMeanFromCoverageDatasets(dataConfig2)).toBe(97.88)
  })
})
