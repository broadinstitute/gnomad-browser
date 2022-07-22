import React from 'react'
import Highlighter from 'react-highlight-words'

import { ExternalLink, TooltipAnchor, TooltipHint } from '@gnomad/ui'

import Link from '../Link'
import { Cell, NumericCell, renderAlleleCountCell, renderAlleleFrequencyCell } from '../tableCells'
import { getCategoryFromConsequence, getLabelForConsequenceTerm } from '../vepConsequences'
import SampleSourceIcon from './SampleSourceIcon'
import {
  makeCompareFunction,
  makeNumericCompareFunction,
  makeStringCompareFunction,
} from './sortUtilities'
import VariantCategoryMarker from './VariantCategoryMarker'
import VariantFlag from './VariantFlag'

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

const getConsequenceDescription = (contextType: any) => {
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
    key: 'base_level_pext',
    heading: 'pext',
    description: 'Base-level pext score',
    contextNotes: 'Only shown when viewing a gene',
    minWidth: 80,
    compareFunction: makeNumericCompareFunction('base_level_pext'),
    render: (variant: any) => (
      <NumericCell>
        {variant.base_level_pext != null &&
          variant.base_level_pext.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
      </NumericCell>
    ),
    shouldShowInContext: (context: any, contextType: any) => contextType === 'gene',
  },

  {
    key: 'clinical_significance',
    heading: 'Clinical Significance',
    description: 'ClinVar clinical significance',
    grow: 1,
    minWidth: 150,
    compareFunction: makeStringCompareFunction('clinical_significance'),
    getSearchTerms: (variant: any) => variant.clinical_significance,
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
      row[key]
        .filter((flag: any) => flag !== 'segdup' && flag !== 'par')
        .map((flag: any) => <VariantFlag key={flag} type={flag} variant={row} />),
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
    key: 'hemizygote_count',
    heading: 'Number of Hemizygotes',
    description: 'Number of individuals hemizygous for alternate allele',
    contextNotes: 'Only shown when viewing X or Y chromosomes',
    grow: 0,
    minWidth: 100,
    compareFunction: makeNumericCompareFunction('ac_hemi'),
    render: (variant: any) => renderAlleleCountCell(variant, 'ac_hemi'),
    shouldShowInContext: (context: any) => context.chrom === 'X' || context.chrom === 'Y',
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
    getSearchTerms: (variant: any) => [variant.hgvs],
    render: (variant: any, key: any, { highlightWords }: any) => (
      <Cell>
        <Highlighter autoEscape searchWords={highlightWords} textToHighlight={variant.hgvs || ''} />
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
    key: 'homozygote_count',
    heading: 'Number of Homozygotes',
    description: 'Number of individuals homozygous for alternate allele',
    contextNotes: 'Not shown when viewing Y chromosome',
    grow: 0,
    minWidth: 100,
    compareFunction: makeNumericCompareFunction('ac_hom'),
    render: (variant: any) => renderAlleleCountCell(variant, 'ac_hom'),
    shouldShowInContext: (context: any) => context.chrom !== 'Y',
  },

  {
    key: 'lof_curation',
    heading: 'LoF Curation',
    description: 'Results of manual curation of pLoF variants',
    contextNotes: 'Not shown when viewing a transcript',
    minWidth: 100,
    compareFunction: makeStringCompareFunction((row: any) => (row.lof_curation || {}).verdict),
    render: (row: any) => {
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
          // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message
          <TooltipAnchor tooltip={tooltip}>
            {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
            <TooltipHint>{verdict}</TooltipHint>
          </TooltipAnchor>
        )
      } else {
        content = verdict
      }

      return <Cell>{content}</Cell>
    },
    shouldShowInContext: (context: any, contextType: any) =>
      contextType === 'gene' || contextType === 'region',
  },

  {
    key: 'rsid',
    heading: 'rsIDs',
    description: 'dbSNP rsIDs',
    grow: 1,
    minWidth: 160,
    compareFunction: makeCompareFunction('rsids', (rsids1: any, rsids2: any) =>
      rsids1[0].localeCompare(rsids2[0])
    ),
    getSearchTerms: (variant: any) => variant.rsids || [],
    render: (variant: any, key: any, { highlightWords }: any) => (
      <Cell>
        <Highlighter
          autoEscape
          searchWords={highlightWords}
          textToHighlight={(variant.rsids || []).join(', ')}
        />
      </Cell>
    ),
  },

  {
    key: 'source',
    heading: 'Source',
    description: 'Sample set and quality control filters',
    grow: 0,
    minWidth: 100,
    render: (variant: any) => (
      <React.Fragment>
        {variant.exome && <SampleSourceIcon source="exome" filters={variant.exome.filters} />}
        {variant.genome && <SampleSourceIcon source="genome" filters={variant.genome.filters} />}
      </React.Fragment>
    ),
  },

  {
    key: 'transcript_id',
    heading: 'Transcript',
    description: 'Transcript in which the displayed consequence occurs',
    contextNotes: 'Not shown when viewing a transcript',
    grow: 0,
    minWidth: 160,
    render: (row: any) => (
      <Cell>
        <Link to={`/transcript/${row.transcript_id}`}>
          {row.transcript_id}.{row.transcript_version}
        </Link>
      </Cell>
    ),
    shouldShowInContext: (context: any, contextType: any) => contextType !== 'transcript',
  },

  {
    key: 'variant_id',
    heading: 'Variant ID',
    description: 'Chromosome-position-reference-alternate',
    isRowHeader: true,
    minWidth: 150,
    grow: 1,
    compareFunction: makeNumericCompareFunction('pos'),
    getSearchTerms: (variant: any) => [variant.variant_id].concat(variant.rsids || []),
    render: (row: any, key: any, { highlightWords }: any) => (
      <Cell>
        <Link target="_blank" to={`/variant/${row.variant_id}`}>
          <Highlighter autoEscape searchWords={highlightWords} textToHighlight={row.variant_id} />
        </Link>
      </Cell>
    ),
  },
]

export default variantTableColumns

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
  const columns = variantTableColumns
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

  if (contextType === 'gene') {
    const primaryTranscriptId = context.mane_select_transcript
      ? context.mane_select_transcript.ensembl_id
      : context.canonical_transcript_id

    // @ts-expect-error TS(2339) Property 'hgvs' does not exist on type '{}'.
    columns.hgvs.render = (variant: any, key: any, { highlightWords }: any) => (
      <Cell>
        <Highlighter autoEscape searchWords={highlightWords} textToHighlight={variant.hgvs || ''} />
        {primaryTranscriptId && variant.transcript_id !== primaryTranscriptId && ' †'}
      </Cell>
    )
  }

  return columns
}
