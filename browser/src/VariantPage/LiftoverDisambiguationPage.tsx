import React from 'react'
import {
  DatasetId,
  labelForDataset,
  referenceGenome,
  isLiftoverSource,
  baseDatasetForReferenceGenome,
} from '@gnomad/dataset-metadata/metadata'
import { TrackPage, TrackPageSection } from '../TrackPage'
import DocumentTitle from '../DocumentTitle'
import { BaseQuery } from '../Query'
import Delayed from '../Delayed'
import StatusMessage from '../StatusMessage'
import Link from '../Link'
import { Redirect } from 'react-router-dom'

type LiftoverDisambiguationPageProps = {
  fromVariantId: string
  fromDatasetId: DatasetId
  toDatasetId: DatasetId
}

type CorrespondingVariantField = 'liftover' | 'source'

const LiftoverDisambiguationPage = ({
  fromVariantId,
  fromDatasetId,
  toDatasetId,
}: LiftoverDisambiguationPageProps) => {
  const fromLabel = labelForDataset(fromDatasetId)
  const fromReferenceGenome = referenceGenome(fromDatasetId)
  const toReferenceGenome = referenceGenome(toDatasetId)

  const operationName = 'LiftoverDisambiguation'
  const correspondingVariantField: CorrespondingVariantField = isLiftoverSource(fromDatasetId)
    ? 'liftover'
    : 'source'
  const disambiguationQuery = `
query ${operationName}($source_variant_id: String, $liftover_variant_id: String, $reference_genome: ReferenceGenomeId!) {
  liftover(source_variant_id: $source_variant_id, liftover_variant_id: $liftover_variant_id, reference_genome: $reference_genome) {
	${correspondingVariantField} {
	  variant_id
	}
    }
  }
`

  const baseQueryVariables = { reference_genome: referenceGenome(fromDatasetId) }
  const queryVariables =
    fromReferenceGenome === 'GRCh37'
      ? { ...baseQueryVariables, source_variant_id: fromVariantId }
      : { ...baseQueryVariables, liftover_variant_id: fromVariantId }

  return (
    <TrackPage>
      <TrackPageSection>
        <DocumentTitle
          title={`${fromVariantId} liftover | ${fromReferenceGenome} to ${toReferenceGenome}`}
        />
        <>
          Due to liftover, variant {fromVariantId} in dataset {fromLabel} may correspond to a
          different variant or variants in {toReferenceGenome}.
        </>
        <BaseQuery
          operationName="LiftoverDisambiguation"
          query={disambiguationQuery}
          variables={queryVariables}
        >
          {({ data, error, graphQLErrors, loading }: any) => {
            let pageContent = null
            if (loading) {
              pageContent = (
                <Delayed>
                  <StatusMessage>Loading corresponding variants...</StatusMessage>
                </Delayed>
              )
            } else if (error) {
              pageContent = <StatusMessage>Unable to load corresponding variants</StatusMessage>
            } else if (!(data || {}).liftover) {
              pageContent = (
                <StatusMessage>
                  {graphQLErrors && graphQLErrors.length
                    ? Array.from(
                        new Set(
                          graphQLErrors
                            .filter((e: any) => !e.message.includes('ClinVar'))
                            .map((e: any) => e.message)
                        )
                      ).join(', ')
                    : 'Unable to load corresponding variants'}
                </StatusMessage>
              )
            } else if (data.liftover.length === 0) {
              pageContent = <StatusMessage>No corresponding variants found</StatusMessage>
            } else if (data.liftover.length === 1) {
              pageContent = (
                <Redirect
                  to={{
                    pathname: `/variant/${data.liftover[0][correspondingVariantField].variant_id}`,
                    search: `dataset=${baseDatasetForReferenceGenome(toReferenceGenome)}`,
                  }}
                />
              )
            } else {
              pageContent = (
                <>
                  <ul>
                    {data.liftover.map(
                      (
                        correspondingVariant: Record<
                          CorrespondingVariantField,
                          { variant_id: string } | undefined
                        >
                      ) => {
                        const variantId =
                          correspondingVariant[correspondingVariantField]!.variant_id
                        const datasetToLink = baseDatasetForReferenceGenome(toReferenceGenome)
                        return (
                          <li key={variantId}>
                            <Link
                              to={`/variant/${variantId}?dataset=${datasetToLink}`}
                              preserveSelectedDataset={false}
                            >
                              {variantId}
                            </Link>
                          </li>
                        )
                      }
                    )}
                  </ul>
                </>
              )
            }

            return <>{pageContent}</>
          }}
        </BaseQuery>
      </TrackPageSection>
    </TrackPage>
  )
}

export default LiftoverDisambiguationPage
