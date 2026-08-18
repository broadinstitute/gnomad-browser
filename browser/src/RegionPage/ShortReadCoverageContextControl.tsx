import React, { useCallback } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import styled from 'styled-components'

import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import HaplotypeHelpButton from '../Haplotypes/HelpButton'
import { SHORT_READ_COVERAGE_CAVEAT } from './ShortReadCoverageContextTrack'
import {
  isShortReadCoverageContextEligible,
  shouldShowShortReadCoverageContext,
  updateShortReadCoverageSearch,
} from './shortReadCoverageContext'

type CoverageContextRegion = {
  reference_genome: 'GRCh37' | 'GRCh38'
  chrom: string
}

const CoverageContextControl = styled.div`
  max-width: 580px;
  margin: 0.75em 0;

  @media (min-width: 1201px) {
    max-width: 520px;
    margin-left: 1.5em;
  }
`

const CoverageContextLabelRow = styled.div`
  display: flex;
  align-items: center;
`

const CoverageContextLabel = styled.label`
  display: flex;
  align-items: center;
  min-height: 44px;
  font-weight: 600;
  cursor: pointer;

  input {
    width: 20px;
    height: 20px;
    margin: 0 0.6em 0 0;
    flex: 0 0 auto;
  }
`

const CoverageContextUnavailable = styled.div`
  max-width: 520px;
  margin: 1em 0 1em 1.5em;
  font-size: 0.875rem;
`

export const useShortReadCoverageContext = (
  datasetId: DatasetId,
  region: CoverageContextRegion
) => {
  const location = useLocation()
  const history = useHistory()
  const eligible = isShortReadCoverageContextEligible(datasetId, region)
  const show = shouldShowShortReadCoverageContext(location.search, datasetId, region)

  const setShow = useCallback(
    (nextShow: boolean) => {
      history.replace({
        ...location,
        search: updateShortReadCoverageSearch(location.search, nextShow),
      })
    },
    [history, location]
  )

  return { eligible, show, setShow }
}

type Props = {
  eligible: boolean
  show: boolean
  onChange: (show: boolean) => void
  showUnavailable?: boolean
}

const ShortReadCoverageContextControl = ({
  eligible,
  show,
  onChange,
  showUnavailable = true,
}: Props) => {
  if (!eligible) {
    return showUnavailable ? (
      <CoverageContextUnavailable>
        Short-read coverage context is available only for GRCh38 autosomes 1–22; it is not available
        for X, Y, or mitochondrial LR regions.
      </CoverageContextUnavailable>
    ) : null
  }

  return (
    <CoverageContextControl>
      <CoverageContextLabelRow>
        <CoverageContextLabel>
          <input
            type="checkbox"
            checked={show}
            onChange={(event) => onChange(event.currentTarget.checked)}
          />
          Show short-read coverage context
        </CoverageContextLabel>
        <HaplotypeHelpButton title="About short-read coverage context">
          <p>
            This option adds separate gnomAD v4.0 exome and gnomAD v3.0.1 genome short-read coverage
            below long-read coverage. Each track keeps its own metric and scale.
          </p>
          <p>{SHORT_READ_COVERAGE_CAVEAT}</p>
        </HaplotypeHelpButton>
      </CoverageContextLabelRow>
    </CoverageContextControl>
  )
}

export default ShortReadCoverageContextControl
