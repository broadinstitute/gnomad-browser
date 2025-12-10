import React from 'react'

import { ExternalLink, List, ListItem } from '@gnomad/ui'

import AttributeList, { AttributeListItem } from './AttributeList'
import formatClinvarDate from './ClinvarVariantsTrack/formatClinvarDate'

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
  <List>
    {submissions.map((submission) => (
      <ListItem key={`${submission.submitter_name}-${submission.last_evaluated}`}>
        <AttributeList>
          <AttributeListItem label="Submitter">{submission.submitter_name}</AttributeListItem>
          <AttributeListItem label="Conditions">
            {/* @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'. */}
            {submission.conditions
              .map((condition) =>
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
              // @ts-expect-error TS(2769) FIXME: No overload matches this call.
              .reduce((acc, el, i) => (i === 0 ? [...acc, el] : [...acc, ', ', el]), [])}
          </AttributeListItem>
          <AttributeListItem label="Germline classification">
            {submission.clinical_significance || '–'}
          </AttributeListItem>
          <AttributeListItem label="Review status">{submission.review_status}</AttributeListItem>
          <AttributeListItem label="Last evaluated">
            {submission.last_evaluated ? formatClinvarDate(submission.last_evaluated) : '–'}
          </AttributeListItem>
        </AttributeList>
      </ListItem>
    ))}
  </List>
)

export default SubmissionsList
