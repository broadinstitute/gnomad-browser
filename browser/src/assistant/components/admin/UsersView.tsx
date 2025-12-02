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

const UserIdText = styled.span`
  font-family: monospace;
  font-size: 12px;
  color: #666;
`

// Helper function to format user IDs
const formatUserId = (userId: string): string => {
  if (userId.includes('|')) {
    const [provider, id] = userId.split('|')
    const shortProvider = provider.replace('oauth2', '').replace('-', '')
    return `${shortProvider}|${id.substring(0, 8)}...`
  }
  return userId.length > 20 ? userId.substring(0, 20) + '...' : userId
}

// Helper function to format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

export const UsersView = () => {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const limit = 20
  const { getAccessTokenSilently } = useAuth0()

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true)
      try {
        const token = await getAccessTokenSilently()
        const response = await fetch(`/api/copilotkit/users?limit=${limit}&offset=${page * limit}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (!response.ok) throw new Error('Failed to fetch users')
        const data = await response.json()
        setUsers(data)
        setError(null)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [page, getAccessTokenSilently])

  if (loading) return <LoadingMessage>Loading users...</LoadingMessage>
  if (error) return <ErrorMessage>Error: {error}</ErrorMessage>
  if (users.length === 0) return <EmptyMessage>No users found.</EmptyMessage>

  return (
    <Container>
      <Title>Registered Users</Title>
      <Table>
        <thead>
          <tr>
            <Th>Email</Th>
            <Th>Name</Th>
            <Th>User ID</Th>
            <Th>First Seen</Th>
            <Th>Last Seen</Th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <Tr key={user.userId}>
              <Td style={{ fontWeight: 500 }}>
                {user.email || <span style={{ color: '#999', fontStyle: 'italic' }}>No email</span>}
              </Td>
              <Td>{user.name || '-'}</Td>
              <Td>
                <UserIdText title={user.userId}>{formatUserId(user.userId)}</UserIdText>
              </Td>
              <Td style={{ fontSize: '13px', color: '#666' }}>
                {new Date(user.createdAt).toLocaleDateString()}
              </Td>
              <Td style={{ fontSize: '13px', color: '#666' }}>
                {formatRelativeTime(user.lastSeenAt)}
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
        <Button onClick={() => setPage(p => p + 1)} disabled={users.length < limit}>
          Next
        </Button>
      </Pagination>
    </Container>
  )
}
