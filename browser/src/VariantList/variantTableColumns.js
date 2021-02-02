import React from 'react'
import Highlighter from 'react-highlight-words'

import { ExternalLink, TooltipAnchor, TooltipHint } from '@gnomad/ui'

import Link from '../Link'
import { Cell, renderAlleleCountCell, renderAlleleFrequencyCell } from '../tableCells'
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
  includeLofCuration = false,
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
        <Cell>
          <Link target="_blank" to={`/variant/${row.variant_id}`}>
            <Highlighter searchWords={highlightWords} textToHighlight={row.variant_id} />
          </Link>
        </Cell>
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
      heading: 'HGVS Consequence',
      tooltip: `HGVS protein sequence (where defined) or coding sequence${getConsequenceDescription(
        context
      )}`,
      grow: 1,
      isSortable: true,
      minWidth: 160,
      render: (variant, key, { highlightWords }) => (
        <Cell>
          <Highlighter searchWords={highlightWords} textToHighlight={variant.hgvs || ''} />
          {primaryTranscriptId && variant.transcript_id !== primaryTranscriptId && ' †'}
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
        row[key]
          .filter(flag => flag !== 'segdup' && flag !== 'par')
          .map(flag => <VariantFlag key={flag} type={flag} variant={row} />),
    },
    {
      key: 'ac',
      heading: 'Allele Count',
      tooltip: 'Alternate allele count in high quality genotypes',
      grow: 0,
      isSortable: true,
      minWidth: 110,
      render: renderAlleleCountCell,
    },
    {
      key: 'an',
      heading: 'Allele Number',
      tooltip: 'Total number of called high quality genotypes',
      grow: 0,
      isSortable: true,
      minWidth: 110,
      render: renderAlleleCountCell,
    },
    {
      key: 'af',
      heading: 'Allele Frequency',
      tooltip: 'Alternate allele frequency in high quality genotypes',
      grow: 0,
      isSortable: true,
      minWidth: 110,
      render: renderAlleleFrequencyCell,
    },
  ]

  if (includeLofCuration) {
    columns.splice(4, 0, {
      key: 'lof_curation',
      heading: 'LoF Curation',
      tooltip: 'Results of manual curation of pLoF variants',
      isSortable: false,
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
    })
  }

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

  if (includeHomozygoteAC) {
    columns.push({
      key: 'ac_hom',
      heading: 'Number of Homozygotes',
      tooltip: 'Number of individuals homozygous for alternate allele',
      grow: 0,
      isSortable: true,
      minWidth: 100,
      render: renderAlleleCountCell,
    })
  }

  if (includeHemizygoteAC) {
    columns.push({
      key: 'ac_hemi',
      heading: 'Number of Hemizygotes',
      tooltip: 'Number of individuals hemizygous for alternate allele',
      grow: 0,
      isSortable: true,
      minWidth: 100,
      render: renderAlleleCountCell,
    })
  }

  return columns
}
