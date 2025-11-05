import React from 'react'
import { useCopilotAction } from '@copilotkit/react-core'
import VariantLoading from '../components/VariantLoading'
import VariantDisplay from '../components/VariantDisplay'

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
    render: (props) => {
      const { status, result } = props
      console.log('get_variant_summary render props:', { status, result })
      
      if (status === 'executing') {
        return <VariantLoading message="Fetching variant information..." />
      }
      
      if (status === 'complete' && result) {
        console.log('Rendering VariantDisplay with data:', result)
        return <VariantDisplay data={result} />
      }
      
      return null
    },
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
    render: (props) => {
      const { status, result } = props
      
      if (status === 'executing') {
        return <VariantLoading message="Loading detailed variant data..." />
      }
      
      if (status === 'complete' && result) {
        return <VariantDisplay data={result} />
      }
      
      return null
    },
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
    render: (props) => {
      const { status, result } = props
      
      if (status === 'executing') {
        return <VariantLoading message="Loading frequency data..." />
      }
      
      if (status === 'complete' && result) {
        return <VariantDisplay data={result} />
      }
      
      return null
    },
  })
}