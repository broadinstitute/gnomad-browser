import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { Badge, Button, ExternalLink } from '@gnomad/ui'

import { BaseQuery } from '../../Query'
import StatusMessage from '../../StatusMessage'
import { IGVBrowser } from './IGVBrowser'

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

  @media (max-width: 500px) {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-right: 0;

    strong {
      width: auto;
      margin-bottom: 0.5em;
    }

    button {
      margin-left: 0 !important;

      &:last-child {
        margin-top: 1em;
      }
    }
  }
`

const ReadDataPropType = PropTypes.shape({
  bamPath: PropTypes.string.isRequired,
  category: PropTypes.oneOf(['het', 'hom', 'hemi']).isRequired,
  indexPath: PropTypes.string.isRequired,
  label: PropTypes.string,
  readGroup: PropTypes.string.isRequired,
})

class GnomadReadData extends Component {
  static propTypes = {
    children: PropTypes.node,
    referenceGenome: PropTypes.oneOf(['GRCh37', 'GRCh38']).isRequired,
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
    exomeReads: PropTypes.arrayOf(ReadDataPropType).isRequired,
    genomeReads: PropTypes.arrayOf(ReadDataPropType).isRequired,
    showHemizygotes: PropTypes.bool,
  }

  static defaultProps = {
    children: undefined,
    showHemizygotes: false,
  }

  constructor(props) {
    super(props)

    const { exomeReads, genomeReads } = this.props

    this.state = {
      tracksAvailable: {
        exome: exomeReads.reduce(
          (acc, read) => ({
            ...acc,
            [read.category]: acc[read.category] + 1,
          }),
          { het: 0, hom: 0, hemi: 0 }
        ),
        genome: genomeReads.reduce(
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
    const { exomeReads, genomeReads } = this.props

    if (exomeOrGenome === 'exome') {
      return exomeReads && exomeReads.length > 0
    }
    if (exomeOrGenome === 'genome') {
      return genomeReads && genomeReads.length > 0
    }
    return false
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
    const { exomeReads, genomeReads } = this.props
    const reads = {
      exome: exomeReads,
      genome: genomeReads,
    }[exomeOrGenome]

    const tracksLoadedForCategory = this.tracksLoaded[exomeOrGenome][category]

    const readsInCategory = reads.filter(r => r.category === category)

    const nextRead = readsInCategory[tracksLoadedForCategory]

    const trackConfig = {
      autoHeight: false,
      colorBy: 'strand',
      format: 'bam',
      height: 300,
      indexURL: nextRead.indexPath,
      name: nextRead.label || `${category} [${exomeOrGenome}] #${tracksLoadedForCategory + 1}`,
      pairsSupported: false,
      readgroup: nextRead.readGroup,
      removable: false,
      samplingDepth: 1000,
      type: 'alignment',
      url: nextRead.bamPath,
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
    const { children, referenceGenome, chrom, start, stop, showHemizygotes } = this.props

    if (!this.hasReadData('exome') && !this.hasReadData('genome')) {
      return (
        <div>
          <p>No read data available for this variant.</p>
        </div>
      )
    }

    const locus = `${chrom}:${start}-${stop}`

    const browserConfig =
      referenceGenome === 'GRCh37'
        ? {
            locus,
            reference: {
              fastaURL: '/reads/reference/Homo_sapiens_assembly19.fasta',
              id: 'hg19',
              indexURL: '/reads/reference/Homo_sapiens_assembly19.fasta.fai',
            },
            tracks: [
              {
                displayMode: 'SQUISHED',
                indexURL: '/reads/reference/gencode.v19.bed.gz.tbi',
                name: 'GENCODE v19',
                removable: false,
                url: '/reads/reference/gencode.v19.bed.gz',
              },
            ],
          }
        : {
            locus,
            reference: {
              fastaURL: '/reads/reference/Homo_sapiens_assembly38.fasta',
              id: 'hg38',
              indexURL: '/reads/reference/Homo_sapiens_assembly38.fasta.fai',
            },
            tracks: [
              {
                displayMode: 'SQUISHED',
                indexURL: '/reads/reference/gencode.v35.bed.gz.tbi',
                name: 'GENCODE v35',
                removable: false,
                url: '/reads/reference/gencode.v35.bed.gz',
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

        {children}

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

const interleaveReads = allVariantReads => {
  let reads = []
  ;['het', 'hom', 'hemi'].forEach(category => {
    const allReadsInCategory = allVariantReads.map(variantReads =>
      variantReads.filter(read => read.category === category)
    )
    while (allReadsInCategory.some(variantReads => variantReads.length)) {
      reads = reads.concat(
        allReadsInCategory
          .map(variantReads => variantReads.shift())
          .filter(read => read !== undefined)
      )
    }
  })
  return reads
}

const GnomadReadDataContainer = ({ datasetId, variantIds }) => {
  if (variantIds.length === 0) {
    return null
  }

  // Reads are not broken down by subset.
  let readsDatasetId
  if (datasetId.startsWith('gnomad_r3')) {
    readsDatasetId = 'gnomad_r3'
  } else if (datasetId.startsWith('gnomad_r2')) {
    readsDatasetId = 'gnomad_r2'
  } else {
    readsDatasetId = datasetId
  }

  const query = `
    {
      ${variantIds
        .map(
          (
            variantId,
            i
          ) => `variant_${i}: variantReads(dataset: ${readsDatasetId}, variantId: "${variantId}") {
        exome {
          bamPath
          category
          indexPath
          readGroup
        }
        genome {
          bamPath
          category
          indexPath
          readGroup
        }
      }`
        )
        .join('\n')}
    }
  `

  return (
    <BaseQuery query={query} url="/reads/">
      {({ data, error, graphQLErrors, loading }) => {
        if (loading) {
          return <StatusMessage>Loading reads...</StatusMessage>
        }

        if (error || !data) {
          return <StatusMessage>Unable to load reads</StatusMessage>
        }

        const variants = variantIds.map(variantId => {
          const [chrom, pos, ref, alt] = variantId.split('-')
          return { chrom, pos: Number(pos), ref, alt }
        })

        // Assume all variants are on the same chromosome
        const { chrom } = variants[0]

        const minPosition = variants.reduce(
          (minPos, variant) => Math.min(minPos, variant.pos),
          Infinity
        )
        const maxPosition = variants.reduce(
          (maxPos, variant) => Math.max(maxPos, variant.pos),
          -Infinity
        )

        const positionDifference = maxPosition - minPosition
        const [start, stop] =
          positionDifference > 80
            ? [minPosition, maxPosition]
            : [
                minPosition - Math.ceil((80 - positionDifference) / 2),
                maxPosition + Math.floor((80 - positionDifference) / 2),
              ]

        // Concatenate reads from all variants
        const exomeReads = interleaveReads(
          variantIds.map((variantId, i) => {
            const categoryCount = { het: 0, hom: 0, hemi: 0 }
            return (data[`variant_${i}`].exome || []).map(read => {
              const { category } = read
              categoryCount[category] += 1
              return {
                ...read,
                label: `${variantIds.length > 1 ? `${variantId} ` : ''}${category} [exome] #${
                  categoryCount[category]
                }`,
              }
            })
          })
        )

        const genomeReads = interleaveReads(
          variantIds.map((variantId, i) => {
            const categoryCount = { het: 0, hom: 0, hemi: 0 }
            return (data[`variant_${i}`].genome || []).map(read => {
              const { category } = read
              categoryCount[category] += 1
              return {
                ...read,
                label: `${variantIds.length > 1 ? `${variantId} ` : ''}${category} [genome] #${
                  categoryCount[category]
                }`,
              }
            })
          })
        )

        return (
          <GnomadReadData
            referenceGenome={
              readsDatasetId === 'exac' || readsDatasetId === 'gnomad_r2' ? 'GRCh37' : 'GRCh38'
            }
            chrom={chrom}
            start={start}
            stop={stop}
            exomeReads={exomeReads}
            genomeReads={genomeReads}
            showHemizygotes={chrom === 'X' || chrom === 'Y'}
          >
            {graphQLErrors && (
              <p>
                <Badge level="warning">Warning</Badge>{' '}
                {graphQLErrors.map(e => e.message).join('. ')}.
              </p>
            )}
          </GnomadReadData>
        )
      }}
    </BaseQuery>
  )
}

GnomadReadDataContainer.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variantIds: PropTypes.arrayOf(PropTypes.string).isRequired,
}

export default GnomadReadDataContainer
