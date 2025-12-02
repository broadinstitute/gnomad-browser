import React, { useState } from 'react'
import { AssistantMessage, AssistantMessageProps } from '@copilotkit/react-ui'
import { useAuth0 } from '@auth0/auth0-react'
import { Modal, Button, PrimaryButton } from '@gnomad/ui'
import styled from 'styled-components'

const FeedbackButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 12px;
  color: #666;
  transition: color 0.2s;

  &:hover {
    color: #0d79d0;
  }
`

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #0d79d0;
  }
`

const MessageWrapper = styled.div`
  position: relative;
`

const FeedbackActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
  padding-left: 12px;
`

interface CustomAssistantMessageProps extends AssistantMessageProps {
  threadId?: string
}

export const CustomAssistantMessage: React.FC<CustomAssistantMessageProps> = (props) => {
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { getAccessTokenSilently, isAuthenticated } = useAuth0()

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

  return (
    <MessageWrapper>
      <AssistantMessage {...props} />
      <FeedbackActions>
        <FeedbackButton onClick={handleOpenFeedbackModal} title="Provide detailed feedback">
          💬 Provide feedback
        </FeedbackButton>
      </FeedbackActions>

      {isFeedbackModalOpen && (
        <Modal
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
        </Modal>
      )}
    </MessageWrapper>
  )
}
