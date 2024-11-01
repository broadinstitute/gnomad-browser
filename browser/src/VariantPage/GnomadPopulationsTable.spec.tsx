import React from 'react'
import { describe, expect, test } from '@jest/globals'
import renderer from 'react-test-renderer'

import { GnomadPopulationsTable } from './GnomadPopulationsTable'
import { allDatasetIds, getTopLevelDataset } from '@gnomad/dataset-metadata/metadata'
import { createAncestryGroupObjects } from '../__factories__/Variant'

describe('GnomadPopulationsTable', () => {
  describe.each(allDatasetIds)('with a dataset of %s', (dataset: any) => {
    test('has no unexpected changes', () => {
      const exomeGeneticAncestryGroupObjexts = createAncestryGroupObjects(
        [
          { id: 'afr', value: 1 },
          { id: 'remaining', value: 2 },
          { id: 'eur', value: 4 },
          { id: 'XX', value: 8 },
          { id: 'XY', value: 16 },
        ],
        false
      )

      const genomeGeneticAncestryGroupObjexts = createAncestryGroupObjects(
        [
          { id: 'afr', value: 32 },
          { id: 'remaining', value: 64 },
          { id: 'eur', value: 128 },
          { id: 'XX', value: 256 },
          { id: 'XY', value: 512 },
        ],
        false
      )

      const tree = renderer.create(
        <GnomadPopulationsTable
          datasetId={dataset}
          exomePopulations={exomeGeneticAncestryGroupObjexts}
          genomePopulations={genomeGeneticAncestryGroupObjexts}
          jointPopulations={null}
          showHemizygotes={false}
        />
      )

      expect(tree).toMatchSnapshot()
    })
    test('has no unexpected changes when missing genetic ancestry groups are filled in', () => {
      const jointGeneticAncestryGroupObjects =
        getTopLevelDataset(dataset) === 'v4'
          ? createAncestryGroupObjects(
              [
                { id: 'afr', value: 1 },
                { id: 'remaining', value: 2 },
                { id: 'eur', value: 4 },
                { id: 'XX', value: 8 },
                { id: 'XY', value: 16 },
              ],
              true
            )
          : null

      const tree = renderer.create(
        <GnomadPopulationsTable
          datasetId={dataset}
          exomePopulations={[]}
          genomePopulations={[]}
          jointPopulations={jointGeneticAncestryGroupObjects}
          showHemizygotes={false}
        />
      )

      expect(tree).toMatchSnapshot()
    })
  })
})
