import React from 'react'
import { useCopilotAction } from '@copilotkit/react-core'
import VariantLoading from '../components/VariantLoading'
import VariantDisplay from '../components/VariantDisplay'
import { useToolResult } from '../../hooks/useToolResult'

// Convert to a proper React component so hooks work correctly
const VariantRenderComponent: React.FC<{ props: any; loadingMessage: string }> = ({
  props,
  loadingMessage
}) => {
  const { status } = props
  const { data: resolvedData, isLoading, error } = useToolResult(props.result)

  if (status === 'executing' || isLoading) {
    return <VariantLoading message={loadingMessage} />
  }

  if (error) {
    return <div>Error: {error.message}</div>
  }

  if (status === 'complete' && resolvedData) {
    // The 'results' key is added by our backend standard
    return <VariantDisplay data={resolvedData.results} />
  }

  return null
}

export function useGnomadVariantActions() {

  // Action for getting variant summary
  useCopilotAction({
    name: 'get_variant_summary',
    description: 'Fetch summary information for a genetic variant',
    parameters: [
      {
        name: 'variant_id',
        type: 'string',
        description: 'The variant identifier (e.g., "1-55516888-G-A")',
        required: true,
      },
      {
        name: 'dataset',
        type: 'string',
        description: 'The dataset to query (e.g., "gnomad_r4")',
        required: false,
      },
    ],
    handler: async ({ variant_id, dataset }) => {
      // The handler returns the parameters that will be sent to the backend
      return { variant_id, dataset }
    },
    render: (props) => <VariantRenderComponent props={props} loadingMessage="Fetching variant information..." />,
  })

  // Action for getting variant details with population frequencies
  useCopilotAction({
    name: 'get_variant_details',
    description: 'Fetch detailed information for a variant including population frequencies',
    parameters: [
      {
        name: 'variant_id',
        type: 'string',
        description: 'The variant identifier',
        required: true,
      },
      {
        name: 'dataset',
        type: 'string',
        description: 'The dataset to query',
        required: false,
      },
    ],
    handler: async ({ variant_id, dataset }) => {
      return { variant_id, dataset }
    },
    render: (props) => <VariantRenderComponent props={props} loadingMessage="Loading detailed variant data..." />,
  })

  // Action for getting variant frequencies
  useCopilotAction({
    name: 'get_variant_frequencies',
    description: 'Fetch allele frequency information for a variant',
    parameters: [
      {
        name: 'variant_id',
        type: 'string',
        description: 'The variant identifier',
        required: true,
      },
      {
        name: 'dataset',
        type: 'string',
        description: 'The dataset to query',
        required: false,
      },
    ],
    handler: async ({ variant_id, dataset }) => {
      return { variant_id, dataset }
    },
    render: (props) => <VariantRenderComponent props={props} loadingMessage="Loading frequency data..." />,
  })
}