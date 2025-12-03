import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import { useAuth0 } from '@auth0/auth0-react'
import { Button, PrimaryButton } from '@gnomad/ui'
// @ts-expect-error TS(2307)
import CommentIcon from '@fortawesome/fontawesome-free/svgs/solid/comment-dots.svg'
import { ChatModal } from './ChatModal'

interface Thread {
  threadId: string
  title: string | null
  updatedAt: string
  messageCount: number
  contexts: { type: string; id: string }[]
}

interface ChatHistorySidebarProps {
  currentThreadId: string
  onNewChat: () => void
  onSelectThread: (threadId: string) => void
  onRefreshRef?: (refreshFn: () => void) => void
  currentContext?: { type: string; id: string } | null
  currentMessageCount?: number
}

const SidebarContainer = styled.div`
  width: 320px;
  background: #f7f7f7;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`

const SidebarHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
`

const NewChatButton = styled.button`
  width: 100%;
  padding: 10px 16px;
  background: #0d79d0;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #0a5fa3;
  }
`

const ThreadList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;
`

const ThreadItem = styled.div<{ isActive: boolean }>`
  padding: 12px;
  margin-bottom: 4px;
  border-radius: 6px;
  cursor: pointer;
  background: ${(props) => (props.isActive ? '#e3f2fd' : 'white')};
  border: 1px solid ${(props) => (props.isActive ? '#90caf9' : '#e0e0e0')};
  transition: all 0.15s;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;

  &:hover {
    background: ${(props) => (props.isActive ? '#e3f2fd' : '#f5f5f5')};
    border-color: ${(props) => (props.isActive ? '#90caf9' : '#d0d0d0')};
  }
`

const ThreadContent = styled.div`
  flex: 1;
  min-width: 0;
`

const DeleteButton = styled.button`
  padding: 4px 8px;
  background: transparent;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  color: #666;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
  opacity: 0.6;

  &:hover {
    background: #fee;
    border-color: #d32f2f;
    color: #d32f2f;
    opacity: 1;
  }
`

const ThreadFeedbackButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  opacity: 0.6;
  transition: opacity 0.2s;
  flex-shrink: 0;

  &:hover {
    opacity: 1;
  }

  img {
    width: 14px;
    height: 14px;
    display: block;
    filter: invert(50%);
  }
`

const FeedbackTextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 8px 12px;
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

const ThreadTitle = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.4;
`

const ThreadMeta = styled.div`
  font-size: 11px;
  color: #666;
  display: flex;
  gap: 8px;
`

const ContextList = styled.div`
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`

const ContextPill = styled.div`
  background: #eef;
  border: 1px solid #cce;
  color: #557;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;

  .context-type {
    font-weight: 600;
    margin-right: 4px;
  }
`

const LoadingState = styled.div`
  padding: 20px;
  text-align: center;
  color: #666;
  font-size: 13px;
`

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function ChatHistorySidebar({
  currentThreadId,
  onNewChat,
  onSelectThread,
  onRefreshRef,
  currentContext,
  currentMessageCount = 0,
}: ChatHistorySidebarProps) {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0()
  const isAuthEnabled = process.env.REACT_APP_AUTH0_ENABLE === 'true'
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedbackModalThreadId, setFeedbackModalThreadId] = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)

  // Fetch threads function (extracted so it can be called manually)
  const fetchThreads = React.useCallback(async (isInitialLoad = false) => {
    if (isAuthEnabled && !isAuthenticated) {
      setThreads([])
      setLoading(false)
      return
    }

    try {
      // Only show loading spinner on initial load, not on refreshes
      if (isInitialLoad) {
        setLoading(true)
      }

      const headers: HeadersInit = {}
      if (isAuthEnabled) {
        const token = await getAccessTokenSilently()
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch('/api/copilotkit/threads?limit=50', { headers })
      if (!response.ok) throw new Error('Failed to fetch threads')
      const data = await response.json()
      // Filter out empty threads (zombie threads with no messages)
      const nonEmptyThreads = data.filter((thread: Thread) => thread.messageCount > 0)
      setThreads(nonEmptyThreads)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      if (isInitialLoad) {
        setLoading(false)
      }
    }
  }, [isAuthEnabled, isAuthenticated, getAccessTokenSilently])

  // Expose refresh function to parent
  useEffect(() => {
    if (onRefreshRef) {
      // Parent refreshes should be silent (no loading state)
      onRefreshRef(() => fetchThreads(false))
    }
  }, [onRefreshRef, fetchThreads])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    // Initial load
    fetchThreads(true)

    // Refresh every 30 seconds (without loading state)
    const interval = setInterval(() => fetchThreads(false), 30000)
    return () => clearInterval(interval)
  }, [fetchThreads])

  // Silently refresh when currentThreadId changes
  useEffect(() => {
    if (currentThreadId) {
      fetchThreads(false)
    }
  }, [currentThreadId, fetchThreads])

  // Get unique contexts, prioritizing the most recent ones
  const getUniqueContexts = (contexts: { type: string; id: string }[] = []) => {
    if (!contexts) return []
    const unique: { [key: string]: { type: string; id: string } } = {}
    // Iterate backwards to get the most recent unique contexts
    for (let i = contexts.length - 1; i >= 0; i--) {
      const key = `${contexts[i].type}:${contexts[i].id}`
      if (!unique[key]) {
        unique[key] = contexts[i]
      }
    }
    return Object.values(unique).reverse().slice(0, 3) // Show max 3 contexts
  }

  // Create optimistic thread list - include current thread if not in fetched list
  const displayThreads = React.useMemo(() => {
    // Check if current thread exists in fetched threads
    const existingThread = threads.find(t => t.threadId === currentThreadId)

    // If current thread doesn't exist and we have a threadId, create optimistic entry
    if (!existingThread && currentThreadId && currentContext) {
      const optimisticThread: Thread = {
        threadId: currentThreadId,
        title: `Chat about ${currentContext.id}`,
        updatedAt: new Date().toISOString(),
        messageCount: currentMessageCount,
        contexts: [currentContext]
      }
      // Put optimistic thread at the top
      return [optimisticThread, ...threads]
    }

    // If thread exists but has outdated message count, update it
    if (existingThread && currentMessageCount > existingThread.messageCount) {
      const updatedThreads = threads.map(t =>
        t.threadId === currentThreadId
          ? { ...t, messageCount: currentMessageCount }
          : t
      )
      return updatedThreads
    }

    return threads
  }, [threads, currentThreadId, currentContext, currentMessageCount])

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim() || !feedbackModalThreadId) return

    setIsSubmittingFeedback(true)
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (isAuthEnabled && isAuthenticated) {
        const token = await getAccessTokenSilently()
        headers.Authorization = `Bearer ${token}`
      }
      await fetch('/api/copilotkit/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          threadId: feedbackModalThreadId,
          source: 'thread',
          feedbackText,
        }),
      })
      setFeedbackModalThreadId(null)
      setFeedbackText('')
    } catch (error) {
      console.error('Failed to submit thread feedback:', error)
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  // Handle thread deletion
  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    // Prevent the click from bubbling up to the thread item
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this conversation?')) {
      return
    }

    try {
      const headers: HeadersInit = {}
      if (isAuthEnabled) {
        const token = await getAccessTokenSilently()
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`/api/copilotkit/threads/${threadId}`, {
        method: 'DELETE',
        headers,
      })

      if (!response.ok) throw new Error('Failed to delete thread')

      // Remove the thread from the local state
      setThreads(threads.filter((t) => t.threadId !== threadId))

      // If we deleted the current thread, start a new chat
      if (threadId === currentThreadId) {
        onNewChat()
      }
    } catch (err: any) {
      console.error('Failed to delete thread:', err)
      alert('Failed to delete conversation. Please try again.')
    }
  }

  return (
    <SidebarContainer>
      <SidebarHeader>
        <NewChatButton onClick={onNewChat}>+ New Chat</NewChatButton>
      </SidebarHeader>

      <ThreadList>
        {loading && <LoadingState>Loading history...</LoadingState>}

        {error && <LoadingState>Error: {error}</LoadingState>}

        {!loading && !error && displayThreads.length === 0 && (
          <LoadingState>No chat history yet</LoadingState>
        )}

        {displayThreads.map((thread) => (
          <ThreadItem
            key={thread.threadId}
            isActive={thread.threadId === currentThreadId}
            onClick={() => onSelectThread(thread.threadId)}
          >
            <ThreadContent>
              <ThreadTitle>{thread.title || 'New conversation'}</ThreadTitle>
              <ThreadMeta>
                <span>{thread.messageCount} messages</span>
                <span>{formatDate(thread.updatedAt)}</span>
              </ThreadMeta>
              <ContextList>
                {getUniqueContexts(thread.contexts).map((context) => (
                  <ContextPill key={`${context.type}-${context.id}`} title={`${context.type}: ${context.id}`}>
                    <span className="context-type">{context.type}</span>
                    <span>{context.id}</span>
                  </ContextPill>
                ))}
              </ContextList>
            </ThreadContent>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
              <DeleteButton
                onClick={(e) => handleDeleteThread(thread.threadId, e)}
                title="Delete conversation"
              >
                Delete
              </DeleteButton>
              <ThreadFeedbackButton
                onClick={(e) => {
                  e.stopPropagation()
                  setFeedbackModalThreadId(thread.threadId)
                }}
                title="Provide feedback on this conversation"
              >
                <img src={CommentIcon} alt="Feedback" />
              </ThreadFeedbackButton>
            </div>
          </ThreadItem>
        ))}
      </ThreadList>
      {feedbackModalThreadId && (
        <ChatModal
          title="Provide Feedback on Conversation"
          onRequestClose={() => setFeedbackModalThreadId(null)}
          footer={
            <>
              <Button onClick={() => setFeedbackModalThreadId(null)} disabled={isSubmittingFeedback}>
                Cancel
              </Button>
              <PrimaryButton onClick={handleFeedbackSubmit} disabled={isSubmittingFeedback || !feedbackText.trim()}>
                {isSubmittingFeedback ? 'Submitting...' : 'Submit'}
              </PrimaryButton>
            </>
          }
        >
          <FeedbackTextArea
            aria-label="Feedback input"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Tell us what you think about this conversation..."
            autoFocus
          />
        </ChatModal>
      )}
    </SidebarContainer>
  )
}
