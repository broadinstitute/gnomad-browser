/* eslint-disable camelcase */

import React, { Component } from 'react'
import R from 'ramda'
import Slider from 'material-ui/Slider'

import { RegionViewer } from '@broad/region-viewer'
import PositionTableTrack from '@broad/track-position-table'

import SashimiTrack from '../index'

import testGene from '@resources/gwas-eg.json'  // eslint-disable-line
import testCoverage from '@resources/gwas-eg.json'  // eslint-disable-line
import testJunctions from '@resources/gwas-eg.json'  // eslint-disable-line

class SashimiTrackExample extends Component {
  state = {
    hasData: false,
    padding: 1000,
  }

  componentDidMount() {
    this.fetchData()
  }

  fetchData = () => {
    this.setState({
      geneData: testGene.gene,
      coverage: testCoverage,
      junctions: testJunctions,
      hasData: true,
    })
  }

  setPadding = (event, newValue) => {
    const padding = Math.floor(2000 * newValue)
    this.setState({ padding })
  }

  render() {
    if (!this.state.hasData) {
      return <p>Loading!</p>
    }

    const {
      transcript: { exons },
    } = this.state.geneData

    const junctionSelection = ['578', '1514', '181']

    const prepareJunctionSeries = (seriesName, junctions) =>
      junctions.map((junction) => {
        const start = Number(junction.junc_start)
        const stop = Number(junction.junc_end)
        const mid = Math.floor(((start + stop) / 2))

        return ({
          series: seriesName,
          positions: [
            { pos: start },
            { pos: mid },
            { pos: stop },
          ],
          reading: junction[seriesName],
        })
      })
     .filter(junction => junction.reading !== 'None')
     .filter(junction =>
       R.contains(junction.reading, junctionSelection))
     .map(junction =>
       ({ ...junction, reading: Number(junction.reading) }))

    const junctions_control = prepareJunctionSeries('series1', this.state.junctions)
    const junctions_patient = prepareJunctionSeries('series2', this.state.junctions)

    const coverage_control = this.state.coverage
      .map(base => ({ pos: Number(base.pos), reading: Number(base.series1) }))
    const coverage_patient = this.state.coverage
      .filter(base => base.series1 !== 'None')
      .map(base => ({ pos: Number(base.pos), reading: Number(base.series2) }))

    return (
      <div>
        <Slider
          style={{
            width: 800,
          }}
          onChange={this.setPadding}
        />
        <RegionViewer width={1000} regions={exons} padding={this.state.padding}>
          <SashimiTrack
            height={200}
            domainMax={750}
            coverage={coverage_control}
            coverageColour={'#004D7F'}
            junctions={junctions_control}
          />
          <SashimiTrack
            height={200}
            domainMax={2000}
            coverage={coverage_patient}
            coverageColour={'#FF0001'}
            junctions={junctions_patient}
          />
          <PositionTableTrack
            title={''}
            height={50}
          />
        </RegionViewer>
      </div>
    )
  }
}

export default SashimiTrackExample
