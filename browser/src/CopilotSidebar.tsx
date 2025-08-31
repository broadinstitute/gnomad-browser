import React, { useEffect, useRef } from 'react'
import { useCopilotAction } from '@copilotkit/react-core'
import { CopilotSidebar } from '@copilotkit/react-ui'
import { useHistory } from 'react-router-dom'

interface CopilotSidebarProps {
  isOpen: boolean
  onClose: () => void
}

const GnomadCopilotSidebar: React.FC<CopilotSidebarProps> = ({ isOpen, onClose }) => {
  const history = useHistory()
  const prevIsOpen = useRef(isOpen)

  useCopilotAction({
    name: 'navigateToVariantPage',
    description: 'Navigate to the gnomAD variant page for a given variant ID.',
    parameters: [
      {
        name: 'variantId',
        type: 'string',
        description: "The variant ID, such as '1-55516888-G-GA' or an rsID like 'rs527413419'.",
        required: true,
      },
      {
        name: 'datasetId',
        type: 'string',
        description: `The dataset ID to use, for example 'gnomad_r4'. If not provided, the current dataset will be used.`,
        required: false,
      },
    ],
    handler: async ({ variantId, datasetId }) => {
      // Get the current dataset from the URL if not provided
      const currentUrl = new URL(window.location.href)
      const currentDatasetId = currentUrl.searchParams.get('dataset') || 'gnomad_r4'
      const targetDatasetId = datasetId || currentDatasetId
      
      const url = `/variant/${variantId}?dataset=${targetDatasetId}`
      console.log(`Navigating to: ${url}`)
      history.push(url)
      
      return {
        message: `Navigating to the variant page for ${variantId}.`,
      }
    },
  })

  // Handle the open/close logic manually
  useEffect(() => {
    if (prevIsOpen.current && !isOpen) {
      // Sidebar was closed
      onClose()
    }
    prevIsOpen.current = isOpen
  }, [isOpen, onClose])

  return (
    <CopilotSidebar
      defaultOpen={isOpen}
      onSetOpen={(open) => {
        if (!open) {
          onClose()
        }
      }}
      labels={{
        title: "gnomAD Assistant",
        initial: "Hello! How can I help you explore gnomAD's data?",
      }}
    />
  )
}

export default GnomadCopilotSidebar