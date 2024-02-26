import React, { useState } from 'react'

import { ExternalLink, Modal, TextButton } from '@gnomad/ui'

import AttributeList, { AttributeListItem } from '../AttributeList'
import SubmissionsList from '../SubmissionsList'
import formatClinvarDate from '../ClinvarVariantsTrack/formatClinvarDate'
import { ClinvarVariant } from './VariantPage'

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
        <AttributeListItem label="ClinVar Variation ID">
          {clinvar.clinvar_variation_id}
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
          {clinvar.clinical_significance}
        </AttributeListItem>
        <AttributeListItem label="Review status">
          {clinvar.review_status} ({clinvar.gold_stars}{' '}
          {clinvar.gold_stars === 1 ? 'star' : 'stars'})
        </AttributeListItem>
        <AttributeListItem label="Last evaluated">
          {clinvar.last_evaluated ? formatClinvarDate(clinvar.last_evaluated) : '–'}
        </AttributeListItem>
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
