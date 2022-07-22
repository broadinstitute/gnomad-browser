import PropTypes from 'prop-types'
import React from 'react'

import { ExternalLink } from '@gnomad/ui'

import Link from '../Link'

const PROJECT_PUBLICATIONS = {
  all_homozygous: {
    pubmed_id: '32461654',
  },
  haploinsufficient_genes: {
    pubmed_id: '32461655',
  },
}

type LoFCurationResultProps = {
  result: LoFCurationResultPropType
}

const LoFCurationResult = ({ result }: LoFCurationResultProps) => {
  const { verdict, flags = [], project } = result
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const publication = PROJECT_PUBLICATIONS[project]
  return (
    <>
      <Link to={`/gene/${result.gene_id}`}>{result.gene_symbol || result.gene_id}</Link>
      <div>Curated as {verdict}</div>
      {flags.length > 0 && <div>Contributing factors: {flags.join(', ')}</div>}
      {publication && (
        <div>
          For more information about this curation, see{' '}
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <ExternalLink href={`https://pubmed.ncbi.nlm.nih.gov/${publication.pubmed_id}/`}>
            PMID {publication.pubmed_id}
          </ExternalLink>
        </div>
      )}
    </>
  )
}

type LoFCurationResultPropType = {
  gene_id: string
  gene_symbol?: string
  verdict: string
  flags?: string[]
  project: string
}

// @ts-expect-error TS(2322) FIXME: Type 'Requireable<InferProps<{ gene_id: Validator<... Remove this comment to see the full error message
const LoFCurationResultPropType: PropTypes.Requireable<LoFCurationResultPropType> = PropTypes.shape(
  {
    gene_id: PropTypes.string.isRequired,
    gene_symbol: PropTypes.string,
    verdict: PropTypes.string.isRequired,
    flags: PropTypes.arrayOf(PropTypes.string),
    project: PropTypes.string.isRequired,
  }
)

type VariantLoFCurationResultsProps = {
  variant: {
    lof_curations: LoFCurationResultPropType[]
  }
}

const VariantLoFCurationResults = ({ variant }: VariantLoFCurationResultsProps) => {
  const numGenes = new Set(variant.lof_curations.map((c) => c.gene_id)).size

  return (
    <div>
      This variant was manually curated in {numGenes} gene{numGenes !== 1 ? 's' : ''}.
      <ul>
        {variant.lof_curations.map((result) => (
          <li key={result.gene_id}>
            <LoFCurationResult result={result} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default VariantLoFCurationResults
