import PropTypes from 'prop-types'
import React from 'react'

import { Tabs } from '@gnomad/ui'

import TableWrapper from '../TableWrapper'
import { GnomadPopulationsTable } from './GnomadPopulationsTable'
import LocalAncestryPopulationsTable from './LocalAncestryPopulationsTable'
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

    const localAncestryPopulations = variant.genome.local_ancestry_populations

    return (
      <Tabs
        tabs={[
          {
            id: 'gnomAD',
            label: 'gnomAD',
            render: () => (
              <TableWrapper>
                <GnomadPopulationsTable
                  datasetId={datasetId}
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
            render: () => {
              if (hgdpPopulations.length === 0) {
                return <p>HGDP population frequencies are not available for this variant.</p>
              }

              return (
                <TableWrapper>
                  <HGDPPopulationsTable
                    populations={hgdpPopulations}
                    showHemizygotes={variant.chrom === 'X' || variant.chrom === 'Y'}
                  />
                </TableWrapper>
              )
            },
          },
          {
            id: '1KG',
            label: '1KG',
            render: () => {
              if (tgpPopulations.length === 0) {
                return (
                  <p>
                    1000 Genomes Project population frequencies are not available for this variant.
                  </p>
                )
              }

              if (datasetId === 'gnomad_r3_non_v2') {
                return (
                  <p>
                    1000 Genomes Project population frequencies are not available for this subset.
                  </p>
                )
              }

              return (
                <TableWrapper>
                  <TGPPopulationsTable
                    populations={tgpPopulations}
                    showHemizygotes={variant.chrom === 'X' || variant.chrom === 'Y'}
                  />
                </TableWrapper>
              )
            },
          },
          {
            id: 'local-ancestry',
            label: 'Local Ancestry',
            render: () => {
              if (datasetId !== 'gnomad_r3') {
                return <p>Local ancestry is not available for subsets of gnomAD v3.</p>
              }

              if (localAncestryPopulations.length === 0) {
                return (
                  <p>
                    Local ancestry is not available for this variant. Local ancestry is only
                    available for bi-allelic variants with high call rates and with an allele
                    frequency &gt; 0.1% within the Latino/Admixed American gnomAD population.
                  </p>
                )
              }

              return (
                <TableWrapper>
                  <LocalAncestryPopulationsTable populations={localAncestryPopulations} />
                </TableWrapper>
              )
            },
          },
        ]}
      />
    )
  }

  return (
    <TableWrapper>
      <GnomadPopulationsTable
        datasetId={datasetId}
        exomePopulations={variant.exome ? variant.exome.populations : []}
        genomePopulations={variant.genome ? variant.genome.populations : []}
        showHemizygotes={variant.chrom === 'X' || variant.chrom === 'Y'}
      />
    </TableWrapper>
  )
}

VariantPopulationFrequencies.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variant: PropTypes.shape({
    chrom: PropTypes.string.isRequired,
    exome: PropTypes.shape({
      populations: PropTypes.arrayOf(PropTypes.object).isRequired,
      local_ancestry_populations: PropTypes.arrayOf(PropTypes.object),
    }),
    genome: PropTypes.shape({
      populations: PropTypes.arrayOf(PropTypes.object).isRequired,
      local_ancestry_populations: PropTypes.arrayOf(PropTypes.object),
    }),
  }).isRequired,
}

export default VariantPopulationFrequencies
