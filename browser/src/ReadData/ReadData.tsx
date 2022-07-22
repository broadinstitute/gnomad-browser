import PropTypes from 'prop-types'
import React, { Component, Suspense, lazy } from 'react'
import styled from 'styled-components'

import { Badge, Button, ExternalLink } from '@gnomad/ui'

import { isSubset } from '../../../dataset-metadata/metadata'
import { BaseQuery } from '../Query'
import StatusMessage from '../StatusMessage'

const IGVBrowser = lazy(() => import('./IGVBrowser'))

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

type ReadDataPropType = {
  bamPath: string
  category: 'het' | 'hom' | 'hemi'
  indexPath: string
  label?: string
  readGroup: string
}

// @ts-expect-error TS(2322) FIXME: Type 'Requireable<InferProps<{ bamPath: Validator<... Remove this comment to see the full error message
const ReadDataPropType: PropTypes.Requireable<ReadDataPropType> = PropTypes.shape({
  bamPath: PropTypes.string.isRequired,
  category: PropTypes.oneOf(['het', 'hom', 'hemi']).isRequired,
  indexPath: PropTypes.string.isRequired,
  label: PropTypes.string,
  readGroup: PropTypes.string.isRequired,
})

type OwnReadDataProps = {
  datasetId: string
  referenceGenome: 'GRCh37' | 'GRCh38'
  chrom: string
  start: number
  stop: number
  exomeReads: ReadDataPropType[]
  genomeReads: ReadDataPropType[]
  showHemizygotes?: boolean
}

type ReadDataState = any

type ReadDataProps = OwnReadDataProps & typeof ReadData.defaultProps

class ReadData extends Component<ReadDataProps, ReadDataState> {
  static defaultProps = {
    children: undefined,
    showHemizygotes: false,
  }

  igvBrowser: any
  tracksLoaded: any

  constructor(props: ReadDataProps) {
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

  onCreateBrowser = (igvBrowser: any) => {
    this.igvBrowser = igvBrowser

    this.loadInitialTracks()
  }

  hasReadData(exomeOrGenome: any) {
    const { exomeReads, genomeReads } = this.props

    if (exomeOrGenome === 'exome') {
      return exomeReads && exomeReads.length > 0
    }
    if (exomeOrGenome === 'genome') {
      return genomeReads && genomeReads.length > 0
    }
    return false
  }

  canLoadMoreTracks(exomeOrGenome: any, category: any) {
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

  loadNextTrack(exomeOrGenome: any, category: any) {
    const { exomeReads, genomeReads } = this.props
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    const reads = {
      exome: exomeReads,
      genome: genomeReads,
    }[exomeOrGenome]

    const tracksLoadedForCategory = this.tracksLoaded[exomeOrGenome][category]

    const readsInCategory = reads.filter((r: any) => r.category === category)

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

    this.setState((state: any) => ({
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
    ;['exome', 'genome'].forEach((exomeOrGenome) => {
      ;['het', 'hom', 'hemi'].forEach((category) => {
        if (this.canLoadMoreTracks(exomeOrGenome, category)) {
          this.loadNextTrack(exomeOrGenome, category)
        }
      })
    })
  }

  loadAllTracks() {
    const { tracksAvailable, tracksLoaded } = this.state

    ;['exome', 'genome'].forEach((exomeOrGenome) => {
      ;['het', 'hom', 'hemi'].forEach((category) => {
        const tracksAvailableForCategory = tracksAvailable[exomeOrGenome][category]
        const tracksLoadedForCategory = tracksLoaded[exomeOrGenome][category]

        for (let i = tracksLoadedForCategory; i < tracksAvailableForCategory; i += 1) {
          this.loadNextTrack(exomeOrGenome, category)
        }
      })
    })
  }

  renderLoadMoreButton(exomeOrGenome: any, category: any) {
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
    const { children, datasetId, referenceGenome, chrom, start, stop, showHemizygotes } = this.props

    if (!this.hasReadData('exome') && !this.hasReadData('genome')) {
      return (
        <div>
          <p>No read data available for this variant.</p>
          {(datasetId === 'exac' || datasetId.startsWith('gnomad_r2')) && (
            <p>
              <Badge level="info">Note</Badge> Read data for non-coding regions is not available in
              gnomAD v2.1.1 and ExAC.
            </p>
          )}
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
          {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
          <ExternalLink href="https://github.com/igvteam/igv.js">IGV.js</ExternalLink> visualization
          shows reads that went into calling this variant. Reads may not be available for every
          sample carrying this variant.
        </p>
        <p>
          These are reassembled reads produced by{' '}
          {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
          <ExternalLink href="https://www.broadinstitute.org/gatk/gatkdocs/org_broadinstitute_gatk_tools_walkers_haplotypecaller_HaplotypeCaller.php#--bamOutput">
            GATK HaplotypeCaller --bamOutput
          </ExternalLink>
          , so they accurately represent what HaplotypeCaller was seeing when it called this
          variant.
        </p>
        {datasetId.startsWith('gnomad_r2') && (
          <p>
            <Badge level="info">Note</Badge> Reads shown here may include low quality genotypes that
            were excluded from allele counts.
          </p>
        )}
        {isSubset(datasetId) && (
          <p>
            <Badge level="info">Note</Badge> Samples shown below are not guaranteed to be part of
            the selected subset.
          </p>
        )}

        {children}

        <Suspense fallback={null}>
          {/* @ts-expect-error TS(2322) FIXME: Type '(igvBrowser: any) => void' is not assignable... Remove this comment to see the full error message */}
          <IGVBrowser config={browserConfig} onCreateBrowser={this.onCreateBrowser} />
        </Suspense>

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

const interleaveReads = (allVariantReads: any) => {
  let reads: any = []
  ;['het', 'hom', 'hemi'].forEach((category) => {
    const allReadsInCategory = allVariantReads.map((variantReads: any) =>
      variantReads.filter((read: any) => read.category === category)
    )
    while (allReadsInCategory.some((variantReads: any) => variantReads.length)) {
      reads = reads.concat(
        allReadsInCategory
          .map((variantReads: any) => variantReads.shift())
          .filter((read: any) => read !== undefined)
      )
    }
  })
  return reads
}

type ReadDataContainerProps = {
  datasetId: string
  variantIds: string[]
}

const ReadDataContainer = ({ datasetId, variantIds }: ReadDataContainerProps) => {
  if (variantIds.length === 0) {
    return null
  }

  // Reads are not broken down by subset.
  let readsDatasetId: any
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
    // @ts-expect-error TS(2769) FIXME: No overload matches this call.
    <BaseQuery query={query} url="/reads/">
      {({ data, error, graphQLErrors, loading }: any) => {
        if (loading) {
          return <StatusMessage>Loading reads...</StatusMessage>
        }

        if (error || !data) {
          return <StatusMessage>Unable to load reads</StatusMessage>
        }

        const variants = variantIds.map((variantId) => {
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
            return (data[`variant_${i}`].exome || []).map((read: any) => {
              const { category } = read
              // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
              categoryCount[category] += 1
              return {
                ...read,
                label: `${variantIds.length > 1 ? `${variantId} ` : ''}${category} [exome] #${
                  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                  categoryCount[category]
                }`,
              }
            })
          })
        )

        const genomeReads = interleaveReads(
          variantIds.map((variantId, i) => {
            const categoryCount = { het: 0, hom: 0, hemi: 0 }
            return (data[`variant_${i}`].genome || []).map((read: any) => {
              const { category } = read
              // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
              categoryCount[category] += 1
              return {
                ...read,
                label: `${variantIds.length > 1 ? `${variantId} ` : ''}${category} [genome] #${
                  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                  categoryCount[category]
                }`,
              }
            })
          })
        )

        return (
          <ReadData
            datasetId={datasetId}
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
                {graphQLErrors.map((e: any) => e.message).join('. ')}.
              </p>
            )}
          </ReadData>
        )
      }}
    </BaseQuery>
  )
}

export default ReadDataContainer
