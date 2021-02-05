import React from 'react'
import Highlighter from 'react-highlight-words'

import { ExternalLink, TooltipAnchor, TooltipHint } from '@gnomad/ui'

import Link from '../Link'
import { Cell, renderAlleleCountCell, renderAlleleFrequencyCell } from '../tableCells'
import { getCategoryFromConsequence, getLabelForConsequenceTerm } from '../vepConsequences'
import SampleSourceIcon from './SampleSourceIcon'
import { makeNumericCompareFunction, makeStringCompareFunction } from './sortUtilities'
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

const getConsequenceDescription = contextType => {
  switch (contextType) {
    case 'gene':
      return ' for most severe consequence across all transcripts for this gene'
    case 'region':
      return ' for most severe consequence across all transcripts'
    case 'transcript':
    default:
      return ' for consequence in this transcript'
  }
}

const variantTableColumns = [
  {
    key: 'ac',
    heading: 'Allele Count',
    description: 'Alternate allele count in high quality genotypes',
    grow: 0,
    minWidth: 110,
    compareFunction: makeNumericCompareFunction('ac'),
    render: renderAlleleCountCell,
  },

  {
    key: 'an',
    heading: 'Allele Number',
    description: 'Total number of called high quality genotypes',
    grow: 0,
    minWidth: 110,
    compareFunction: makeNumericCompareFunction('an'),
    render: renderAlleleCountCell,
  },

  {
    key: 'af',
    heading: 'Allele Frequency',
    description: 'Alternate allele frequency in high quality genotypes',
    grow: 0,
    minWidth: 110,
    compareFunction: makeNumericCompareFunction('af'),
    render: renderAlleleFrequencyCell,
  },

  {
    key: 'clinical_significance',
    heading: 'Clinical Significance',
    description: 'ClinVar clinical significance',
    grow: 1,
    minWidth: 200,
    compareFunction: makeStringCompareFunction('clinical_significance'),
    getSearchTerms: variant => variant.clinical_significance,
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
    key: 'consequence',
    heading: 'VEP Annotation',
    description: 'Variant Effect Predictor (VEP) annotation',
    descriptionInContext: (context, contextType) =>
      `Variant Effect Predictor (VEP) annotation${getConsequenceDescription(contextType)}`,
    grow: 0,
    minWidth: 140,
    compareFunction: makeStringCompareFunction('consequence'),
    getSearchTerms: variant => [getLabelForConsequenceTerm(variant.consequence)],
    render: (row, key, { highlightWords }) => (
      <Cell>
        <VariantCategoryMarker color={getConsequenceColor(row[key])} />
        <Highlighter searchWords={highlightWords} textToHighlight={getConsequenceName(row[key])} />
      </Cell>
    ),
  },

  {
    key: 'flags',
    heading: 'Flags',
    description: 'Flags that may affect annotation and/or confidence',
    grow: 0,
    minWidth: 140,
    compareFunction: (v1, v2) => v1.flags.length - v2.flags.length,
    render: (row, key) =>
      row[key]
        .filter(flag => flag !== 'segdup' && flag !== 'par')
        .map(flag => <VariantFlag key={flag} type={flag} variant={row} />),
  },

  {
    key: 'gene',
    heading: 'Gene',
    description: 'Gene in which variant has the most severe consequence',
    minWidth: 100,
    render: row => (
      <Cell>
        <Link to={`/gene/${row.gene_id}`}>{row.gene_symbol || row.gene_id}</Link>
      </Cell>
    ),
    shouldShowInContext: (context, contextType) => contextType === 'region',
  },

  {
    key: 'hemizygote_count',
    heading: 'Number of Hemizygotes',
    description: 'Number of individuals hemizygous for alternate allele',
    grow: 0,
    minWidth: 100,
    compareFunction: makeNumericCompareFunction('ac_hemi'),
    render: variant => renderAlleleCountCell(variant, 'ac_hemi'),
    shouldShowInContext: context => context.chrom === 'X' || context.chrom === 'Y',
  },

  {
    key: 'hgvs',
    heading: 'HGVS Consequence',
    description: 'HGVS protein sequence (where defined) or coding sequence',
    descriptionInContext: (context, contextType) =>
      `HGVS protein sequence (where defined) or coding sequence${getConsequenceDescription(
        contextType
      )}`,
    grow: 1,
    minWidth: 160,
    compareFunction: makeStringCompareFunction('hgvs'),
    getSearchTerms: variant => [variant.hgvs],
    render: (variant, key, { highlightWords }) => (
      <Cell>
        <Highlighter searchWords={highlightWords} textToHighlight={variant.hgvs || ''} />
      </Cell>
    ),
  },

  {
    key: 'hgvsc',
    heading: 'HGVSc Consequence',
    description: 'HGVS coding sequence',
    descriptionInContext: (context, contextType) =>
      `HGVS coding sequence${getConsequenceDescription(contextType)}`,
    grow: 1,
    minWidth: 160,
    compareFunction: makeStringCompareFunction('hgvsc'),
    getSearchTerms: variant => [variant.hgvsc],
    render: (variant, key, { highlightWords }) => (
      <Cell>
        <Highlighter searchWords={highlightWords} textToHighlight={variant.hgvsc || ''} />
      </Cell>
    ),
  },

  {
    key: 'hgvsp',
    heading: 'HGVSp Consequence',
    description: 'HGVS protein sequence',
    descriptionInContext: (context, contextType) =>
      `HGVS protein sequence${getConsequenceDescription(contextType)}`,
    grow: 1,
    minWidth: 160,
    compareFunction: makeStringCompareFunction('hgvsp'),
    getSearchTerms: variant => [variant.hgvsp],
    render: (variant, key, { highlightWords }) => (
      <Cell>
        <Highlighter searchWords={highlightWords} textToHighlight={variant.hgvsp || ''} />
      </Cell>
    ),
  },

  {
    key: 'homozygote_count',
    heading: 'Number of Homozygotes',
    description: 'Number of individuals homozygous for alternate allele',
    grow: 0,
    minWidth: 100,
    compareFunction: makeNumericCompareFunction('ac_hom'),
    render: variant => renderAlleleCountCell(variant, 'ac_hom'),
    shouldShowInContext: context => context.chrom !== 'Y',
  },

  {
    key: 'lof_curation',
    heading: 'LoF Curation',
    description: 'Results of manual curation of pLoF variants',
    minWidth: 100,
    render: row => {
      if (!row.lof_curation) {
        return null
      }

      const { verdict, flags = [] } = row.lof_curation
      let content
      if (flags.length) {
        const tooltip = `This variant was curated as "${verdict}". The following factors contributed to this verdict: ${flags.join(
          ', '
        )}. See variant page for details.`

        content = (
          <TooltipAnchor tooltip={tooltip}>
            <TooltipHint>{verdict}</TooltipHint>
          </TooltipAnchor>
        )
      } else {
        content = verdict
      }

      return <Cell>{content}</Cell>
    },
    shouldShowInContext: (context, contextType) =>
      contextType === 'gene' || contextType === 'region',
  },

  {
    key: 'source',
    heading: 'Source',
    description: 'Sample set and quality control filters',
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
    key: 'variant_id',
    heading: 'Variant ID',
    description: 'Chromosome-position-reference-alternate',
    isRowHeader: true,
    minWidth: 150,
    grow: 1,
    compareFunction: makeNumericCompareFunction('pos'),
    getSearchTerms: variant => [variant.variant_id, variant.rsid],
    render: (row, key, { highlightWords }) => (
      <Cell>
        <Link target="_blank" to={`/variant/${row.variant_id}`}>
          <Highlighter searchWords={highlightWords} textToHighlight={row.variant_id} />
        </Link>
      </Cell>
    ),
  },
]

export default variantTableColumns

const getContextType = context => {
  if (context.transcript_id) {
    return 'transcript'
  }
  if (context.gene_id) {
    return 'gene'
  }
  return 'region'
}

export const getColumnsForContext = context => {
  const contextType = getContextType(context)
  const columns = variantTableColumns
    .filter(
      column =>
        column.shouldShowInContext === undefined || column.shouldShowInContext(context, contextType)
    )
    .map(column => ({
      ...column,
      description: column.descriptionInContext
        ? column.descriptionInContext(context, contextType)
        : column.description,
    }))
    .reduce((acc, column) => ({ ...acc, [column.key]: column }), {})

  if (contextType === 'gene') {
    const primaryTranscriptId = context.mane_select_transcript
      ? context.mane_select_transcript.ensembl_id
      : context.canonical_transcript_id

    columns.hgvs.render = (variant, key, { highlightWords }) => (
      <Cell>
        <Highlighter searchWords={highlightWords} textToHighlight={variant.hgvs || ''} />
        {primaryTranscriptId && variant.transcript_id !== primaryTranscriptId && ' †'}
      </Cell>
    )
  }

  return columns
}
