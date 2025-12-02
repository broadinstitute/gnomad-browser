import React, { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter as Router, Route, useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'
import { CopilotKit } from '@copilotkit/react-core'
import '@copilotkit/react-ui/styles.css'
import './styles/chatComponents.css'

import Delayed from './Delayed'
import ErrorBoundary from './ErrorBoundary'

import Notifications, { showNotification } from './Notifications'
import StatusMessage from './StatusMessage'
import userPreferences from './userPreferences'
import { GnomadCopilot } from './GnomadCopilot'

const NavBar = lazy(() => import('./NavBar'))
const Routes = lazy(() => import('./Routes'))

const scrollToAnchorOrStartOfPage = (location: any) => {
  if (location.hash) {
    setTimeout(() => {
      const anchor = document.querySelector(`a${location.hash}`)
      if (anchor) {
        anchor.scrollIntoView()
      } else {
        window.scrollTo(0, 0)
      }
    }, 0)
  } else {
    window.scrollTo(0, 0)
  }
}

// Hack to make anchor links work on the first navigation to a page
// See https://github.com/broadinstitute/gnomad-browser/issues/685
const PageLoading = () => {
  const location = useLocation()
  useEffect(() => () => {
    scrollToAnchorOrStartOfPage(location)
  })
  return null
}

const GoogleAnalytics = () => {
  const location = useLocation()
  useEffect(() => {
    if ((window as any).gtag) {
      ; (window as any).gtag('config', (window as any).gaTrackingId, {
        page_path: location.pathname,
      })
    }
  }, [location.pathname])
  return null
}

const TopBarWrapper = styled.div`
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.23);

  @media print {
    display: none;
  }
`

const Banner = styled.div`
  padding: 0.75em 0.5em;
  background: rgb(17, 115, 187);
  color: #fff;
  text-align: center;

  a {
    color: #8ac8f4 !important;
    text-decoration: underline;
  }
`


const BANNER_CONTENT = null

const COPILOT_MODEL_STORAGE_KEY = 'gnomad.copilot.model'
const COPILOT_SAVED_PROMPTS_STORAGE_KEY = 'gnomad.copilot.savedPrompts'
const COPILOT_ACTIVE_PROMPT_ID_STORAGE_KEY = 'gnomad.copilot.activePromptId'
const COPILOT_THREAD_ID_STORAGE_KEY = 'gnomad.copilot.threadId'

interface SavedPrompt {
  id: string
  name: string
  prompt: string
}

// Helper to generate a new thread ID
const generateThreadId = () => crypto.randomUUID()

// Wrapper to handle Auth0 loading state when authentication is enabled
const Auth0LoadingWrapper = ({ children }: { children: React.ReactNode }) => {
  const { isLoading, error } = useAuth0()

  if (isLoading) {
    return (
      <Delayed>
        <StatusMessage>Authenticating...</StatusMessage>
      </Delayed>
    )
  }

  if (error) {
    return (
      <Delayed>
        <StatusMessage>Authentication error: {error.message}</StatusMessage>
      </Delayed>
    )
  }

  return <>{children}</>
}

const GnomadApp = () => {
  const isAuthEnabled = process.env.REACT_APP_AUTH0_ENABLE === 'true'
  const { getAccessTokenSilently, isAuthenticated } = useAuth0()
  const [isLoading, setIsLoading] = useState(true)
  const [copilotToken, setCopilotToken] = useState<string | null>(null)

  // Thread ID state - load from localStorage or generate new
  const [threadId, setThreadId] = useState(() => {
    try {
      const storedThreadId = localStorage.getItem(COPILOT_THREAD_ID_STORAGE_KEY)
      return storedThreadId || generateThreadId()
    } catch {
      return generateThreadId()
    }
  })

  // CopilotKit settings state - load from localStorage if available
  const [selectedModel, setSelectedModel] = useState(() => {
    try {
      return localStorage.getItem(COPILOT_MODEL_STORAGE_KEY) || 'gemini-2.5-flash'
    } catch {
      return 'gemini-2.5-flash'
    }
  })

  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>(() => {
    try {
      const stored = localStorage.getItem(COPILOT_SAVED_PROMPTS_STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const [activePromptId, setActivePromptId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(COPILOT_ACTIVE_PROMPT_ID_STORAGE_KEY)
    } catch {
      return null
    }
  })

  const [customPrompt, setCustomPrompt] = useState(() => {
    try {
      const activeId = localStorage.getItem(COPILOT_ACTIVE_PROMPT_ID_STORAGE_KEY)
      if (activeId) {
        const stored = localStorage.getItem(COPILOT_SAVED_PROMPTS_STORAGE_KEY)
        if (stored) {
          const prompts: SavedPrompt[] = JSON.parse(stored)
          const activePrompt = prompts.find(p => p.id === activeId)
          return activePrompt?.prompt || ''
        }
      }
      return ''
    } catch {
      return ''
    }
  })

  // Persist model selection to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(COPILOT_MODEL_STORAGE_KEY, selectedModel)
    } catch (error) {
      console.error('Failed to save model preference:', error)
    }
  }, [selectedModel])

  // Persist saved prompts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(COPILOT_SAVED_PROMPTS_STORAGE_KEY, JSON.stringify(savedPrompts))
    } catch (error) {
      console.error('Failed to save prompts:', error)
    }
  }, [savedPrompts])

  // Persist active prompt ID to localStorage
  useEffect(() => {
    try {
      if (activePromptId) {
        localStorage.setItem(COPILOT_ACTIVE_PROMPT_ID_STORAGE_KEY, activePromptId)
      } else {
        localStorage.removeItem(COPILOT_ACTIVE_PROMPT_ID_STORAGE_KEY)
      }
    } catch (error) {
      console.error('Failed to save active prompt ID:', error)
    }
  }, [activePromptId])

  // Persist thread ID to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(COPILOT_THREAD_ID_STORAGE_KEY, threadId)
    } catch (error) {
      console.error('Failed to save thread ID:', error)
    }
  }, [threadId])

  // Fetch Auth0 token for CopilotKit
  useEffect(() => {
    if (isAuthEnabled && isAuthenticated) {
      const getToken = async () => {
        try {
          // Try to get token silently first
          const token = await getAccessTokenSilently({
            authorizationParams: {
              audience: process.env.REACT_APP_AUTH0_AUDIENCE,
              scope: 'openid profile email',
            }
          })
          setCopilotToken(token)
        } catch (e: any) {
          // If consent is required, use popup to get consent interactively
          if (e.error === 'consent_required' || e.error === 'login_required') {
            try {
              // Use popup to get consent - this will open a popup window
              const token = await getAccessTokenSilently({
                authorizationParams: {
                  audience: process.env.REACT_APP_AUTH0_AUDIENCE,
                  scope: 'openid profile email',
                  prompt: 'consent',
                },
                cacheMode: 'off', // Don't use cached token
              })
              setCopilotToken(token)
            } catch (consentError: any) {
              console.error('Failed to get Auth0 token. Please check configuration.')
            }
          }
        }
      }
      getToken()
    }
  }, [isAuthEnabled, isAuthenticated, getAccessTokenSilently])

  // Handler for starting a new chat
  const handleNewChat = async () => {
    const newThreadId = generateThreadId()

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (isAuthEnabled && isAuthenticated) {
        const token = await getAccessTokenSilently()
        headers.Authorization = `Bearer ${token}`
      }

      // Create the thread in the database so it appears in the sidebar
      await fetch('/api/copilotkit/threads', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          threadId: newThreadId,
          model: selectedModel,
        }),
      })

      // Set the new thread as active
      setThreadId(newThreadId)
    } catch (error) {
      console.error('Failed to create new thread:', error)
      // Still set the thread ID even if the API call fails
      setThreadId(newThreadId)
    }
  }

  // Handler for selecting an existing thread
  const handleSelectThread = (selectedThreadId: string) => {
    setThreadId(selectedThreadId)
  }

  useEffect(() => {
    userPreferences.loadPreferences().then(
      () => {
        setIsLoading(false)
      },
      (error: any) => {
        setIsLoading(false)
        showNotification({
          title: 'Error',
          message: error.message,
          status: 'error',
        })
      }
    )
  }, [])

  const copilotKitUrl = '/api/copilotkit'

  if (isAuthEnabled && isAuthenticated && !copilotToken) {
    return (
      <Delayed>
        <StatusMessage>Loading Assistant...</StatusMessage>
      </Delayed>
    )
  }

  return (
    <CopilotKit
      runtimeUrl={copilotKitUrl}
      headers={copilotToken ? { Authorization: `Bearer ${copilotToken}` } : {}}
      // @ts-ignore - threadId and model are not in the type definition but are supported by the runtime
      threadId={threadId}
      forwardedParameters={{ model: selectedModel }}
      instructions="You are a helpful assistant for gnomAD, a genome aggregation database. Your goal is to help users understand genetic data, navigate the site, and find relevant information. Use the available tools to answer user questions about variants, genes, and regions."
    >
      <Router>
        {/* On any navigation, send event to Google Analytics. */}
        <Route path="/" component={GoogleAnalytics} />

        {/**
         * On any navigation, scroll to the anchor specified by location fragment (if any) or to the top of the page.
         * If the page's module is already loaded, scrolling is handled by this router's render function. If the page's
         * module is loaded by Suspense, scrolling is handled by the useEffect hook in the PageLoading component.
         */}
        <Route
          path="/"
          render={({ location }: any) => {
            scrollToAnchorOrStartOfPage(location)
            return null
          }}
        />

        <ErrorBoundary>
          {isLoading ? (
            <Delayed>
              <StatusMessage>Loading</StatusMessage>
            </Delayed>
          ) : (
            <Suspense fallback={null}>
              <GnomadCopilot
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                customPrompt={customPrompt}
                setCustomPrompt={setCustomPrompt}
                savedPrompts={savedPrompts}
                setSavedPrompts={setSavedPrompts}
                activePromptId={activePromptId}
                setActivePromptId={setActivePromptId}
                threadId={threadId}
                onNewChat={handleNewChat}
                onSelectThread={handleSelectThread}
              >
                <TopBarWrapper>
                  <NavBar />
                  {BANNER_CONTENT && <Banner>{BANNER_CONTENT}</Banner>}
                </TopBarWrapper>
                <Notifications />
                <Suspense fallback={<PageLoading />}>
                  <Routes />
                </Suspense>
              </GnomadCopilot>
            </Suspense>
          )}
        </ErrorBoundary>
      </Router>
    </CopilotKit>
  )
}

const App = () => {
  const isAuthEnabled = process.env.REACT_APP_AUTH0_ENABLE === 'true'

  if (isAuthEnabled) {
    // Handle the redirect callback - redirect to home after login
    const onRedirectCallback = (appState: any) => {
      console.log('[Auth0] Redirect callback', { appState, currentUrl: window.location.href })
      // After login, navigate to home or the page they were on
      window.history.replaceState(
        {},
        document.title,
        appState?.returnTo || window.location.pathname
      )
    }

    return (
      <Auth0Provider
        domain={process.env.REACT_APP_AUTH0_DOMAIN || ''}
        clientId={process.env.REACT_APP_AUTH0_CLIENT_ID || ''}
        authorizationParams={{
          redirect_uri: window.location.origin,
          audience: process.env.REACT_APP_AUTH0_AUDIENCE,
          scope: 'openid profile email',
        }}
        cacheLocation="localstorage"
        onRedirectCallback={onRedirectCallback}
      >
        <Auth0LoadingWrapper>
          <GnomadApp />
        </Auth0LoadingWrapper>
      </Auth0Provider>
    )
  }
  return <GnomadApp />
}

export default App
