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

const ThreadLink = styled.a`
  color: #0d79d0;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
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

export const ChatFeedbackView = () => {
  const [feedback, setFeedback] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const limit = 20
  const { getAccessTokenSilently } = useAuth0()

  useEffect(() => {
    const fetchFeedback = async () => {
      setLoading(true)
      try {
        const token = await getAccessTokenSilently()
        const response = await fetch(`/api/copilotkit/feedback?limit=${limit}&offset=${page * limit}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (!response.ok) throw new Error('Failed to fetch feedback')
        const data = await response.json()
        setFeedback(data)
        setError(null)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchFeedback()
  }, [page, getAccessTokenSilently])

  if (loading) return <LoadingMessage>Loading feedback...</LoadingMessage>
  if (error) return <ErrorMessage>Error: {error}</ErrorMessage>
  if (feedback.length === 0) return <EmptyMessage>No feedback submitted yet.</EmptyMessage>

  return (
    <Container>
      <Title>User Feedback</Title>
      <Table>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Source</Th>
            <Th>Rating</Th>
            <Th>Feedback</Th>
            <Th>Thread</Th>
            <Th>User</Th>
          </tr>
        </thead>
        <tbody>
          {feedback.map((item) => (
            <Tr key={item.id}>
              <Td>{new Date(item.createdAt).toLocaleString()}</Td>
              <Td>{item.source}</Td>
              <Td>{item.rating === 1 ? '👍' : item.rating === -1 ? '👎' : 'N/A'}</Td>
              <Td style={{ maxWidth: '300px', wordBreak: 'break-word' }}>
                {item.feedbackText || '-'}
              </Td>
              <Td>
                {item.threadId ? (
                  <ThreadLink href={`#thread=${item.threadId}`}>
                    {item.threadTitle || item.threadId.substring(0, 8)}
                  </ThreadLink>
                ) : (
                  '-'
                )}
              </Td>
              <Td
                style={{ fontSize: '13px', color: '#333' }}
                title={item.userEmail || item.userName || item.userId || 'anonymous'}
              >
                {formatUserDisplay(item)}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      <Pagination>
        <Button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
          Previous
        </Button>
        <span>Page {page + 1}</span>
        <Button onClick={() => setPage(p => p + 1)} disabled={feedback.length < limit}>
          Next
        </Button>
      </Pagination>
    </Container>
  )
}
