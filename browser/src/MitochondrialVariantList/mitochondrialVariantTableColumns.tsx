import React from 'react'
import Highlighter from 'react-highlight-words'

import { ExternalLink } from '@gnomad/ui'

import Link from '../Link'
import { Cell, NumericCell, renderAlleleCountCell, renderAlleleFrequencyCell } from '../tableCells'
import { getCategoryFromConsequence, getLabelForConsequenceTerm } from '../vepConsequences'
import SampleSourceIcon from '../VariantList/SampleSourceIcon'
import { makeNumericCompareFunction, makeStringCompareFunction } from '../VariantList/sortUtilities'
import VariantCategoryMarker from '../VariantList/VariantCategoryMarker'
import VariantFlag from '../VariantList/VariantFlag'

const categoryColors = {
  lof: '#DD2C00',
  missense: 'orange',
  synonymous: '#2E7D32',
  other: '#424242',
}

const getConsequenceColor = (consequenceTerm: any) => {
  if (!consequenceTerm) {
    return 'gray'
  }
  const category = getCategoryFromConsequence(consequenceTerm) || 'other'
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  return categoryColors[category]
}

const getConsequenceName = (consequenceTerm: any) =>
  consequenceTerm ? getLabelForConsequenceTerm(consequenceTerm) : 'N/A'

const getConsequenceDescription = (context: any) => {
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

const mitochondrialVariantTableColumns = [
  {
    key: 'ac_het',
    description: 'Number of individuals with a variant at heteroplasmy level 0.10 - 0.95.',
    heading: 'Heteroplasmic Allele Count',
    grow: 0,
    minWidth: 110,
    compareFunction: makeNumericCompareFunction('ac_het'),
    render: renderAlleleCountCell,
  },

  {
    key: 'ac_hom',
    heading: 'Homoplasmic Allele Count',
    tooltip:
      'Number of individuals with homoplasmic or near-homoplasmic variant (heteroplasmy level ≥ 0.95).',
    grow: 0,
    minWidth: 110,
    compareFunction: makeNumericCompareFunction('ac_hom'),
    render: renderAlleleCountCell,
  },

  {
    key: 'af_het',
    heading: 'Heteroplasmic Allele Frequency',
    description: 'Proportion of individuals with a variant at heteroplasmy level 0.10 - 0.95.',
    grow: 0,
    minWidth: 110,
    compareFunction: makeNumericCompareFunction('af_het'),
    render: renderAlleleFrequencyCell,
  },

  {
    key: 'af_hom',
    heading: 'Homoplasmic Allele Frequency',
    tooltip:
      'Proportion of individuals with homoplasmic or near-homoplasmic variant (heteroplasmy level ≥ 0.95).',
    grow: 0,
    minWidth: 110,
    compareFunction: makeNumericCompareFunction('af_hom'),
    render: renderAlleleFrequencyCell,
  },

  {
    key: 'an',
    heading: 'Allele Number',
    description: 'Total number of individuals with high quality sequence at this position.',
    grow: 0,
    minWidth: 110,
    compareFunction: makeNumericCompareFunction('an'),
    render: renderAlleleCountCell,
  },

  {
    key: 'clinical_significance',
    heading: 'Clinical Significance',
    description: 'ClinVar clinical significance',
    grow: 1,
    minWidth: 150,
    compareFunction: makeStringCompareFunction('clinical_significance'),
    getSearchTerms: (variant: any) => [variant.clinical_significance],
    render: (variant: any, _: any, { highlightWords }: any) => (
      <Cell>
        {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
        <ExternalLink
          href={`https://www.ncbi.nlm.nih.gov/clinvar/variation/${variant.clinvar_variation_id}/`}
        >
          <Highlighter
            autoEscape
            searchWords={highlightWords}
            textToHighlight={variant.clinical_significance || ''}
          />
        </ExternalLink>
      </Cell>
    ),
  },

  {
    key: 'consequence',
    heading: 'VEP Annotation',
    description: 'Variant Effect Predictor (VEP) annotation',
    descriptionInContext: (context: any, contextType: any) =>
      `Variant Effect Predictor (VEP) annotation${getConsequenceDescription(contextType)}`,
    grow: 0,
    minWidth: 140,
    compareFunction: makeStringCompareFunction('consequence'),
    getSearchTerms: (variant: any) => [getLabelForConsequenceTerm(variant.consequence)],
    render: (row: any, key: any, { highlightWords }: any) => (
      <Cell>
        <VariantCategoryMarker color={getConsequenceColor(row[key])} />
        <Highlighter
          autoEscape
          searchWords={highlightWords}
          textToHighlight={getConsequenceName(row[key])}
        />
      </Cell>
    ),
  },

  {
    key: 'flags',
    heading: 'Flags',
    description: 'Flags that may affect annotation and/or confidence',
    grow: 0,
    minWidth: 140,
    compareFunction: makeNumericCompareFunction((variant: any) => variant.flags.length || null),
    render: (row: any, key: any) =>
      row[key].map((flag: any) => <VariantFlag key={flag} type={flag} variant={row} />),
  },

  {
    key: 'gene',
    heading: 'Gene',
    description: 'Gene in which variant has the most severe consequence',
    contextNotes: 'Only shown when viewing a region',
    minWidth: 100,
    render: (row: any) => (
      <Cell>
        <Link to={`/gene/${row.gene_id}`}>{row.gene_symbol || row.gene_id}</Link>
      </Cell>
    ),
    shouldShowInContext: (context: any, contextType: any) => contextType === 'region',
  },

  {
    key: 'hgvs',
    heading: 'HGVS Consequence',
    description: 'HGVS protein sequence (where defined) or coding sequence',
    descriptionInContext: (context: any, contextType: any) =>
      `HGVS protein sequence (where defined) or coding sequence${getConsequenceDescription(
        contextType
      )}`,
    grow: 1,
    minWidth: 160,
    compareFunction: makeStringCompareFunction('hgvs'),
    getSearchTerms: (variant: any) => [variant.hgvsp || variant.hgvsc],
    render: (variant: any, key: any, { highlightWords }: any) => (
      <Cell>
        <Highlighter
          autoEscape
          searchWords={highlightWords}
          textToHighlight={variant.hgvsp || variant.hgvsc || ''}
        />
      </Cell>
    ),
  },

  {
    key: 'hgvsc',
    heading: 'HGVSc Consequence',
    description: 'HGVS coding sequence',
    descriptionInContext: (context: any, contextType: any) =>
      `HGVS coding sequence${getConsequenceDescription(contextType)}`,
    grow: 1,
    minWidth: 160,
    compareFunction: makeStringCompareFunction('hgvsc'),
    getSearchTerms: (variant: any) => [variant.hgvsc],
    render: (variant: any, key: any, { highlightWords }: any) => (
      <Cell>
        <Highlighter
          autoEscape
          searchWords={highlightWords}
          textToHighlight={variant.hgvsc || ''}
        />
      </Cell>
    ),
  },

  {
    key: 'hgvsp',
    heading: 'HGVSp Consequence',
    description: 'HGVS protein sequence',
    descriptionInContext: (context: any, contextType: any) =>
      `HGVS protein sequence${getConsequenceDescription(contextType)}`,
    grow: 1,
    minWidth: 160,
    compareFunction: makeStringCompareFunction('hgvsp'),
    getSearchTerms: (variant: any) => [variant.hgvsp],
    render: (variant: any, key: any, { highlightWords }: any) => (
      <Cell>
        <Highlighter
          autoEscape
          searchWords={highlightWords}
          textToHighlight={variant.hgvsp || ''}
        />
      </Cell>
    ),
  },

  {
    key: 'max_heteroplasmy',
    heading: 'Max observed heteroplasmy',
    description: 'Maximum heteroplasmy level observed across all individuals (range 0.10 - 1.00).',
    grow: 0,
    minWidth: 120,
    compareFunction: makeNumericCompareFunction('max_heteroplasmy'),
    render: (row: any, key: any) => <NumericCell>{row[key]}</NumericCell>,
  },

  {
    key: 'source',
    heading: 'Source',
    description: 'Quality control filters',
    grow: 0,
    minWidth: 100,
    render: (variant: any) => <SampleSourceIcon source="genome" filters={variant.filters} />,
  },

  {
    key: 'variant_id',
    heading: 'Variant ID',
    description: 'Chromosome-position-reference-alternate',
    grow: 1,
    isRowHeader: true,
    minWidth: 110,
    compareFunction: makeNumericCompareFunction('pos'),
    getSearchTerms: (variant: any) => [variant.variant_id],
    render: (variant: any, key: any, { highlightWords }: any) => (
      <Cell>
        <Link target="_blank" to={`/variant/${variant.variant_id}`}>
          <Highlighter
            autoEscape
            searchWords={highlightWords}
            textToHighlight={variant.variant_id}
          />
        </Link>
      </Cell>
    ),
  },
]

export default mitochondrialVariantTableColumns

const getContextType = (context: any) => {
  if (context.transcript_id) {
    return 'transcript'
  }
  if (context.gene_id) {
    return 'gene'
  }
  return 'region'
}

export const getColumnsForContext = (context: any) => {
  const contextType = getContextType(context)
  return mitochondrialVariantTableColumns
    .filter(
      (column) =>
        column.shouldShowInContext === undefined || column.shouldShowInContext(context, contextType)
    )
    .map((column) => ({
      ...column,
      description: column.descriptionInContext
        ? column.descriptionInContext(context, contextType)
        : column.description,
    }))
    .reduce((acc, column) => ({ ...acc, [column.key]: column }), {})
}
