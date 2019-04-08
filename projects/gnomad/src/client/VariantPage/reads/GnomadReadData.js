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

const ReadDataPropType = PropTypes.shape({
  bamPath: PropTypes.string.isRequired,
  category: PropTypes.oneOf(['het', 'hom', 'hemi']).isRequired,
  indexPath: PropTypes.string.isRequired,
  readGroup: PropTypes.string.isRequired,
})

export class GnomadReadData extends Component {
  static propTypes = {
    showHemizygotes: PropTypes.bool,
    variant: PropTypes.shape({
      chrom: PropTypes.string.isRequired,
      exome: PropTypes.shape({
        reads: PropTypes.arrayOf(ReadDataPropType),
      }),
      genome: PropTypes.shape({
        reads: PropTypes.arrayOf(ReadDataPropType),
      }),
    }).isRequired,
  }

  static defaultProps = {
    showHemizygotes: false,
  }

  constructor(props) {
    super(props)

    const { variant } = this.props

    this.state = {
      tracksAvailable: {
        exome: (variant.exome && variant.exome.reads ? variant.exome.reads : []).reduce(
          (acc, read) => ({
            ...acc,
            [read.category]: acc[read.category] + 1,
          }),
          { het: 0, hom: 0, hemi: 0 }
        ),
        genome: (variant.genome && variant.genome.reads ? variant.genome.reads : []).reduce(
          (acc, read) => ({
            ...acc,
            [read.category]: acc[read.category] + 1,
          }),
          { het: 0, hom: 0, hemi: 0 }
        ),
      },
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

    this.tracksLoaded = {
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
    }
  }

  onCreateBrowser = igvBrowser => {
    this.igvBrowser = igvBrowser

    this.loadInitialTracks()
  }

  hasReadData(exomeOrGenome) {
    const { variant } = this.props
    if (!variant[exomeOrGenome]) {
      return false
    }

    const { reads } = variant[exomeOrGenome]
    return reads && reads.length > 0
  }

  canLoadMoreTracks(exomeOrGenome, category) {
    const { showHemizygotes } = this.props
    const { tracksAvailable, tracksLoaded } = this.state

    if (!this.hasReadData(exomeOrGenome)) {
      return false
    }

    if (category === 'hemi' && !showHemizygotes) {
      return false
    }

    const tracksAvailableForCategory = tracksAvailable[exomeOrGenome][category]
    const tracksLoadedForCategory = tracksLoaded[exomeOrGenome][category]

    return tracksLoadedForCategory < tracksAvailableForCategory
  }

  loadNextTrack(exomeOrGenome, category) {
    const { variant } = this.props
    const { reads } = variant[exomeOrGenome]

    const tracksLoadedForCategory = this.tracksLoaded[exomeOrGenome][category]

    const readsInCategory = reads.filter(r => r.category === category)

    const nextRead = readsInCategory[tracksLoadedForCategory]

    const trackConfig = {
      autoHeight: false,
      colorBy: 'strand',
      format: 'bam',
      height: 300,
      indexURL: `${API_URL}/${nextRead.indexPath}`,
      name: `${category} [${exomeOrGenome}] #${tracksLoadedForCategory + 1}`,
      pairsSupported: false,
      readgroup: nextRead.readGroup,
      removable: false,
      samplingDepth: 1000,
      type: 'alignment',
      url: `${API_URL}/${nextRead.bamPath}`,
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

    this.tracksLoaded = {
      ...this.tracksLoaded,
      [exomeOrGenome]: {
        ...this.tracksLoaded[exomeOrGenome],
        [category]: this.tracksLoaded[exomeOrGenome][category] + 1,
      },
    }

    this.igvBrowser.loadTrack(trackConfig)
  }

  loadInitialTracks() {
    ;['exome', 'genome'].forEach(exomeOrGenome => {
      ;['het', 'hom', 'hemi'].forEach(category => {
        if (this.canLoadMoreTracks(exomeOrGenome, category)) {
          this.loadNextTrack(exomeOrGenome, category)
        }
      })
    })
  }

  loadAllTracks() {
    const { tracksAvailable, tracksLoaded } = this.state

    ;['exome', 'genome'].forEach(exomeOrGenome => {
      ;['het', 'hom', 'hemi'].forEach(category => {
        const tracksAvailableForCategory = tracksAvailable[exomeOrGenome][category]
        const tracksLoadedForCategory = tracksLoaded[exomeOrGenome][category]

        for (let i = tracksLoadedForCategory; i < tracksAvailableForCategory; i += 1) {
          this.loadNextTrack(exomeOrGenome, category)
        }
      })
    })
  }

  renderLoadMoreButton(exomeOrGenome, category) {
    return (
      <Button
        disabled={!this.canLoadMoreTracks(exomeOrGenome, category)}
        onClick={() => this.loadNextTrack(exomeOrGenome, category)}
      >
        Load +1 {category}
      </Button>
    )
  }

  render() {
    const { showHemizygotes, variant } = this.props

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
        fastaURL: `${'https://gnomad.broadinstitute.org/api'}/reads/gnomad_r2_1/hg19.fa`,
        id: 'hg19',
        indexURL: `${'https://gnomad.broadinstitute.org/api'}/reads/gnomad_r2_1/hg19.fa.fai`,
      },
      tracks: [
        {
          displayMode: 'SQUISHED',
          indexURL: `${'https://gnomad.broadinstitute.org/api'}/reads/gnomad_r2_1/gencode.v19.sorted.bed.idx`,
          name: 'gencode v19',
          removable: false,
          url: `${'https://gnomad.broadinstitute.org/api'}/reads/gnomad_r2_1/gencode.v19.sorted.bed`,
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
            {showHemizygotes && this.renderLoadMoreButton('exome', 'hemi')}
          </ControlContainer>
        )}

        {this.hasReadData('genome') && (
          <ControlContainer>
            <strong>Genomes:</strong>
            {this.renderLoadMoreButton('genome', 'het')}
            {this.renderLoadMoreButton('genome', 'hom')}
            {showHemizygotes && this.renderLoadMoreButton('genome', 'hemi')}
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
