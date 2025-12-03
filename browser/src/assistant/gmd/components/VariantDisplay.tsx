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

  // With the new hooks, `data` is the clean payload (variant object or array)
  const variants = Array.isArray(data) ? data : [data]

  if (variants.length === 0 || variants[0] === null) {
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