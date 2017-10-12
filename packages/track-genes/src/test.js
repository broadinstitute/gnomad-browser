import test from 'tape'
import { scaleLinear } from 'd3-scale'

import { formatGenes, createTracks } from './index'

import regionData from '@resources/2-175000717-180995530.json'  // eslint-disable-line

const {
  genes,
} = regionData
const genesToMap = formatGenes(genes)

const xScale = scaleLinear()
  .domain([
    regionData.start,
    regionData.stop,
  ])
  .range([0, 1000])

test('Assertions with tape.', (assert) => {
  // createTracks(genesToMap)
  console.log(genesToMap.length)
  const tracks = createTracks(genesToMap, xScale)
  console.log(tracks.map(track => track.map(gene => gene.get('name'))))

  assert.end()
})
