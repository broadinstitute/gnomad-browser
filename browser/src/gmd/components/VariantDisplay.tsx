import React from 'react'
import styled from 'styled-components'
import { useHistory } from 'react-router-dom'
import VariantCard from './VariantCard'

const DisplayWrapper = styled.div`
  width: 100%;
  max-width: 600px;
`

const ErrorMessage = styled.div`
  padding: 20px;
  background-color: #ffebee;
  border: 1px solid #ffcdd2;
  border-radius: 4px;
  color: #c62828;
`

const NoResultsMessage = styled.div`
  padding: 20px;
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  color: #666;
  text-align: center;
`

const VariantListHeader = styled.div`
  margin-bottom: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #e0e0e0;
`

const ResultCount = styled.div`
  font-size: 0.9em;
  color: #666;
  font-weight: 600;
`

interface VariantDisplayProps {
  data: any
}

const VariantDisplay: React.FC<VariantDisplayProps> = ({ data }) => {
  const history = useHistory()
  
  console.log('VariantDisplay received data:', data)
  console.log('Data type:', typeof data)
  console.log('Data keys:', data ? Object.keys(data) : 'no data')
  if (data && typeof data === 'object') {
    console.log('Data stringified:', JSON.stringify(data, null, 2))
  }

  // Handle error cases
  if (!data) {
    return (
      <DisplayWrapper>
        <NoResultsMessage>
          No data available
        </NoResultsMessage>
      </DisplayWrapper>
    )
  }

  if (data.error) {
    return (
      <DisplayWrapper>
        <ErrorMessage>
          Error: {data.error}
        </ErrorMessage>
      </DisplayWrapper>
    )
  }

  // Handle CopilotKit's wrapped response format
  let processedData = data

  // If data is an array with text objects (CopilotKit format)
  if (Array.isArray(data) && data.length > 0 && data[0].type === 'text' && data[0].text) {
    const textContent = data[0].text

    // Check if the text is JSON or a text description
    if (textContent.trim().startsWith('{') || textContent.trim().startsWith('[')) {
      try {
        // Try to parse as JSON
        processedData = JSON.parse(textContent)
        console.log('Parsed variant data:', processedData)
      } catch (error) {
        console.error('Failed to parse variant data:', error)
        return (
          <DisplayWrapper>
            <ErrorMessage>
              Error parsing variant data
            </ErrorMessage>
          </DisplayWrapper>
        )
      }
    } else {
      // It's a text description, display it as-is
      return (
        <DisplayWrapper>
          <div style={{ whiteSpace: 'pre-wrap', padding: '16px', fontFamily: 'monospace', fontSize: '14px' }}>
            {textContent}
          </div>
        </DisplayWrapper>
      )
    }
  }

  // Determine if we have a single variant or multiple variants
  const variants = Array.isArray(processedData) ? processedData : (processedData.variants || [processedData])
  console.log('Processed variants:', variants)
  
  if (variants.length === 0) {
    return (
      <DisplayWrapper>
        <NoResultsMessage>
          No variants found
        </NoResultsMessage>
      </DisplayWrapper>
    )
  }

  const handleNavigateToVariant = (variantId: string, referenceGenome?: string) => {
    // Navigate to the variant page
    // The route structure is typically /variant/{variantId}?dataset={datasetId}
    // Map reference genome to dataset ID
    let dataset = 'gnomad_r4'
    if (referenceGenome === 'GRCh37') {
      dataset = 'gnomad_r2_1_1'
    } else if (referenceGenome === 'GRCh38') {
      dataset = 'gnomad_r4'
    }
    history.push(`/variant/${variantId}?dataset=${dataset}`)
  }

  // Single variant display
  if (variants.length === 1) {
    const variant = variants[0]
    return (
      <DisplayWrapper>
        <VariantCard
          variant={variant}
          onNavigateToVariant={() => handleNavigateToVariant(variant.variant_id || variant.variantId, variant.reference_genome)}
        />
      </DisplayWrapper>
    )
  }

  // Multiple variants display
  return (
    <DisplayWrapper>
      <VariantListHeader>
        <ResultCount>
          Found {variants.length} variant{variants.length !== 1 ? 's' : ''}
        </ResultCount>
      </VariantListHeader>
      {variants.map((variant: any, index: number) => (
        <VariantCard
          key={variant.variant_id || variant.variantId || index}
          variant={variant}
          onNavigateToVariant={() => handleNavigateToVariant(variant.variant_id || variant.variantId, variant.reference_genome)}
        />
      ))}
    </DisplayWrapper>
  )
}

export default VariantDisplay