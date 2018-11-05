import React from 'react'
import { connect } from 'react-redux'

import { finalFilteredVariants, isLoadingVariants } from '@broad/redux-variants'
import { Button } from '@broad/ui'

const POPULATION_NAMES = {
  AFR: 'African',
  AMR: 'Latino',
  ASJ: 'Ashkenazi Jewish',
  EAS: 'East Asian',
  FIN: 'European (Finnish)',
  NFE: 'European (non-Finnish)',
  OTH: 'Other',
  SAS: 'South Asian',
}

const SOURCE_LABELS = {
  gnomadExomeVariants: 'gnomAD Exomes',
  gnomadGenomeVariants: 'gnomAD Genomes',
  exacVariants: 'ExAC',
}

const DEFAULT_COLUMNS = [
  {
    label: 'Chromosome',
    getValue: variant => variant.variant_id.split('-')[0],
  },
  {
    label: 'Position',
    getValue: variant => JSON.stringify(variant.pos),
  },
  {
    label: 'rsID',
    getValue: variant => variant.rsid || '',
  },
  {
    label: 'Reference',
    getValue: variant => variant.variant_id.split('-')[2],
  },
  {
    label: 'Alternate',
    getValue: variant => variant.variant_id.split('-')[3],
  },
  {
    label: 'Source',
    getValue: variant => variant.datasets.map(d => SOURCE_LABELS[d]).join(','),
  },
  {
    label: 'Filters - exomes',
    getValue: variant => {
      const inExome =
        variant.datasets.includes('gnomadExomeVariants') ||
        variant.datasets.includes('exacVariants')
      if (!inExome) {
        return 'NA'
      }
      const exomeFilters = variant.filters
        .filter(f => !f.startsWith('genomes_')) // matches ExAC and gnomAD exomes
        .map(f => f.slice(7))
      return exomeFilters.length ? exomeFilters.join(',') : 'PASS'
    },
  },
  {
    label: 'Filters - genomes',
    getValue: variant => {
      const inGenome = variant.datasets.includes('gnomadGenomeVariants')
      if (!inGenome) {
        return 'NA'
      }
      const genomeFilters = variant.filters
        .filter(f => f.startsWith('genomes_'))
        .map(f => f.slice(8))
      return genomeFilters.length ? genomeFilters.join(',') : 'PASS'
    },
  },
  {
    label: 'Consequence',
    getValue: variant => variant.hgvs || '',
  },
  {
    label: 'Protein Consequence',
    getValue: variant => variant.hgvsp || '',
  },
  {
    label: 'Transcript Consequence',
    getValue: variant => variant.hgvsc || '',
  },
  {
    label: 'Annotation',
    getValue: variant => variant.consequence || '',
  },
  {
    label: 'Flags',
    getValue: variant => variant.flags.join(','),
  },
  {
    label: 'Allele Count',
    getValue: variant => JSON.stringify(variant.allele_count),
  },
  {
    label: 'Allele Number',
    getValue: variant => JSON.stringify(variant.allele_num),
  },
  {
    label: 'Allele Frequency',
    getValue: variant => JSON.stringify(variant.allele_freq),
  },
  {
    label: 'Homozygote Count',
    getValue: variant => JSON.stringify(variant.hom_count),
  },
  {
    label: 'Hemizygote Count',
    getValue: variant => JSON.stringify(variant.hemi_count),
  },
]

const exportVariantsToCsv = (variants, baseFileName) => {
  const datasetPopulations = variants[0].populations.map(pop => pop.id)
  let populationColumns = []
  datasetPopulations.forEach((popId, popIndex) => {
    const popName = POPULATION_NAMES[popId]
    populationColumns = populationColumns.concat([
      {
        label: `Allele Count ${popName}`,
        getValue: variant => JSON.stringify(variant.populations[popIndex].ac),
      },
      {
        label: `Allele Number ${popName}`,
        getValue: variant => JSON.stringify(variant.populations[popIndex].an),
      },
      {
        label: `Homozygote Count ${popName}`,
        getValue: variant => JSON.stringify(variant.populations[popIndex].ac_hom),
      },
      {
        label: `Hemizygote Count ${popName}`,
        getValue: variant => JSON.stringify(variant.populations[popIndex].ac_hemi),
      },
    ])
  })

  const columns = DEFAULT_COLUMNS.concat(populationColumns)

  const headerRow = columns.map(c => c.label)

  const csv = `${headerRow}\r\n${variants
    .map(variant =>
      columns
        .map(c => c.getValue(variant))
        .map(
          val =>
            val.includes(',') || val.includes('"') || val.includes("'")
              ? `"${val.replace('"', '""')}"`
              : val
        )
        .join(',')
    )
    .join('\r\n')}\r\n`

  const date = new Date()
  const timestamp = `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${date
    .getDate()
    .toString()
    .padStart(2, '0')} ${date
    .getHours()
    .toString()
    .padStart(2, '0')}.${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}.${date
    .getSeconds()
    .toString()
    .padStart(2, '0')}`

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${baseFileName} ${timestamp}.csv`)
  link.onClick = () => {
    console.log('revoke')
    URL.revokeObjectURL(url)
    link.remove()
  }
  document.body.appendChild(link)
  link.click()
}

const ExportVariantsButton = connect((state, ownProps) => {
  const variants = finalFilteredVariants(state)
  return {
    disabled: isLoadingVariants(state) || variants.size === 0,
    onClick: () => exportVariantsToCsv(variants.toJS(), ownProps.exportFileName),
  }
})(({ exportFileName, ...buttonProps }) => <Button {...buttonProps}>Export variants to CSV</Button>)

export default ExportVariantsButton
