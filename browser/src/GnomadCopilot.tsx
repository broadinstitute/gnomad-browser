import React, { useState, useRef, useCallback } from 'react'
import styled from 'styled-components'
import { CopilotChat } from '@copilotkit/react-ui'
import { useCopilotAction } from '@copilotkit/react-core'
import { useHistory } from 'react-router-dom'
import { useGnomadCopilotActions } from './hooks/useGnomadCopilotActions'
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
`

export function GnomadCopilot({ children }: { children: React.ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatWidth, setChatWidth] = useState(window.innerWidth / 3) // Default to 1/3 of screen
  const isResizing = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const history = useHistory()
  
  // Initialize gnomAD-specific copilot actions
  useGnomadCopilotActions()

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