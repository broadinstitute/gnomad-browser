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

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`

const StatCard = styled.div`
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 16px;
`

const StatLabel = styled.div`
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
`

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 600;
  color: #333;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  margin-top: 16px;
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

const Section = styled.div`
  margin-bottom: 32px;
`

const SectionTitle = styled.h3`
  font-size: 1em;
  margin-bottom: 12px;
  color: #333;
`

// Model pricing per 1M tokens (based on provided pricing data)
// Using Gemini 2.5 pricing as reference
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.5-flash': { input: 0.30, output: 2.50 },
  'gemini-2.5-pro': { input: 1.25, output: 10.00 },
  'gemini-3-flash': { input: 0.30, output: 2.50 }, // Estimated
  'gemini-3-pro': { input: 2.00, output: 12.00 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
}

const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '0'
  return num.toLocaleString()
}

const calculateCost = (requestTokens: number, outputTokens: number, model: string): number => {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['gemini-2.5-flash']
  const inputCost = (requestTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output
  return inputCost + outputCost
}

export const UsageStatsView = () => {
  const [stats, setStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getAccessTokenSilently } = useAuth0()

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      try {
        const token = await getAccessTokenSilently()
        const response = await fetch('/api/copilotkit/admin/stats', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (!response.ok) throw new Error('Failed to fetch stats')
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

  if (loading) return <Container><LoadingMessage>Loading statistics...</LoadingMessage></Container>
  if (error) return <Container><ErrorMessage>Error: {error}</ErrorMessage></Container>

  // Calculate totals across all models
  const totals = stats.reduce(
    (acc, stat) => ({
      threads: acc.threads + parseInt(stat.total_threads || 0),
      users: acc.users + parseInt(stat.total_users || 0),
      messages: acc.messages + parseInt(stat.total_messages || 0),
      requestTokens: acc.requestTokens + parseInt(stat.total_request_tokens || 0),
      outputTokens: acc.outputTokens + parseInt(stat.total_output_tokens || 0),
    }),
    { threads: 0, users: 0, messages: 0, requestTokens: 0, outputTokens: 0 }
  )

  return (
    <Container>
      <Title>Usage & Cost Statistics</Title>

      <Section>
        <SectionTitle>Overall Usage</SectionTitle>
        <StatsGrid>
          <StatCard>
            <StatLabel>Total Threads</StatLabel>
            <StatValue>{formatNumber(totals.threads)}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Total Users</StatLabel>
            <StatValue>{formatNumber(totals.users)}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Total Messages</StatLabel>
            <StatValue>{formatNumber(totals.messages)}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Total Request Tokens</StatLabel>
            <StatValue>{formatNumber(totals.requestTokens)}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Output Tokens</StatLabel>
            <StatValue>{formatNumber(totals.outputTokens)}</StatValue>
          </StatCard>
        </StatsGrid>
      </Section>

      <Section>
        <SectionTitle>Usage by Model</SectionTitle>
        <Table>
          <thead>
            <tr>
              <Th>Model</Th>
              <Th>Threads</Th>
              <Th>Messages</Th>
              <Th>Total Request Tokens</Th>
              <Th>Output Tokens</Th>
              <Th>Est. Cost (USD)</Th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat, idx) => {
              const requestTokens = parseInt(stat.total_request_tokens || 0)
              const outputTokens = parseInt(stat.total_output_tokens || 0)
              const cost = calculateCost(requestTokens, outputTokens, stat.model || 'gemini-2.5-flash')

              return (
                <tr key={idx}>
                  <Td>{stat.model || 'Unknown'}</Td>
                  <Td>{formatNumber(stat.total_threads)}</Td>
                  <Td>{formatNumber(stat.total_messages)}</Td>
                  <Td>{formatNumber(requestTokens)}</Td>
                  <Td>{formatNumber(outputTokens)}</Td>
                  <Td>${cost.toFixed(4)}</Td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </Section>

      <Section>
        <SectionTitle>Token Breakdown by Model</SectionTitle>
        <Table>
          <thead>
            <tr>
              <Th>Model</Th>
              <Th>System Prompt</Th>
              <Th>Tool Definitions</Th>
              <Th>History</Th>
              <Th>User Message</Th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat, idx) => (
              <tr key={idx}>
                <Td>{stat.model || 'Unknown'}</Td>
                <Td>{formatNumber(stat.total_system_prompt_tokens)}</Td>
                <Td>{formatNumber(stat.total_tool_definition_tokens)}</Td>
                <Td>{formatNumber(stat.total_history_tokens)}</Td>
                <Td>{formatNumber(stat.total_user_message_tokens)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section>
        <SectionTitle>Pricing Reference</SectionTitle>
        <Table>
          <thead>
            <tr>
              <Th>Model</Th>
              <Th>Input (per 1M tokens)</Th>
              <Th>Output (per 1M tokens)</Th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(MODEL_PRICING).map(([model, pricing]) => (
              <tr key={model}>
                <Td>{model}</Td>
                <Td>${pricing.input.toFixed(2)}</Td>
                <Td>${pricing.output.toFixed(2)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '12px' }}>
          Note: Token usage data is only available after implementing token tracking in the backend.
          Costs are estimates based on Google Gemini API pricing.
        </p>
      </Section>
    </Container>
  )
}
