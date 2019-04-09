import PropTypes from 'prop-types'
import React from 'react'

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

const exportVariantsToCsv = (variants, datasetId, baseFileName) => {
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
      getValue:
        datasetId === 'exac'
          ? () => 'ExAC'
          : variant => {
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
      getValue: variant => {
        if (!variant.exome) {
          return 'NA'
        }
        return variant.exome.filters.length === 0 ? 'PASS' : variant.exome.filters.join(',')
      },
    },
    {
      label: 'Filters - genomes',
      getValue: variant => {
        if (!variant.genome) {
          return 'NA'
        }
        return variant.genome.filters.length === 0 ? 'PASS' : variant.genome.filters.join(',')
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
      getValue: variant => JSON.stringify(variant.ac),
    },
    {
      label: 'Allele Number',
      getValue: variant => JSON.stringify(variant.an),
    },
    {
      label: 'Allele Frequency',
      getValue: variant => JSON.stringify(variant.af),
    },
    {
      label: 'Homozygote Count',
      getValue: variant => JSON.stringify(variant.ac_hom),
    },
    {
      label: 'Hemizygote Count',
      getValue: variant => JSON.stringify(variant.ac_hemi),
    },
  ]

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
        .map(val =>
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
    .padStart(2, '0')}_${date
    .getDate()
    .toString()
    .padStart(2, '0')}_${date
    .getHours()
    .toString()
    .padStart(2, '0')}_${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}_${date
    .getSeconds()
    .toString()
    .padStart(2, '0')}`

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${baseFileName.replace(/\s+/g, '_')}_${timestamp}.csv`)
  link.onClick = () => {
    console.log('revoke')
    URL.revokeObjectURL(url)
    link.remove()
  }
  document.body.appendChild(link)
  link.click()
}

const ExportVariantsButton = ({ datasetId, exportFileName, variants, ...rest }) => (
  <Button
    {...rest}
    onClick={() => {
      exportVariantsToCsv(variants, datasetId, exportFileName)
    }}
  >
    Export variants to CSV
  </Button>
)

ExportVariantsButton.propTypes = {
  datasetId: PropTypes.string.isRequired,
  exportFileName: PropTypes.string.isRequired,
  variants: PropTypes.arrayOf(
    PropTypes.shape({
      ac: PropTypes.number.isRequired,
      ac_hemi: PropTypes.number.isRequired,
      ac_hom: PropTypes.number.isRequired,
      an: PropTypes.number.isRequired,
      af: PropTypes.number.isRequired,
      consequence: PropTypes.string,
      flags: PropTypes.arrayOf(PropTypes.string).isRequired,
      hgvs: PropTypes.string,
      hgvsc: PropTypes.string,
      hgvsp: PropTypes.string,
      populations: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          ac: PropTypes.number.isRequired,
          an: PropTypes.number.isRequired,
          ac_hemi: PropTypes.number.isRequired,
          ac_hom: PropTypes.number.isRequired,
        })
      ).isRequired,
      pos: PropTypes.number.isRequired,
      rsid: PropTypes.string,
      variant_id: PropTypes.string.isRequired,
      xpos: PropTypes.number.isRequired,
      exome: PropTypes.shape({
        filters: PropTypes.arrayOf(PropTypes.string).isRequired,
      }),
      genome: PropTypes.shape({
        filters: PropTypes.arrayOf(PropTypes.string).isRequired,
      }),
    })
  ).isRequired,
}

export default ExportVariantsButton
