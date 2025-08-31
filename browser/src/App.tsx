import React, { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter as Router, Route, useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { CopilotKit } from '@copilotkit/react-core'
import '@copilotkit/react-ui/styles.css'

import Delayed from './Delayed'
import ErrorBoundary from './ErrorBoundary'

import Notifications, { showNotification } from './Notifications'
import StatusMessage from './StatusMessage'
import userPreferences from './userPreferences'
import GnomadCopilotSidebar from './CopilotSidebar'

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
      ;(window as any).gtag('config', (window as any).gaTrackingId, {
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

const MainContentWrapper = styled.div`
  display: flex;
  height: calc(100vh - 64px); // Assuming navbar height
  overflow: hidden;
`

const ContentArea = styled.div`
  flex: 1;
  overflow-y: auto;
`

const BANNER_CONTENT = null

const App = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [isChatOpen, setIsChatOpen] = useState(false)
  
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

  return (
    <CopilotKit runtimeUrl="http://localhost:4001/api/copilotkit">
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
              <TopBarWrapper>
                <NavBar onOpenChat={() => setIsChatOpen(true)} />
                {BANNER_CONTENT && <Banner>{BANNER_CONTENT}</Banner>}
              </TopBarWrapper>
              <Notifications />

              <MainContentWrapper>
                <ContentArea>
                  <Suspense fallback={<PageLoading />}>
                    <Routes />
                  </Suspense>
                </ContentArea>
                <GnomadCopilotSidebar
                  isOpen={isChatOpen}
                  onClose={() => setIsChatOpen(false)}
                />
              </MainContentWrapper>
            </Suspense>
          )}
        </ErrorBoundary>
      </Router>
    </CopilotKit>
  )
}

export default App
