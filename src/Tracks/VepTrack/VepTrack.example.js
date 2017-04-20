/* eslint-disable camelcase */

import React, { Component } from 'react'
import R from 'ramda'
import fetch from 'graphql-fetch'
import DropDownMenu from 'material-ui/DropDownMenu'
import MenuItem from 'material-ui/MenuItem'

import { groupExonsByTranscript } from 'utilities'
import { processVariantsList } from 'utilities/exalt/process'


import RegionViewer from '../../RegionViewer'
import TranscriptTrack from '../TranscriptTrack'
import VariantTrack from '../VariantTrack'
import GenericTableTrack from './index'

import css from './styles.css'

const API_URL = process.env.API_URL

export const genericTableFetch = (geneName, dataset) => {
  const query = `
  {
    gene(gene_name: "${geneName}") {
      gene_name
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
      variants: ${dataset}_variants {
        variant_id
        pos
        rsid
        filter
        allele_count
        allele_num
        allele_freq
        vep_annotations {
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
        }
      }
    }
  }`
  return new Promise((resolve, reject) => {
    fetch(API_URL)(query)
      .then((data) => {
        // console.log(data)
        resolve(data.data.gene)
      })
      .catch((error) => {
        // console.log(error)
        reject(error)
      })
  })
}

class GenericTableTrackExample extends Component {
  state = {
    circleRadius: 3,
    circleStrokeWidth: 1,
    hasData: false,
    currentGene: 'BRCA2',
    currentDataset: 'exacv1',
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
      'MYH7',
      'MYBPC3',
      'ARSF',
      'CD33',
      'DMD',
      'TTN',
      'ARID1B',
      'CHD7',
      'CASK',
      'CDKL5',
      'HCCS',
      'KDM6A',
      'MECP2',
      'PCDH19',
      'WDR45',
      'ACSL4',
      'BCOR',
      'DCX',
      'EBP',
      'EFNB1',
      'FLNA',
      'FMR1',
      'GRIA3',
      'LAMP2',
      'NSDHL',
      'OFD1',
      'OTC',
      'PDHA1',
      'PHF6',
      'PLP1',
      'PORCN',
      'SLC6A8',
      'SLC9A6',
      'TIMM8A',
      'BTK',
      'GLA',
      'MID1',
      'PRPS1',
      'COL4A5',
      'UPF3B',
      'CUL4B',
      'XIAP',
      'SH2D1A',
      'OCRL',
      'FRMD7',
      'GPC3',
      'HPRT1',
      'ZIC3',
      'TRAPPC2',
      'F9',
      'AFF2',
      'IDS',
      'FANCB',
      'MTM1',
      'ABCD1',
      'L1CAM',
      'AVPR2',
      'IKBKG',
      'F8',
      'RAB39B',
      'AP1S2',
      'NHS',
      'RS1',
      'RPS6KA3',
      'CNKSR2',
      'SMS',
      'PHEX',
      'ARX',
      'ARSE',
      'IL1RAPL1',
      'NR0B1',
      'GK',
      'DMD',
      'CYBB',
      'NYX',
      'NDP',
      'RP2',
      'FTSJ1',
      'PQBP1',
      'CLCN5',
      'KDM5C',
      'PHF8',
      'FGD1',
      'NLGN4X',
      'SHOX',
      'AR',
      'OPHN1',
      'EDA',
      'DLG3',
      'STS',
      'XIST',
      'SLC16A2',
      'ATRX',
      'ATP7A',
      'PGK1',
      'KAL1',
      'CHM',
      'CNKSR2',
      'TBX22',
      'WDR45',
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
    genericTableFetch(this.state.currentGene, this.state.currentDataset).then((data) => {
      // console.log(data)
      this.setState({ geneData: data })
      this.setState({ hasData: true })
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

  render() {
    if (!this.state.hasData) {
      return <p className={css.cool}>Loading!</p>
    }

    const { gene_name, variants } = this.state.geneData
    const geneExons = this.state.geneData.exons
    const transcriptsGrouped = groupExonsByTranscript(geneExons)

    const canonicalExons = this.state.geneData.transcript.exons
    const variantsProcessed = processVariantsList(variants)
    // console.log('proc var', variantsProcessed)
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
        { dataKey: 'variant_id', title: 'Variant ID', dataType: 'string' },
        { dataKey: 'rsid', title: 'RSID', dataType: 'string' },
        { dataKey: 'consequence', title: 'Consequence', dataType: 'string' },
        { dataKey: 'filter', title: 'Filter', dataType: 'filter' },
        { dataKey: 'allele_count', title: 'AC', dataType: 'integer' },
        { dataKey: 'allele_num', title: 'AN', dataType: 'integer' },
        { dataKey: 'allele_freq', title: 'AF', dataType: 'float' },
      ],
    }

    const consequenceCategories = [
      // { annotation: 'transcript_ablation', colour: '#ed2024' },
      { annotation: 'splice_acceptor_variant', colour: '#f26424' },
      { annotation: 'splice_donor_variant', colour: '#f26424' },
      { annotation: 'stop_gained', colour: '#ed2024' },
      { annotation: 'frameshift_variant', colour: '#85489c' },
      // { annotation: 'stop_lost', colour: '#ed2024' },
      // { annotation: 'start_lost', colour: '#fedc00' },
      // { annotation: 'initiator_codon_variant', colour: '#fff' },
      { annotation: 'transcript_amplification', colour: '#f177ae' },
      { annotation: 'inframe_insertion', colour: '#f177ae' },
      { annotation: 'inframe_deletion', colour: '#f177ae' },
      { annotation: 'missense_variant', colour: '#fedc00' },
      // { annotation: 'protein_altering_variant', colour: '#ed2089' },
      { annotation: 'splice_region_variant', colour: '#f68a5d' },
      // { annotation: 'incomplete_terminal_codon_variant', colour: '#b9529f' },
      // { annotation: 'stop_retained_variant', colour: '#8fc73e' },
      { annotation: 'synonymous_variant', colour: '#8fc73e' },
      // { annotation: 'coding_sequence_variant', colour: '#4f9743' },
      // { annotation: 'mature_miRNA_variant', colour: '#4f9743' },
      // { annotation: '5_prime_UTR_variant', colour: '#85cbd3' },
      // { annotation: '3_prime_UTR_variant', colour: '#85cbd3' },
      // { annotation: 'non_coding_transcript_exon_variant', colour: '#5aba47' },
      // { annotation: 'non_coding_exon_variant', colour: '#fff' },
      { annotation: 'intron_variant', colour: '#0064a6' },
      // { annotation: 'NMD_transcript_variant', colour: '#f05223' },
      // { annotation: 'non_coding_transcript_variant', colour: '#5aba47' },
      // { annotation: 'nc_transcript_variant', colour: '#fff' },
      // { annotation: 'upstream_gene_variant', colour: '#acbdd3' },
      // { annotation: 'downstream_gene_variant', colour: '#acbdd3' },
      // { annotation: 'TFBS_ablation', colour: '#af302f' },
      // { annotation: 'TFBS_amplification', colour: '#af302f' },
      // { annotation: 'TF_binding_site_variant', colour: '#af302f' },
      // { annotation: 'regulatory_region_ablation', colour: '#af302f' },
      // { annotation: 'regulatory_region_amplification', colour: '#af302f' },
      // { annotation: 'feature_elongation', colour: '#8a8a8a' },
      // { annotation: 'regulatory_region_variant', colour: '#af302f' },
      // { annotation: 'feature_truncation', colour: '#8a8a8a' },
      // { annotation: 'intergenic_variant', colour: '#8a8a8a' },
    ]

    const consequenceTracks = consequenceCategories.map(consequence => (
      <VariantTrack
        title={consequence.annotation.replace('_', ' ')}
        height={25}
        color={consequence.colour}
        circleRadius={this.state.circleRadius}
        circleStroke={'black'}
        circleStrokeWidth={this.state.circleStrokeWidth}
        variants={variantsProcessed.filter(variant =>
           R.contains(consequence.annotation, variant.consequence))
         }
      />
    ))

    return (
      <div className={css.page}>
        <h1>Annotation demo</h1>
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
          <DropDownMenu value={this.state.circleStrokeWidth} onChange={this.handleCircleStrokeWidthChange}>
            {[0, 1, 2].map(circleStrokeWidth =>
              <MenuItem key={`${circleStrokeWidth}-menu`} value={circleStrokeWidth} primaryText={circleStrokeWidth} />,
            )}
          </DropDownMenu>
        </div>
        <RegionViewer
          css={css}
          width={1000}
          regions={canonicalExons}
          regionAttributes={regionAttributesConfig}
        >
          <VariantTrack
            title={this.state.currentDataset}
            height={25}
            circleRadius={this.state.circleRadius}
            circleStroke={'black'}
            circleStrokeWidth={this.state.circleStrokeWidth}
            variants={variantsProcessed}
          />
          {consequenceTracks}
          <TranscriptTrack
            transcriptsGrouped={transcriptsGrouped}
            height={15}
          />
          <GenericTableTrack
            title={`Twenty ${this.state.currentDataset} ${gene_name} variants`}
            height={200}
            tableConfig={tableDataConfig}
            tableData={R.take(20, variantsProcessed)}
          />
        </RegionViewer>
      </div>
    )
  }
}

export default GenericTableTrackExample
