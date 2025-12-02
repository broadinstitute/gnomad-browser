import React from 'react'
import styled from 'styled-components'
import { Badge, Button, ExternalLink } from '@gnomad/ui'
import AttributeList, { AttributeListItem } from '../../../AttributeList'

const CardWrapper = styled.div`
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin: 10px 0;
  width: 100%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
`

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
`

const VariantTitle = styled.h3`
  margin: 0;
  font-size: 1.1em;
  font-weight: 600;
  color: #333;
`

const VariantSubtitle = styled.div`
  color: #666;
  font-size: 0.9em;
  margin-top: 5px;
`

const Section = styled.div`
  margin-top: 15px;
`

const SectionTitle = styled.h4`
  margin: 0 0 10px 0;
  font-size: 0.9em;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const FrequencyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin-top: 10px;
`

const FrequencyItem = styled.div`
  background: #f8f8f8;
  padding: 10px;
  border-radius: 4px;
`

const FrequencyLabel = styled.div`
  font-size: 0.8em;
  color: #666;
  margin-bottom: 2px;
`

const FrequencyValue = styled.div`
  font-size: 1.1em;
  font-weight: 600;
  color: #333;
`

const ActionBar = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
`

interface VariantData {
  variant_id: string
  reference_genome?: string
  chrom?: string
  pos?: number
  ref?: string
  alt?: string
  rsids?: string[]
  flags?: string[]
  exome?: {
    ac: number
    an: number
    af?: number
    homozygote_count: number
    hemizygote_count?: number
    faf95?: {
      popmax: number
      popmax_population: string
    }
    populations?: Array<{
      id: string
      ac: number
      an: number
      homozygote_count: number
    }>
  }
  genome?: {
    ac: number
    an: number
    af?: number
    homozygote_count: number
    hemizygote_count?: number
    faf95?: {
      popmax: number
      popmax_population: string
    }
    populations?: Array<{
      id: string
      ac: number
      an: number
      homozygote_count: number
    }>
  }
  transcript_consequences?: Array<{
    gene_id: string
    gene_symbol: string
    transcript_id: string
    consequence_terms: string[]
    major_consequence: string
    is_canonical: boolean
    hgvs?: string
    hgvsc?: string
    hgvsp?: string
    lof?: string
    lof_flags?: string
    lof_filter?: string
  }>
  in_silico_predictors?: Array<{
    id: string
    value: string
    flags?: string[]
  }>
}

interface VariantCardProps {
  variant: VariantData
  onViewDetails?: () => void
  onNavigateToVariant?: () => void
}

const formatFrequency = (frequency: number): string => {
  if (frequency === 0) return '0'
  if (frequency < 0.00001) return frequency.toExponential(2)
  return frequency.toFixed(5)
}

const calculateAF = (ac: number, an: number): number => {
  return an > 0 ? ac / an : 0
}

const VariantCard: React.FC<VariantCardProps> = ({ 
  variant, 
  onViewDetails, 
  onNavigateToVariant 
}) => {
  console.log('VariantCard received variant:', variant)
  console.log('variant.transcript_consequences:', variant.transcript_consequences)
  console.log('variant.variant_id:', variant.variant_id)
  console.log('variant.variantId:', variant.variantId)
  
  // Get the first canonical transcript or the first transcript
  const canonicalTranscript = variant.transcript_consequences?.find(t => t.is_canonical) || variant.transcript_consequences?.[0]
  
  // Calculate allele frequencies
  const exomeAF = variant.exome ? calculateAF(variant.exome.ac, variant.exome.an) : undefined
  const genomeAF = variant.genome ? calculateAF(variant.genome.ac, variant.genome.an) : undefined
  
  // Determine which frequency data to display
  const hasExomeData = variant.exome && variant.exome.an > 0
  const hasGenomeData = variant.genome && variant.genome.an > 0

  return (
    <CardWrapper>
      <CardHeader>
        <div>
          <VariantTitle>{variant.variant_id}</VariantTitle>
          <VariantSubtitle>
            {canonicalTranscript?.gene_symbol && (
              <>
                {canonicalTranscript.gene_symbol}
                {canonicalTranscript.major_consequence && ` • ${canonicalTranscript.major_consequence.replace(/_/g, ' ')}`}
              </>
            )}
          </VariantSubtitle>
        </div>
        {variant.flags && variant.flags.length > 0 && (
          <div>
            {variant.flags.map((flag) => (
              <Badge key={flag} level="warning" style={{ marginLeft: 5 }}>
                {flag}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <AttributeList>
        {canonicalTranscript?.hgvsp && (
          <AttributeListItem label="HGVSp">
            {canonicalTranscript.hgvsp}
          </AttributeListItem>
        )}
        {canonicalTranscript?.hgvsc && (
          <AttributeListItem label="HGVSc">
            {canonicalTranscript.hgvsc}
          </AttributeListItem>
        )}
        {variant.rsids && variant.rsids.length > 0 && (
          <AttributeListItem label="rsID">
            {variant.rsids.map((rsid, index) => (
              <React.Fragment key={rsid}>
                {index > 0 && ', '}
                <ExternalLink href={`https://www.ncbi.nlm.nih.gov/snp/${rsid}`}>
                  {rsid}
                </ExternalLink>
              </React.Fragment>
            ))}
          </AttributeListItem>
        )}
      </AttributeList>

      {(hasExomeData || hasGenomeData) && (
        <Section>
          <SectionTitle>Allele Frequency</SectionTitle>
          <FrequencyGrid>
            {hasExomeData && (
              <>
                <FrequencyItem>
                  <FrequencyLabel>Exome AF</FrequencyLabel>
                  <FrequencyValue>{formatFrequency(exomeAF!)}</FrequencyValue>
                </FrequencyItem>
                <FrequencyItem>
                  <FrequencyLabel>Exome AC/AN</FrequencyLabel>
                  <FrequencyValue>
                    {variant.exome!.ac} / {variant.exome!.an}
                  </FrequencyValue>
                </FrequencyItem>
                {variant.exome!.homozygote_count !== undefined && (
                  <FrequencyItem>
                    <FrequencyLabel>Exome Homozygotes</FrequencyLabel>
                    <FrequencyValue>{variant.exome!.homozygote_count}</FrequencyValue>
                  </FrequencyItem>
                )}
              </>
            )}
            {hasGenomeData && (
              <>
                <FrequencyItem>
                  <FrequencyLabel>Genome AF</FrequencyLabel>
                  <FrequencyValue>{formatFrequency(genomeAF!)}</FrequencyValue>
                </FrequencyItem>
                <FrequencyItem>
                  <FrequencyLabel>Genome AC/AN</FrequencyLabel>
                  <FrequencyValue>
                    {variant.genome!.ac} / {variant.genome!.an}
                  </FrequencyValue>
                </FrequencyItem>
                {variant.genome!.homozygote_count !== undefined && (
                  <FrequencyItem>
                    <FrequencyLabel>Genome Homozygotes</FrequencyLabel>
                    <FrequencyValue>{variant.genome!.homozygote_count}</FrequencyValue>
                  </FrequencyItem>
                )}
              </>
            )}
          </FrequencyGrid>
          
          {/* Display FAF if available */}
          {(variant.exome?.faf95 || variant.genome?.faf95) && (
            <FrequencyGrid style={{ marginTop: '10px' }}>
              {variant.exome?.faf95 && (
                <FrequencyItem>
                  <FrequencyLabel>Exome FAF95 ({variant.exome.faf95.popmax_population})</FrequencyLabel>
                  <FrequencyValue>{formatFrequency(variant.exome.faf95.popmax)}</FrequencyValue>
                </FrequencyItem>
              )}
              {variant.genome?.faf95 && (
                <FrequencyItem>
                  <FrequencyLabel>Genome FAF95 ({variant.genome.faf95.popmax_population})</FrequencyLabel>
                  <FrequencyValue>{formatFrequency(variant.genome.faf95.popmax)}</FrequencyValue>
                </FrequencyItem>
              )}
            </FrequencyGrid>
          )}
        </Section>
      )}

      {variant.in_silico_predictors && variant.in_silico_predictors.length > 0 && (
        <Section>
          <SectionTitle>In Silico Predictors</SectionTitle>
          <AttributeList>
            {variant.in_silico_predictors.map((predictor) => (
              <AttributeListItem key={predictor.id} label={predictor.id.toUpperCase()}>
                {predictor.value}
                {predictor.flags && predictor.flags.length > 0 && (
                  <span style={{ marginLeft: '10px' }}>
                    {predictor.flags.map((flag) => (
                      <Badge key={flag} level="info" style={{ marginLeft: 5 }}>
                        {flag}
                      </Badge>
                    ))}
                  </span>
                )}
              </AttributeListItem>
            ))}
          </AttributeList>
        </Section>
      )}

      <ActionBar>
        {onNavigateToVariant && (
          <Button onClick={onNavigateToVariant}>
            View in Browser
          </Button>
        )}
        {onViewDetails && (
          <Button variant="ghost" onClick={onViewDetails}>
            More Details
          </Button>
        )}
      </ActionBar>
    </CardWrapper>
  )
}

export default VariantCard