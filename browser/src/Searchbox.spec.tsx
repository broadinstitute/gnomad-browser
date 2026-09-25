import React from 'react'
import { afterEach, describe, test, expect } from '@jest/globals'
import { forAllDatasets } from '../../tests/__helpers__/datasets'
import { BrowserRouter, Router } from 'react-router-dom'
import renderer from 'react-test-renderer'
import { createBrowserHistory } from 'history'

import Searchbox from './Searchbox'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'

const originalLrMode = process.env.LR_Y1_ENABLED

afterEach(() => {
  if (originalLrMode === undefined) delete process.env.LR_Y1_ENABLED
  else process.env.LR_Y1_ENABLED = originalLrMode
})

describe('Searchbox', () => {
  test.each(['true', 'false'])(
    'deployment default applies initially and after navigation (LR=%s)',
    async (mode) => {
      process.env.LR_Y1_ENABLED = mode
      const expected = mode === 'true' ? 'gnomad_r4_lr' : 'gnomad_r4'
      const history = createBrowserHistory()
      history.push('/')
      let tree: renderer.ReactTestRenderer
      renderer.act(() => {
        tree = renderer.create(
          <Router history={history}>
            <Searchbox />
          </Router>
        )
      })
      expect(tree!.root.findByType('select').props.value).toBe(expected)
      const search = tree!.root.find((node) => node.props.fetchSearchResults && node.props.onSelect)
      const [result] = await search.props.fetchSearchResults('6-31400000-31450000')
      expect(result.value).toBe(`/region/6-31400000-31450000?dataset=${expected}`)
      renderer.act(() => history.push('/?dataset=gnomad_r3'))
      expect(tree!.root.findByType('select').props.value).toBe('gnomad_r3')
      renderer.act(() => history.push('/'))
      expect(tree!.root.findByType('select').props.value).toBe(expected)
      renderer.act(() => tree!.unmount())
    }
  )

  test('has no unexpected changes when no dataset specified', () => {
    const tree = renderer.create(
      <BrowserRouter>
        <Searchbox />
      </BrowserRouter>
    )
    expect(tree).toMatchSnapshot()
  })

  test('preserves LR selector state, cohort, and URL when a gene result is selected', async () => {
    const history = createBrowserHistory()
    history.push('/gene/ENSG00000133424?dataset=gnomad_r4_lr&lr_cohort=aou')
    const tree = renderer.create(
      <Router history={history}>
        <Searchbox />
      </Router>
    )

    expect(tree.root.findByType('select').props.value).toBe('gnomad_r4_lr')
    const interactiveSearchbox = tree.root.find(
      (node) => node.props.fetchSearchResults && node.props.onSelect
    )
    const [result] = await interactiveSearchbox.props.fetchSearchResults('ENSG00000133424')
    expect(result.value).toBe('/gene/ENSG00000133424?dataset=gnomad_r4_lr&lr_cohort=aou')

    renderer.act(() => interactiveSearchbox.props.onSelect(result.value))
    expect(`${history.location.pathname}${history.location.search}`).toBe(result.value)
  })

  forAllDatasets('with selected dataset %s', (datasetId) => {
    test('has no unexpected changes', () => {
      const history = createBrowserHistory()
      history.push(`/?dataset=${datasetId}`)
      const tree = renderer.create(
        <BrowserRouter>
          <Searchbox history={history} />
        </BrowserRouter>
      )
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
      gnomad_sv_r4: 'gnomad_sv_r4',
      gnomad_r4: 'gnomad_r4',
      gnomad_cnv_r4: 'gnomad_cnv_r4',
      gnomad_r4_non_ukb: 'gnomad_r4',
      gnomad_r4_lr: 'gnomad_r4_lr',
    }

    test('has correct default dataset', () => {
      const expectedDefaultDataset = expectedDefaultDatasets[datasetId]
      const history = createBrowserHistory()
      history.push(`/?dataset=${datasetId}`)
      const tree = renderer.create(
        <BrowserRouter>
          <Searchbox history={history} />
        </BrowserRouter>
      )
      const datasetSelect = tree.root.findByType('select')
      const defaultDataset = datasetSelect.props.value
      expect(defaultDataset).toEqual(expectedDefaultDataset)
    })
  })
})
