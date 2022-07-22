import React from 'react'

import { ExternalLink, List, ListItem } from '@gnomad/ui'

import AttributeList from '../AttributeList'
import Link from '../Link'
import Query from '../Query'

import formatClinvarDate from './formatClinvarDate'

type SubmissionsListProps = {
  submissions: {
    clinical_significance?: string
    conditions?: {
      medgen_id?: string
      name: string
    }[]
    last_evaluated?: string
    review_status: string
    submitter_name: string
  }[]
}

const SubmissionsList = ({ submissions }: SubmissionsListProps) => (
  // @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
  <List>
    {submissions.map((submission) => (
      // @ts-expect-error TS(2769) FIXME: No overload matches this call.
      <ListItem key={`${submission.submitter_name}-${submission.last_evaluated}`}>
        <AttributeList>
          {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
          <AttributeList.Item label="Submitter">{submission.submitter_name}</AttributeList.Item>
          {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
          <AttributeList.Item label="Conditions">
            {/* @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'. */}
            {submission.conditions
              .map((condition) =>
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
              // @ts-expect-error TS(2769) FIXME: No overload matches this call.
              .reduce((acc, el, i) => (i === 0 ? [...acc, el] : [...acc, ', ', el]), [])}
          </AttributeList.Item>
          {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
          <AttributeList.Item label="Clinical significance">
            {submission.clinical_significance || '–'}
          </AttributeList.Item>
          {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
          <AttributeList.Item label="Review status">{submission.review_status}</AttributeList.Item>
          {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
          <AttributeList.Item label="Last evaluated">
            {submission.last_evaluated ? formatClinvarDate(submission.last_evaluated) : '–'}
          </AttributeList.Item>
        </AttributeList>
      </ListItem>
    ))}
  </List>
)

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
        {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
        <AttributeList.Item label="Allele count">{ac}</AttributeList.Item>
        {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
        <AttributeList.Item label="Allele number">{an}</AttributeList.Item>
        {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
        <AttributeList.Item label="Allele frequency">{formattedAF}</AttributeList.Item>
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
        {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
        <AttributeList.Item label="ClinVar Variation ID">
          {clinvarVariant.clinvar_variation_id}
        </AttributeList.Item>
        {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
        <AttributeList.Item label="Conditions">
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
        </AttributeList.Item>
        {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
        <AttributeList.Item label="Clinical significance">
          {clinvarVariant.clinical_significance}
        </AttributeList.Item>
        {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
        <AttributeList.Item label="Review status">
          {clinvarVariant.review_status} ({clinvarVariant.gold_stars}{' '}
          {clinvarVariant.gold_stars === 1 ? 'star' : 'stars'})
        </AttributeList.Item>
        {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
        <AttributeList.Item label="Last evaluated">
          {clinvarVariant.last_evaluated ? formatClinvarDate(clinvarVariant.last_evaluated) : '–'}
        </AttributeList.Item>
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

const query = `
query ClinVarVariant($variantId: String!, $referenceGenome: ReferenceGenomeId!) {
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
