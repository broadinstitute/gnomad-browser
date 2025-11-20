import React, { useState, useRef, useCallback, useMemo } from 'react'
import styled, { css } from 'styled-components'
import { CopilotChat } from '@copilotkit/react-ui'
import { useCopilotAction, useCopilotContext } from '@copilotkit/react-core'
import { useHistory, useLocation } from 'react-router-dom'
import { Modal, Button, PrimaryButton } from '@gnomad/ui'
import { useMCPStateRender } from './hooks/useMCPStateRender'
import { useGnomadVariantActions } from './gmd/hooks/useGnomadVariantActions'
import { useJuhaActions } from './gmd/hooks/useJuhaActions'
// @ts-expect-error TS(2307) FIXME: Cannot find module '@fortawesome/fontawesome-free/... Remove this comment to see the full error message
import ExpandIcon from '@fortawesome/fontawesome-free/svgs/solid/expand.svg'
// @ts-expect-error TS(2307) FIXME: Cannot find module '@fortawesome/fontawesome-free/... Remove this comment to see the full error message
import CompressIcon from '@fortawesome/fontawesome-free/svgs/solid/compress.svg'
// @ts-expect-error TS(2307) FIXME: Cannot find module '@fortawesome/fontawesome-free/... Remove this comment to see the full error message
import SettingsIcon from '@fortawesome/fontawesome-free/svgs/solid/cog.svg'
// @ts-expect-error TS(2307) FIXME: Cannot find module '@fortawesome/fontawesome-free/... Remove this comment to see the full error message
import CloseIcon from '@fortawesome/fontawesome-free/svgs/solid/times.svg'
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

const ChatPanel = styled.div<{ width: number; mode: 'side' | 'fullscreen' }>`
  display: flex;
  flex-direction: column;
  background: white;
  min-width: 300px;
  position: relative;
  box-sizing: border-box;

  ${(props) =>
    props.mode === 'side' &&
    css`
      width: ${props.width}px;
      max-width: 80%;
      overflow: hidden;
      padding-right: 8px;
    `}

  ${(props) =>
    props.mode === 'fullscreen' &&
    css`
      position: fixed;
      top: 0;
      right: 0;
      width: 100vw;
      height: 100vh;
      z-index: 1000;
      max-width: 100%;
      overflow: hidden;
    `}
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

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 100px;
  z-index: 99999;
  padding: 8px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  pointer-events: auto;

  img {
    width: 16px;
    height: 16px;
    opacity: 0.6;
    display: block;
  }

  &:hover {
    background: #f7f7f7;
    border-color: #d32f2f;
  }

  &:hover img {
    opacity: 1;
  }
`

const SettingsButton = styled.button`
  position: absolute;
  top: 10px;
  right: 60px;
  z-index: 99999;
  padding: 8px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  pointer-events: auto;

  img {
    width: 16px;
    height: 16px;
    opacity: 0.6;
    display: block;
  }

  &:hover {
    background: #f7f7f7;
    border-color: #0d79d0;
  }

  &:hover img {
    opacity: 1;
  }
`

const FullscreenButton = styled.button`
  position: absolute;
  top: 10px;
  right: 20px;
  z-index: 99999;
  padding: 8px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  pointer-events: auto;

  img {
    width: 16px;
    height: 16px;
    opacity: 0.6;
    display: block;
  }

  &:hover {
    background: #f7f7f7;
    border-color: #0d79d0;
  }

  &:hover img {
    opacity: 1;
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

const SettingsContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 0;
`

const SettingItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const SettingLabel = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: #666;
`

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;

  &:hover {
    border-color: #0d79d0;
  }

  &:focus {
    outline: none;
    border-color: #0d79d0;
    box-shadow: 0 0 0 3px rgba(13, 121, 208, 0.1);
  }
`

const TextArea = styled.textarea`
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s;

  &:hover {
    border-color: #0d79d0;
  }

  &:focus {
    outline: none;
    border-color: #0d79d0;
    box-shadow: 0 0 0 3px rgba(13, 121, 208, 0.1);
  }

  &::placeholder {
    color: #999;
  }
`

const StyledCopilotChat = styled(CopilotChat)`
  height: 100%;
  position: relative;
  z-index: 1;
  overflow: hidden;

  /* CSS Custom Properties for theming */
  --copilot-kit-primary-color: #0d79d0;
  --copilot-kit-background-color: white;
  --copilot-kit-header-background: #f7f7f7;
  --copilot-kit-separator-color: rgba(0, 0, 0, 0.08);
  --copilot-kit-border-radius: 0.5rem;

  /* Messages container */
  .copilotKitMessages {
    padding: 1rem;
    padding-top: calc(1rem + 40px);
    overflow-x: hidden;
    overflow-y: auto;
  }

  /* Hide scrollbar unless needed */
  .copilotKitMessages::-webkit-scrollbar {
    width: 8px;
  }

  .copilotKitMessages::-webkit-scrollbar-track {
    background: transparent;
  }

  .copilotKitMessages::-webkit-scrollbar-thumb {
    background: #d0d0d0;
    border-radius: 4px;
  }

  .copilotKitMessages::-webkit-scrollbar-thumb:hover {
    background: #a0a0a0;
  }

  /* Individual message bubbles */
  .copilotKitMessage {
    border-radius: 0.75rem;
  }

  /* Input container */
  .copilotKitInputContainer {
    width: calc(100% - 48px) !important;
    margin: 0 auto !important;
    padding: 0 8px !important;
    box-sizing: border-box !important;
  }

  /* Input area */
  .copilotKitInput {
    border-radius: 0.75rem;
    border: 1px solid var(--copilot-kit-separator-color) !important;
  }

  /* Style suggestion chips */
  .copilotKitMessages footer .suggestions .suggestion {
    font-size: 14px !important;
    border-radius: 0.5rem;
  }

  .copilotKitMessages footer .suggestions button:not(:disabled):hover {
    background-color: #f0f9ff;
    border-color: var(--copilot-kit-primary-color);
    transform: scale(1.03);
  }
`


export function GnomadCopilot({ children }: { children: React.ReactNode }) {
  const [chatDisplayMode, setChatDisplayMode] = useState<'closed' | 'side' | 'fullscreen'>('side')
  const isChatOpen = chatDisplayMode !== 'closed'
  const [chatWidth, setChatWidth] = useState(window.innerWidth / 3) // Default to 1/3 of screen
  const isResizing = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const history = useHistory()
  const location = useLocation()

  // Settings state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState('claude-3-5-sonnet-20241022')
  const [customPrompt, setCustomPrompt] = useState('')

  // Initialize MCP state rendering (renders inline in chat)
  useMCPStateRender()

  // Initialize gnomAD variant actions
  useGnomadVariantActions()

  // Initialize Juha API actions
  useJuhaActions()

  // Show "interpret this variant" suggestion only on variant pages
  const isVariantPage = location.pathname.startsWith('/variant/')
  const isGenePage = location.pathname.startsWith('/gene/')
  const isRegionPage = location.pathname.startsWith('/region/')

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
        {
          title: "Find credible sets for variant",
          message: "Using the Juha API, find credible sets from GWAS, eQTL, and pQTL studies for this variant.",
        },
        {
          title: "Check variant for colocalization",
          message: "Using the Juha API, find traits that colocalize at this variant's locus.",
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
        {
          title: "Find associations in gene region",
          message: "Using the Juha API, find GWAS, eQTL, and pQTL credible sets in this gene's region.",
        },
        {
          title: "Find QTLs for this gene",
          message: "Using the Juha API, find QTLs (eQTLs, pQTLs) where this gene is the target.",
        },
        {
          title: "Find curated disease associations",
          message: "Using the Juha API, what diseases are associated with this gene from curated sources like ClinGen and GenCC?",
        },
      ]
    }
    if (isRegionPage) {
      return [
        {
          title: "Find associations in region",
          message: "Using the Juha API, find GWAS, eQTL, and pQTL credible sets that overlap with this genomic region.",
        },
      ]
    }
    return []
  }, [isVariantPage, isGenePage, isRegionPage])

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
    if (chatDisplayMode === 'side') {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [chatDisplayMode, handleMouseMove, handleMouseUp])

  return (
    <>
      <PageContainer ref={containerRef}>
        <MainContent>{children}</MainContent>
        {isChatOpen && (
          <>
            {chatDisplayMode === 'side' && <ResizeHandle onMouseDown={handleMouseDown} />}
            <ChatPanel width={chatWidth} mode={chatDisplayMode}>
              <StyledCopilotChat
                labels={{
                  title: 'gnomAD Assistant',
                  initial: 'Hello! I can help you understand gnomAD data, navigate the browser, or answer questions about what you\'re viewing.',
                }}
                suggestions={suggestions}
              />
              <SettingsButton
                onClick={() => setIsSettingsModalOpen(true)}
                title="Settings"
              >
                <img src={SettingsIcon} alt="Settings" />
              </SettingsButton>
              <CloseButton
                onClick={() => setChatDisplayMode('closed')}
                title="Close Assistant"
              >
                <img src={CloseIcon} alt="Close" />
              </CloseButton>
              <FullscreenButton
                onClick={() =>
                  setChatDisplayMode(chatDisplayMode === 'fullscreen' ? 'side' : 'fullscreen')
                }
                title={chatDisplayMode === 'fullscreen' ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                <img
                  src={chatDisplayMode === 'fullscreen' ? CompressIcon : ExpandIcon}
                  alt={chatDisplayMode === 'fullscreen' ? 'Exit fullscreen' : 'Enter fullscreen'}
                />
              </FullscreenButton>
            </ChatPanel>
          </>
        )}
      </PageContainer>

      {!isChatOpen && (
        <ToggleButton onClick={() => setChatDisplayMode('side')}>
          Ask gnomAD Assistant
        </ToggleButton>
      )}

      {isSettingsModalOpen && (
        <Modal
          size="large"
          title="Assistant Settings"
          onRequestClose={() => setIsSettingsModalOpen(false)}
        >
          <SettingsContent>
            <SettingItem>
              <SettingLabel htmlFor="model-select">Model</SettingLabel>
              <Select
                id="model-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </Select>
            </SettingItem>
            <SettingItem>
              <SettingLabel htmlFor="custom-prompt">Custom System Prompt</SettingLabel>
              <TextArea
                id="custom-prompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Add additional instructions for the assistant (optional)..."
              />
            </SettingItem>
          </SettingsContent>
        </Modal>
      )}
    </>
  )
}
