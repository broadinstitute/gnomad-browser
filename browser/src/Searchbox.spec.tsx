import React from 'react'
import { describe, test, expect } from '@jest/globals'
import { forAllDatasets } from '../../tests/__helpers__/datasets'
import { withDummyRouter } from '../../tests/__helpers__/router'
import renderer from 'react-test-renderer'
import { createBrowserHistory } from 'history'

import Searchbox from './Searchbox'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'

describe('Searchbox', () => {
  test('has no unexpected changes when no dataset specified', () => {
    const tree = renderer.create(withDummyRouter(<Searchbox />))
    expect(tree).toMatchSnapshot()
  })

  forAllDatasets('with selected dataset %s', (datasetId) => {
    test('has no unexpected changes', () => {
      const history = createBrowserHistory()
      history.push(`/?dataset=${datasetId}`)
      const tree = renderer.create(withDummyRouter(<Searchbox history={history} />))
      expect(tree).toMatchSnapshot()
    })

    const expectedDefaultDatasets: Record<DatasetId, DatasetId> = {
      exac: 'exac',
      gnomad_r2_1: 'gnomad_r2_1',
      gnomad_r2_1_controls: 'gnomad_r2_1',
      gnomad_r2_1_non_cancer: 'gnomad_r2_1',
      gnomad_r2_1_non_neuro: 'gnomad_r2_1',
      gnomad_r2_1_non_topmed: 'gnomad_r2_1',
      gnomad_r3: 'gnomad_r3',
      gnomad_r3_controls_and_biobanks: 'gnomad_r3',
      gnomad_r3_non_cancer: 'gnomad_r3',
      gnomad_r3_non_neuro: 'gnomad_r3',
      gnomad_r3_non_topmed: 'gnomad_r3',
      gnomad_r3_non_v2: 'gnomad_r3',
      gnomad_sv_r2_1: 'gnomad_sv_r2_1',
      gnomad_sv_r2_1_controls: 'gnomad_sv_r2_1',
      gnomad_sv_r2_1_non_neuro: 'gnomad_sv_r2_1',
      gnomad_sv_r3: 'gnomad_sv_r3',
    }

    test('has correct default dataset', () => {
      const expectedDefaultDataset = expectedDefaultDatasets[datasetId]
      const history = createBrowserHistory()
      history.push(`/?dataset=${datasetId}`)
      const tree = renderer.create(withDummyRouter(<Searchbox history={history} />))
      const datasetSelect = tree.root.findByType('select')
      const defaultDataset = datasetSelect.props['value']
      expect(defaultDataset).toEqual(expectedDefaultDataset)
    })
  })
})
