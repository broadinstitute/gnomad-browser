/* eslint-disable camelcase */

import React, { Component } from 'react'
import R from 'ramda'
import fetch from 'graphql-fetch'

import DropDownMenu from 'material-ui/DropDownMenu'
import MenuItem from 'material-ui/MenuItem'
import Slider from 'material-ui/Slider'
import RefreshIndicator from 'material-ui/RefreshIndicator'
import Checkbox from 'material-ui/Checkbox'
import { range } from 'd3-array'

import { groupExonsByTranscript, combineDataForTable, getXpos } from 'utilities'
import { processVariantsList } from 'utilities/exalt/process'

import RegionViewer from '../../RegionViewer'
import NavigatorTrack from '../../Tracks/NavigatorTrack'
import TranscriptTrack from '../../Tracks/TranscriptTrack'
import VariantTrack from '../../Tracks/VariantTrack'
import VariantTable from '../../VariantTable'

import { TEST_GENES } from '../../constants'

import css from './Composite.example.css'

const API_URL = process.env.API_URL

export const geneFetch = (geneName) => {
  const query = `
  {
    gene(gene_name: "${geneName}") {
      gene_name
      xstart
      xstop
      chrom
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

const vepFields = `{
  TSL
  ancestral
  SYMBOL
  EAS_MAF
  Feature
  Codons
  MOTIF_NAME
  DOMAINS
  SIFT
  VARIANT_CLASS
  CDS_position
  CCDS
  Allele
  PolyPhen
  MOTIF_SCORE_CHANGE
  IMPACT
  HGVSp
  ENSP
  LoF
  INTRON
  Existing_variation
  HGVSc
  LoF_filter
  MOTIF_POS
  HIGH_INF_POS
  AA_MAF
  LoF_flags
  AFR_MAF
  UNIPARC
  cDNA_position
  PUBMED
  ALLELE_NUM
  Feature_type
  GMAF
  HGNC_ID
  PHENO
  LoF_info
  SWISSPROT
  EXON
  EUR_MAF
  Consequence
  Protein_position
  Gene
  STRAND
  DISTANCE
  EA_MAF
  SYMBOL_SOURCE
  Amino_acids
  TREMBL
  CLIN_SIG
  SAS_MAF
  MINIMISED
  HGVS_OFFSET
  ASN_MAF
  BIOTYPE
  context
  SOMATIC
  AMR_MAF
  CANONICAL
}`

export const regionFetch = (datasets, xstart, xstop) => {
  const variantsQuery = datasets.map(dataset => `
    ${dataset}_variants {
      chrom
      variant_id
      pos
      xpos
      rsid
      filter
      allele_count
      allele_num
      allele_freq
      hom_count
      vep_annotations ${vepFields}
    }
  `)

  const query = `
  {
    region(xstart: ${xstart}, xstop: ${xstop}) {
      ${variantsQuery.join(' ')}
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

const combineFields = {
  constantFields: [
    'chrom',
    'pos',
    'rsid',
    'vep_annotations',
    'variant_id',
  ],
  sumFields: [
    'allele_count',
    'allele_num',
    'hom_count',
  ],
  nestedSumFields: [],
  uniqueFields: ['allele_count', 'allele_num', 'hom_count', 'filter'],
}

const onCursorMove = ({ isPositionOutside, position: { x, y } }) => {
  console.log(`x: ${x}, y: ${y}`)
}

const onCursorClick = ({ x, y }) => {
  console.log(`clicked x: ${x}, y: ${y}`)
}

class Composite extends Component {
  state = {
    markerWidth: 5,
    markerStrokeWidth: 1,
    hasData: false,
    currentGene: 'PCSK9',
    currentDataset: 'genome',
    isFetching: false,
    fetchingWindow: 2000,
    padding: 30,
    totalVariantCount: 20000,
    fetchFrequency: 2000,
    latestFetch: 0,
    totalTime: 0,
    timer: 0,
    trackHeight: 100,
    markerType: 'af',
    testGenes: TEST_GENES,
    consequence: 'lof',
    variantYPosition: 'center',
    tracksSplit: true,
    fetchTimes: [],
    variantCounts: [],
    totalTimes: [],
    afMax: 0.001,
    tablePosition: 100,
    positionsWithData: [],
    datasets: [
      // 'exacv1',
      'exome',
      'genome',
    ],
  }

  componentDidMount() {
    this.fetchData()
  }

  componentDidUpdate(_, previousState) {
    if (previousState.currentGene !== this.state.currentGene ||
      previousState.currentDataset !== this.state.currentDataset
    ) {
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
        geneData,
        fetchingWindow,
        markerWidth,
        markerStrokeWidth,
        currentStart: regionStart,
        currentStop: regionStop,
      })
      regionFetch(this.state.datasets, regionStart, regionStop)
        .then((variantData) => {
          const { exome_variants, genome_variants } = variantData
          const addDatasetLabel = (variants, label) => variants.map(v => ({ ...v, dataset: label }))

          const combinedVariants = combineDataForTable(
            [
              ...addDatasetLabel(genome_variants, 'genome'),
              ...addDatasetLabel(exome_variants, 'exome'),
            ],
            combineFields,
          )

          const variantsProcessed = processVariantsList(combinedVariants)
          this.setState({ geneData })
          this.setState({ variantsProcessed })
          this.setState({ hasData: true })
          this.setState({
            positionsWithData: [
              ...this.state.positionsWithData,
              ...range(regionStart, regionStop),
            ].sort((a, b) => b - a),
          })
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
      this.state.datasets,
      newStart,
      newStop,
    )
      .then((variantData) => {
        const { exome_variants, genome_variants } = variantData
        const addDatasetLabel = (variants, label) => variants.map(v => ({ ...v, dataset: label }))

        const combinedVariants = combineDataForTable(
          [
            ...addDatasetLabel(genome_variants, 'genome'),
            ...addDatasetLabel(exome_variants, 'exome'),
          ],
          combineFields,
        )

        const variantsProcessed = processVariantsList(combinedVariants)
        const totalVariantCount = exome_variants.length + genome_variants.length
        this.setState({
          isFetching: false,
          currentStart: newStart,
          currentStop: newStop,
          timer: time,
          totalTime: this.state.totalTime + 1,
          latestFetch: totalVariantCount,
          variantCounts: [...this.state.variantCounts, totalVariantCount],
          fetchTimes: [...this.state.fetchTimes, time],
          totalTimes: [...this.state.totalTimes, this.state.totalTime],
          variantsProcessed: [
            ...this.state.variantsProcessed,
            ...variantsProcessed,
          ].sort((a, b) => b.pos - a.pos),
          positionsWithData: [
            ...this.state.positionsWithData,
            ...range(newStart, newStop),
          ], // .sort((a, b) => b - a),
        })
        this.forceUpdate()
        clearInterval(timer)
      })
  }

  fetchFromPositionClick = (chrom, position) => {
    if (this.state.isFetching) return
    let time = 0
    const increment = () => { time += 1 }
    const timer = setInterval(increment, 1)
    this.setState({ isFetching: true })
    const xpos = getXpos(chrom, position)

    regionFetch(
      this.state.datasets,
      xpos - 1000,
      xpos + 1000,
    )
      .then((variantData) => {
        const { exome_variants, genome_variants } = variantData
        const addDatasetLabel = (variants, label) => variants.map(v => ({ ...v, dataset: label }))

        const combinedVariants = combineDataForTable(
          [
            ...addDatasetLabel(genome_variants, 'genome'),
            ...addDatasetLabel(exome_variants, 'exome'),
          ],
          combineFields,
        )

        const variantsProcessed = processVariantsList(combinedVariants)

        const allVariants = [
          ...this.state.variantsProcessed,
          ...variantsProcessed,
        ].sort((a, b) => b.pos - a.pos)

        const totalVariantCount = exome_variants.length + genome_variants.length
        const tablePosition = this.getTableIndexByPosition(position, allVariants)
        console.log('position', position)
        console.log('all variants', allVariants)
        console.log('table position:', tablePosition)
        this.setState({
          isFetching: false,
          timer: time,
          totalTime: this.state.totalTime + 1,
          latestFetch: totalVariantCount,
          variantCounts: [...this.state.variantCounts, totalVariantCount],
          fetchTimes: [...this.state.fetchTimes, time],
          totalTimes: [...this.state.totalTimes, this.state.totalTime],
          variantsProcessed: allVariants,
          positionsWithData: [
            ...this.state.positionsWithData,
            ...range(xpos, xpos + 1000),
          ], //.sort((a, b) => b - a),
          tablePosition,
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

  handleAfMaxChange = (event, index, value) => {
    this.setState({ afMax: value })
  }

  handleFetchWindowChange = (event, index, value) => {
    this.setState({ fetchingWindow: value })
  }

  handleShowTracks = (event, isInputChecked) => {
    this.setState({ showTracks: isInputChecked })
  }

  reset = () => {
    this.setState({
      variantCounts: [],
      fetchTimes: [],
    })
    this.fetchData()
  }

  setPadding = (event, newValue) => {
    const padding = Math.floor(200 * newValue)
    this.setState({ padding })
  }

  setTrackHeight = (event, newValue) => {
    const trackHeight = Math.floor(300 * newValue)
    this.setState({ trackHeight })
  }

  handleSplitConsequences = (event, isInputChecked) => {
    this.setState({ tracksSplit: isInputChecked })
  }

  getTableIndexByPosition = (position, variants) =>
    variants.findIndex((variant, i) => {
      if (variants[i + 1]) {
        return position >= variant.pos && position <= variants[i + 1].pos
      }
      return variants.length - 1
    })

  updateCurrentTableindex = (position) => {
    this.setState({ tablePosition: this.getTableIndexByPosition(position) })
  }

  onCursorClick = (position) => {
    const { chrom } = this.state.geneData
    this.fetchFromPositionClick(chrom, position)
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
    const { variantsProcessed } = this.state

    const regionAttributesConfig = {
      CDS: {
        color: '#424242',
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
        { dataKey: 'datasets', title: 'Source', dataType: 'datasets', width: 40 },
        // { dataKey: 'rsid', title: 'RSID', dataType: 'string', width: 100 },
        { dataKey: 'consequence', title: 'Consequence', dataType: 'string', width: 150 },
        { dataKey: 'first_lof_flag', title: 'LoF', dataType: 'string', width: 20 },
        // { dataKey: 'filter', title: 'Filter', dataType: 'filter', width: 100 },
        { dataKey: 'allele_count', title: 'AC', dataType: 'integer', width: 50 },
        { dataKey: 'allele_num', title: 'AN', dataType: 'integer', width: 75 },
        { dataKey: 'allele_freq', title: 'AF', dataType: 'float', width: 75 },
        { dataKey: 'hom_count', title: 'Hom', dataType: 'integer', width: 50 },
      ],
    }

    const consequenceCategories = [
      // { annotation: 'transcript_ablation', colour: '#ed2024' },
      { annotation: 'splice_acceptor_variant', colour: '#757575' },
      { annotation: 'splice_donor_variant', colour: '#757575' },
      { annotation: 'stop_gained', colour: '#757575' },
      { annotation: 'frameshift_variant', colour: '#757575' },
    ]

    const markerConfigCircle = {
      markerType: 'circle',
      circleRadius: this.state.markerWidth,
      circleStroke: 'black',
      circleStrokeWidth: this.state.markerStrokeWidth,
      yPositionSetting: this.state.variantYPosition,
      fillColor: 'lof',
    }

    const markerConfigTick = {
      markerType: 'tick',
      tickHeight: 3,
      tickWidth: this.state.markerWidth,
      tickStroke: 'black',
      tickStrokeWidth: this.state.markerStrokeWidth,
      yPositionSetting: this.state.variantYPosition,
      fillColor: 'lof',
    }

    const markerConfigAF = {
      ...markerConfigCircle,
      markerType: 'af',
      fillColor: 'lof',
      afMax: this.state.afMax,
    }

    const markerConfigLoF = {
      ...markerConfigCircle,
      markerType: 'af',
      fillColor: 'lof',
      yPositionSetting: 'center',
      afMax: this.state.afMax,
    }
    const markerConfigAll = {
      ...markerConfigCircle,
      markerType: 'af',
      fillColor: '#757575',
      yPositionSetting: 'random',
      afMax: this.state.afMax,
    }

    const markerConfig = {
      circle: markerConfigCircle,
      tick: markerConfigTick,
      af: markerConfigAF,
    }

    const cats = consequenceCategories.map(c => c.annotation)

    const splitTracks = consequenceCategories.map((consequence, index) => {
      return (
        <VariantTrack
          key={`${consequence.annotation}-${index}`}
          title={consequence.annotation.replace('_', ' ')}
          height={25}
          color={consequence.colour}
          markerConfig={markerConfigLoF}
          variants={variantsProcessed.filter(variant =>
             R.contains(consequence.annotation, variant.consequence))
           }
        />
      )
    })

    const allTrack = (
      <VariantTrack
        key={'All-variants'}
        title={'All variants'}
        height={this.state.trackHeight}
        color={'#757575'}
        markerConfig={markerConfigAll}
        variants={variantsProcessed.filter(v =>
          !R.contains(cats, v.consequence))}
      />
    )
    return (
      <div className={css.page}>
        <h1>Infinite + combined datasets + annotations</h1>
        <div className={css.menus}>
          <p>Gene</p>
          <DropDownMenu value={this.state.currentGene} onChange={this.handleChange}>
            {this.state.testGenes.map((gene, i) =>
              <MenuItem key={`${gene}-menu-${i}`} value={gene} primaryText={gene} />,
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
        </div>
        <div className={css.menus}>
          <p>markerType</p>
          <DropDownMenu value={this.state.markerType} onChange={this.handleMarkerTypeChange}>
            {['circle', 'tick', 'af'].map(markerType =>
              <MenuItem key={`${markerType}-menu`} value={markerType} primaryText={markerType} />,
            )}
          </DropDownMenu>
          <Checkbox
            label="Split consequences"
            onCheck={this.handleSplitConsequences}
            style={{ display: 'flex', width: 200, height: 25 }}
          />
          <p>AF domain max</p>
          <DropDownMenu value={this.state.afMax} onChange={this.handleAfMaxChange}>
            {[1, 0.1, 0.01, 0.001, 0.0001, 0.00005, 0.00001].map(afmax =>
              <MenuItem key={`${afmax}-menu`} value={afmax} primaryText={afmax} />,
            )}
          </DropDownMenu>
          <p>Track height</p>
          <Slider
            style={{
              width: 100,
            }}
            onChange={this.setTrackHeight}
          />
          <p>Exon padding</p>
          <Slider
            style={{
              width: 100,
            }}
            onChange={this.setPadding}
          />
          {this.state.isFetching && refreshIndicatorSmall}
        </div>
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
        <div className={css.menus}>
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
        </div>
        <RegionViewer
          css={css}
          width={1000}
          regions={canonicalExons}
          regionAttributes={regionAttributesConfig}
          padding={this.state.padding}
          onRegionClick={onCursorClick}
        >
          <NavigatorTrack
            title={'Navigator'}
            height={50}
            onNavigatorClick={this.onCursorClick}
          />
          <TranscriptTrack
            transcriptsGrouped={transcriptsGrouped}
            height={15}
          />
          {splitTracks}
          {allTrack}
        </RegionViewer>
        <p>{`${variantsProcessed.length} latest fetch: ${this.state.latestFetch} variants in  ${this.state.timer} ms`}</p>
        <VariantTable
          title={''}
          height={400}
          width={1100}
          tableConfig={tableDataConfig}
          tableData={variantsProcessed}
          overscan={60}
          showIndex
          loadLookAhead={1000}
          remoteRowCount={this.state.totalVariantCount}
          loadMoreRows={this.fetchMoreData}
          scrollToRow={this.state.tablePosition}
        />
      </div>
    )
  }
}

export default Composite
