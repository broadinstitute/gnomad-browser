import React, { useState } from 'react'

import { ExternalLink, List, ListItem, Modal, TextButton } from '@gnomad/ui'

import AttributeList from '../AttributeList'
import formatClinvarDate from '../ClinvarVariantsTrack/formatClinvarDate'
import { ClinvarVariant } from './VariantPage'

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

type VariantClinvarInfoProps = {
  clinvar: ClinvarVariant
}

const VariantClinvarInfo = ({ clinvar }: VariantClinvarInfoProps) => {
  const [isSubmissionsModalOpen, setIsSubmissionsModalOpen] = useState(false)

  const conditions = clinvar.submissions
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
      <AttributeList>
        {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
        <AttributeList.Item label="ClinVar Variation ID">
          {clinvar.clinvar_variation_id}
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
          {clinvar.clinical_significance}
        </AttributeList.Item>
        {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
        <AttributeList.Item label="Review status">
          {clinvar.review_status} ({clinvar.gold_stars}{' '}
          {clinvar.gold_stars === 1 ? 'star' : 'stars'})
        </AttributeList.Item>
        {/* @ts-expect-error TS(2604) FIXME: JSX element type 'AttributeList.Item' does not hav... Remove this comment to see the full error message */}
        <AttributeList.Item label="Last evaluated">
          {clinvar.last_evaluated ? formatClinvarDate(clinvar.last_evaluated) : '–'}
        </AttributeList.Item>
      </AttributeList>

      <p style={{ marginBottom: 0 }}>
        <TextButton
          onClick={() => {
            setIsSubmissionsModalOpen(true)
          }}
        >
          See{' '}
          {clinvar.submissions.length === 1
            ? 'submission'
            : `all ${clinvar.submissions.length} submissions`}
        </TextButton>{' '}
        or find more information on the{' '}
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink
          href={`https://www.ncbi.nlm.nih.gov/clinvar/variation/${clinvar.clinvar_variation_id}/`}
        >
          ClinVar website
        </ExternalLink>
        . Data displayed here is from ClinVar&apos;s {formatClinvarDate(clinvar.release_date)}{' '}
        release.
      </p>

      {isSubmissionsModalOpen && (
        // @ts-expect-error TS(2741) FIXME: Property 'size' is missing in type '{ children: El... Remove this comment to see the full error message
        <Modal
          title="ClinVar submissions"
          onRequestClose={() => {
            setIsSubmissionsModalOpen(false)
          }}
        >
          <SubmissionsList submissions={clinvar.submissions} />
        </Modal>
      )}
    </>
  )
}

export default VariantClinvarInfo
