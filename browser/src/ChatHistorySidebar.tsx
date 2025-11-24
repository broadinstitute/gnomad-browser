import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import { useAuth0 } from '@auth0/auth0-react'

interface Thread {
  threadId: string
  title: string | null
  updatedAt: string
  messageCount: number
}

interface ChatHistorySidebarProps {
  currentThreadId: string
  onNewChat: () => void
  onSelectThread: (threadId: string) => void
}

const SidebarContainer = styled.div`
  width: 280px;
  background: #f7f7f7;
  border-left: 1px solid #e0e0e0;
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

const ThreadTitle = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
`

const ThreadMeta = styled.div`
  font-size: 11px;
  color: #666;
  display: flex;
  gap: 8px;
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
}: ChatHistorySidebarProps) {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0()
  const isAuthEnabled = process.env.REACT_APP_AUTH0_ENABLE === 'true'
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch threads
  useEffect(() => {
    const fetchThreads = async () => {
      if (isAuthEnabled && !isAuthenticated) {
        setThreads([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        const headers: HeadersInit = {}
        if (isAuthEnabled) {
          const token = await getAccessTokenSilently()
          headers.Authorization = `Bearer ${token}`
        }

        const response = await fetch('/api/copilotkit/threads?limit=50', { headers })
        if (!response.ok) throw new Error('Failed to fetch threads')
        const data = await response.json()
        setThreads(data)
        setError(null)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchThreads()

    // Refresh every 30 seconds
    const interval = setInterval(fetchThreads, 30000)
    return () => clearInterval(interval)
  }, [currentThreadId, isAuthEnabled, isAuthenticated, getAccessTokenSilently]) // Re-fetch when currentThreadId changes (e.g., new chat created)

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

        {!loading && !error && threads.length === 0 && (
          <LoadingState>No chat history yet</LoadingState>
        )}

        {threads.map((thread) => (
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
            </ThreadContent>
            <DeleteButton
              onClick={(e) => handleDeleteThread(thread.threadId, e)}
              title="Delete conversation"
            >
              Delete
            </DeleteButton>
          </ThreadItem>
        ))}
      </ThreadList>
    </SidebarContainer>
  )
}
