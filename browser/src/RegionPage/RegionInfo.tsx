import React from 'react'

import { ExternalLink } from '@gnomad/ui'

import AttributeList, { AttributeListItem } from '../AttributeList'

type Props = {
  region: {
    reference_genome: 'GRCh37' | 'GRCh38'
    chrom: string
    start: number
    stop: number
  }
}

const RegionInfo = ({ region }: Props) => {
  const { reference_genome: referenceGenome, chrom, start, stop } = region

  const ucscReferenceGenomeId = referenceGenome === 'GRCh37' ? 'hg19' : 'hg38'
  const ucscUrl = `https://genome.ucsc.edu/cgi-bin/hgTracks?db=${ucscReferenceGenomeId}&position=chr${chrom}%3A${start}-${stop}`

  return (
    <AttributeList style={{ marginTop: '1.25em' }}>
      <AttributeListItem label="Genome build">
        {referenceGenome} / {ucscReferenceGenomeId}
      </AttributeListItem>
      <AttributeListItem label="Region size">
        {(stop - start + 1).toLocaleString()} BP
      </AttributeListItem>
      <AttributeListItem label="External resources">
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href={ucscUrl}>UCSC Browser</ExternalLink>
      </AttributeListItem>
    </AttributeList>
  )
}

export default RegionInfo
