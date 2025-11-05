import React, { useState, useRef, useCallback, useMemo } from 'react'
import styled from 'styled-components'
import { CopilotChat } from '@copilotkit/react-ui'
import { useCopilotAction } from '@copilotkit/react-core'
import { useHistory, useLocation } from 'react-router-dom'
import { useMCPStateRender } from './hooks/useMCPStateRender'
import { useGnomadVariantActions } from './gmd/hooks/useGnomadVariantActions'
import '@copilotkit/react-ui/styles.css'

const PageContainer = styled.div`
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  position: relative;
`

const MainContent = styled.div`
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  min-width: 300px;
`

const ChatPanel = styled.div<{ width: number }>`
  width: ${(props) => props.width}px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: white;
  min-width: 300px;
  max-width: 80%;
`

const ResizeHandle = styled.div`
  width: 4px;
  background-color: #e0e0e0;
  cursor: col-resize;
  flex-shrink: 0;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #0d79d0;
  }
  
  &:active {
    background-color: #0d79d0;
  }
`

const ToggleButton = styled.button`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  padding: 12px 24px;
  border-radius: 8px;
  border: 1px solid #ddd;
  background-color: #fff;
  color: #333;
  font-size: 16px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: #f7f7f7;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  }
`

const StyledCopilotChat = styled(CopilotChat)`
  height: 100%;
  --copilot-kit-primary-color: #0d79d0;
  --copilot-kit-background-color: white;
  --copilot-kit-header-background: #f7f7f7;
  
  /* Increase font size in the chat input textarea */
  textarea {
    font-size: 14px !important;
  }
  
  /* Also apply to any input fields */
  input[type="text"] {
    font-size: 14px !important;
  }
  
  /* Style suggestion chips */
  button[data-suggestion] {
    font-size: 14px !important;
  }
`


export function GnomadCopilot({ children }: { children: React.ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(true)
  const [chatWidth, setChatWidth] = useState(window.innerWidth / 3) // Default to 1/3 of screen
  const isResizing = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const history = useHistory()
  const location = useLocation()

  // Initialize MCP state rendering (renders inline in chat)
  useMCPStateRender()

  // Initialize gnomAD variant actions
  useGnomadVariantActions()

  // Show "interpret this variant" suggestion only on variant pages
  const isVariantPage = location.pathname.startsWith('/variant/')
  const isGenePage = location.pathname.startsWith('/gene/')

  // Define suggestions based on the current page
  const suggestions = useMemo(() => {
    if (isVariantPage) {
      return [
        {
          title: "Display the variant summary",
          message: "Please display the variant summary",
        },
        {
          title: "Interpret this variant",
          message: "Can you help me interpret the clinical significance and population frequency of this variant?",
        },
        {
          title: "Is this variant too common?",
          message: "Is this variant's allele frequency too high for it to cause a rare Mendelian disease?",
        },
        {
          title: "Analyze expression at this location (Pext)",
          message: "Analyze the Pext score for this variant's location. Is it in a functionally important region that is expressed across many tissues?",
        },
        {
          title: "Check in silico predictors",
          message: "What do in silico predictors like REVEL and CADD say about this variant?",
        },
      ]
    }
    if (isGenePage) {
      return [
        {
          title: "Summarize gene constraint",
          message: "Summarize this gene's constraint scores, like pLI and missense o/e.",
        },
        {
          title: "Check tissue expression",
          message: "In which tissues is this gene most highly expressed?",
        },
        {
          title: "Look up Mendelian disease",
          message: "Is this gene associated with any Mendelian diseases?",
        },
        {
          title: "Analyze expression regions (Pext)",
          message: "Provide a Pext analysis for this gene to identify functionally important regions.",
        },
      ]
    }
    return []
  }, [isVariantPage, isGenePage])

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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isResizing.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const newWidth = containerRect.right - e.clientX

    // Ensure width stays within bounds
    const minWidth = 300
    const maxWidth = containerRect.width * 0.8

    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setChatWidth(newWidth)
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    isResizing.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  React.useEffect(() => {
    if (isChatOpen) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isChatOpen, handleMouseMove, handleMouseUp])

  return (
    <>
      <PageContainer ref={containerRef}>
        <MainContent>{children}</MainContent>
        {isChatOpen && (
          <>
            <ResizeHandle onMouseDown={handleMouseDown} />
            <ChatPanel width={chatWidth}>
              <StyledCopilotChat
                labels={{
                  title: 'gnomAD Assistant',
                  initial: 'Hello! I can help you understand gnomAD data, navigate the browser, or answer questions about what you\'re viewing.',
                }}
                suggestions={suggestions}
              />
            </ChatPanel>
          </>
        )}
      </PageContainer>

      <ToggleButton onClick={() => setIsChatOpen(!isChatOpen)}>
        {isChatOpen ? 'Close Assistant' : 'Ask gnomAD Assistant'}
      </ToggleButton>
    </>
  )
}
