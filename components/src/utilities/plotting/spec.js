/* eslint-disable dot-notation */

import expect from 'expect'
import R from 'ramda'

import { getMaxMeanFromCoverageDatasets } from './index'

import testData from 'data/region-viewer-full-BRCA2-v1.json'

const { exome_coverage, genome_coverage, exacv1_coverage } = testData.gene

describe.only('getMaxFromCoverageDatasets', () => {
  it('get maximum Y value from multiple coverage data sets', () => {
    const dataConfig1 = {
      datasets: [
        {
          name: 'exome',
          data: exome_coverage,
          type: 'area',
          color: 'rgba(70, 130, 180, 1)',
          opacity: 0.5,
        },
        {
          name: 'genome',
          data: genome_coverage,
          type: 'area',
          color: 'rgba(115, 171, 61,  1)',
          strokeWidth: 4,
          opacity: 0.5,
        },
      ],
    }
    expect(
      getMaxMeanFromCoverageDatasets(dataConfig1),
    ).toBe(90.57)
    const dataConfig2 = {
      datasets: [
        {
          name: 'exacv1',
          data: exacv1_coverage,
          type: 'area',
          color: 'yellow',
          opacity: 0.5,
        },
        {
          name: 'exome',
          data: exome_coverage,
          type: 'area',
          color: 'rgba(70, 130, 180, 1)',
          opacity: 0.5,
        },
        {
          name: 'genome',
          data: genome_coverage,
          type: 'area',
          color: 'rgba(115, 171, 61,  1)',
          strokeWidth: 4,
          opacity: 0.5,
        },
      ],
    }
    expect(
      getMaxMeanFromCoverageDatasets(dataConfig2),
    ).toBe(97.88)
  })
})
