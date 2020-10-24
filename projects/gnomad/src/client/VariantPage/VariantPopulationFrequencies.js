import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { GnomadPopulationsTable } from './GnomadPopulationsTable'
import HGDPPopulationsTable from './HGDPPopulationsTable'
import TGPPopulationsTable from './TGPPopulationsTable'

const ScrollWrapper = styled.div`
  overflow-x: auto;
`

const VariantPopulationFrequencies = ({ datasetId, variant }) => {
  if (datasetId === 'gnomad_r3_hgdp') {
    return (
      <div>
        <ScrollWrapper>
          <HGDPPopulationsTable
            populations={variant.genome.populations}
            showHemizygotes={variant.chrom === 'X' || variant.chrom === 'Y'}
          />
        </ScrollWrapper>
      </div>
    )
  }

  if (datasetId === 'gnomad_r3_tgp') {
    return (
      <div>
        <ScrollWrapper>
          <TGPPopulationsTable
            populations={variant.genome.populations}
            showHemizygotes={variant.chrom === 'X' || variant.chrom === 'Y'}
          />
        </ScrollWrapper>
      </div>
    )
  }

  return (
    <div>
      <ScrollWrapper>
        <GnomadPopulationsTable
          exomePopulations={variant.exome ? variant.exome.populations : []}
          genomePopulations={variant.genome ? variant.genome.populations : []}
          showHemizygotes={variant.chrom === 'X' || variant.chrom === 'Y'}
        />
      </ScrollWrapper>
    </div>
  )
}

VariantPopulationFrequencies.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variant: PropTypes.shape({
    chrom: PropTypes.string.isRequired,
    exome: PropTypes.shape({
      populations: PropTypes.arrayOf(PropTypes.object).isRequired,
    }),
    genome: PropTypes.shape({
      populations: PropTypes.arrayOf(PropTypes.object).isRequired,
    }),
  }).isRequired,
}

export default VariantPopulationFrequencies
