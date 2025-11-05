import React, { useState } from "react";
import { useCopilotAction } from "@copilotkit/react-core";
import styled from 'styled-components';

const ToolStateContainer = styled.div<{ isExecuting: boolean }>`
  border: 1px solid ${props => props.isExecuting ? '#007bff' : '#28a745'};
  border-radius: 8px;
  padding: 16px;
  margin: 8px 0;
  background: ${props => props.isExecuting ? '#f0f8ff' : '#f8fff8'};
  transition: all 0.3s ease;
`;

const ToolHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const StatusIcon = styled.div<{ isExecuting: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.isExecuting ? '#e3f2fd' : '#e8f5e8'};
  margin-top: 4px;
`;

const StatusIndicator = styled.div`
  width: 12px;
  height: 12px;
  background: #007bff;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
`;

const CheckIcon = styled.svg`
  width: 16px;
  height: 16px;
  color: #28a745;
`;

const ToolContent = styled.div`
  flex: 1;
`;

const ToolTitle = styled.h4<{ isExecuting: boolean }>`
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: ${props => props.isExecuting ? '#0056b3' : '#155724'};
`;

const StatusLine = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #6c757d;
  margin-bottom: 4px;
`;

const StatusArrow = styled.span`
  color: #adb5bd;
`;

const StatusText = styled.span`
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
`;

const ParametersToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  font-size: 12px;
  color: #6c757d;
  cursor: pointer;
  padding: 4px 0;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  
  &:hover {
    color: #495057;
  }
`;

const ChevronIcon = styled.svg<{ expanded: boolean }>`
  width: 12px;
  height: 12px;
  transition: transform 0.2s ease;
  transform: ${props => props.expanded ? 'rotate(90deg)' : 'rotate(0deg)'};
`;

const ParametersContent = styled.pre`
  margin: 8px 0 0 24px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 11px;
  overflow-x: auto;
  border: 1px solid #e9ecef;
`;

const ProcessingLine = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #6c757d;
  animation: pulse 1.5s ease-in-out infinite;
`;

const SuccessLine = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #28a745;
`;

const SuccessIcon = styled.span`
  color: #28a745;
`;

interface ToolStateDisplayProps {
  name: string;
  status: string;
  args: any;
}

function ToolStateDisplay({ name, status, args }: ToolStateDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isExecuting = status === "executing";
  const isComplete = status === "complete";

  return (
    <ToolStateContainer isExecuting={isExecuting}>
      <ToolHeader>
        <StatusIcon isExecuting={isExecuting}>
          {isExecuting ? (
            <StatusIndicator />
          ) : (
            <CheckIcon fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </CheckIcon>
          )}
        </StatusIcon>
        <ToolContent>
          <ToolTitle isExecuting={isExecuting}>
            Tool: {name}
          </ToolTitle>
          
          {isExecuting && (
            <>
              <StatusLine>
                <StatusArrow>›</StatusArrow>
                <StatusText>Calling MCP server...</StatusText>
              </StatusLine>
              <StatusLine>
                <ParametersToggle onClick={() => setIsExpanded(!isExpanded)}>
                  <StatusArrow>›</StatusArrow>
                  <StatusText>Parameters</StatusText>
                  <ChevronIcon expanded={isExpanded} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </ChevronIcon>
                </ParametersToggle>
              </StatusLine>
              {isExpanded && (
                <ParametersContent>
                  {args ? JSON.stringify(args, null, 2) : "No parameters"}
                </ParametersContent>
              )}
              <ProcessingLine>
                <StatusArrow>›</StatusArrow>
                <StatusText>Processing request...</StatusText>
              </ProcessingLine>
            </>
          )}
          
          {isComplete && (
            <>
              <SuccessLine>
                <SuccessIcon>✓</SuccessIcon>
                <StatusText>Tool completed successfully</StatusText>
              </SuccessLine>
              <StatusLine>
                <ParametersToggle onClick={() => setIsExpanded(!isExpanded)}>
                  <StatusArrow>›</StatusArrow>
                  <StatusText>Parameters</StatusText>
                  <ChevronIcon expanded={isExpanded} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </ChevronIcon>
                </ParametersToggle>
              </StatusLine>
              {isExpanded && (
                <ParametersContent>
                  {args ? JSON.stringify(args, null, 2) : "No parameters"}
                </ParametersContent>
              )}
            </>
          )}
        </ToolContent>
      </ToolHeader>
    </ToolStateContainer>
  );
}

export function useMCPStateRender() {
  // Catch all tool calls including MCP tools
  useCopilotAction({
    name: "*",
    description: "Monitor all tool calls",
    render: ({ name, status, args }) => {
      // Show for both executing and complete status
      if (status === "idle") {
        return null;
      }

      // Render inline tool state
      return <ToolStateDisplay name={name} status={status} args={args} />;
    },
  });
}