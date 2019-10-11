import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { ExternalLink, List } from '@broad/ui'

import { withAnchor } from '../AnchorLink'

export const FileList = styled(List)`
  li {
    line-height: 1.25;
  }
`

export const SectionTitle = withAnchor(styled.h2``)

export const ColumnsWrapper = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
`

export const Column = styled.div`
  flex-basis: calc(50% - 25px);

  @media (max-width: 900px) {
    flex-basis: 100%;
  }

  > h3 {
    margin-top: 0;
  }
`

export const ChromosomeVcfLinks = ({ chrom, md5, size, url }) => {
  const vcfUrl = url(chrom)
  const tabixUrl = `${vcfUrl}.tbi`

  return (
    <React.Fragment>
      <ExternalLink href={vcfUrl}>{`chr${chrom} sites VCF`}</ExternalLink>{' '}
      <ExternalLink href={tabixUrl}>(.tbi)</ExternalLink>
      <br />
      <span>
        {size}, MD5:&nbsp;{md5}
      </span>
    </React.Fragment>
  )
}

ChromosomeVcfLinks.propTypes = {
  chrom: PropTypes.string.isRequired,
  md5: PropTypes.string.isRequired,
  size: PropTypes.string.isRequired,
  url: PropTypes.func.isRequired,
}
