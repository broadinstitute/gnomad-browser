import React, { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
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

const ClickCount = styled.div`
  font-weight: 600;
  color: #0d79d0;
`

export const InteractionAnalysisView = () => {
  const [stats, setStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getAccessTokenSilently } = useAuth0()

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      try {
        const token = await getAccessTokenSilently()
        const response = await fetch('/api/copilotkit/admin/stats/suggestions', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (!response.ok) throw new Error('Failed to fetch suggestion stats')
        const data = await response.json()
        setStats(data)
        setError(null)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [getAccessTokenSilently])

  if (loading) return <Container><LoadingMessage>Loading interaction data...</LoadingMessage></Container>
  if (error) return <Container><ErrorMessage>Error: {error}</ErrorMessage></Container>
  if (stats.length === 0) return <Container><EmptyMessage>No interaction data available yet.</EmptyMessage></Container>

  return (
    <Container>
      <Title>User Interaction Analysis</Title>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
        Most frequently clicked suggestion pills, helping understand which features users find most useful.
      </p>

      <Table>
        <thead>
          <tr>
            <Th>Rank</Th>
            <Th>Suggestion Title</Th>
            <Th>Suggestion Message</Th>
            <Th>Click Count</Th>
          </tr>
        </thead>
        <tbody>
          {stats.map((stat, idx) => (
            <tr key={idx}>
              <Td>{idx + 1}</Td>
              <Td style={{ fontWeight: 500 }}>{stat.suggestion_title || 'N/A'}</Td>
              <Td style={{ maxWidth: '400px' }}>{stat.suggestion_message || 'N/A'}</Td>
              <Td>
                <ClickCount>{stat.click_count}</ClickCount>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <p style={{ fontSize: '12px', color: '#666', marginTop: '20px' }}>
        Note: Suggestion click tracking is implemented but requires frontend instrumentation to capture events.
        Data will appear here once users start clicking suggestion pills.
      </p>
    </Container>
  )
}
