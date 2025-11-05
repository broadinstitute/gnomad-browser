import React from 'react'
import styled, { keyframes } from 'styled-components'

const pulse = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
`

const LoadingWrapper = styled.div`
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin: 10px 0;
  width: 100%;
  max-width: 600px;
`

const SkeletonHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
`

const SkeletonTitle = styled.div`
  height: 24px;
  width: 200px;
  background-color: #e0e0e0;
  border-radius: 4px;
  animation: ${pulse} 1.5s ease-in-out infinite;
`

const SkeletonSubtitle = styled.div`
  height: 18px;
  width: 150px;
  background-color: #e0e0e0;
  border-radius: 4px;
  margin-top: 8px;
  animation: ${pulse} 1.5s ease-in-out infinite;
`

const SkeletonBadge = styled.div`
  height: 24px;
  width: 60px;
  background-color: #e0e0e0;
  border-radius: 4px;
  animation: ${pulse} 1.5s ease-in-out infinite;
`

const SkeletonContent = styled.div`
  margin-top: 20px;
`

const SkeletonLine = styled.div<{ width?: string }>`
  height: 16px;
  width: ${props => props.width || '100%'};
  background-color: #e0e0e0;
  border-radius: 4px;
  margin-bottom: 12px;
  animation: ${pulse} 1.5s ease-in-out infinite;
`

const SkeletonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 15px;
`

const SkeletonBox = styled.div`
  height: 60px;
  background-color: #f5f5f5;
  border-radius: 4px;
  padding: 10px;
  animation: ${pulse} 1.5s ease-in-out infinite;
`

const LoadingMessage = styled.div`
  text-align: center;
  color: #666;
  font-size: 0.9em;
  margin-top: 15px;
`

interface VariantLoadingProps {
  message?: string
}

const VariantLoading: React.FC<VariantLoadingProps> = ({ message = 'Loading variant data...' }) => {
  return (
    <LoadingWrapper>
      <SkeletonHeader>
        <div>
          <SkeletonTitle />
          <SkeletonSubtitle />
        </div>
        <SkeletonBadge />
      </SkeletonHeader>
      
      <SkeletonContent>
        <SkeletonLine width="80%" />
        <SkeletonLine width="60%" />
        <SkeletonLine width="70%" />
        
        <SkeletonGrid>
          <SkeletonBox />
          <SkeletonBox />
          <SkeletonBox />
        </SkeletonGrid>
      </SkeletonContent>
      
      <LoadingMessage>{message}</LoadingMessage>
    </LoadingWrapper>
  )
}

export default VariantLoading