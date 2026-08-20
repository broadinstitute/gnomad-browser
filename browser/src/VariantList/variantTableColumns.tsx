import React from 'react'
import Highlighter from 'react-highlight-words'

import { Badge, ExternalLink, TooltipAnchor, TooltipHint } from '@gnomad/ui'

import Link from '../Link'
import { Cell, NumericCell, renderAlleleCountCell, renderAlleleFrequencyCell } from '../tableCells'
import { getCategoryFromConsequence, getLabelForConsequenceTerm } from '../vepConsequences'
import SampleSourceIcon from './SampleSourceIcon'
import {
  makeClinvarCompareFunction,
  makeCompareFunction,
  makeNumericCompareFunction,
  makeStringCompareFunction,
} from './sortUtilities'
import VariantCategoryMarker from './VariantCategoryMarker'
import VariantFlag from './VariantFlag'
import { Variant } from '../VariantPage/VariantPage'
import { DatasetId, isLongRead } from '@gnomad/dataset-metadata/metadata'
import { longReadVariantUrl } from '../LongReadVariantPage/longReadCohort'
import { formatLongReadAlleleDisplay } from '../LongReadVariantPage/formatLongReadVariantId'
import { trLocusUrl } from '@gnomad/dataset-metadata/longReadTrLocusId'

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

const consolidatedFlags = (row: any) => {
  const variantFlags = row.flags || []
  const exomeFlags = row.exome?.flags || []
  const genomeFlags = row.genome?.flags || []
  const allFlags = Array.from(new Set([...variantFlags, ...exomeFlags, ...genomeFlags]))
  return allFlags.sort()
}

export type VariantTableColumn = {
  key: string
  heading: string
  description?: string
  grow?: number
  minWidth?: number
  compareFunction?: (a: any, b: any, order?: string) => number
  render: (variant: any, key: string, options: any) => JSX.Element | null
  shouldShowInContext?: (context: string, contextType: string) => boolean
  contextNotes?: string
  getSearchTerms?: (variant: Variant) => Variant[]
  descriptionInContext?: (context: string, contextType: string) => string
  isRowHeader?: boolean
}

const variantTableColumns: VariantTableColumn[] = [
  {
    key: 'ac',
    heading: 'Allele Count',
    description: 'Alternate allele count in high quality genotypes',
    grow: 0,
    minWidth: 110,
    compareFunction: makeNumericCompareFunction('ac'),
    render: (row: any, key: string) =>
      row.is_long_read_tr_locus ? <NumericCell title="Exact-allele count is unavailable for a locus summary.">—</NumericCell> : renderAlleleCountCell(row, key),
  },

  {
    key: 'an',
    heading: 'Allele Number',
    description: 'Total number of called high quality genotypes',
    grow: 0,
    minWidth: 110,
    compareFunction: makeNumericCompareFunction('an'),
    render: (row: any, key: string) =>
      row.is_long_read_tr_locus ? <NumericCell title="Exact-allele number is unavailable for a locus summary.">—</NumericCell> : renderAlleleCountCell(row, key),
  },

  {
    key: 'af',
    heading: 'Allele Frequency',
    description: 'Alternate allele frequency in high quality genotypes',
    grow: 0,
    minWidth: 110,
    compareFunction: makeNumericCompareFunction('af'),
    render: (row: any, key: string) =>
      row.is_long_read_tr_locus ? <NumericCell title="Exact-allele frequency is unavailable for a locus summary.">—</NumericCell> : renderAlleleFrequencyCell(row, key),
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
    shouldShowInContext: (_context: string, contextType: string) => contextType === 'gene',
  },

  {
    key: 'clinical_significance',
    heading: 'Germline classification',
    description: 'ClinVar germline classification, formerly called clinical significance',
    grow: 1,
    minWidth: 150,
    compareFunction: makeClinvarCompareFunction('clinical_significance'),
    getSearchTerms: (variant: any) => variant.clinical_significance,
    render: (variant: any, _: any, { highlightWords }: any) => (
      <Cell>
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
    shouldShowInContext: (_context, contextType) => contextType !== 'gene-lr',
  },

  {
    key: 'consequence',
    heading: 'VEP Annotation',
    description: 'Variant Effect Predictor (VEP) annotation',
    descriptionInContext: (_context: string, contextType: string) =>
      `Variant Effect Predictor (VEP) annotation${getConsequenceDescription(contextType)}`,
    grow: 0,
    minWidth: 140,
    compareFunction: makeStringCompareFunction('consequence'),
    getSearchTerms: (variant: any) => [
      variant.is_long_read_tr_locus
        ? 'Unavailable for tandem-repeat locus'
        : getLabelForConsequenceTerm(variant.consequence),
    ],
    render: (row: any, key: any, { highlightWords }: any) =>
      row.is_long_read_tr_locus ? (
        <Cell title="Allele-level VEP consequence is unavailable for this locus summary.">—</Cell>
      ) : (
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
    compareFunction: makeNumericCompareFunction(
      (variant: any) => consolidatedFlags(variant).length || null
    ),
    render: (row: any) => (
      <>
        {consolidatedFlags(row).map((flag: any) => (
          <VariantFlag key={flag} type={flag} variant={row} />
        ))}
      </>
    ),
    shouldShowInContext: (_context: any, contextType: any) => contextType !== 'gene-lr',
  },

  {
    key: 'gene',
    heading: 'Gene',
    description: 'Gene in which variant has the most severe consequence',
    contextNotes: 'Only shown when viewing a region',
    minWidth: 100,
    render: (row: any) => (
      <Cell>
        {row.is_long_read_tr_locus ? (
          <span title="Allele-level gene annotation is unavailable for this locus summary.">—</span>
        ) : (
          <Link to={`/gene/${row.gene_id}`}>{row.gene_symbol || row.gene_id}</Link>
        )}
      </Cell>
    ),
    shouldShowInContext: (_context: any, contextType: any) => contextType === 'region',
  },

  {
    key: 'hemizygote_count',
    heading: 'Number of Hemizygotes',
    description: 'Number of individuals hemizygous for alternate allele',
    contextNotes: 'Only shown when viewing X or Y chromosomes',
    grow: 0,
    minWidth: 100,
    compareFunction: makeNumericCompareFunction('ac_hemi'),
    render: (variant: Variant) => renderAlleleCountCell(variant, 'ac_hemi'),
    shouldShowInContext: (context: any) => context.chrom === 'X' || context.chrom === 'Y',
  },

  {
    key: 'hgvs',
    heading: 'HGVS Consequence',
    description: 'HGVS protein sequence (where defined) or coding sequence',
    descriptionInContext: (_context: any, contextType: any) =>
      `HGVS protein sequence (where defined) or coding sequence${getConsequenceDescription(
        contextType
      )}`,
    grow: 1,
    minWidth: 160,
    compareFunction: makeStringCompareFunction('hgvs'),
    getSearchTerms: (variant: any) => [
      variant.hgvs,
      variant.is_long_read_tr_locus ? 'Unavailable for tandem-repeat locus' : null,
    ],
    render: (variant: any, _: any, { highlightWords }: any) => (
      <Cell
        title={
          variant.is_long_read_tr_locus
            ? 'Allele-level HGVS consequence is unavailable for this locus summary.'
            : undefined
        }
      >
        <Highlighter
          autoEscape
          searchWords={highlightWords}
          textToHighlight={variant.is_long_read_tr_locus ? '—' : variant.hgvs || ''}
        />
      </Cell>
    ),
  },

  {
    key: 'hgvsc',
    heading: 'HGVSc Consequence',
    description: 'HGVS coding sequence',
    descriptionInContext: (_context: any, contextType: any) =>
      `HGVS coding sequence${getConsequenceDescription(contextType)}`,
    grow: 1,
    minWidth: 160,
    compareFunction: makeStringCompareFunction('hgvsc'),
    getSearchTerms: (variant: any) => [variant.hgvsc],
    render: (variant: any, _: any, { highlightWords }: any) => (
      <Cell title={variant.is_long_read_tr_locus ? 'Allele-level HGVSc is unavailable for this locus summary.' : undefined}>
        <Highlighter
          autoEscape
          searchWords={highlightWords}
          textToHighlight={variant.is_long_read_tr_locus ? '—' : variant.hgvsc || ''}
        />
      </Cell>
    ),
  },

  {
    key: 'hgvsp',
    heading: 'HGVSp Consequence',
    description: 'HGVS protein sequence',
    descriptionInContext: (_context: any, contextType: any) =>
      `HGVS protein sequence${getConsequenceDescription(contextType)}`,
    grow: 1,
    minWidth: 160,
    compareFunction: makeStringCompareFunction('hgvsp'),
    getSearchTerms: (variant: any) => [variant.hgvsp],
    render: (variant: any, _: any, { highlightWords }: any) => (
      <Cell title={variant.is_long_read_tr_locus ? 'Allele-level HGVSp is unavailable for this locus summary.' : undefined}>
        <Highlighter
          autoEscape
          searchWords={highlightWords}
          textToHighlight={variant.is_long_read_tr_locus ? '—' : variant.hgvsp || ''}
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
            <TooltipHint>{verdict}</TooltipHint>
          </TooltipAnchor>
        )
      } else {
        content = verdict
      }

      return <Cell>{content}</Cell>
    },
    shouldShowInContext: (_context: any, contextType: any) =>
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
    render: (variant: any, _: any, { highlightWords }: any) => (
      <Cell title={variant.is_long_read_tr_locus ? 'Exact-allele rsIDs are unavailable for this locus summary.' : undefined}>
        <Highlighter
          autoEscape
          searchWords={highlightWords}
          textToHighlight={variant.is_long_read_tr_locus ? '—' : (variant.rsids || []).join(', ')}
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
        {variant.long_read && (
          <SampleSourceIcon source="long_read" filters={variant.long_read.filters} />
        )}
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
        {row.is_long_read_tr_locus ? (
          <span title="Allele-level transcript annotation is unavailable for this locus summary.">—</span>
        ) : (
          <Link to={`/transcript/${row.transcript_id}`}>
            {row.transcript_id}.{row.transcript_version}
          </Link>
        )}
      </Cell>
    ),
    shouldShowInContext: (_context: any, contextType: any) => contextType !== 'transcript',
  },

  {
    key: 'variant_id',
    heading: 'Variant ID',
    description: 'Chromosome-position-reference-alternate',
    isRowHeader: true,
    minWidth: 150,
    grow: 1,
    compareFunction: makeNumericCompareFunction('pos'),
    getSearchTerms: (variant: any) =>
      [
        variant.variant_id,
        variant.long_read_tr_locus_id,
        variant.long_read_tr_source_variant_id,
        variant.long_read_tr_label,
        ...(variant.rsids || []),
        ...(variant.long_read_alleles || []).flatMap((allele: any) => [
          allele.variant_id,
          allele.source_variant_id,
          formatLongReadAlleleDisplay(allele).label,
        ]),
      ].filter(Boolean),
    render: (row: any, _: any, { highlightWords }: any) => {
      if (row.is_long_read_tr_locus) {
        return (
          <Cell title={row.long_read_tr_tooltip}>
            <Link
              target="_blank"
              to={trLocusUrl(row.long_read_tr_locus_id, row.lr_cohort)}
              preserveSelectedDataset={false}
              title={row.long_read_tr_tooltip}
              aria-label={row.long_read_tr_tooltip}
            >
              <Highlighter
                autoEscape
                searchWords={highlightWords}
                textToHighlight={row.long_read_tr_label}
              />
            </Link>
            <span
              style={{ marginLeft: '0.75ch', whiteSpace: 'nowrap' }}
              title={row.long_read_tr_delta_unavailable_reason || 'Complete observed whole-record ALT minus REF range'}
            >
              Δbp {row.long_read_tr_delta_label}
            </span>
            <span style={{ marginLeft: '0.5ch', whiteSpace: 'nowrap' }}>
              <Badge level="info">TR</Badge>
            </span>
          </Cell>
        )
      }

      const lrIdentity = row.lr_cohort
        ? formatLongReadAlleleDisplay({
            ...row,
            ...row.long_read_details,
            allele_type: row.long_read_details?.allele_type,
          })
        : null
      return (
        <Cell>
          <Link
            target="_blank"
            to={
              row.lr_cohort
                ? longReadVariantUrl(row.variant_id, row.lr_cohort)
                : `/variant/${row.variant_id}`
            }
            preserveSelectedDataset={!row.lr_cohort}
            title={lrIdentity?.accessibleLabel}
            aria-label={lrIdentity?.accessibleLabel}
          >
            <Highlighter
              autoEscape
              searchWords={highlightWords}
              textToHighlight={lrIdentity?.compactLabel || row.variant_id}
            />
          </Link>
          {lrIdentity?.alleleLabel && (
            <span style={{ marginLeft: '0.5ch', whiteSpace: 'nowrap' }} title={lrIdentity.label}>
              <Badge level="info">{lrIdentity.alleleLabel.replace('Allele ', 'ALT ')}</Badge>
            </span>
          )}
          {!row.lr_cohort &&
            row.long_read_alleles?.map((allele: any) => {
              const identity = formatLongReadAlleleDisplay(allele)
              return (
                <span key={allele.variant_id} style={{ marginLeft: '0.5ch', whiteSpace: 'nowrap' }}>
                  <Link
                    target="_blank"
                    to={longReadVariantUrl(allele.variant_id, allele.lr_cohort || 'hgsvc_hprc')}
                    preserveSelectedDataset={false}
                    title={identity.accessibleLabel}
                    aria-label={identity.accessibleLabel}
                  >
                    <Badge level="info">
                      LR
                      {identity.alleleLabel
                        ? ` ${identity.alleleLabel.replace('Allele ', 'ALT ')}`
                        : ''}
                    </Badge>
                  </Link>
                </span>
              )
            })}
          {row.long_read_details?.is_likely_tr && (
            <span style={{ marginLeft: '0.5ch' }}>
              <Badge level="info">TR</Badge>
            </span>
          )}
        </Cell>
      )
    },
  },
  {
    key: 'short_read_match_id',
    heading: 'Short read match',
    description: 'Matching variant in gnomAD v4 short-read dataset',
    isRowHeader: true,
    grow: 1,
    compareFunction: makeStringCompareFunction('short_read_match_id'),
    getSearchTerms: (variant: any) => [variant.short_read_match_id],
    render: (row: any, _key: any, _options: any) => (
      <Cell>
        {row.is_long_read_tr_locus ? (
          <span title="Exact-allele short-read matches are unavailable for this locus summary.">—</span>
        ) : (
          <Link
            target="_blank"
            to={`/variant/${row.short_read_match_id}?dataset=gnomad_r4`}
            preserveSelectedDataset={false}
          >
            {row.short_read_match_id}
          </Link>
        )}
      </Cell>
    ),
    shouldShowInContext: (_context, contextType) => contextType === 'gene-lr',
  },
]

export default variantTableColumns

const getContextType = (context: any, datasetId: DatasetId) => {
  if (context.transcript_id) {
    return 'transcript'
  }
  if (context.gene_id) {
    if (isLongRead(datasetId)) {
      return 'gene-lr'
    }
    return 'gene'
  }
  return 'region'
}

export const getColumnsForContext = (context: any, datasetId: DatasetId) => {
  const contextType = getContextType(context, datasetId)
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
    columns.hgvs.render = (variant: any, _: any, { highlightWords }: any) => (
      <Cell
        title={
          variant.is_long_read_tr_locus
            ? 'Allele-level HGVS consequence is unavailable for this locus summary.'
            : undefined
        }
      >
        <Highlighter
          autoEscape
          searchWords={highlightWords}
          textToHighlight={variant.is_long_read_tr_locus ? '—' : variant.hgvs || ''}
        />
        {!variant.is_long_read_tr_locus &&
          primaryTranscriptId &&
          variant.transcript_id !== primaryTranscriptId &&
          ' †'}
      </Cell>
    )
  }

  return columns
}
