/* eslint-disable camelcase */

import React, { Component } from 'react'
import R from 'ramda'
import fetch from 'graphql-fetch'
import DropDownMenu from 'material-ui/DropDownMenu'
import MenuItem from 'material-ui/MenuItem'
import Slider from 'material-ui/Slider'

import { groupExonsByTranscript } from 'utilities'

import RegionViewer from '../RegionViewer'
import TranscriptTrack from '../Tracks/TranscriptTrack'
import VariantTrack from '../Tracks/VariantTrack'
import InfiniteTable from './index'

import css from './styles.css'

const API_URL = process.env.API_URL

export const geneFetch = (geneName) => {
  const query = `
  {
    gene(gene_name: "${geneName}") {
      gene_name
      xstart
      xstop
      exons {
        _id
        start
        transcript_id
        feature_type
        strand
        stop
        chrom
        gene_id
      }
      transcript {
        exons {
          _id
          start
          transcript_id
          feature_type
          strand
          stop
          chrom
          gene_id
        }
      }
    }
  }`
  return new Promise((resolve, reject) => {
    fetch(API_URL)(query)
      .then((data) => {
        resolve(data.data.gene)
      })
      .catch((error) => {
        reject(error)
      })
  })
}
export const regionFetch = (dataset, xstart, xstop) => {
  const query = `
  {
    region(xstart: ${xstart}, xstop: ${xstop}) {
      variants: ${dataset}_variants {
        variant_id
        pos
        rsid
        filter
        allele_count
        allele_num
        allele_freq
      }
    }
  }`
  return new Promise((resolve, reject) => {
    fetch(API_URL)(query)
      .then((data) => {
        resolve(data.data.region)
      })
      .catch((error) => {
        reject(error)
      })
  })
}

class InfiniteTableExample extends Component {
  state = {
    circleRadius: 1,
    circleStrokeWidth: 0,
    hasData: false,
    currentGene: 'PCSK9',
    currentDataset: 'genome',
    fetchingWindow: 1000,
    padding: 2000,
    testGenes: [
      'PCSK9',
      'ZNF658',
      'MYH9',
      'MYH7',
      'FMR1',
      'BRCA2',
      'CFTR',
      'FBN1',
      'TP53',
      'SCN5A',
      'MYBPC3',
      'ARSF',
      'CD33',
      'DMD',
      'TTN',
    ],
    datasets: [
      'exacv1',
      'exome',
      'genome',
    ],
  }

  componentDidMount() {
    this.fetchData()
  }

  componentDidUpdate(_, previousState) {
    if (previousState.currentGene !== this.state.currentGene ||
      previousState.currentDataset !== this.state.currentDataset) {
      this.fetchData()
    }
  }

  fetchData = () => {
    geneFetch(this.state.currentGene, this.state.currentDataset).then((geneData) => {
      const regionStart = geneData.xstart
      const regionStop = geneData.xstart + this.state.fetchingWindow
      this.setState({
        currentStart: regionStart,
        currentStop: regionStop,
      })
      regionFetch(this.state.currentDataset, regionStart, regionStop)
        .then((variantData) => {
          this.setState({ geneData })
          this.setState({ variantData })
          this.setState({ hasData: true })
        })
    })
  }

  fetchMoreData = () => {
    const newStart = this.state.currentStop
    const newStop = this.state.currentStop + this.state.fetchingWindow
    regionFetch(
      this.state.currentDataset,
      newStart,
      newStop,
    )
      .then((variantData) => {
        this.setState({
          currentStart: newStart,
          currentStop: newStop,
          variantData: {
            variants: [
              ...this.state.variantData.variants,
              ...variantData.variants,
            ],
          },
        })
      })
  }

  handleChange = (event, index, value) => {
    // console.log(value)
    this.setState({ currentGene: value })
  }

  handleDatasetChange = (event, index, value) => {
    // console.log(value)
    this.setState({ currentDataset: value })
  }

  handleCircleRadiusChange = (event, index, value) => {
    this.setState({ circleRadius: value })
  }

  handleCircleStrokeWidthChange = (event, index, value) => {
    this.setState({ circleStrokeWidth: value })
  }

  setPadding = (event, newValue) => {
    const padding = Math.floor(2000 * newValue)
    this.setState({ padding })
  }

  render() {
    if (!this.state.hasData) {
      return <p className={css.cool}>Loading!</p>
    }
    const { gene_name } = this.state.geneData
    const geneExons = this.state.geneData.exons
    const transcriptsGrouped = groupExonsByTranscript(geneExons)
    const canonicalExons = this.state.geneData.transcript.exons

    const { variants } = this.state.variantData
    console.log(variants.length)

    const regionAttributesConfig = {
      CDS: {
        color: '#757575',
        thickness: '30px',
      },
      start_pad: {
        color: '#e0e0e0',
        thickness: '3px',
      },
      end_pad: {
        color: '#e0e0e0',
        thickness: '3px',
      },
      intron: {
        color: '#e0e0e0',
        thickness: '3px',
      },
      default: {
        color: '#grey',
        thickness: '3px',
      },
    }

    const tableDataConfig = {
      fields: [
        { dataKey: 'variant_id', title: 'Variant ID', dataType: 'variantId', width: 200 },
        { dataKey: 'rsid', title: 'RSID', dataType: 'string', width: 100 },
        { dataKey: 'filter', title: 'Filter', dataType: 'filter', width: 100 },
        { dataKey: 'allele_count', title: 'AC', dataType: 'integer', width: 100 },
        { dataKey: 'allele_num', title: 'AN', dataType: 'integer', width: 100 },
        { dataKey: 'allele_freq', title: 'AF', dataType: 'float', width: 100 },
      ],
    }

    return (
      <div className={css.page}>
        <h1>Infinite scrolling demo</h1>
        <div className={css.menus}>
          <p>Gene</p>
          <DropDownMenu value={this.state.currentGene} onChange={this.handleChange}>
            {this.state.testGenes.map(gene =>
              <MenuItem key={`${gene}-menu`} value={gene} primaryText={gene} />,
            )}
          </DropDownMenu>
          <p>Dataset</p>
          <DropDownMenu value={this.state.currentDataset} onChange={this.handleDatasetChange}>
            {this.state.datasets.map(dataset =>
              <MenuItem key={`${dataset}-menu`} value={dataset} primaryText={dataset} />,
            )}
          </DropDownMenu>
          <p>Variant radius</p>
          <DropDownMenu value={this.state.circleRadius} onChange={this.handleCircleRadiusChange}>
            {[1, 2, 3, 4, 5].map(circleRadius =>
              <MenuItem key={`${circleRadius}-menu`} value={circleRadius} primaryText={circleRadius} />,
            )}
          </DropDownMenu>
          <p>Variant stroke</p>
          <DropDownMenu
            value={this.state.circleStrokeWidth}
            onChange={this.handleCircleStrokeWidthChange}
          >
            {[0, 1, 2].map(circleStrokeWidth =>
              <MenuItem key={`${circleStrokeWidth}-menu`} value={circleStrokeWidth} primaryText={circleStrokeWidth} />,
            )}
          </DropDownMenu>
        </div>
        <button
          onClick={() => {
            this.fetchMoreData()
          }}
        >
          More variants
        </button>
        <Slider
          style={{
            width: 800,
          }}
          onChange={this.setPadding}
        />
        <RegionViewer
          css={css}
          width={1000}
          regions={canonicalExons}
          regionAttributes={regionAttributesConfig}
          padding={this.state.padding}
        >
          <VariantTrack
            title={this.state.currentDataset}
            height={25}
            circleRadius={this.state.circleRadius}
            circleStroke={'black'}
            circleStrokeWidth={this.state.circleStrokeWidth}
            variants={variants}
          />
          <TranscriptTrack
            transcriptsGrouped={transcriptsGrouped}
            height={15}
          />
        </RegionViewer>
        <InfiniteTable
          title={`${variants.length} ${this.state.currentDataset} ${gene_name} variants`}
          height={700}
          width={1000}
          tableConfig={tableDataConfig}
          tableData={variants}
          loadMoreRows={this.fetchMoreData}
        />
      </div>
    )
  }
}

export default InfiniteTableExample
