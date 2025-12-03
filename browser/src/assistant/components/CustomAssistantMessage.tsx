import React, { useState, useEffect, useRef } from 'react'
import { AssistantMessage, AssistantMessageProps } from '@copilotkit/react-ui'
import { useAuth0 } from '@auth0/auth0-react'
import { Button, PrimaryButton } from '@gnomad/ui'
import styled from 'styled-components'
import { ChatModal } from './ChatModal'

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 8px 12px 8px 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #0d79d0;
  }
`

const MessageWrapper = styled.div`
  position: relative;
`

interface CustomAssistantMessageProps extends AssistantMessageProps {
  threadId?: string
}

export const CustomAssistantMessage: React.FC<CustomAssistantMessageProps> = (props) => {
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { getAccessTokenSilently, isAuthenticated } = useAuth0()
  const wrapperRef = useRef<HTMLDivElement>(null)

  const handleOpenFeedbackModal = () => {
    setIsFeedbackModalOpen(true)
  }

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return

    setIsSubmitting(true)
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      // Add authorization header if authenticated
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently()
          headers.Authorization = `Bearer ${token}`
        } catch (error) {
          console.warn('Failed to get access token, submitting as anonymous', error)
        }
      }

      await fetch('/api/copilotkit/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messageId: props.message?.id,
          threadId: props.threadId,
          source: 'message',
          feedbackText,
        }),
      })
      setIsFeedbackModalOpen(false)
      setFeedbackText('')
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Add click handlers to thumbs up/down buttons to open feedback modal
  useEffect(() => {
    if (!wrapperRef.current) return

    const thumbsUpButton = wrapperRef.current.querySelector('button[aria-label="Thumbs up"]')
    const thumbsDownButton = wrapperRef.current.querySelector('button[aria-label="Thumbs down"]')

    const handleThumbsClick = (e: Event) => {
      // Let the original click handler run first
      setTimeout(() => {
        setIsFeedbackModalOpen(true)
      }, 0)
    }

    if (thumbsUpButton) {
      thumbsUpButton.addEventListener('click', handleThumbsClick)
    }
    if (thumbsDownButton) {
      thumbsDownButton.addEventListener('click', handleThumbsClick)
    }

    return () => {
      if (thumbsUpButton) {
        thumbsUpButton.removeEventListener('click', handleThumbsClick)
      }
      if (thumbsDownButton) {
        thumbsDownButton.removeEventListener('click', handleThumbsClick)
      }
    }
  }, [props.message?.id]) // Re-run when message changes

  return (
    <MessageWrapper ref={wrapperRef}>
      <AssistantMessage {...props} />

      {isFeedbackModalOpen && (
        <ChatModal
          title="Provide Feedback"
          onRequestClose={() => setIsFeedbackModalOpen(false)}
          footer={
            <>
              <Button onClick={() => setIsFeedbackModalOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <PrimaryButton onClick={handleFeedbackSubmit} disabled={isSubmitting || !feedbackText.trim()}>
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </PrimaryButton>
            </>
          }
        >
          <TextArea
            aria-label="Feedback input"
            value={feedbackText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFeedbackText(e.target.value)}
            placeholder="Tell us what you think about this response..."
            autoFocus
          />
        </ChatModal>
      )}
    </MessageWrapper>
  )
}
