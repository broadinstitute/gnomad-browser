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

export const createVersionSpecificColumns = (datasetId: DatasetId) => {
  const inSilicoPredictorIds = [
    'cadd',
    'revel_max',
    'spliceai_ds_max',
    'pangolin_largest_ds',
    'phylop',
    'sift_max',
    'polyphen_max',
  ]

  let versionSpecificColumns: Column[] = []

  if (isV4(datasetId)) {
    versionSpecificColumns = [
      {
        label: 'GroupMax FAF group',
        getValue: (variant) => {
          const v4Variant = variant as V4VariantTableVariant
          return v4Variant.faf95_joint.popmax_population !== null
            ? v4Variant.faf95_joint.popmax_population
            : ''
        },
      },
      {
        label: 'GroupMax FAF frequency',
        getValue: (variant) => {
          const v4Variant = variant as V4VariantTableVariant
          return v4Variant.faf95_joint.popmax !== null
            ? JSON.stringify(v4Variant.faf95_joint.popmax)
            : ''
        },
      },
    ]

    inSilicoPredictorIds.forEach((id) => {
      const inSilicoColumn = {
        label: id,
        getValue: (variant: VariantTableVariant) => {
          const v4Variant = variant as V4VariantTableVariant
          return v4Variant.in_silico_predictors.filter((predictor) => predictor.id === id).length >
            0
            ? v4Variant.in_silico_predictors.filter((predictor) => predictor.id === id)[0].value
            : ''
        },
      }
      versionSpecificColumns = versionSpecificColumns.concat(inSilicoColumn)
    })
  }

  if (isV2(datasetId)) {
    versionSpecificColumns = [
      {
        label: 'Exome GroupMax FAF group',
        getValue: (variant) => {
          const v2Variant = variant as V2VariantTableVariant
          return v2Variant.exome && v2Variant.exome.faf95.popmax_population !== null
            ? v2Variant.exome.faf95.popmax_population
            : ''
        },
      },
      {
        label: 'Exome GroupMax FAF frequency',
        getValue: (variant) => {
          const v2Variant = variant as V2VariantTableVariant
          return v2Variant.exome && v2Variant.exome.faf95.popmax !== null
            ? JSON.stringify(v2Variant.exome.faf95.popmax)
            : ''
        },
      },
      {
        label: 'Genome GroupMax FAF group',
        getValue: (variant) => {
          const v2Variant = variant as V2VariantTableVariant
          return v2Variant.genome && v2Variant.genome.faf95.popmax_population !== null
            ? v2Variant.genome.faf95.popmax_population
            : ''
        },
      },
      {
        label: 'Genome GroupMax FAF frequency',
        getValue: (variant) => {
          const v2Variant = variant as V2VariantTableVariant
          return v2Variant.genome && v2Variant.genome.faf95.popmax !== null
            ? JSON.stringify(v2Variant.genome.faf95.popmax)
            : ''
        },
      },
    ]
  }

  return versionSpecificColumns
}

const exportVariantsToCsv = (
  variants: VariantTableVariant[],
  datasetId: DatasetId,
  baseFileName: string
) => {
  const DEFAULT_COLUMNS = [
    {
      label: 'gnomAD ID',
      getValue: (variant: VariantTableVariant) => variant.variant_id,
    },
    {
      label: 'Chromosome',
      getValue: (variant: VariantTableVariant) => variant.variant_id.split('-')[0],
    },
    {
      label: 'Position',
      getValue: (variant: VariantTableVariant) => JSON.stringify(variant.pos),
    },
    {
      label: 'rsIDs',
      getValue: (variant: VariantTableVariant) => (variant.rsids || []).join(';'),
    },
    {
      label: 'Reference',
      getValue: (variant: VariantTableVariant) => variant.variant_id.split('-')[2],
    },
    {
      label: 'Alternate',
      getValue: (variant: VariantTableVariant) => variant.variant_id.split('-')[3],
    },
    {
      label: 'Source',
      getValue:
        datasetId === 'exac'
          ? () => 'ExAC'
          : (variant: VariantTableVariant) => {
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
      getValue: (variant: VariantTableVariant) => {
        if (!variant.exome) {
          return 'NA'
        }
        return variant.exome.filters.length === 0 ? 'PASS' : variant.exome.filters.join(',')
      },
    },
    {
      label: 'Filters - genomes',
      getValue: (variant: VariantTableVariant) => {
        if (!variant.genome) {
          return 'NA'
        }
        return variant.genome.filters.length === 0 ? 'PASS' : variant.genome.filters.join(',')
      },
    },
    {
      label: 'Transcript',
      getValue: (variant: VariantTableVariant) =>
        variant.transcript_id ? `${variant.transcript_id}.${variant.transcript_version}` : '',
    },
    {
      label: 'HGVS Consequence',
      getValue: (variant: VariantTableVariant) => variant.hgvs || '',
    },
    {
      label: 'Protein Consequence',
      getValue: (variant: VariantTableVariant) => variant.hgvsp || '',
    },
    {
      label: 'Transcript Consequence',
      getValue: (variant: VariantTableVariant) => variant.hgvsc || '',
    },
    {
      label: 'VEP Annotation',
      getValue: (variant: VariantTableVariant) => variant.consequence || '',
    },
    {
      label: 'ClinVar Clinical Significance',
      getValue: (variant: VariantTableVariant) => variant.clinical_significance || '',
    },
    {
      label: 'ClinVar Variation ID',
      getValue: (variant: VariantTableVariant) => variant.clinvar_variation_id || '',
    },
    {
      label: 'Flags',
      getValue: (variant: VariantTableVariant) => variant.flags.join(','),
    },
    {
      label: 'Allele Count',
      getValue: (variant: VariantTableVariant) => JSON.stringify(variant.ac),
    },
    {
      label: 'Allele Number',
      getValue: (variant: VariantTableVariant) => JSON.stringify(variant.an),
    },
    {
      label: 'Allele Frequency',
      getValue: (variant: VariantTableVariant) => JSON.stringify(variant.af),
    },
    {
      label: 'Homozygote Count',
      getValue: (variant: VariantTableVariant) => JSON.stringify(variant.ac_hom),
    },
    {
      label: 'Hemizygote Count',
      getValue: (variant: VariantTableVariant) => JSON.stringify(variant.ac_hemi),
    },
  ]

  const versionSpecificColumns = createVersionSpecificColumns(datasetId)

  const populationColumns = createPopulationColumns(datasetId)

  const columns = DEFAULT_COLUMNS.concat(versionSpecificColumns, populationColumns)

  const headerRow = columns.map((c) => c.label)

  const csv = `${headerRow}\r\n${variants
    .map((variant) =>
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
  clinical_significance: string
  clinvar_variation_id: string
  consequence?: string
  flags: string[]
  hgvs?: string
  hgvsc?: string
  hgvsp?: string
  populations: Population[]
  pos: number
  rsids?: string[]
  transcript_id: string
  transcript_version: string
  variant_id: string
  exome: {
    filters: string[]
  } | null
  genome: {
    filters: string[]
  } | null
}

type FilteredAlleleFrequency = {
  popmax: number | null
  popmax_population: string | null
}

type V2VariantTableVariant = VariantTableVariant & {
  exome: {
    faf95: FilteredAlleleFrequency
  }
  genome: {
    faf95: FilteredAlleleFrequency
  }
}

type V4VariantTableVariant = VariantTableVariant & {
  faf95_joint: FilteredAlleleFrequency
  in_silico_predictors: {
    id: string
    value: string
    flags: string[]
  }[]
}

type Props = {
  datasetId: DatasetId
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
