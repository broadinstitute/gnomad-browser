import React from 'react'

import { Tabs } from '@gnomad/ui'

import TableWrapper from '../TableWrapper'
import { GnomadPopulationsTable } from './GnomadPopulationsTable'
import LocalAncestryPopulationsTable from './LocalAncestryPopulationsTable'
import HGDPPopulationsTable from './HGDPPopulationsTable'
import TGPPopulationsTable from './TGPPopulationsTable'

type Props = {
  datasetId: string
  variant: {
    chrom: string
    exome?: {
      populations: any[]
      local_ancestry_populations?: any[]
    }
    genome?: {
      populations: any[]
      local_ancestry_populations?: any[]
    }
  }
}

const VariantPopulationFrequencies = ({ datasetId, variant }: Props) => {
  if (datasetId.startsWith('gnomad_r3')) {
    // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
    const gnomadPopulations = variant.genome.populations.filter(
      (pop) => !(pop.id.startsWith('hgdp:') || pop.id.startsWith('1kg:'))
    )
    // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
    const hgdpPopulations = variant.genome.populations
      .filter((pop) => pop.id.startsWith('hgdp:'))
      .map((pop) => ({ ...pop, id: pop.id.slice(5) })) // Remove hgdp: prefix
    // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
    const tgpPopulations = variant.genome.populations
      .filter((pop) => pop.id.startsWith('1kg:'))
      .map((pop) => ({ ...pop, id: pop.id.slice(4) })) // Remove 1kg: prefix

    // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
    const localAncestryPopulations = variant.genome.local_ancestry_populations

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

              // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
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
                  {/* @ts-expect-error TS(2322) FIXME: Type 'any[] | undefined' is not assignable to type... Remove this comment to see the full error message */}
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

export default VariantPopulationFrequencies
