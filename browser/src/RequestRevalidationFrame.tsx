import React, { useEffect, useRef } from 'react'
import styled from 'styled-components'

const Frame = styled.div`
  position: relative;
  width: 100%;
`

const Content = styled.div<{ $stale: boolean }>`
  opacity: ${(props) => (props.$stale ? 0.22 : 1)};
  pointer-events: ${(props) => (props.$stale ? 'none' : 'auto')};
`

const UpdatingStatus = styled.div`
  position: absolute;
  z-index: 20;
  top: 1rem;
  left: 50%;
  max-width: calc(100% - 2rem);
  padding: 0.65rem 1rem;
  border: 1px solid #aaa;
  border-radius: 4px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  color: #333;
  text-align: center;
  transform: translateX(-50%);
`

type Props = {
  children: React.ReactNode
  focusAfterUpdateSelector?: string
  message: string
  stale: boolean
  testId: string
}

/**
 * Retains the previous layout during a request without exposing previous-scope
 * data as current. The stale subtree is visually muted, inert, and removed from
 * the accessibility tree; focus moves to the explicit updating status.
 */
const RequestRevalidationFrame = ({
  children,
  focusAfterUpdateSelector,
  message,
  stale,
  testId,
}: Props) => {
  const statusRef = useRef<HTMLDivElement>(null)
  const wasStale = useRef(false)

  useEffect(() => {
    if (stale) {
      wasStale.current = true
      statusRef.current?.focus()
      return
    }

    if (wasStale.current && focusAfterUpdateSelector) {
      wasStale.current = false
      requestAnimationFrame(() => {
        const target = document.querySelector<HTMLElement>(focusAfterUpdateSelector)
        target?.focus()
      })
    }
  }, [focusAfterUpdateSelector, stale])

  return (
    <Frame data-testid={testId} aria-busy={stale ? 'true' : 'false'}>
      {stale && (
        <UpdatingStatus ref={statusRef} role="status" aria-live="polite" tabIndex={-1}>
          {message}
        </UpdatingStatus>
      )}
      <Content
        $stale={stale}
        aria-hidden={stale ? 'true' : undefined}
        // React 17's DOM typings predate the inert attribute.
        {...(stale ? ({ inert: '' } as any) : {})}
      >
        {children}
      </Content>
    </Frame>
  )
}

export default RequestRevalidationFrame
