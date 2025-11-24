import React, { useEffect, useState } from 'react'
import styled from 'styled-components'

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

  &:hover {
    background: ${(props) => (props.isActive ? '#e3f2fd' : '#f5f5f5')};
    border-color: ${(props) => (props.isActive ? '#90caf9' : '#d0d0d0')};
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
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch threads
  useEffect(() => {
    const fetchThreads = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/copilotkit/threads?limit=50')
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
  }, [])

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
            <ThreadTitle>{thread.title || 'New conversation'}</ThreadTitle>
            <ThreadMeta>
              <span>{thread.messageCount} messages</span>
              <span>{formatDate(thread.updatedAt)}</span>
            </ThreadMeta>
          </ThreadItem>
        ))}
      </ThreadList>
    </SidebarContainer>
  )
}
