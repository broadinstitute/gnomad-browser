import PropTypes from 'prop-types'
import React, { useState } from 'react'

import { Button, ExternalLink, List, ListItem, Modal, PrimaryButton } from '@gnomad/ui'

import Link from '../Link'

const getReportVariantEmailUrl = ({ datasetId, variantId }) => {
  const reportVariantEmailBody = `
Name:
Institution:

Variant ID: ${variantId} (https://gnomad.broadinstitute.org/variant/${variantId}?dataset=${datasetId})

Variant issue: (clinically implausible, read support poor, other artifact, etc.)
Please explain your concern about this variant
`

  const reportVariantEmailUrl = `mailto:gnomad@broadinstitute.org?subject=${encodeURIComponent(
    'Variant report'
  )}&body=${encodeURIComponent(reportVariantEmailBody)}`

  return reportVariantEmailUrl
}

const getRequestInfoEmailUrl = ({ datasetId, variantId }) => {
  const requestInfoEmailBody = `
Name:
Institution:

Variant ID: ${variantId} (https://gnomad.broadinstitute.org/variant/${variantId}?dataset=${datasetId})

Additional information that may be helpful for our understanding of the request:
`

  const requestInfoEmailUrl = `mailto:gnomad@broadinstitute.org?subject=${encodeURIComponent(
    'Request for variant information'
  )}&body=${encodeURIComponent(requestInfoEmailBody)}`

  return requestInfoEmailUrl
}

const VariantFeedback = ({ datasetId, variantId }) => {
  const [isRequestInfoModalOpen, setIsRequestInfoModalOpen] = useState(false)
  return (
    <>
      <List>
        <ListItem>
          <ExternalLink href={getReportVariantEmailUrl({ datasetId, variantId })}>
            Report this variant
          </ExternalLink>
        </ListItem>
        <ListItem>
          <ExternalLink
            href={getRequestInfoEmailUrl({ datasetId, variantId })}
            onClick={e => {
              e.preventDefault()
              setIsRequestInfoModalOpen(true)
            }}
          >
            Request additional information
          </ExternalLink>
        </ListItem>
      </List>
      {isRequestInfoModalOpen && (
        <Modal
          initialFocusOnButton={false}
          onRequestClose={() => {
            setIsRequestInfoModalOpen(false)
          }}
          title="Request additional information"
          footer={
            <>
              <Button
                onClick={() => {
                  setIsRequestInfoModalOpen(false)
                }}
              >
                Cancel
              </Button>
              <PrimaryButton
                onClick={() => {
                  window.open(getRequestInfoEmailUrl({ datasetId, variantId }))
                  setIsRequestInfoModalOpen(false)
                }}
                style={{ marginLeft: '1em' }}
              >
                Request Information
              </PrimaryButton>
            </>
          }
        >
          <p>
            Before requesting information, please be aware that we are unable to provide any
            information about the clinical status of variant carriers or access to individual level
            genotype data. See the following FAQ answers for details:
            <List>
              <ListItem>
                <Link to="/help/i-have-identified-a-rare-variant-what-phenotype-data-are-available">
                  I have identified a rare variant in gnomAD that I believe is associated with a
                  specific clinical phenotype. What phenotype data are available for these
                  individuals?
                </Link>
              </ListItem>
              <ListItem>
                <Link to="/help/can-i-get-access-to-individual-level-genotype-data-from-gnomad">
                  Can I get access to individual-level genotype data from gnomAD?
                </Link>
              </ListItem>
            </List>
          </p>

          <p>
            For clinical information, we recommend checking{' '}
            <ExternalLink href="https://www.genomeconnect.org/">GenomeConnect</ExternalLink>, an
            online registry developed by the{' '}
            <ExternalLink href="https://clinicalgenome.org/">
              Clinical Genome Resource (ClinGen)
            </ExternalLink>{' '}
            for people who are interested in sharing de-identified genetic and health information to
            improve understanding of genetics and health.
          </p>
        </Modal>
      )}
    </>
  )
}

VariantFeedback.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variantId: PropTypes.string.isRequired,
}

export default VariantFeedback
