import PropTypes from 'prop-types'
import React, { useState } from 'react'

import { ExternalLink, List, ListItem, Modal, TextButton } from '@gnomad/ui'

import AttributeList from '../AttributeList'

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
            {submission.clinical_significance}
          </AttributeList.Item>
          <AttributeList.Item label="Review status">{submission.review_status}</AttributeList.Item>
          <AttributeList.Item label="Last evaluated">
            {submission.last_evaluated || '–'}
          </AttributeList.Item>
        </AttributeList>
      </ListItem>
    ))}
  </List>
)

SubmissionsList.propTypes = {
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
}

const VariantClinvarInfo = ({ variant }) => {
  const [isSubmissionsModalOpen, setIsSubmissionsModalOpen] = useState(false)

  const conditions = variant.clinvar.submissions
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
      <AttributeList>
        <AttributeList.Item label="ClinVar Variation ID">
          {variant.clinvar.clinvar_variation_id}
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
          {variant.clinvar.clinical_significance}
        </AttributeList.Item>
        <AttributeList.Item label="Review status">
          {variant.clinvar.review_status} ({variant.clinvar.gold_stars}{' '}
          {variant.clinvar.gold_stars === 1 ? 'star' : 'stars'})
        </AttributeList.Item>
        <AttributeList.Item label="Last evaluated">
          {variant.clinvar.last_evaluated || '–'}
        </AttributeList.Item>
      </AttributeList>

      <p style={{ marginBottom: 0 }}>
        <TextButton
          onClick={() => {
            setIsSubmissionsModalOpen(true)
          }}
        >
          See{' '}
          {variant.clinvar.submissions.length === 1
            ? 'submission'
            : `all ${variant.clinvar.submissions.length} submissions`}
        </TextButton>{' '}
        or find more information on the{' '}
        <ExternalLink
          href={`https://www.ncbi.nlm.nih.gov/clinvar/variation/${variant.clinvar.clinvar_variation_id}/`}
        >
          ClinVar website.
        </ExternalLink>
      </p>

      {isSubmissionsModalOpen && (
        <Modal
          title="ClinVar submissions"
          onRequestClose={() => {
            setIsSubmissionsModalOpen(false)
          }}
        >
          <SubmissionsList submissions={variant.clinvar.submissions} />
        </Modal>
      )}
    </>
  )
}

VariantClinvarInfo.propTypes = {
  variant: PropTypes.shape({
    clinvar: PropTypes.shape({
      clinical_significance: PropTypes.string.isRequired,
      clinvar_variation_id: PropTypes.string.isRequired,
      gold_stars: PropTypes.number.isRequired,
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
    }).isRequired,
  }).isRequired,
}

export default VariantClinvarInfo
