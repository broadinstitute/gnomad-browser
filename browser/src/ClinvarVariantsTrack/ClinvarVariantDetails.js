import PropTypes from 'prop-types'
import React from 'react'

import { ExternalLink, List, ListItem } from '@gnomad/ui'

import AttributeList from '../AttributeList'
import Link from '../Link'
import Query from '../Query'

import formatClinvarDate from './formatClinvarDate'

const SubmissionsList = ({ submissions }) => (
  <List>
    {submissions.map(submission => (
      <ListItem key={`${submission.submitter_name}-${submission.last_evaluated}`}>
        <AttributeList>
          <AttributeList.Item label="Submitter">{submission.submitter_name}</AttributeList.Item>
          <AttributeList.Item label="Conditions">
            {submission.conditions
              .map(condition =>
                condition.medgen_id ? (
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
              .reduce((acc, el, i) => (i === 0 ? [...acc, el] : [...acc, ', ', el]), [])}
          </AttributeList.Item>
          <AttributeList.Item label="Clinical significance">
            {submission.clinical_significance || '–'}
          </AttributeList.Item>
          <AttributeList.Item label="Review status">{submission.review_status}</AttributeList.Item>
          <AttributeList.Item label="Last evaluated">
            {submission.last_evaluated ? formatClinvarDate(submission.last_evaluated) : '–'}
          </AttributeList.Item>
        </AttributeList>
      </ListItem>
    ))}
  </List>
)

SubmissionsList.propTypes = {
  submissions: PropTypes.arrayOf(
    PropTypes.shape({
      clinical_significance: PropTypes.string,
      conditions: PropTypes.arrayOf(
        PropTypes.shape({
          medgen_id: PropTypes.string,
          name: PropTypes.string.isRequired,
        })
      ),
      last_evaluated: PropTypes.string,
      review_status: PropTypes.string.isRequired,
      submitter_name: PropTypes.string.isRequired,
    })
  ).isRequired,
}

const ClinvarVariantDetailsGnomadData = ({ clinvarVariant }) => {
  const ac =
    ((clinvarVariant.gnomad.exome || {}).ac || 0) + ((clinvarVariant.gnomad.genome || {}).ac || 0)
  const an =
    ((clinvarVariant.gnomad.exome || {}).an || 0) + ((clinvarVariant.gnomad.genome || {}).an || 0)
  const af = an === 0 ? 0 : ac / an

  const truncatedAF = Number(af.toPrecision(3))
  const formattedAF = truncatedAF === 0 || truncatedAF === 1 ? af.toFixed(0) : af.toExponential(2)

  return (
    <>
      <AttributeList>
        <AttributeList.Item label="Allele count">{ac}</AttributeList.Item>
        <AttributeList.Item label="Allele number">{an}</AttributeList.Item>
        <AttributeList.Item label="Allele frequency">{formattedAF}</AttributeList.Item>
      </AttributeList>
    </>
  )
}

ClinvarVariantDetailsGnomadData.propTypes = {
  clinvarVariant: PropTypes.shape({
    gnomad: PropTypes.shape({
      exome: PropTypes.shape({
        ac: PropTypes.number.isRequired,
        an: PropTypes.number.isRequired,
        filters: PropTypes.arrayOf(PropTypes.string).isRequired,
      }),
      genome: PropTypes.shape({
        ac: PropTypes.number.isRequired,
        an: PropTypes.number.isRequired,
        filters: PropTypes.arrayOf(PropTypes.string).isRequired,
      }),
    }),
  }).isRequired,
}

const ClinvarVariantDetails = ({ clinvarVariant, clinvarReleaseDate }) => {
  const conditions = clinvarVariant.submissions
    .flatMap(submission => submission.conditions)
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
        <ExternalLink
          href={`https://www.ncbi.nlm.nih.gov/clinvar/variation/${clinvarVariant.clinvar_variation_id}/`}
        >
          View more information on the ClinVar website
        </ExternalLink>
      </p>

      <AttributeList>
        <AttributeList.Item label="ClinVar Variation ID">
          {clinvarVariant.clinvar_variation_id}
        </AttributeList.Item>
        <AttributeList.Item label="Conditions">
          {Object.values(conditions)
            .map(condition =>
              condition.medgen_id ? (
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
            .reduce((acc, el, i) => (i === 0 ? [...acc, el] : [...acc, ', ', el]), [])}
        </AttributeList.Item>
        <AttributeList.Item label="Clinical significance">
          {clinvarVariant.clinical_significance}
        </AttributeList.Item>
        <AttributeList.Item label="Review status">
          {clinvarVariant.review_status} ({clinvarVariant.gold_stars}{' '}
          {clinvarVariant.gold_stars === 1 ? 'star' : 'stars'})
        </AttributeList.Item>
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

ClinvarVariantDetails.propTypes = {
  clinvarVariant: PropTypes.shape({
    clinical_significance: PropTypes.string.isRequired,
    clinvar_variation_id: PropTypes.string.isRequired,
    gnomad: PropTypes.shape({
      exome: PropTypes.shape({
        ac: PropTypes.number.isRequired,
        an: PropTypes.number.isRequired,
        filters: PropTypes.arrayOf(PropTypes.string).isRequired,
      }),
      genome: PropTypes.shape({
        ac: PropTypes.number.isRequired,
        an: PropTypes.number.isRequired,
        filters: PropTypes.arrayOf(PropTypes.string).isRequired,
      }),
    }),
    gold_stars: PropTypes.number.isRequired,
    in_gnomad: PropTypes.bool.isRequired,
    last_evaluated: PropTypes.string,
    review_status: PropTypes.string.isRequired,
    submissions: PropTypes.arrayOf(
      PropTypes.shape({
        clinical_significance: PropTypes.string.isRequired,
        conditions: PropTypes.arrayOf(
          PropTypes.shape({
            medgen_id: PropTypes.string,
            name: PropTypes.string.isRequired,
          })
        ),
        last_evaluated: PropTypes.string,
        review_status: PropTypes.string.isRequired,
        submitter_name: PropTypes.string.isRequired,
      })
    ).isRequired,
    variant_id: PropTypes.string.isRequired,
  }).isRequired,
  clinvarReleaseDate: PropTypes.string.isRequired,
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

const ClinvarVariantDetailsContainer = ({ referenceGenome, variantId }) => {
  return (
    <Query
      query={query}
      variables={{ referenceGenome, variantId }}
      loadingMessage="Loading variant data"
      errorMessage="Unable to load variant data"
      success={data => data.clinvar_variant}
    >
      {({ data }) => {
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

ClinvarVariantDetailsContainer.propTypes = {
  referenceGenome: PropTypes.oneOf(['GRCh37', 'GRCh38']).isRequired,
  variantId: PropTypes.string.isRequired,
}

export default ClinvarVariantDetailsContainer
