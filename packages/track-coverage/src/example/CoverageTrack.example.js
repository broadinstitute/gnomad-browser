import React, { Component } from 'react'

import { attributeConfig, RegionViewer } from '@broad/region-viewer'
import exampleData from '@resources/region-viewer-full-PCSK9-v1.json'

import CoverageTrack from '../index'


const {
  exacv1_coverage,
  exome_coverage,
  genome_coverage,
  transcript: { exons },
} = exampleData.gene


export default class CoverageTrackExample extends Component {
  state = {
    padding: 100,
  }

  onChangePadding = (e) => {
    this.setState({ padding: parseInt(e.target.value, 10) })
  }

  render() {
    const coverageConfig = {
      datasets: [
        {
          name: 'exacv1',
          data: exacv1_coverage,
          type: 'area',
          color: 'red',
          strokeWidth: 2,
          opacity: 0.5,
        },
        {
          name: 'exome',
          data: exome_coverage,
          type: 'area',
          color: 'rgba(70, 130, 180, 1)',
          strokeWidth: 2,
          opacity: 0.5,
        },
        {
          name: 'genome',
          data: genome_coverage,
          type: 'area',
          color: 'rgba(115, 171, 61,  1)',
          strokeWidth: 2,
          opacity: 0.5,
        },
      ],
    }
    return (
      <div style={{ padding: '10px' }}>
        <label htmlFor="padding">
          Region padding: {this.state.padding}bp
          <br />
          <input
            id="padding"
            type="range"
            min="0"
            max="200"
            value={this.state.padding}
            step="1"
            onChange={this.onChangePadding}
          />
        </label>

        <RegionViewer
          width={800}
          regions={exons}
          regionAttributes={attributeConfig}
          padding={this.state.padding}
        >
          <CoverageTrack
            title={'Coverage'}
            height={120}
            dataConfig={coverageConfig}
            yTickNumber={11}
            yMax={110}
          />
        </RegionViewer>
      </div>
    )
  }
}
