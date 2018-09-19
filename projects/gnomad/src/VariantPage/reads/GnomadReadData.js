import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { Button, ExternalLink } from '@broad/ui'

import { IGVBrowser } from './IGVBrowser'

const API_URL = process.env.GNOMAD_API_URL

const ControlContainer = styled.div`
  /* Offset the 80px wide label to center buttons under the IGV browser */
  padding-right: 80px;
  margin-top: 1em;
  text-align: center;

  strong {
    display: inline-block;
    width: 80px;
    text-align: right;
  }

  button {
    margin-left: 2em;
  }
`

const readsPropType = PropTypes.shape({
  het: PropTypes.shape({
    available: PropTypes.number.isRequired,
    readGroups: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  hom: PropTypes.shape({
    available: PropTypes.number.isRequired,
    readGroups: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  hemi: PropTypes.shape({
    available: PropTypes.number.isRequired,
    readGroups: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  bamPath: PropTypes.string.isRequired,
  indexPath: PropTypes.string.isRequired,
})

export class GnomadReadData extends Component {
  static propTypes = {
    variant: PropTypes.shape({
      chrom: PropTypes.string.isRequired,
      exome: PropTypes.shape({
        reads: readsPropType,
      }),
      genome: PropTypes.shape({
        reads: readsPropType,
      }),
    }).isRequired,
  }

  state = {
    tracksLoaded: {
      exome: {
        het: 0,
        hom: 0,
        hemi: 0,
      },
      genome: {
        het: 0,
        hom: 0,
        hemi: 0,
      },
    },
  }

  onCreateBrowser = igvBrowser => {
    this.igvBrowser = igvBrowser

    this.loadInitialTracks()
  }

  shouldShowHemiCategory() {
    return ['X', 'Y'].includes(this.props.variant.chrom)
  }

  hasReadData(exomeOrGenome) {
    return this.props.variant[exomeOrGenome] && this.props.variant[exomeOrGenome].reads
  }

  canLoadMoreTracks(exomeOrGenome, category) {
    if (!this.hasReadData(exomeOrGenome)) {
      return false
    }

    if (category === 'hemi' && !this.shouldShowHemiCategory()) {
      return false
    }

    const tracksAvailable = this.props.variant[exomeOrGenome].reads[category].available
    const tracksLoaded = this.state.tracksLoaded[exomeOrGenome][category]
    return tracksLoaded < tracksAvailable
  }

  loadTrack(exomeOrGenome, category, index) {
    const reads = this.props.variant[exomeOrGenome].reads

    const trackConfig = {
      autoHeight: false,
      colorBy: 'strand',
      format: 'bam',
      height: 300,
      indexURL: `${API_URL}/${reads.indexPath}`,
      name: `${category} [${exomeOrGenome}] #${index + 1}`,
      pairsSupported: false,
      readgroup: reads[category].readGroups[index],
      removable: false,
      samplingDepth: 1000,
      type: 'alignment',
      url: `${API_URL}/${reads.bamPath}`,
    }

    this.setState(state => ({
      ...state,
      tracksLoaded: {
        ...state.tracksLoaded,
        [exomeOrGenome]: {
          ...state.tracksLoaded[exomeOrGenome],
          [category]: state.tracksLoaded[exomeOrGenome][category] + 1,
        },
      },
    }))

    this.igvBrowser.loadTrack(trackConfig)
  }

  loadInitialTracks() {
    ;['exome', 'genome'].forEach(exomeOrGenome => {
      ;['het', 'hom', 'hemi'].forEach(category => {
        if (this.canLoadMoreTracks(exomeOrGenome, category)) {
          this.loadTrack(exomeOrGenome, category, 0)
        }
      })
    })
  }

  loadAllTracks() {
    ;['exome', 'genome'].forEach(exomeOrGenome => {
      ;['het', 'hom', 'hemi'].forEach(category => {
        const tracksAvailable = this.props.variant[exomeOrGenome].reads[category].available
        const tracksLoaded = this.state.tracksLoaded[exomeOrGenome][category]

        for (let i = tracksLoaded; i < tracksAvailable; i += 1) {
          this.loadTrack(exomeOrGenome, category, i)
        }
      })
    })
  }

  renderLoadMoreButton(exomeOrGenome, category) {
    const tracksLoaded = this.state.tracksLoaded[exomeOrGenome][category]

    return (
      <Button
        disabled={!this.canLoadMoreTracks(exomeOrGenome, category)}
        onClick={() => this.loadTrack(exomeOrGenome, category, tracksLoaded)}
      >
        Load +1 {category}
      </Button>
    )
  }

  render() {
    const variant = this.props.variant

    if (!this.hasReadData('exome') && !this.hasReadData('genome')) {
      return (
        <div>
          <p>No read data available for this variant.</p>
        </div>
      )
    }

    const browserConfig = {
      locus: `${variant.chrom}:${variant.pos - 40}-${variant.pos + 40}`,
      reference: {
        fastaURL: `${API_URL}/reads/hg19.fa`,
        id: 'hg19',
        indexURL: `${API_URL}/reads/hg19.fa.fai`,
      },
      tracks: [
        {
          displayMode: 'SQUISHED',
          name: 'gencode v19',
          removable: false,
          url: `${API_URL}/reads/gencode.v19.sorted.bed`,
        },
      ],
    }

    return (
      <div>
        <p>
          This interactive{' '}
          <ExternalLink href="https://github.com/igvteam/igv.js">IGV.js</ExternalLink> visualization
          shows reads that went into calling this variant.
        </p>
        <p>
          Note: These are reassembled reads produced by{' '}
          <ExternalLink href="https://www.broadinstitute.org/gatk/gatkdocs/org_broadinstitute_gatk_tools_walkers_haplotypecaller_HaplotypeCaller.php#--bamOutput">
            GATK HaplotypeCaller --bamOutput
          </ExternalLink>
          , so they accurately represent what HaplotypeCaller was seeing when it called this
          variant.
        </p>

        <IGVBrowser config={browserConfig} onCreateBrowser={this.onCreateBrowser} />

        {this.hasReadData('exome') && (
          <ControlContainer>
            <strong>Exomes:</strong>
            {this.renderLoadMoreButton('exome', 'het')}
            {this.renderLoadMoreButton('exome', 'hom')}
            {this.shouldShowHemiCategory() && this.renderLoadMoreButton('exome', 'hemi')}
          </ControlContainer>
        )}

        {this.hasReadData('genome') && (
          <ControlContainer>
            <strong>Genomes:</strong>
            {this.renderLoadMoreButton('genome', 'het')}
            {this.renderLoadMoreButton('genome', 'hom')}
            {this.shouldShowHemiCategory() && this.renderLoadMoreButton('genome', 'hemi')}
          </ControlContainer>
        )}

        <ControlContainer>
          <Button
            disabled={
              !(
                this.canLoadMoreTracks('exome', 'het') ||
                this.canLoadMoreTracks('exome', 'hom') ||
                this.canLoadMoreTracks('exome', 'hemi') ||
                this.canLoadMoreTracks('genome', 'het') ||
                this.canLoadMoreTracks('genome', 'hom') ||
                this.canLoadMoreTracks('genome', 'hemi')
              )
            }
            onClick={() => this.loadAllTracks()}
            style={{ marginLeft: '80px' }}
          >
            Load all
          </Button>
        </ControlContainer>
      </div>
    )
  }
}
