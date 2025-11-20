import React, { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter as Router, Route, useLocation } from 'react-router-dom'
import styled from 'styled-components'
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

interface SavedPrompt {
  id: string
  name: string
  prompt: string
}

const App = () => {
  const [isLoading, setIsLoading] = useState(true)

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

  return (
    <CopilotKit
      runtimeUrl={copilotKitUrl}
      // @ts-ignore - model is not in the type definition but is supported by the runtime
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

export default App
