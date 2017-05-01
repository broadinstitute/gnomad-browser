/* eslint-disable camelcase */

import React, { Component } from 'react'
// import R from 'ramda'
import fetch from 'graphql-fetch'

import DropDownMenu from 'material-ui/DropDownMenu'
import MenuItem from 'material-ui/MenuItem'
import Slider from 'material-ui/Slider'
import RefreshIndicator from 'material-ui/RefreshIndicator'
import Checkbox from 'material-ui/Checkbox'

import { groupExonsByTranscript } from 'utilities'

import { TEST_GENES } from '../constants'

import RegionViewer from '../RegionViewer'
import TranscriptTrack from '../Tracks/TranscriptTrack'
import VariantTrack from '../Tracks/VariantTrack'
import InfiniteTable from './index'
import BarGraph from '../Plots/BarGraph'
import LineGraph from '../Plots/LineGraph'

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
      exome_variants {
        variant_id
        pos
        rsid
        filter
        allele_count
        allele_num
        allele_freq
      }
      genome_variants {
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
    markerWidth: 1,
    markerStrokeWidth: 0,
    hasData: false,
    currentGene: 'PCSK9',
    currentDataset: 'genome',
    isFetching: false,
    fetchingWindow: 2000,
    padding: 2000,
    totalVariantCount: 20000,
    fetchFrequency: 10,
    latestFetch: 0,
    totalTime: 0,
    timer: 0,
    markerType: 'circle',
    variantYPosition: 'random',
    trackHeight: 200,
    testGenes: TEST_GENES,
    showTracks: false,
    fetchTimes: [],
    variantCounts: [],
    cumulativeVariantCounts: [],
    totalTimes: [],
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

  updateGeneSettings = (gene) => {
    switch (gene) {
      case 'TTN':
        return {
          markerWidth: 1,
          markerStrokeWidth: 0,
          fetchingWindow: 1000,
        }
      default:
        return {
          markerWidth: 3,
          markerStrokeWidth: 1,
          fetchingWindow: 2000,
        }
    }
  }

  fetchData = () => {
    geneFetch(this.state.currentGene, this.state.currentDataset).then((geneData) => {
      const regionStart = geneData.xstart
      const regionStop = geneData.xstart + this.state.fetchingWindow
      const {
        markerWidth,
        markerStrokeWidth,
        fetchingWindow,
      } = this.updateGeneSettings(this.state.currentGene)
      this.setState({
        fetchingWindow,
        markerWidth,
        markerStrokeWidth,
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
    if (this.state.isFetching) return
    let time = 0
    const increment = () => { time += 1 }
    const timer = setInterval(increment, 1)
    this.setState({ isFetching: true })
    const newStart = this.state.currentStop
    const newStop = this.state.currentStop + this.state.fetchingWindow
    regionFetch(
      this.state.currentDataset,
      newStart,
      newStop,
    )
      .then((variantData) => {
        const { exome_variants, genome_variants } = variantData
        const totalVariantCount = exome_variants.length + genome_variants.length
        this.setState({
          isFetching: false,
          currentStart: newStart,
          currentStop: newStop,
          timer: time,
          totalTime: this.state.totalTime + 1,
          latestFetch: totalVariantCount,
          variantCounts: [...this.state.variantCounts, totalVariantCount],
          cumulativeVariantCounts: [
            ...this.state.cumulativeVariantCounts,
            this.state.cumulativeVariantCounts + totalVariantCount,
          ],
          fetchTimes: [...this.state.fetchTimes, time],
          totalTimes: [...this.state.totalTimes, this.state.totalTime],
          variantData: {
            exome_variants: [
              ...this.state.variantData.exome_variants,
              ...exome_variants,
            ],
            genome_variants: [
              ...this.state.variantData.genome_variants,
              ...genome_variants,
            ],
          },
        })
        clearInterval(timer)
      })
  }

  handleFetchFrequencyChange = (event, index, value) => {
    this.setState({ fetchFrequency: value })
  }

  fetchMoreDataUntilDone = () => {
    // window.totalTime = 0
    const interval = setInterval(this.fetchMoreData, this.state.fetchFrequency)
    // const totalTimer =
    //   setInterval(() => { window.totalTime += 1 }, 1)
    this.setState({
      interval,
      // totalTimer,
    })
  }

  stopFetching = () => {
    this.setState({
      interval: clearInterval(this.state.interval),
      totalTimer: clearInterval(this.state.totalTimer),
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

  handlMarkerWidthChange = (event, index, value) => {
    this.setState({ markerWidth: value })
  }

  handleMarkerStrokeWidthChange = (event, index, value) => {
    this.setState({ markerStrokeWidth: value })
  }

  handleMarkerTypeChange = (event, index, value) => {
    this.setState({ markerType: value })
  }

  handleVariantYChange = (event, index, value) => {
    this.setState({ variantYPosition: value })
  }

  handleFetchWindowChange = (event, index, value) => {
    this.setState({ fetchingWindow: value })
  }

  handleShowTracks = (event, isInputChecked) => {
    console.log(isInputChecked)
    this.setState({ showTracks: isInputChecked })
  }

  reset = () => {
    this.setState({
      variantCounts: [],
      fetchTimes: [],
     })
    this.fetchData()
  }

  setTrackHeight = (event, newValue) => {
    const trackHeight = Math.floor(500 * newValue)
    this.setState({ trackHeight })
  }

  setPadding = (event, newValue) => {
    const padding = Math.floor(2000 * newValue)
    this.setState({ padding })
  }

  render() {
    const refreshIndicatorPage = (
      <div
        style={{
          position: 'relative',
          width: 100,
        }}
      >
        <RefreshIndicator
          size={100}
          left={50}
          top={200}
          status={'loading'}
          style={{
            position: 'relative',
          }}
        />
      </div>
    )

    const refreshIndicatorSmall = (
      <div
        style={{
          display: 'flex',
          position: 'relative',
          width: 100,
        }}
      >
        <RefreshIndicator
          size={40}
          left={10}
          top={0}
          status={'loading'}
          style={{
            position: 'relative',
          }}
        />
      </div>
    )

    if (!this.state.hasData) return refreshIndicatorPage

    const { gene_name } = this.state.geneData
    const geneExons = this.state.geneData.exons
    const transcriptsGrouped = groupExonsByTranscript(geneExons)
    const canonicalExons = this.state.geneData.transcript.exons
    const { exome_variants } = this.state.variantData
    const { genome_variants } = this.state.variantData

    const regionAttributesConfig = {
      CDS: {
        color: 'black',
        thickness: '30px',
      },
      start_pad: {
        color: '#757575',
        thickness: '3px',
      },
      end_pad: {
        color: '#757575',
        thickness: '3px',
      },
      intron: {
        color: '#757575',
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

    const refreshStyle = {
      container: {
        display: 'flex',
        position: 'relative',
        width: 100,
      },
      refresh: {
        display: 'inline-block',
        position: 'relative',
      },
    }

    const consequenceCategories = [
      // { annotation: 'transcript_ablation', colour: '#ed2024' },
      { annotation: 'splice_acceptor_variant', colour: '#f26424' },
      { annotation: 'splice_donor_variant', colour: '#f26424' },
      { annotation: 'stop_gained', colour: '#ed2024' },
      { annotation: 'frameshift_variant', colour: '#85489c' },
    ]

    const markerConfigCircle = {
      markerType: 'circle',
      circleRadius: this.state.markerWidth,
      circleStroke: 'black',
      circleStrokeWidth: this.state.markerStrokeWidth,
      yPositionSetting: this.state.variantYPosition,
    }

    const markerConfigTick = {
      markerType: 'tick',
      tickHeight: 3,
      tickWidth: this.state.markerWidth,
      tickStroke: 'black',
      tickStrokeWidth: this.state.markerStrokeWidth,
      yPositionSetting: this.state.variantYPosition,
    }

    const markerConfigAF = {
      ...markerConfigCircle,
      markerType: 'af',

    }

    const markerConfig = {
      circle: markerConfigCircle,
      tick: markerConfigTick,
      af: markerConfigAF,
    }

    const variantTracks = [
      <VariantTrack
        title={'exome variants'}
        height={this.state.trackHeight}
        markerConfig={markerConfig[this.state.markerType]}
        variants={exome_variants}
      />,
      <VariantTrack
        title={'genome variants'}
        height={this.state.trackHeight}
        markerConfig={markerConfig[this.state.markerType]}
        variants={genome_variants}
      />,
    ]

    console.log(this.state)

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
          <p>fetch freq (ms)</p>
          <DropDownMenu
            value={this.state.fetchFrequency}
            onChange={this.handleFetchFrequencyChange}
          >
            {[1, 10, 50, 100, 500, 1000, 1500, 2000].map(frequency =>
              <MenuItem key={`${frequency}-menu`} value={frequency} primaryText={frequency} />,
            )}
          </DropDownMenu>
          <p>fetch window (bp)</p>
          <DropDownMenu
            value={this.state.fetchingWindow}
            onChange={this.handleFetchWindowChange}
          >
            {[10, 50, 100, 500, 1000, 1500, 2000,
              5000, 10000, 15000, 20000, 25000, 30000,
              35000, 40000, 50000, 60000, 70000, 80000,
            ].map(window =>
              <MenuItem key={`${window}-menu`} value={window} primaryText={window} />,
            )}
          </DropDownMenu>
          <Checkbox
            label="Variant traacks"
            onCheck={this.handleShowTracks}
            style={{
              block: {
                maxWidth: 250,
              },
            }}
          />
        {/* this.state.isFetching && refreshIndicatorSmall */}
        </div>
        <div className={css.menus}>
          <p>markerType</p>
          <DropDownMenu value={this.state.markerType} onChange={this.handleMarkerTypeChange}>
            {['circle', 'tick', 'af'].map(markerType =>
              <MenuItem key={`${markerType}-menu`} value={markerType} primaryText={markerType} />,
            )}
          </DropDownMenu>
          <p>Variant width</p>
          <DropDownMenu value={this.state.markerWidth} onChange={this.handlMarkerWidthChange}>
            {[1, 2, 3, 4, 5].map(markerWidth =>
              <MenuItem key={`${markerWidth}-menu`} value={markerWidth} primaryText={markerWidth} />,
            )}
          </DropDownMenu>
          <p>Variant stroke</p>
          <DropDownMenu value={this.state.markerStrokeWidth} onChange={this.handleMarkerStrokeWidthChange}>
            {[0, 1, 2].map(markerStrokeWidth =>
              <MenuItem key={`${markerStrokeWidth}-menu`} value={markerStrokeWidth} primaryText={markerStrokeWidth} />,
            )}
          </DropDownMenu>
          <p>Variant position</p>
          <DropDownMenu value={this.state.variantYPosition} onChange={this.handleVariantYChange}>
            {['random', 'center'].map(yPositionSetting =>
              <MenuItem key={`${yPositionSetting}-menu`} value={yPositionSetting} primaryText={yPositionSetting} />,
            )}
          </DropDownMenu>
          <p>Track height</p>
          <Slider
            style={{
              width: 100,
            }}
            onChange={this.setTrackHeight}
          />
        </div>
        <BarGraph
          title={'Number of variants per fetch'}
          datax={this.state.fetchTimes}
          datay={this.state.variantCounts}
          ytitle={'Number of variants'}
          xtitle={'Fetch attempt'}
          width={1000}
          height={300}
        />
      {/*<LineGraph
          title={'Number of variants per fetch'}
          datax={this.state.totalTimes}
          datay={this.state.cumulativeVariantCounts}
          ytitle={'Number of variants'}
          xtitle={'Fetch attempt'}
          width={1000}
          height={300}
        />*/}
        <button
          onClick={() => {
            this.fetchMoreData()
          }}
        >
          More variants
        </button>
        <button
          onClick={() => {
            this.fetchMoreDataUntilDone()
          }}
        >
          Fetch all
        </button>
        <button
          onClick={() => {
            this.stopFetching()
          }}
        >
          Stop fetching
        </button>
        <button
          onClick={() => {
            this.reset()
          }}
        >
          Reset
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
          {this.state.showTracks && variantTracks}
          <TranscriptTrack
            transcriptsGrouped={transcriptsGrouped}
            height={15}
          />
        </RegionViewer>
        <InfiniteTable
          title={`${genome_variants.length} ${this.state.currentDataset} ${gene_name} variants, latest fetch: ${this.state.latestFetch} variants in  ${this.state.timer} ms`}
          height={700}
          width={1100}
          tableConfig={tableDataConfig}
          tableData={genome_variants}
          remoteRowCount={this.state.totalVariantCount}
          loadMoreRows={this.fetchMoreData}
          overscan={60}
          loadLookAhead={1000}
          showIndex
        />
      </div>
    )
  }
}

export default InfiniteTableExample
// , total time: ${Math.floor(this.state.totalTime / 1000)} seconds
