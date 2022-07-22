import React from 'react'
import styled from 'styled-components'

// @ts-expect-error TS(2732) FIXME: Cannot find module '@gnomad/dataset-metadata/datas... Remove this comment to see the full error message
import gnomadV3AgeDistribution from '@gnomad/dataset-metadata/datasets/gnomad-v3/ageDistribution.json'
// @ts-expect-error TS(2732) FIXME: Cannot find module '@gnomad/dataset-metadata/datas... Remove this comment to see the full error message
import gnomadV2AgeDistribution from '@gnomad/dataset-metadata/datasets/gnomad-v2/ageDistribution.json'

import Histogram from '../../../src/Histogram'

const ColumnsWrapper = styled.div`
  display: flex;
  flex-direction: row;

  @media (max-width: 700px) {
    flex-direction: column;
  }
`

const Column = styled.div`
  width: calc(50% - 15px);

  @media (max-width: 700px) {
    width: 100%;
  }
`

export const question = 'What is the age distribution in gnomAD?'

export const renderAnswer = () => (
  <>
    <p>For gnomAD v3, the age distribution is:</p>
    <ColumnsWrapper>
      <Column>
        <Histogram
          // @ts-expect-error TS(2322) FIXME: Type '{ binEdges: any; binValues: any; nSmaller: a... Remove this comment to see the full error message
          binEdges={gnomadV3AgeDistribution.genome.bin_edges}
          binValues={gnomadV3AgeDistribution.genome.bin_freq}
          nSmaller={gnomadV3AgeDistribution.genome.n_smaller}
          nLarger={gnomadV3AgeDistribution.genome.n_larger}
          barColor="#73ab3d"
          xLabel="Age"
          yLabel="Individuals"
          formatTooltip={(bin: any) => `${bin.label}: ${bin.value.toLocaleString()} individuals`}
        />
      </Column>
    </ColumnsWrapper>
    <p>For gnomAD v2, the age distribution is:</p>
    <ColumnsWrapper>
      <Column>
        <p>Exomes</p>
        <Histogram
          // @ts-expect-error TS(2322) FIXME: Type '{ binEdges: any; binValues: any; nSmaller: a... Remove this comment to see the full error message
          binEdges={gnomadV2AgeDistribution.exome.bin_edges}
          binValues={gnomadV2AgeDistribution.exome.bin_freq}
          nSmaller={gnomadV2AgeDistribution.exome.n_smaller}
          nLarger={gnomadV2AgeDistribution.exome.n_larger}
          barColor="#428bca"
          xLabel="Age"
          yLabel="Individuals"
          formatTooltip={(bin: any) => `${bin.label}: ${bin.value.toLocaleString()} individuals`}
        />
      </Column>
      <Column>
        <p>Genomes</p>
        <Histogram
          // @ts-expect-error TS(2322) FIXME: Type '{ binEdges: any; binValues: any; nSmaller: a... Remove this comment to see the full error message
          binEdges={gnomadV2AgeDistribution.genome.bin_edges}
          binValues={gnomadV2AgeDistribution.genome.bin_freq}
          nSmaller={gnomadV2AgeDistribution.genome.n_smaller}
          nLarger={gnomadV2AgeDistribution.genome.n_larger}
          barColor="#73ab3d"
          xLabel="Age"
          yLabel="Individuals"
          formatTooltip={(bin: any) => `${bin.label}: ${bin.value.toLocaleString()} individuals`}
        />
      </Column>
    </ColumnsWrapper>
    <p>
      Please note that cohorts vary in how they report age (some report the age at diagnosis, others
      report the age of last visit, etc), so the ages associated with the gnomAD data can be thought
      of as the last known age of the individual. Information on age was not available for all
      samples. We have age data for 85,462 exome samples and 11,242 genome samples.
    </p>
  </>
)
