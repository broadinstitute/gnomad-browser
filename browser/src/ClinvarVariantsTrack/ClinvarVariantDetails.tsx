import React from 'react'

import { ExternalLink } from '@gnomad/ui'

import AttributeList, { AttributeListItem } from '../AttributeList'
import SubmissionsList from '../SubmissionsList'
import Link from '../Link'
import Query from '../Query'

import formatClinvarDate from './formatClinvarDate'

type ClinvarVariantDetailsGnomadDataProps = {
  clinvarVariant: {
    gnomad?: {
      exome?: {
        ac: number
        an: number
        filters: string[]
      }
      genome?: {
        ac: number
        an: number
        filters: string[]
      }
    }
  }
}

const ClinvarVariantDetailsGnomadData = ({
  clinvarVariant,
}: ClinvarVariantDetailsGnomadDataProps) => {
  const ac =
    // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
    ((clinvarVariant.gnomad.exome || {}).ac || 0) + ((clinvarVariant.gnomad.genome || {}).ac || 0)
  const an =
    // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
    ((clinvarVariant.gnomad.exome || {}).an || 0) + ((clinvarVariant.gnomad.genome || {}).an || 0)
  const af = an === 0 ? 0 : ac / an

  const truncatedAF = Number(af.toPrecision(3))
  const formattedAF = truncatedAF === 0 || truncatedAF === 1 ? af.toFixed(0) : af.toExponential(2)

  return (
    <>
      <AttributeList>
        <AttributeListItem label="Allele count">{ac}</AttributeListItem>
        <AttributeListItem label="Allele number">{an}</AttributeListItem>
        <AttributeListItem label="Allele frequency">{formattedAF}</AttributeListItem>
      </AttributeList>
    </>
  )
}

type ClinvarVariantDetailsProps = {
  clinvarVariant: {
    clinical_significance: string
    clinvar_variation_id: string
    gnomad?: {
      exome?: {
        ac: number
        an: number
        filters: string[]
      }
      genome?: {
        ac: number
        an: number
        filters: string[]
      }
    }
    gold_stars: number
    in_gnomad: boolean
    last_evaluated?: string
    review_status: string
    submissions: {
      clinical_significance: string
      conditions?: {
        medgen_id?: string
        name: string
      }[]
      last_evaluated?: string
      review_status: string
      submitter_name: string
    }[]
    variant_id: string
  }
  clinvarReleaseDate: string
}

const ClinvarVariantDetails = ({
  clinvarVariant,
  clinvarReleaseDate,
}: ClinvarVariantDetailsProps) => {
  const conditions = clinvarVariant.submissions
    .flatMap((submission: any) => submission.conditions)
    .reduce(
      (acc, condition) => ({
        ...acc,
        [`${condition.medgen_id}-${condition.name}`]: condition,
      }),
      {}
    )

  return (
    <>
      <h3>ClinVar</h3>

      <p>
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink
          href={`https://www.ncbi.nlm.nih.gov/clinvar/variation/${clinvarVariant.clinvar_variation_id}/`}
        >
          View more information on the ClinVar website
        </ExternalLink>
      </p>

      <AttributeList>
        <AttributeListItem label="ClinVar Variation ID">
          {clinvarVariant.clinvar_variation_id}
        </AttributeListItem>
        <AttributeListItem label="Conditions">
          {Object.values(conditions)
            .map((condition: any) =>
              condition.medgen_id ? (
                // @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component.
                <ExternalLink
                  key={condition.medgen_id}
                  href={`https://www.ncbi.nlm.nih.gov/medgen/${condition.medgen_id}/`}
                >
                  {condition.name}
                </ExternalLink>
              ) : (
                <span>{condition.name}</span>
              )
            )
            .reduce(
              (acc: any, el: any, i: any) => (i === 0 ? [...acc, el] : [...acc, ', ', el]),
              []
            )}
        </AttributeListItem>
        <AttributeListItem label="Clinical significance">
          {clinvarVariant.clinical_significance}
        </AttributeListItem>
        <AttributeListItem label="Review status">
          {clinvarVariant.review_status} ({clinvarVariant.gold_stars}{' '}
          {clinvarVariant.gold_stars === 1 ? 'star' : 'stars'})
        </AttributeListItem>
        <AttributeListItem label="Last evaluated">
          {clinvarVariant.last_evaluated ? formatClinvarDate(clinvarVariant.last_evaluated) : '–'}
        </AttributeListItem>
      </AttributeList>

      <h4>Submissions</h4>

      <SubmissionsList submissions={clinvarVariant.submissions} />

      <p>
        Data displayed here is from ClinVar&apos;s {formatClinvarDate(clinvarReleaseDate)} release.
      </p>

      {clinvarVariant.in_gnomad && (
        <>
          <h3>gnomAD</h3>

          <p>
            <Link target="_blank" to={`/variant/${clinvarVariant.variant_id}`}>
              View all gnomAD data for this variant
            </Link>
          </p>

          <ClinvarVariantDetailsGnomadData clinvarVariant={clinvarVariant} />
        </>
      )}
    </>
  )
}

const operationName = 'ClinVarVariant'
const query = `
query ${operationName}($variantId: String!, $referenceGenome: ReferenceGenomeId!) {
  clinvar_variant(variant_id: $variantId, reference_genome: $referenceGenome) {
    clinical_significance
    clinvar_variation_id
    gnomad {
      exome {
        ac
        an
        filters
      }
      genome {
        ac
        an
        filters
      }
    }
    gold_stars
    in_gnomad
    last_evaluated
    review_status
    submissions {
      clinical_significance
      conditions {
        name
        medgen_id
      }
      last_evaluated
      review_status
      submitter_name
    }
    variant_id
  }
  meta {
    clinvar_release_date
  }
}
`

type ClinvarVariantDetailsContainerProps = {
  referenceGenome: 'GRCh37' | 'GRCh38'
  variantId: string
}

const ClinvarVariantDetailsContainer = ({
  referenceGenome,
  variantId,
}: ClinvarVariantDetailsContainerProps) => {
  return (
    <Query
      operationName={operationName}
      query={query}
      variables={{ referenceGenome, variantId }}
      loadingMessage="Loading variant data"
      errorMessage="Unable to load variant data"
      success={(data: any) => data.clinvar_variant}
    >
      {({ data }: any) => {
        return (
          <ClinvarVariantDetails
            clinvarReleaseDate={data.meta.clinvar_release_date}
            clinvarVariant={data.clinvar_variant}
          />
        )
      }}
    </Query>
  )
}

export default ClinvarVariantDetailsContainer
