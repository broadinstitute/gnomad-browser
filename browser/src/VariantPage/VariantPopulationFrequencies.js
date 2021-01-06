import PropTypes from 'prop-types'
import React from 'react'

import { Tabs } from '@gnomad/ui'

import TableWrapper from '../TableWrapper'
import { GnomadPopulationsTable } from './GnomadPopulationsTable'
import HGDPPopulationsTable from './HGDPPopulationsTable'
import TGPPopulationsTable from './TGPPopulationsTable'

const VariantPopulationFrequencies = ({ datasetId, variant }) => {
  if (datasetId.startsWith('gnomad_r3')) {
    const gnomadPopulations = variant.genome.populations.filter(
      pop => !(pop.id.startsWith('hgdp:') || pop.id.startsWith('1kg:'))
    )
    const hgdpPopulations = variant.genome.populations
      .filter(pop => pop.id.startsWith('hgdp:'))
      .map(pop => ({ ...pop, id: pop.id.slice(5) })) // Remove hgdp: prefix
    const tgpPopulations = variant.genome.populations
      .filter(pop => pop.id.startsWith('1kg:'))
      .map(pop => ({ ...pop, id: pop.id.slice(4) })) // Remove 1kg: prefix

    return (
      <Tabs
        tabs={[
          {
            id: 'gnomAD',
            label: 'gnomAD',
            render: () => (
              <TableWrapper>
                <GnomadPopulationsTable
                  exomePopulations={[]}
                  genomePopulations={gnomadPopulations}
                  showHemizygotes={variant.chrom === 'X' || variant.chrom === 'Y'}
                />
              </TableWrapper>
            ),
          },
          {
            id: 'HGDP',
            label: 'HGDP',
            render: () => (
              <TableWrapper>
                <HGDPPopulationsTable
                  populations={hgdpPopulations}
                  showHemizygotes={variant.chrom === 'X' || variant.chrom === 'Y'}
                />
              </TableWrapper>
            ),
          },
          {
            id: '1KG',
            label: '1KG',
            render: () =>
              datasetId === 'gnomad_r3_non_v2' ? (
                <p>
                  1000 Genomes Project population frequencies are not available for this subset.
                </p>
              ) : (
                <TableWrapper>
                  <TGPPopulationsTable
                    populations={tgpPopulations}
                    showHemizygotes={variant.chrom === 'X' || variant.chrom === 'Y'}
                  />
                </TableWrapper>
              ),
          },
        ]}
      />
    )
  }

  return (
    <div>
      <TableWrapper>
        <GnomadPopulationsTable
          exomePopulations={variant.exome ? variant.exome.populations : []}
          genomePopulations={variant.genome ? variant.genome.populations : []}
          showHemizygotes={variant.chrom === 'X' || variant.chrom === 'Y'}
        />
      </TableWrapper>
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
