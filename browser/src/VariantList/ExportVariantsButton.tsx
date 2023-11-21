import React from 'react'

import { Button } from '@gnomad/ui'
import { Population } from '../VariantPage/VariantPage'

import {
  GNOMAD_POPULATION_NAMES,
  PopulationId,
  populationsInDataset,
} from '@gnomad/dataset-metadata/gnomadPopulations'
import { DatasetId, isExac, isV2, isV3, isV4 } from '@gnomad/dataset-metadata/metadata'

type Column = {
  label: string
  getValue: (variant: VariantTableVariant) => string
}

type Property = 'ac' | 'an' | 'ac_hemi' | 'ac_hom'

const getValueGivenProperty = (
  popId: PopulationId,
  variant: VariantTableVariant,
  property: Property
) => {
  return variant.populations.filter((v) => v.id === popId)[0]
    ? JSON.stringify(variant.populations.filter((v) => v.id === popId)[0][property])
    : ''
}

export const createPopulationColumns = (datasetId: DatasetId) => {
  /* eslint-disable no-nested-ternary */
  const topLevelDataset = isV4(datasetId)
    ? 'v4'
    : isV3(datasetId)
    ? 'v3'
    : isV2(datasetId)
    ? 'v2'
    : isExac(datasetId)
    ? 'ExAC'
    : 'default'
  /* eslint-enable no-nested-ternary */

  const datasetPopulations: PopulationId[] = populationsInDataset[topLevelDataset]

  let populationColumns: Column[] = []
  datasetPopulations.forEach((popId: PopulationId) => {
    const popName = GNOMAD_POPULATION_NAMES[popId]

    populationColumns = populationColumns.concat([
      {
        label: `Allele Count ${popName}`,
        getValue: (variant: VariantTableVariant) => getValueGivenProperty(popId, variant, 'ac'),
      },
      {
        label: `Allele Number ${popName}`,
        getValue: (variant: VariantTableVariant) => getValueGivenProperty(popId, variant, 'an'),
      },
      {
        label: `Homozygote Count ${popName}`,
        getValue: (variant: VariantTableVariant) => getValueGivenProperty(popId, variant, 'ac_hom'),
      },
      {
        label: `Hemizygote Count ${popName}`,
        getValue: (variant: VariantTableVariant) =>
          getValueGivenProperty(popId, variant, 'ac_hemi'),
      },
    ])
  })

  return populationColumns
}

const exportVariantsToCsv = (
  variants: VariantTableVariant[],
  datasetId: any,
  baseFileName: any
) => {
  const DEFAULT_COLUMNS = [
    {
      label: 'Chromosome',
      getValue: (variant: any) => variant.variant_id.split('-')[0],
    },
    {
      label: 'Position',
      getValue: (variant: any) => JSON.stringify(variant.pos),
    },
    {
      label: 'rsIDs',
      getValue: (variant: any) => (variant.rsids || []).join(';'),
    },
    {
      label: 'Reference',
      getValue: (variant: any) => variant.variant_id.split('-')[2],
    },
    {
      label: 'Alternate',
      getValue: (variant: any) => variant.variant_id.split('-')[3],
    },
    {
      label: 'Source',
      getValue:
        datasetId === 'exac'
          ? () => 'ExAC'
          : (variant: any) => {
              const sources = []
              if (variant.exome) {
                sources.push('gnomAD Exomes')
              }
              if (variant.genome) {
                sources.push('gnomAD Genomes')
              }
              return sources.join(',')
            },
    },
    {
      label: 'Filters - exomes',
      getValue: (variant: any) => {
        if (!variant.exome) {
          return 'NA'
        }
        return variant.exome.filters.length === 0 ? 'PASS' : variant.exome.filters.join(',')
      },
    },
    {
      label: 'Filters - genomes',
      getValue: (variant: any) => {
        if (!variant.genome) {
          return 'NA'
        }
        return variant.genome.filters.length === 0 ? 'PASS' : variant.genome.filters.join(',')
      },
    },
    {
      label: 'Transcript',
      getValue: (variant: any) =>
        variant.transcript_id ? `${variant.transcript_id}.${variant.transcript_version}` : '',
    },
    {
      label: 'HGVS Consequence',
      getValue: (variant: any) => variant.hgvs || '',
    },
    {
      label: 'Protein Consequence',
      getValue: (variant: any) => variant.hgvsp || '',
    },
    {
      label: 'Transcript Consequence',
      getValue: (variant: any) => variant.hgvsc || '',
    },
    {
      label: 'VEP Annotation',
      getValue: (variant: any) => variant.consequence || '',
    },
    {
      label: 'ClinVar Clinical Significance',
      getValue: (variant: any) => variant.clinical_significance || '',
    },
    {
      label: 'ClinVar Variation ID',
      getValue: (variant: any) => variant.clinvar_variation_id || '',
    },
    {
      label: 'Flags',
      getValue: (variant: any) => variant.flags.join(','),
    },
    {
      label: 'Allele Count',
      getValue: (variant: any) => JSON.stringify(variant.ac),
    },
    {
      label: 'Allele Number',
      getValue: (variant: any) => JSON.stringify(variant.an),
    },
    {
      label: 'Allele Frequency',
      getValue: (variant: any) => JSON.stringify(variant.af),
    },
    {
      label: 'Homozygote Count',
      getValue: (variant: any) => JSON.stringify(variant.ac_hom),
    },
    {
      label: 'Hemizygote Count',
      getValue: (variant: any) => JSON.stringify(variant.ac_hemi),
    },
  ]

  const populationColumns = createPopulationColumns(datasetId)

  const columns = DEFAULT_COLUMNS.concat(populationColumns)

  const headerRow = columns.map((c) => c.label)

  const csv = `${headerRow}\r\n${variants
    .map((variant: any) =>
      columns
        .map((c) => c.getValue(variant))
        .map((val) =>
          val.includes(',') || val.includes('"') || val.includes("'")
            ? `"${val.replace('"', '""')}"`
            : val
        )
        .join(',')
    )
    .join('\r\n')}\r\n`

  const date = new Date()
  const timestamp = `${date.getFullYear()}_${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}_${date.getDate().toString().padStart(2, '0')}_${date
    .getHours()
    .toString()
    .padStart(2, '0')}_${date.getMinutes().toString().padStart(2, '0')}_${date
    .getSeconds()
    .toString()
    .padStart(2, '0')}`

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${baseFileName.replace(/\s+/g, '_')}_${timestamp}.csv`)
  // @ts-expect-error TS(2551) FIXME: Property 'onClick' does not exist on type 'HTMLAnc... Remove this comment to see the full error message
  link.onClick = () => {
    URL.revokeObjectURL(url)
    link.remove()
  }
  document.body.appendChild(link)
  link.click()
}

export type VariantTableVariant = {
  ac: number
  ac_hemi: number
  ac_hom: number
  an: number
  af: number
  consequence?: string
  flags: string[]
  hgvs?: string
  hgvsc?: string
  hgvsp?: string
  populations: Population[]
  pos: number
  rsids?: string[]
  variant_id: string
  exome?: {
    filters: string[]
  }
  genome?: {
    filters: string[]
  }
}

type Props = {
  datasetId: string
  exportFileName: string
  variants: VariantTableVariant[]
}

const ExportVariantsButton = ({ datasetId, exportFileName, variants, ...rest }: Props) => (
  <Button
    {...rest}
    onClick={() => {
      exportVariantsToCsv(variants, datasetId, exportFileName)
    }}
  >
    Export variants to CSV
  </Button>
)

export default ExportVariantsButton
