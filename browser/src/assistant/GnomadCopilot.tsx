import React, { useState, useRef, useCallback, useMemo } from 'react'
import styled, { css, createGlobalStyle } from 'styled-components'
import { useAuth0 } from '@auth0/auth0-react'
import { CopilotChat } from '@copilotkit/react-ui'
import { useCopilotAction, useCopilotAdditionalInstructions, useCopilotMessagesContext } from '@copilotkit/react-core'
import {
  TextMessage,
  ActionExecutionMessage,
  ResultMessage,
  AgentStateMessage,
  ImageMessage,
} from '@copilotkit/runtime-client-gql'
import { useHistory, useLocation } from 'react-router-dom'
import { Button, PrimaryButton } from '@gnomad/ui'
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
import UserShieldIcon from '@fortawesome/fontawesome-free/svgs/solid/user-shield.svg'
// @ts-expect-error TS(2307) FIXME: Cannot find module '@fortawesome/fontawesome-free/... Remove this comment to see the full error message
import CloseIcon from '@fortawesome/fontawesome-free/svgs/solid/times.svg'
// @ts-expect-error TS(2307) FIXME: Cannot find module '@fortawesome/fontawesome-free/... Remove this comment to see the full error message
import RobotIcon from '@fortawesome/fontawesome-free/svgs/solid/robot.svg'
import '@copilotkit/react-ui/styles.css'
import { ChatHistorySidebar } from './components/ChatHistorySidebar'
import { ChatSettingsView } from './components/settings/ChatSettingsView'
import { AdminView } from './components/admin/AdminView'
import { NavigationBar } from './components/NavigationBar'
import { CustomAssistantMessage } from './components/CustomAssistantMessage'
import Login from '../auth/Login'
import Logout from '../auth/Logout'
import { useCurrentUser } from '../auth/useCurrentUser'
// @ts-expect-error TS(2307)
import SignOutIcon from '@fortawesome/fontawesome-free/svgs/solid/sign-out-alt.svg'

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

const ChatWrapper = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`

const ContextUpdateBanner = styled.div`
  position: absolute;
  top: 60px;
  left: 20px;
  right: 20px;
  z-index: 100;
  padding: 8px 12px;
  background: rgba(227, 242, 253, 0.95);
  border: 1px solid #90caf9;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  color: #1976d2;
  text-align: center;
  animation: fadeInDown 0.3s ease-out;
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

const LogoutButton = styled.button`
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
    border-color: #0d79d0;
  }

  &:hover img {
    opacity: 1;
  }
`

const CloseButton = styled.button`
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
    border-color: #d32f2f;
  }

  &:hover img {
    opacity: 1;
  }
`

const SettingsButton = styled.button`
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
    border-color: #0d79d0;
  }

  &:hover img {
    opacity: 1;
  }
`

const AdminButton = styled.button`
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

const BadgeContainer = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  flex-wrap: wrap;
  background: white;
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
`

const ModelBadge = styled.div`
  padding: 6px 12px;
  background: #f7f7f7;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #666;
  display: flex;
  align-items: center;
  gap: 8px;

  img {
    width: 14px;
    height: 14px;
    opacity: 0.7;
  }
`

const ContextBadge = styled.div`
  padding: 6px 12px;
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #1976d2;
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: calc(100% - 200px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  .context-type {
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
  }

  .context-id {
    font-family: monospace;
    opacity: 0.9;
  }
`

const FullscreenContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  z-index: 1000;
  background: white;
`

const FullscreenChatArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
`

const ChatLoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #666;
  font-size: 14px;
  background-color: #fafafa;
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

interface SavedPrompt {
  id: string
  name: string
  prompt: string
}

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


interface PageContext {
  gene_id?: string
  symbol?: string
  name?: string
  variant_id?: string
  caid?: string
  rsids?: string[]
  chrom?: string
  start?: number
  stop?: number
  reference_genome?: string
}

// This new component will contain all auth-related logic for the chat.
const AuthenticatedChatView = ({
  suggestions,
  isLoadingHistory,
  threadId,
}: {
  suggestions: { title: string; message: string }[]
  isLoadingHistory: boolean
  threadId: string
}) => {
  const { isAuthenticated, isLoading, error, logout, getAccessTokenSilently } = useAuth0()
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Track suggestion clicks
  const trackSuggestionClick = async (suggestion: { title: string; message: string }) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      // Try to get token, but don't fail if unavailable
      try {
        const token = await getAccessTokenSilently()
        headers.Authorization = `Bearer ${token}`
      } catch (e) {
        // Continue without token - analytics endpoint will work without userId
      }

      await fetch('/api/copilotkit/analytics/event', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          threadId,
          eventType: 'suggestion_click',
          payload: {
            title: suggestion.title,
            message: suggestion.message,
          },
        }),
      })
    } catch (error) {
      console.error('Failed to track suggestion click:', error)
    }
  }

  // Add click listener for suggestion pills
  React.useEffect(() => {
    const handleSuggestionClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      // Check if clicked element is a suggestion button
      const suggestionButton = target.closest('.suggestion')
      if (suggestionButton && suggestionButton instanceof HTMLElement) {
        // Extract the title from the button text
        const buttonText = suggestionButton.textContent || ''
        // Find matching suggestion from our suggestions array
        const matchedSuggestion = suggestions.find(s => s.title === buttonText)
        if (matchedSuggestion) {
          trackSuggestionClick(matchedSuggestion)
        }
      }
    }

    const container = chatContainerRef.current
    if (container) {
      container.addEventListener('click', handleSuggestionClick)
      return () => {
        container.removeEventListener('click', handleSuggestionClick)
      }
    }
  }, [suggestions, threadId])

  const submitFeedback = async (feedback: any) => {
    try {
      const token = await getAccessTokenSilently()
      await fetch('/api/copilotkit/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(feedback),
      })
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }

  const handleThumbsUp = (message: any) => {
    submitFeedback({
      messageId: message.id,
      threadId,
      source: 'message',
      rating: 1,
    })
  }

  const handleThumbsDown = (message: any) => {
    submitFeedback({
      messageId: message.id,
      threadId,
      source: 'message',
      rating: -1,
    })
  }

  if (isLoading) {
    return <ChatLoadingState>Authenticating...</ChatLoadingState>
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h3>Error authenticating</h3>
        <p>{error.message}</p>
        <Logout />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <div ref={chatContainerRef} style={{ display: 'contents' }}>
      {isLoadingHistory ? (
        <ChatLoadingState>Loading conversation...</ChatLoadingState>
      ) : (
        <StyledCopilotChat
          labels={{
            title: 'gnomAD Assistant',
            initial:
              "Hello! I can help you understand gnomAD data, navigate the browser, or answer questions about what you're viewing.",
          }}
          suggestions={suggestions}
          AssistantMessage={(props) => <CustomAssistantMessage {...props} threadId={threadId} />}
          onThumbsUp={handleThumbsUp}
          onThumbsDown={handleThumbsDown}
        />
      )}
      {/* The logout button is rendered here for authenticated users */}
      <LogoutButton
        onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
        title="Log out"
      >
        <img src={SignOutIcon} alt="Log Out" />
      </LogoutButton>
    </div>
  )
}

export function GnomadCopilot({
  children,
  selectedModel,
  setSelectedModel,
  customPrompt,
  setCustomPrompt,
  savedPrompts,
  setSavedPrompts,
  activePromptId,
  setActivePromptId,
  pageContext,
  threadId,
  onNewChat,
  onSelectThread,
}: {
  children: React.ReactNode
  selectedModel: string
  setSelectedModel: (model: string) => void
  customPrompt: string
  setCustomPrompt: (prompt: string) => void
  savedPrompts: SavedPrompt[]
  setSavedPrompts: (prompts: SavedPrompt[]) => void
  activePromptId: string | null
  setActivePromptId: (id: string | null) => void
  pageContext?: PageContext | null
  threadId: string
  onNewChat: () => void
  onSelectThread: (threadId: string) => void
}) {
  const history = useHistory()
  const location = useLocation()
  const { user: currentUser } = useCurrentUser()
  const canAccessAdmin = currentUser?.role === 'admin' || currentUser?.role === 'viewer'

  // Initialize chat display mode from query parameter
  const getInitialChatMode = (): 'closed' | 'side' | 'fullscreen' => {
    const params = new URLSearchParams(location.search)
    const chatMode = params.get('chat')
    if (chatMode === 'fullscreen') return 'fullscreen'
    if (chatMode === 'side') return 'side'
    if (chatMode === 'closed') return 'closed'
    return 'side' // default
  }

  const [chatDisplayMode, setChatDisplayModeState] = useState<'closed' | 'side' | 'fullscreen'>(getInitialChatMode())

  // Sync state with URL when location changes (e.g., browser back/forward)
  React.useEffect(() => {
    const params = new URLSearchParams(location.search)
    const chatMode = params.get('chat')
    if (chatMode === 'fullscreen') {
      setChatDisplayModeState('fullscreen')
    } else if (chatMode === 'side') {
      setChatDisplayModeState('side')
    } else if (chatMode === 'closed') {
      setChatDisplayModeState('closed')
    } else {
      setChatDisplayModeState('side') // default
    }
  }, [location.search])

  // Wrapper function to update both state and URL
  const setChatDisplayMode = useCallback((mode: 'closed' | 'side' | 'fullscreen') => {
    setChatDisplayModeState(mode)

    // Update URL query parameter - read current location from window
    const currentSearch = window.location.search
    const params = new URLSearchParams(currentSearch)
    if (mode === 'side') {
      // 'side' is the default, so we can remove the parameter
      params.delete('chat')
    } else {
      params.set('chat', mode)
    }

    const newSearch = params.toString()
    const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}${window.location.hash}`
    history.replace(newUrl)
  }, [history])

  const isChatOpen = chatDisplayMode !== 'closed'
  const isAuthEnabled = process.env.REACT_APP_AUTH0_ENABLE === 'true'
  const { getAccessTokenSilently, isAuthenticated } = useAuth0()
  const [chatWidth, setChatWidth] = useState(window.innerWidth / 3) // Default to 1/3 of screen
  const isResizing = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // State for context update notifications
  const [contextNotification, setContextNotification] = useState<string | null>(null)
  const lastSentContext = useRef<{ threadId: string; contextId: string } | null>(null)

  // Ref to store the chat history refresh function
  const chatHistoryRefreshRef = useRef<(() => void) | null>(null)

  // Get CopilotKit's message context to set messages directly
  const { setMessages, messages } = useCopilotMessagesContext()

  // State for managing loading status
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(true)

  // Track previous message count to detect new messages
  const prevMessageCountRef = useRef(0)

  // Refresh chat history when new messages are added
  React.useEffect(() => {
    const currentMessageCount = messages.length
    const hadMessages = prevMessageCountRef.current > 0
    const hasNewMessages = currentMessageCount > prevMessageCountRef.current

    // Refresh if we have new messages and a valid threadId
    if (hasNewMessages && threadId && chatHistoryRefreshRef.current) {
      // Small delay to ensure backend has processed the message
      setTimeout(() => {
        chatHistoryRefreshRef.current?.()
      }, 500)
    }

    prevMessageCountRef.current = currentMessageCount
  }, [messages.length, threadId])

  // Sync chat display mode when URL changes (e.g., browser back/forward)
  React.useEffect(() => {
    const params = new URLSearchParams(location.search)
    const chatMode = params.get('chat')
    let newMode: 'closed' | 'side' | 'fullscreen' = 'side'
    if (chatMode === 'fullscreen') newMode = 'fullscreen'
    else if (chatMode === 'side') newMode = 'side'
    else if (chatMode === 'closed') newMode = 'closed'

    if (newMode !== chatDisplayMode) {
      setChatDisplayModeState(newMode)
    }
  }, [location.search])

  // Format context for display badge
  const getContextDisplay = useCallback(() => {
    // Use pageContext if provided
    if (pageContext) {
      if (pageContext.gene_id && pageContext.symbol) {
        return {
          type: 'Gene',
          id: pageContext.symbol,
          detail: pageContext.name || pageContext.gene_id
        }
      } else if (pageContext.variant_id) {
        return {
          type: 'Variant',
          id: pageContext.variant_id,
          detail: pageContext.caid || (pageContext.rsids && pageContext.rsids.length > 0 ? pageContext.rsids[0] : '')
        }
      } else if (pageContext.chrom && pageContext.start && pageContext.stop) {
        return {
          type: 'Region',
          id: `${pageContext.chrom}:${pageContext.start}-${pageContext.stop}`,
          detail: ''
        }
      }
    }

    // Fallback: Parse from URL
    const isVariantPage = location.pathname.startsWith('/variant/')
    const isGenePage = location.pathname.startsWith('/gene/')
    const isRegionPage = location.pathname.startsWith('/region/')

    if (isVariantPage) {
      const match = location.pathname.match(/\/variant\/(.+)/)
      if (match) {
        const variantId = decodeURIComponent(match[1].split('?')[0])
        return { type: 'Variant', id: variantId, detail: '' }
      }
    } else if (isGenePage) {
      const match = location.pathname.match(/\/gene\/(.+)/)
      if (match) {
        const geneSymbol = decodeURIComponent(match[1].split('?')[0])
        return { type: 'Gene', id: geneSymbol, detail: '' }
      }
    } else if (isRegionPage) {
      const match = location.pathname.match(/\/region\/(.+)/)
      if (match) {
        const regionId = decodeURIComponent(match[1].split('?')[0])
        return { type: 'Region', id: regionId, detail: '' }
      }
    }

    return null
  }, [pageContext, location.pathname])

  // Effect to send context updates to backend
  React.useEffect(() => {
    const context = getContextDisplay()
    const contextId = context ? `${context.type}:${context.id}` : null

    if (!context || !threadId || !contextId) return

    // Check if we've already sent this exact context for this thread
    const alreadySent = lastSentContext.current?.threadId === threadId &&
                        lastSentContext.current?.contextId === contextId

    if (alreadySent) return

    const isNewContext = lastSentContext.current?.threadId === threadId &&
                         lastSentContext.current?.contextId !== contextId

    lastSentContext.current = { threadId, contextId }

    const sendContext = async () => {
      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' }
        if (isAuthEnabled && isAuthenticated) {
          const token = await getAccessTokenSilently()
          headers.Authorization = `Bearer ${token}`
        }
        await fetch(`/api/copilotkit/threads/${threadId}/context`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ context: { type: context.type, id: context.id } }),
        })
        // Only show notification for navigation (not initial context)
        if (isNewContext) {
          setContextNotification(`Context updated to ${context.type}: ${context.id}`)
          setTimeout(() => setContextNotification(null), 5000)
        }
      } catch (error) {
        console.error('Failed to send context update:', error)
      }
    }
    sendContext()
  }, [getContextDisplay, threadId, isAuthEnabled, isAuthenticated, getAccessTokenSilently])

  // Effect to fetch message history when the threadId changes
  React.useEffect(() => {
    // Note: Don't reset lastSentContext here - it tracks thread+context pairs
    // Reset message count tracking when thread changes
    prevMessageCountRef.current = 0

    // If there's no threadId, this is a new chat. Clear messages and stop loading.
    if (!threadId) {
      setMessages([])
      setIsLoadingHistory(false)
      return
    }

    const fetchMessages = async () => {
      setIsLoadingHistory(true)
      try {
        const headers: HeadersInit = {}
        if (isAuthEnabled && isAuthenticated) {
          const token = await getAccessTokenSilently()
          headers.Authorization = `Bearer ${token}`
        }

        const response = await fetch(`/api/copilotkit/threads/${threadId}/messages`, { headers })

        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`)
        }
        const data = await response.json()

        // The backend returns the raw message object in the `rawMessage` field.
        // We need to reconstruct proper CopilotKit message instances from the plain objects
        const formattedMessages = data.map((msg: any, idx: number) => {
          const rawMsg = msg.rawMessage

          try {
            // Reconstruct the appropriate message class based on type
            switch (rawMsg.type) {
            case 'TextMessage':
              return new TextMessage(rawMsg)
            case 'ActionExecutionMessage':
              console.log('[Chat History] Reconstructing ActionExecutionMessage:', JSON.stringify(rawMsg))
              // The arguments field comes from JSONB as a parsed object
              // But GraphQL schema expects it as a JSON string, so stringify it
              const actionData = { ...rawMsg }
              if (actionData.arguments && typeof actionData.arguments !== 'string') {
                actionData.arguments = JSON.stringify(actionData.arguments)
              }
              return new ActionExecutionMessage(actionData)
            case 'ResultMessage':
              console.log('[Chat History] Reconstructing ResultMessage:', JSON.stringify(rawMsg))
              // The result field comes from JSONB as a parsed object.
              // But GraphQL schema expects it as a JSON string, so stringify it
              const resultData = { ...rawMsg }
              if (resultData.result && typeof resultData.result !== 'string') {
                resultData.result = JSON.stringify(resultData.result)
              }
              return new ResultMessage(resultData)
            case 'AgentStateMessage':
              return new AgentStateMessage(rawMsg)
            case 'ImageMessage':
              return new ImageMessage(rawMsg)
            default:
              console.warn('[Chat History] Unknown message type:', rawMsg.type)
              return rawMsg
            }
          } catch (err) {
            console.error(`[Chat History] Error reconstructing message ${idx}:`, err, 'rawMsg:', rawMsg)
            throw err
          }
        })
        console.log('[Chat History] Reconstructed', formattedMessages.length, 'messages')
        formattedMessages.forEach((msg: any, idx: number) => {
          console.log(`[Chat History] Message ${idx}:`, msg.constructor?.name || msg.type, msg.id)
        })
        setMessages(formattedMessages)
      } catch (error) {
        console.error('[Chat History] Failed to fetch chat history:', error)
        setMessages([]) // Clear messages on error to ensure a clean state
      } finally {
        setIsLoadingHistory(false)
      }
    }

    fetchMessages()
  }, [threadId, isAuthEnabled, isAuthenticated, getAccessTokenSilently]) // This effect runs only when the threadId changes.

  // State for current view (chat, settings, admin) and section within a view
  const getUrlParams = () => new URLSearchParams(location.search)
  const [activeView, setActiveViewState] = useState<'chat' | 'settings' | 'admin' | null>(
    () => getUrlParams().get('view') as any
  )
  const [activeSection, setActiveSectionState] = useState<string | null>(() =>
    getUrlParams().get('section')
  )

  // Sync state with URL when location changes
  React.useEffect(() => {
    const params = getUrlParams()
    setActiveViewState(params.get('view') as any)
    setActiveSectionState(params.get('section'))
  }, [location.search])

  // Function to update the view and section in the URL
  const setView = useCallback(
    (view: string | null, section: string | null) => {
      const params = new URLSearchParams(window.location.search)
      if (view) {
        params.set('view', view)
      } else {
        params.delete('view')
      }
      if (section) {
        params.set('section', section)
      } else {
        params.delete('section')
      }
      const newSearch = params.toString()
      const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}${
        window.location.hash
      }`
      history.replace(newUrl)
    },
    [history]
  )

  // Helper functions for navigation
  const openSettings = (section = 'general') => setView('settings', section)
  const openAdmin = (section = 'feedback') => setView('admin', section)
  const showChat = () => setView(null, null)

  // Navigation handler for the NavigationBar component
  const handleNavigate = (view: 'chat' | 'settings' | 'admin') => {
    if (view === 'chat') {
      showChat()
    } else if (view === 'settings') {
      openSettings()
    } else if (view === 'admin') {
      openAdmin()
    }
  }

  // Handle prompt selection from dropdown
  const handlePromptSelect = (promptId: string) => {
    if (promptId === '') {
      // "None" selected - clear prompt
      setActivePromptId(null)
      setCustomPrompt('')
    } else {
      const prompt = savedPrompts.find(p => p.id === promptId)
      if (prompt) {
        setActivePromptId(promptId)
        setCustomPrompt(prompt.prompt)
      }
    }
  }

  // Save current prompt with a name
  const handleSavePrompt = (promptName: string) => {
    if (!promptName.trim() || !customPrompt.trim()) return

    const newPrompt: SavedPrompt = {
      id: Date.now().toString(),
      name: promptName.trim(),
      prompt: customPrompt
    }

    setSavedPrompts([...savedPrompts, newPrompt])
    setActivePromptId(newPrompt.id)
  }

  // Delete a saved prompt
  const handleDeletePrompt = (promptId: string) => {
    setSavedPrompts(savedPrompts.filter(p => p.id !== promptId))
    if (activePromptId === promptId) {
      setActivePromptId(null)
      setCustomPrompt('')
    }
  }

  // Update the active saved prompt when custom prompt changes
  const handleCustomPromptChange = (newPrompt: string) => {
    setCustomPrompt(newPrompt)
    // If editing an active saved prompt, update it
    if (activePromptId) {
      setSavedPrompts(savedPrompts.map(p =>
        p.id === activePromptId ? { ...p, prompt: newPrompt } : p
      ))
    }
  }

  // Format model name for display
  const getModelDisplayName = (model: string) => {
    const modelMap: { [key: string]: string } = {
      'gemini-2.5-flash': 'Gemini 2.5 Flash',
      'gemini-2.5-pro': 'Gemini 2.5 Pro',
      'gemini-3-flash': 'Gemini 3 Flash',
      'gemini-3-pro': 'Gemini 3 Pro',
    }
    return modelMap[model] || model
  }

  // Use useCopilotAdditionalInstructions to dynamically set custom instructions
  useCopilotAdditionalInstructions(
    {
      instructions: customPrompt,
      available: customPrompt ? 'enabled' : 'disabled',
    },
    [customPrompt]
  )

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

  const contextDisplay = getContextDisplay()

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
        {isChatOpen && chatDisplayMode === 'side' && (
          <>
            <ResizeHandle onMouseDown={handleMouseDown} />
            <ChatPanel width={chatWidth} mode={chatDisplayMode}>
              <NavigationBar
                activeView={activeView}
                onNavigate={handleNavigate}
                canAccessAdmin={canAccessAdmin}
              />
              {activeView === 'settings' && (
                <ChatSettingsView
                  activeSection={activeSection || 'general'}
                  onSectionChange={(s) => setView('settings', s)}
                  isAuthEnabled={isAuthEnabled}
                  selectedModel={selectedModel}
                  setSelectedModel={setSelectedModel}
                  customPrompt={customPrompt}
                  onCustomPromptChange={handleCustomPromptChange}
                  savedPrompts={savedPrompts}
                  activePromptId={activePromptId}
                  onPromptSelect={handlePromptSelect}
                  onSavePrompt={handleSavePrompt}
                  onDeletePrompt={handleDeletePrompt}
                />
              )}
              {activeView === 'admin' && canAccessAdmin && (
                <AdminView
                  activeSection={activeSection || 'feedback'}
                  onSectionChange={(s) => setView('admin', s)}
                />
              )}
              {(!activeView || (activeView === 'admin' && !canAccessAdmin)) && (
                <>
                  {isAuthEnabled ? (
                    <AuthenticatedChatView
                      suggestions={suggestions}
                      isLoadingHistory={isLoadingHistory}
                      threadId={threadId}
                    />
                  ) : (
                    <>
                      {isLoadingHistory ? (
                        <ChatLoadingState>Loading conversation...</ChatLoadingState>
                      ) : (
                        <StyledCopilotChat
                          labels={{
                            title: 'gnomAD Assistant',
                            initial:
                              "Hello! I can help you understand gnomAD data, navigate the browser, or answer questions about what you're viewing.",
                          }}
                          suggestions={suggestions}
                        />
                      )}
                    </>
                  )}
                  {contextNotification && (
                    <ContextUpdateBanner>{contextNotification}</ContextUpdateBanner>
                  )}
                  <BadgeContainer>
                    <ModelBadge title={`Current model: ${selectedModel}`}>
                      <img src={RobotIcon} alt="Model" />
                      {getModelDisplayName(selectedModel)}
                    </ModelBadge>
                    {contextDisplay && (
                      <ContextBadge
                        title={`Current context: ${contextDisplay.type} - ${contextDisplay.id}${
                          contextDisplay.detail ? ` (${contextDisplay.detail})` : ''
                        }`}
                      >
                        <span className="context-type">{contextDisplay.type}</span>
                        <span className="context-id">{contextDisplay.id}</span>
                      </ContextBadge>
                    )}
                  </BadgeContainer>
                </>
              )}
              <CloseButton
                onClick={() => setChatDisplayMode('closed')}
                title="Close Assistant"
              >
                <img src={CloseIcon} alt="Close" />
              </CloseButton>
              <FullscreenButton
                onClick={() => setChatDisplayMode('fullscreen')}
                title="Enter fullscreen"
              >
                <img src={ExpandIcon} alt="Enter fullscreen" />
              </FullscreenButton>
            </ChatPanel>
          </>
        )}
      </PageContainer>

      {chatDisplayMode === 'fullscreen' && (
        <FullscreenContainer>
          {isAuthEnabled && isAuthenticated && (
            <ChatHistorySidebar
              currentThreadId={threadId}
              onNewChat={onNewChat}
              onSelectThread={onSelectThread}
              onRefreshRef={(refreshFn) => {
                chatHistoryRefreshRef.current = refreshFn
              }}
              currentContext={contextDisplay}
              currentMessageCount={messages.filter(m => m.constructor?.name === 'TextMessage' || m.type === 'TextMessage').length}
            />
          )}
          <FullscreenChatArea>
            <NavigationBar
              activeView={activeView}
              onNavigate={handleNavigate}
              canAccessAdmin={canAccessAdmin}
            />
            {activeView === 'settings' && (
              <ChatSettingsView
                activeSection={activeSection || 'general'}
                onSectionChange={(s) => setView('settings', s)}
                isAuthEnabled={isAuthEnabled}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                customPrompt={customPrompt}
                onCustomPromptChange={handleCustomPromptChange}
                savedPrompts={savedPrompts}
                activePromptId={activePromptId}
                onPromptSelect={handlePromptSelect}
                onSavePrompt={handleSavePrompt}
                onDeletePrompt={handleDeletePrompt}
              />
            )}
            {activeView === 'admin' && canAccessAdmin && (
              <AdminView
                activeSection={activeSection || 'feedback'}
                onSectionChange={(s) => setView('admin', s)}
              />
            )}
            {(!activeView || (activeView === 'admin' && !canAccessAdmin)) && (
              <>
                {isAuthEnabled ? (
                  <AuthenticatedChatView
                    suggestions={suggestions}
                    isLoadingHistory={isLoadingHistory}
                    threadId={threadId}
                  />
                ) : (
                  <>
                    {isLoadingHistory ? (
                      <ChatLoadingState>Loading conversation...</ChatLoadingState>
                    ) : (
                      <StyledCopilotChat
                        labels={{
                          title: 'gnomAD Assistant',
                          initial:
                            "Hello! I can help you understand gnomAD data, navigate the browser, or answer questions about what you're viewing.",
                        }}
                        suggestions={suggestions}
                      />
                    )}
                  </>
                )}
                {contextNotification && (
                  <ContextUpdateBanner>{contextNotification}</ContextUpdateBanner>
                )}
                <BadgeContainer>
                  <ModelBadge title={`Current model: ${selectedModel}`}>
                    <img src={RobotIcon} alt="Model" />
                    {getModelDisplayName(selectedModel)}
                  </ModelBadge>
                  {contextDisplay && (
                    <ContextBadge
                      title={`Current context: ${contextDisplay.type} - ${contextDisplay.id}${
                        contextDisplay.detail ? ` (${contextDisplay.detail})` : ''
                      }`}
                    >
                      <span className="context-type">{contextDisplay.type}</span>
                      <span className="context-id">{contextDisplay.id}</span>
                    </ContextBadge>
                  )}
                </BadgeContainer>
              </>
            )}
            <CloseButton onClick={() => setChatDisplayMode('closed')} title="Close Assistant">
              <img src={CloseIcon} alt="Close" />
            </CloseButton>
            <FullscreenButton onClick={() => setChatDisplayMode('side')} title="Exit fullscreen">
              <img src={CompressIcon} alt="Exit fullscreen" />
            </FullscreenButton>
          </FullscreenChatArea>
        </FullscreenContainer>
      )}

      {!isChatOpen && (
        <ToggleButton onClick={() => setChatDisplayMode('side')}>
          Ask gnomAD Assistant
        </ToggleButton>
      )}
    </>
  )
}
