import React from 'react'

import { Tabs } from '@gnomad/ui'

import {
  DatasetId,
  hasLocalAncestryPopulations,
  isSubset,
  has1000GenomesPopulationFrequencies,
} from '@gnomad/dataset-metadata/metadata'
import TableWrapper from '../TableWrapper'
import { GnomadPopulationsTable } from './GnomadPopulationsTable'
import LocalAncestryPopulationsTable from './LocalAncestryPopulationsTable'
import HGDPPopulationsTable from './HGDPPopulationsTable'
import TGPPopulationsTable from './TGPPopulationsTable'
import { Variant } from './VariantPage'

type Props = {
  datasetId: DatasetId
  variant: Variant
}

const VariantPopulationFrequencies = ({ datasetId, variant }: Props) => {
  if (hasLocalAncestryPopulations(datasetId) && variant.genome) {
    const genome = variant.genome!
    const genomePopulations = genome.populations.filter(
      (pop) => !(pop.id.startsWith('hgdp:') || pop.id.startsWith('1kg:'))
    )
    const exomePopulations = variant.exome
      ? variant.exome.populations.filter(
          (pop) => !(pop.id.startsWith('hgdp:') || pop.id.startsWith('1kg:'))
        )
      : []
    const hgdpPopulations = genome.populations
      .filter((pop) => pop.id.startsWith('hgdp:'))
      .map((pop) => ({ ...pop, id: pop.id.slice(5) })) // Remove hgdp: prefix
    const tgpPopulations = genome.populations
      .filter((pop) => pop.id.startsWith('1kg:'))
      .map((pop) => ({ ...pop, id: pop.id.slice(4) })) // Remove 1kg: prefix
    const localAncestryPopulations = genome.local_ancestry_populations || []

    return (
      // @ts-expect-error TS(2741) FIXME: Property 'onChange' is missing in type '{ tabs: { ... Remove this comment to see the full error message
      <Tabs
        tabs={[
          {
            id: 'gnomAD',
            label: 'gnomAD',
            render: () => (
              <TableWrapper>
                <GnomadPopulationsTable
                  datasetId={datasetId}
                  exomePopulations={exomePopulations}
                  genomePopulations={genomePopulations}
                  jointPopulations={variant.joint ? variant.joint.populations : null}
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
                    datasetId={datasetId}
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

              if (has1000GenomesPopulationFrequencies(datasetId)) {
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
              if (isSubset(datasetId)) {
                return <p>Local ancestry is not available for subsets of gnomAD v3.</p>
              }

              if (localAncestryPopulations.length === 0) {
                return (
                  <p>
                    Local ancestry is not available for this variant. Local ancestry is only
                    available for bi-allelic variants with high call rates and with an allele
                    frequency &gt; 0.1% within the Latino/Admixed American or
                    African/African-American gnomAD ancestry groups.
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
        jointPopulations={variant.joint ? variant.joint.populations : null}
        showHemizygotes={variant.chrom === 'X' || variant.chrom === 'Y'}
      />
    </TableWrapper>
  )
}

export default VariantPopulationFrequencies
