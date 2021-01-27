import React from 'react'
import Highlighter from 'react-highlight-words'

import { ExternalLink } from '@gnomad/ui'

import Link from '../Link'
import { Cell, NumericCell, renderAlleleCountCell, renderAlleleFrequencyCell } from '../tableCells'
import { getCategoryFromConsequence, getLabelForConsequenceTerm } from '../vepConsequences'
import SampleSourceIcon from '../VariantList/SampleSourceIcon'
import VariantCategoryMarker from '../VariantList/VariantCategoryMarker'
import VariantFlag from '../VariantList/VariantFlag'

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
}) => {
  const columns = [
    {
      key: 'variant_id',
      heading: 'Variant ID',
      tooltip: 'Chromosome-position-reference-alternate',
      grow: 1,
      isRowHeader: true,
      isSortable: true,
      minWidth: 110,
      render: (variant, key, { highlightWords }) => (
        <Cell>
          <Link target="_blank" to={`/variant/${variant.variant_id}`}>
            <Highlighter searchWords={highlightWords} textToHighlight={variant.variant_id} />
          </Link>
        </Cell>
      ),
    },
    {
      key: 'source',
      heading: 'Source',
      tooltip: 'Quality control filters',
      grow: 0,
      minWidth: 100,
      render: variant => <SampleSourceIcon source="genome" filters={variant.filters} />,
    },
    {
      key: 'hgvs',
      heading: 'HGVS Consequence',
      tooltip: `HGVS protein sequence (where defined) or coding sequence${getConsequenceDescription(
        context
      )}`,
      grow: 1,
      isSortable: true,
      minWidth: 160,
      render: (variant, key, { highlightWords }) => (
        <Cell>
          <Highlighter
            searchWords={highlightWords}
            textToHighlight={variant.hgvsp || variant.hgvsc || ''}
          />
        </Cell>
      ),
    },
    {
      key: 'consequence',
      heading: 'VEP Annotation',
      tooltip: `Variant Effect Predictor (VEP) annotation${getConsequenceDescription(context)}`,
      grow: 0,
      isSortable: true,
      minWidth: 140,
      render: (row, key, { highlightWords }) => (
        <Cell>
          <VariantCategoryMarker color={getConsequenceColor(row[key])} />
          <Highlighter
            searchWords={highlightWords}
            textToHighlight={getConsequenceName(row[key])}
          />
        </Cell>
      ),
    },
    {
      key: 'clinical_significance',
      heading: 'Clinical Significance',
      tooltip: 'ClinVar clinical significance',
      grow: 1,
      isSortable: true,
      minWidth: 200,
      render: (variant, _, { highlightWords }) => (
        <Cell>
          <ExternalLink
            href={`https://www.ncbi.nlm.nih.gov/clinvar/variation/${variant.clinvar_variation_id}/`}
          >
            <Highlighter
              searchWords={highlightWords}
              textToHighlight={variant.clinical_significance || ''}
            />
          </ExternalLink>
        </Cell>
      ),
    },
    {
      key: 'flags',
      heading: 'Flags',
      tooltip: 'Flags that may affect annotation and/or confidence',
      grow: 0,
      isSortable: true,
      minWidth: 140,
      render: (row, key) =>
        row[key].map(flag => <VariantFlag key={flag} type={flag} variant={row} />),
    },
    {
      key: 'an',
      heading: width < 600 ? 'AN' : 'Allele Number',
      tooltip: 'Total number of individuals with high quality sequence at this position.',
      grow: 0,
      isSortable: true,
      minWidth: 110,
      render: renderAlleleCountCell,
    },
    {
      key: 'ac_hom',
      heading: width < 600 ? 'Hom. AC' : 'Homoplasmic Allele Count',
      tooltip:
        'Number of individuals with homoplasmic or near-homoplasmic variant (heteroplasmy level ≥ 0.95).',
      grow: 0,
      isSortable: true,
      minWidth: 110,
      render: renderAlleleCountCell,
    },
    {
      key: 'af_hom',
      heading: width < 600 ? 'Hom. AF' : 'Homoplasmic Allele Frequency',
      tooltip:
        'Proportion of individuals with homoplasmic or near-homoplasmic variant (heteroplasmy level ≥ 0.95).',
      grow: 0,
      isSortable: true,
      minWidth: 110,
      render: renderAlleleFrequencyCell,
    },
    {
      key: 'ac_het',
      tooltip: 'Number of individuals with a variant at heteroplasmy level 0.10 - 0.95.',
      heading: width < 600 ? 'Het. AC' : 'Heteroplasmic Allele Count',
      grow: 0,
      isSortable: true,
      minWidth: 110,
      render: renderAlleleCountCell,
    },
    {
      key: 'af_het',
      heading: width < 600 ? 'Het. AF' : 'Heteroplasmic Allele Frequency',
      tooltip: 'Proportion of individuals with a variant at heteroplasmy level 0.10 - 0.95.',
      grow: 0,
      isSortable: true,
      minWidth: 110,
      render: renderAlleleFrequencyCell,
    },
    {
      key: 'max_heteroplasmy',
      heading: 'Max observed heteroplasmy',
      tooltip: 'Maximum heteroplasmy level observed across all individuals (range 0.10 - 1.00).',
      grow: 0,
      isSortable: true,
      minWidth: 120,
      render: (row, key) => <NumericCell>{row[key]}</NumericCell>,
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
        <Cell>
          <Link to={`/gene/${row.gene_id}`}>{row.gene_symbol || row.gene_id}</Link>
        </Cell>
      ),
    })
  }

  return columns
}
