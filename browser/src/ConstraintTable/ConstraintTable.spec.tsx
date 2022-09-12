import React from 'react'
import { Factory } from 'fishery' // eslint-disable-line import/no-extraneous-dependencies

import renderer from 'react-test-renderer'
import { createRenderer as createShallowRenderer } from 'react-test-renderer/shallow'
import { forAllDatasets, forAllDatasetsExcept } from '../../../tests/__helpers__/datasets'

import ConstraintTable, { Gene, Transcript } from './ConstraintTable'

const geneFactory = Factory.define<Gene>(() => ({
  chrom: '13',
  transcripts: [],
}))

const transcriptFactory = Factory.define<Transcript>(() => ({
  transcript_id: 'dummy_transcript',
  transcript_version: '12.34.5',
  chrom: '13',
}))

forAllDatasets('ConstraintTable with "%s" dataset selected', (datasetId) => {
  describe('with a minimal gene', () => {
    test('has no unexpected changes', () => {
      const tree = renderer.create(
        <ConstraintTable datasetId={datasetId} geneOrTranscript={geneFactory.build()} />
      )
      expect(tree).toMatchSnapshot()
    })
  })

  describe('with a minimal transcript', () => {
    test('has no unexpected changes', () => {
      const tree = renderer.create(
        <ConstraintTable datasetId={datasetId} geneOrTranscript={transcriptFactory.build()} />
      )
      expect(tree).toMatchSnapshot()
    })
  })

  describe('with a mitochondrial gene', () => {
    test('has no unexpected changes', () => {
      const tree = renderer.create(
        <ConstraintTable
          datasetId={datasetId}
          geneOrTranscript={geneFactory.build({ chrom: 'M' })}
        />
      )
      expect(tree).toMatchSnapshot()
    })
  })

  describe('with a mitochondrial transcript', () => {
    test('has no unexpected changes', () => {
      const tree = renderer.create(
        <ConstraintTable
          datasetId={datasetId}
          geneOrTranscript={transcriptFactory.build({ chrom: 'M' })}
        />
      )
      expect(tree).toMatchSnapshot()
    })
  })
})

test('ConstraintTable with exac dataset and gene with available constraints has no unexpected changes', () => {
  const tree = createShallowRenderer().render(
    <ConstraintTable
      datasetId="exac"
      geneOrTranscript={geneFactory.build({ exac_constraint: {} })}
    />
  )
  expect(tree).toMatchSnapshot()
})

test('ConstraintTable with exac dataset and transcript with available constraints has no unexpected changes', () => {
  const tree = createShallowRenderer().render(
    <ConstraintTable
      datasetId="exac"
      geneOrTranscript={transcriptFactory.build({ exac_constraint: {} })}
    />
  )
  expect(tree).toMatchSnapshot()
})

forAllDatasetsExcept(['exac'], 'ConstraintTable with "%s" dataset selected', (datasetId) => {
  describe('and gene with available constraint', () => {
    test('has no unexpected changes', () => {
      const tree = createShallowRenderer().render(
        <ConstraintTable
          datasetId={datasetId}
          geneOrTranscript={geneFactory.build({ gnomad_constraint: {} })}
        />
      )
      expect(tree).toMatchSnapshot()
    })
  })

  describe('and transcript with available constraint', () => {
    test('has no unexpected changes', () => {
      const tree = createShallowRenderer().render(
        <ConstraintTable
          datasetId={datasetId}
          geneOrTranscript={transcriptFactory.build({ gnomad_constraint: {} })}
        />
      )
      expect(tree).toMatchSnapshot()
    })
  })
})
