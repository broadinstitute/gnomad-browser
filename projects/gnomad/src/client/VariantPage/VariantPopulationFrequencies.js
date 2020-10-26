import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { Tabs } from '@gnomad/ui'

import { GnomadPopulationsTable } from './GnomadPopulationsTable'
import HGDPPopulationsTable from './HGDPPopulationsTable'
import TGPPopulationsTable from './TGPPopulationsTable'

const ScrollWrapper = styled.div`
  overflow-x: auto;
`

const VariantPopulationFrequencies = ({ datasetId, variant }) => {
  if (datasetId.startsWith('gnomad_r3')) {
    const gnomadPopulations = variant.genome.populations.filter(
      pop => !(pop.id.startsWith('hgdp:') || pop.id.startsWith('tgp:'))
    )
    const hgdpPopulations = variant.genome.populations
      .filter(pop => pop.id.startsWith('hgdp:'))
      .map(pop => ({ ...pop, id: pop.id.slice(5) })) // Remove hgdp: prefix
    const tgpPopulations = variant.genome.populations
      .filter(pop => pop.id.startsWith('tgp:'))
      .map(pop => ({ ...pop, id: pop.id.slice(4) })) // Remove tgp: prefix

    return (
      <Tabs
        tabs={[
          {
            id: 'gnomAD',
            label: 'gnomAD',
            render: () => (
              <ScrollWrapper>
                <GnomadPopulationsTable
                  exomePopulations={[]}
                  genomePopulations={gnomadPopulations}
                  showHemizygotes={variant.chrom === 'X' || variant.chrom === 'Y'}
                />
              </ScrollWrapper>
            ),
          },
          {
            id: 'HGDP',
            label: 'HGDP',
            render: () => (
              <ScrollWrapper>
                <HGDPPopulationsTable
                  populations={hgdpPopulations}
                  showHemizygotes={variant.chrom === 'X' || variant.chrom === 'Y'}
                />
              </ScrollWrapper>
            ),
          },
          {
            id: 'TGP',
            label: 'TGP',
            render: () =>
              datasetId === 'gnomad_r3_non_v2' ? (
                <p>
                  1000 Genomes Project population frequencies are not available for this subset.
                </p>
              ) : (
                <ScrollWrapper>
                  <TGPPopulationsTable
                    populations={tgpPopulations}
                    showHemizygotes={variant.chrom === 'X' || variant.chrom === 'Y'}
                  />
                </ScrollWrapper>
              ),
          },
        ]}
      />
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
