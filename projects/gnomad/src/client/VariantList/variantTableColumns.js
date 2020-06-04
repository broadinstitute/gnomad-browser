import React from 'react'
import Highlighter from 'react-highlight-words'

import Link from '../Link'
import { getCategoryFromConsequence, getLabelForConsequenceTerm } from '../vepConsequences'
import SampleSourceIcon from './SampleSourceIcon'
import VariantCategoryMarker from './VariantCategoryMarker'
import VariantFlag from './VariantFlag'

const categoryColors = {
  lof: '#DD2C00',
  missense: 'orange',
  synonymous: '#2E7D32',
  other: '#424242',
}

const getConsequenceColor = consequenceTerm => {
  if (!consequenceTerm) {
    return 'gray'
  }
  const category = getCategoryFromConsequence(consequenceTerm) || 'other'
  return categoryColors[category]
}

const getConsequenceName = consequenceTerm =>
  consequenceTerm ? getLabelForConsequenceTerm(consequenceTerm) : 'N/A'

const renderExponentialNumberCell = (row, key) => {
  const number = row[key]
  if (number === null || number === undefined) {
    return ''
  }
  const truncated = Number(number.toPrecision(3))
  if (truncated === 0) {
    return '0'
  }
  return truncated.toExponential()
}

const getConsequenceDescription = context => {
  switch (context) {
    case 'gene':
      return ' for most severe consequence across all transcripts for this gene'
    case 'region':
      return ' for most severe consequence across all transcripts'
    case 'transcript':
    default:
      return ' for consequence in this transcript'
  }
}

export const getColumns = ({
  context, // one of 'gene', 'region', or 'transcript'
  width,
  includeHomozygoteAC = false,
  includeHemizygoteAC = false,
  primaryTranscriptId = null, // Only present in 'gene' context. MANE Select transcript if available, otherwise canonical.
}) => {
  const columns = [
    {
      key: 'variant_id',
      heading: 'Variant ID',
      tooltip: 'Chromosome-position-reference-alternate',
      isRowHeader: true,
      isSortable: true,
      minWidth: 150,
      grow: 1,
      render: (row, key, { highlightWords }) => (
        <Link className="grid-cell-content" target="_blank" to={`/variant/${row.variant_id}`}>
          <Highlighter searchWords={highlightWords} textToHighlight={row.variant_id} />
        </Link>
      ),
    },
    {
      key: 'source',
      heading: 'Source',
      tooltip: 'Sample set and quality control filters',
      grow: 0,
      minWidth: 100,
      render: variant => (
        <React.Fragment>
          {variant.exome && <SampleSourceIcon source="exome" filters={variant.exome.filters} />}
          {variant.genome && <SampleSourceIcon source="genome" filters={variant.genome.filters} />}
        </React.Fragment>
      ),
    },
    {
      key: 'hgvs',
      heading: 'Consequence',
      tooltip: `HGVS protein sequence (where defined) or coding sequence${getConsequenceDescription(
        context
      )}`,
      grow: 1,
      isSortable: true,
      minWidth: 160,
      render: (variant, key, { highlightWords }) => (
        <span className="grid-cell-content">
          <Highlighter searchWords={highlightWords} textToHighlight={variant.hgvs || ''} />
          {primaryTranscriptId && variant.transcript_id !== primaryTranscriptId && ' †'}
        </span>
      ),
    },
    {
      key: 'consequence',
      heading: 'Annotation',
      tooltip: `Variant Effect Predictor (VEP) annotation${getConsequenceDescription(context)}`,
      grow: 0,
      isSortable: true,
      minWidth: 140,
      render: (row, key, { highlightWords }) => (
        <span className="grid-cell-content">
          <VariantCategoryMarker color={getConsequenceColor(row[key])} />
          <Highlighter
            searchWords={highlightWords}
            textToHighlight={getConsequenceName(row[key])}
          />
        </span>
      ),
    },
    {
      key: 'flags',
      heading: 'Flags',
      tooltip: 'Flags that may affect annotation and/or confidence',
      grow: 0,
      isSortable: true,
      minWidth: 120,
      render: (row, key) =>
        row[key]
          .filter(flag => flag !== 'segdup' && flag !== 'par')
          .map(flag => <VariantFlag key={flag} type={flag} variant={row} />),
    },
    {
      key: 'ac',
      heading: width < 600 ? 'AC' : 'Allele Count',
      tooltip: 'Alternate allele count in high quality genotypes',
      grow: 0,
      isSortable: true,
      minWidth: width < 600 ? 75 : 110,
    },
    {
      key: 'an',
      heading: width < 600 ? 'AN' : 'Allele Number',
      tooltip: 'Total number of called high quality genotypes',
      grow: 0,
      isSortable: true,
      minWidth: width < 600 ? 75 : 110,
    },
    {
      key: 'af',
      heading: width < 600 ? 'AF' : 'Allele Frequency',
      tooltip: 'Alternate allele frequency in high quality genotypes',
      grow: 0,
      isSortable: true,
      minWidth: width < 600 ? 75 : 110,
      render: renderExponentialNumberCell,
    },
  ]

  if (context === 'region') {
    columns.splice(2, 0, {
      key: 'gene',
      heading: 'Gene',
      tooltip: 'Gene in which variant has the most severe consequence',
      isSortable: false,
      minWidth: 100,
      render: row => (
        <span className="grid-cell-content">
          <Link to={`/gene/${row.gene_id}`}>{row.gene_symbol || row.gene_id}</Link>
        </span>
      ),
    })
  }

  if (includeHomozygoteAC) {
    columns.push({
      key: 'ac_hom',
      heading: width < 600 ? 'No. Hom' : 'Number of Homozygotes',
      tooltip: 'Number of individuals homozygous for alternate allele',
      grow: 0,
      isSortable: true,
      minWidth: width < 600 ? 75 : 100,
    })
  }

  if (includeHemizygoteAC) {
    columns.push({
      key: 'ac_hemi',
      heading: width < 600 ? 'No. Hem' : 'Number of Hemizygotes',
      tooltip: 'Number of individuals hemizygous for alternate allele',
      grow: 0,
      isSortable: true,
      minWidth: width < 600 ? 75 : 100,
    })
  }

  return columns
}
