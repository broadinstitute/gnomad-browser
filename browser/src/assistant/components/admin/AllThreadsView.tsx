import React, { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { Button } from '@gnomad/ui'
import styled from 'styled-components'

const Container = styled.div`
  padding: 20px;
  overflow-y: auto;
  height: 100%;
`

const Title = styled.h2`
  font-size: 1.2em;
  margin-bottom: 1em;
  color: #333;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
`

const Th = styled.th`
  text-align: left;
  padding: 12px;
  background: #f5f5f5;
  border-bottom: 2px solid #e0e0e0;
  font-weight: 600;
  color: #333;
`

const Td = styled.td`
  padding: 12px;
  border-bottom: 1px solid #e0e0e0;
  vertical-align: top;
`

const Tr = styled.tr`
  cursor: pointer;

  &:hover {
    background: #f9f9f9;
  }
`

const LoadingMessage = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
`

const ErrorMessage = styled.div`
  text-align: center;
  padding: 40px;
  color: #d32f2f;
`

const EmptyMessage = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
`

const Pagination = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1em;
  padding: 10px 0;
`

const ThreadLink = styled.button`
  color: #0d79d0;
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: inherit;
  text-align: left;

  &:hover {
    text-decoration: underline;
  }
`

const MessagesContainer = styled.div`
  margin-top: 20px;
  padding: 20px;
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  max-height: 600px;
  overflow-y: auto;
`

const Message = styled.div<{ role: string }>`
  margin-bottom: 16px;
  padding: 12px;
  background: ${props => props.role === 'user' ? '#e3f2fd' : '#fff'};
  border: 1px solid ${props => props.role === 'user' ? '#90caf9' : '#e0e0e0'};
  border-radius: 6px;
`

const MessageRole = styled.div`
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  color: #666;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
`

const CollapseButton = styled.button`
  background: none;
  border: none;
  color: #0d79d0;
  cursor: pointer;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;

  &:hover {
    background: #e3f2fd;
  }
`

const MessageContent = styled.div<{ isCollapsed?: boolean }>`
  font-size: 14px;
  color: #333;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: ${props => props.isCollapsed ? '60px' : 'none'};
  overflow: ${props => props.isCollapsed ? 'hidden' : 'visible'};
  position: relative;

  ${props => props.isCollapsed && `
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 30px;
      background: linear-gradient(transparent, white);
    }
  `}
`

const MessageTokens = styled.div`
  font-size: 11px;
  color: #666;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  gap: 12px;
`

const TokenBadge = styled.span<{ type: 'input' | 'output' }>`
  background: ${props => props.type === 'input' ? '#e3f2fd' : '#f3e5f5'};
  color: ${props => props.type === 'input' ? '#1976d2' : '#7b1fa2'};
  padding: 2px 8px;
  border-radius: 3px;
  font-weight: 500;
`

const TokenBreakdown = styled.div`
  margin-top: 8px;
  padding: 8px;
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 11px;
`

const BreakdownItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  color: #666;

  &:not(:last-child) {
    border-bottom: 1px solid #f0f0f0;
  }
`

const BreakdownLabel = styled.span`
  font-weight: 500;
`

const BreakdownValue = styled.span`
  color: #333;
  font-family: monospace;
`

const ThreadStats = styled.div`
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
`

const StatLabel = styled.div`
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 4px;
`

const StatValue = styled.div`
  font-size: 20px;
  color: #333;
  font-weight: 600;
`

const BackButton = styled(Button)`
  margin-bottom: 12px;
`

const DeleteButton = styled.button`
  background: #d32f2f;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;

  &:hover {
    background: #b71c1c;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`

// Helper function to display user information
const formatUserDisplay = (item: any): string => {
  // Prefer email if available
  if (item.userEmail) {
    return item.userEmail
  }

  // Fall back to name if available
  if (item.userName) {
    return item.userName
  }

  // If no email/name, format the userId
  const userId = item.userId
  if (!userId) return 'anonymous'

  // Handle Auth0 user IDs like "google-oauth2|123456789"
  if (userId.includes('|')) {
    const [provider, id] = userId.split('|')
    const shortProvider = provider.replace('oauth2', '').replace('-', '')
    return `${shortProvider}|${id.substring(0, 8)}...`
  }

  // For other formats, show first 16 chars
  if (userId.length > 16) {
    return userId.substring(0, 16) + '...'
  }

  return userId
}

// Pricing per 1M tokens (in USD)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.5-flash': { input: 0.30, output: 2.50 },
  'gemini-2.5-pro': { input: 1.25, output: 10.00 },
  'gemini-3-flash': { input: 0.30, output: 2.50 },
  'gemini-3-pro': { input: 2.00, output: 12.00 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
}

// Calculate estimated cost for a thread
const calculateCost = (inputTokens: number, outputTokens: number, model?: string): number => {
  const pricing = model && MODEL_PRICING[model] ? MODEL_PRICING[model] : MODEL_PRICING['gemini-2.5-flash']
  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output
  return inputCost + outputCost
}

export const AllThreadsView = () => {
  const [threads, setThreads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null)
  const [collapsedMessages, setCollapsedMessages] = useState<Set<number>>(new Set())
  const limit = 20
  const { getAccessTokenSilently } = useAuth0()

  const toggleMessageCollapse = (index: number) => {
    setCollapsedMessages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  useEffect(() => {
    const fetchThreads = async () => {
      setLoading(true)
      try {
        const token = await getAccessTokenSilently()
        const response = await fetch(`/api/copilotkit/admin/threads?limit=${limit}&offset=${page * limit}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
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
  }, [page, getAccessTokenSilently])

  const handleThreadClick = async (threadId: string) => {
    setSelectedThreadId(threadId)
    setLoadingMessages(true)
    try {
      const token = await getAccessTokenSilently()
      const response = await fetch(`/api/copilotkit/admin/threads/${threadId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access to this thread is denied by user privacy settings.')
        }
        throw new Error('Failed to fetch messages')
      }
      const data = await response.json()
      setMessages(data)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleBackToList = () => {
    setSelectedThreadId(null)
    setMessages([])
    setCollapsedMessages(new Set())
  }

  // Collapse system messages by default when messages load
  useEffect(() => {
    if (messages.length > 0) {
      const systemMessageIndices = new Set(
        messages
          .map((msg, idx) => (msg.role === 'system' ? idx : -1))
          .filter(idx => idx !== -1)
      )
      setCollapsedMessages(systemMessageIndices)
    }
  }, [messages.length])

  const handleDeleteThread = async (threadId: string, event: React.MouseEvent) => {
    // Stop event propagation to prevent row click
    event.stopPropagation()

    setDeletingThreadId(threadId)
    try {
      const token = await getAccessTokenSilently()
      const response = await fetch(`/api/copilotkit/admin/threads/${threadId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error('Failed to delete thread')

      // Remove thread from local state
      setThreads(threads.filter(t => t.threadId !== threadId))
    } catch (err: any) {
      console.error('Failed to delete thread:', err.message)
    } finally {
      setDeletingThreadId(null)
    }
  }

  if (selectedThreadId && messages.length > 0) {
    const currentThread = threads.find(t => t.threadId === selectedThreadId)

    // Use thread-level token totals from the database (convert to numbers to avoid string concatenation)
    const totalInputTokens = parseInt(currentThread?.totalInputTokens) || 0
    const totalOutputTokens = parseInt(currentThread?.totalOutputTokens) || 0
    const totalRequestTokens = parseInt(currentThread?.totalRequestTokens) || 0
    const totalTokens = totalRequestTokens + totalOutputTokens
    const estimatedCost = calculateCost(totalRequestTokens, totalOutputTokens, currentThread?.model)

    return (
      <Container>
        <BackButton onClick={handleBackToList}>← Back to Threads List</BackButton>
        <Title>Thread: {currentThread?.title || selectedThreadId}</Title>

        <ThreadStats>
          <StatItem>
            <StatLabel>Total Messages</StatLabel>
            <StatValue>{messages.length}</StatValue>
          </StatItem>
          <StatItem>
            <StatLabel>Total Request Tokens</StatLabel>
            <StatValue style={{ color: '#1976d2' }}>{totalRequestTokens.toLocaleString()}</StatValue>
          </StatItem>
          <StatItem>
            <StatLabel>Output Tokens</StatLabel>
            <StatValue>{totalOutputTokens.toLocaleString()}</StatValue>
          </StatItem>
          <StatItem>
            <StatLabel>Total Tokens</StatLabel>
            <StatValue style={{ fontWeight: '700' }}>{totalTokens.toLocaleString()}</StatValue>
          </StatItem>
          <StatItem>
            <StatLabel>Estimated Cost</StatLabel>
            <StatValue style={{ fontSize: '16px', color: '#2e7d32' }}>${estimatedCost.toFixed(4)}</StatValue>
          </StatItem>
          <StatItem>
            <StatLabel>Model</StatLabel>
            <StatValue style={{ fontSize: '16px' }}>{currentThread?.model || 'N/A'}</StatValue>
          </StatItem>
        </ThreadStats>

        <MessagesContainer>
          {loadingMessages ? (
            <LoadingMessage>Loading messages...</LoadingMessage>
          ) : (
            messages.map((msg, idx) => {
              const isCollapsed = collapsedMessages.has(idx)
              const isSystemMessage = msg.role === 'system'
              const contentLength = (msg.content || '').length

              // Generate descriptive text for messages without content
              let displayContent = msg.content
              if (!displayContent) {
                if (msg.messageType === 'ActionExecutionMessage') {
                  displayContent = '[Tool call]'
                } else if (msg.messageType === 'ResultMessage') {
                  displayContent = '[Tool result]'
                } else {
                  displayContent = `[${msg.messageType || 'No content'}]`
                }
              }

              return (
                <Message key={idx} role={msg.role}>
                  <MessageRole>
                    {msg.role}
                    {isSystemMessage && contentLength > 200 && (
                      <CollapseButton onClick={() => toggleMessageCollapse(idx)}>
                        {isCollapsed ? '+ Expand' : '- Collapse'}
                      </CollapseButton>
                    )}
                  </MessageRole>
                  <MessageContent isCollapsed={isSystemMessage && isCollapsed && contentLength > 200}>
                    {displayContent}
                  </MessageContent>
                  {(msg.inputTokens > 0 || msg.outputTokens > 0) && (
                    <MessageTokens>
                      {msg.inputTokens > 0 && (
                        <TokenBadge type="input">
                          ↓ {msg.inputTokens.toLocaleString()} in
                        </TokenBadge>
                      )}
                      {msg.outputTokens > 0 && (
                        <TokenBadge type="output">
                          ↑ {msg.outputTokens.toLocaleString()} out
                        </TokenBadge>
                      )}
                      {(msg.inputTokens > 0 || msg.outputTokens > 0) && (
                        <span style={{ color: '#999', fontSize: '10px' }}>
                          (cost for this turn)
                        </span>
                      )}
                    </MessageTokens>
                  )}
                  {msg.role === 'user' && (msg.systemPromptTokens || msg.toolDefinitionTokens || msg.historyTokens || msg.userMessageTokens) && (
                    <TokenBreakdown>
                      <div style={{ marginBottom: '6px', fontWeight: '600', fontSize: '12px', color: '#333' }}>
                        Token Breakdown:
                      </div>
                      {msg.systemPromptTokens > 0 && (
                        <BreakdownItem>
                          <BreakdownLabel>System Prompt:</BreakdownLabel>
                          <BreakdownValue>{msg.systemPromptTokens.toLocaleString()}</BreakdownValue>
                        </BreakdownItem>
                      )}
                      {msg.toolDefinitionTokens > 0 && (
                        <BreakdownItem>
                          <BreakdownLabel>Tool Definitions:</BreakdownLabel>
                          <BreakdownValue>{msg.toolDefinitionTokens.toLocaleString()}</BreakdownValue>
                        </BreakdownItem>
                      )}
                      {msg.historyTokens > 0 && (
                        <BreakdownItem>
                          <BreakdownLabel>Conversation History:</BreakdownLabel>
                          <BreakdownValue>{msg.historyTokens.toLocaleString()}</BreakdownValue>
                        </BreakdownItem>
                      )}
                      {msg.userMessageTokens > 0 && (
                        <BreakdownItem>
                          <BreakdownLabel>User Message:</BreakdownLabel>
                          <BreakdownValue>{msg.userMessageTokens.toLocaleString()}</BreakdownValue>
                        </BreakdownItem>
                      )}
                      <BreakdownItem style={{ marginTop: '4px', paddingTop: '6px', borderTop: '2px solid #ddd', fontWeight: '600' }}>
                        <BreakdownLabel>Total Request:</BreakdownLabel>
                        <BreakdownValue>
                          {((msg.systemPromptTokens || 0) + (msg.toolDefinitionTokens || 0) + (msg.historyTokens || 0) + (msg.userMessageTokens || 0)).toLocaleString()}
                        </BreakdownValue>
                      </BreakdownItem>
                    </TokenBreakdown>
                  )}
                </Message>
              )
            })
          )}
        </MessagesContainer>
      </Container>
    )
  }

  if (loading) return <Container><LoadingMessage>Loading threads...</LoadingMessage></Container>
  if (error) return <Container><ErrorMessage>Error: {error}</ErrorMessage></Container>
  if (threads.length === 0) return <Container><EmptyMessage>No threads available.</EmptyMessage></Container>

  return (
    <Container>
      <Title>All User Conversations</Title>
      <Table>
        <thead>
          <tr>
            <Th>Title</Th>
            <Th>User</Th>
            <Th>Messages</Th>
            <Th>Tokens (In/Out)</Th>
            <Th>Total Request Tokens</Th>
            <Th>Total Tokens</Th>
            <Th>Est. Cost</Th>
            <Th>Model</Th>
            <Th>Last Updated</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {threads.map((thread) => {
            const inputTokens = parseInt(thread.totalInputTokens) || 0
            const outputTokens = parseInt(thread.totalOutputTokens) || 0
            const requestTokens = parseInt(thread.totalRequestTokens) || 0
            const totalTokens = requestTokens + outputTokens
            const cost = calculateCost(requestTokens, outputTokens, thread.model)

            return (
              <Tr key={thread.threadId} onClick={() => handleThreadClick(thread.threadId)}>
                <Td>
                  <ThreadLink as="div">
                    {thread.title || thread.threadId.substring(0, 16)}
                  </ThreadLink>
                </Td>
                <Td
                  style={{ fontSize: '13px', color: '#333' }}
                  title={thread.userEmail || thread.userName || thread.userId || 'anonymous'}
                >
                  {formatUserDisplay(thread)}
                </Td>
                <Td>{thread.messageCount}</Td>
                <Td style={{ fontSize: '12px', color: '#666' }}>
                  {inputTokens.toLocaleString()} / {outputTokens.toLocaleString()}
                </Td>
                <Td style={{ fontSize: '13px', color: '#1976d2', fontWeight: 500 }}>
                  {requestTokens.toLocaleString()}
                </Td>
                <Td style={{ fontSize: '13px', color: '#333', fontWeight: 500 }}>
                  {totalTokens.toLocaleString()}
                </Td>
                <Td style={{ fontSize: '13px', color: '#2e7d32', fontWeight: 500 }}>
                  ${cost.toFixed(4)}
                </Td>
                <Td style={{ fontSize: '13px' }}>{thread.model || 'N/A'}</Td>
                <Td style={{ fontSize: '13px' }}>{new Date(thread.updatedAt).toLocaleString()}</Td>
                <Td>
                  <DeleteButton
                    onClick={(e) => handleDeleteThread(thread.threadId, e)}
                    disabled={deletingThreadId === thread.threadId}
                  >
                    {deletingThreadId === thread.threadId ? 'Deleting...' : 'Delete'}
                  </DeleteButton>
                </Td>
              </Tr>
            )
          })}
        </tbody>
      </Table>
      <Pagination>
        <Button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
          Previous
        </Button>
        <span>Page {page + 1}</span>
        <Button onClick={() => setPage(p => p + 1)} disabled={threads.length < limit}>
          Next
        </Button>
      </Pagination>
    </Container>
  )
}
