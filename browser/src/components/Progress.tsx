"use client";

import React from "react";
import styled from 'styled-components';

interface ProgressProps {
  logs: string[];
}

const ProgressContainer = styled.div`
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
`;

const ProgressHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`;

const StatusIndicator = styled.div`
  width: 8px;
  height: 8px;
  background: #28a745;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const ProgressTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: #495057;
  margin: 0;
`;

const LogsContainer = styled.div`
  max-height: 256px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const LogEntry = styled.div`
  font-size: 12px;
  color: #6c757d;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  background: white;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #e9ecef;
`;

const LogIndex = styled.span`
  color: #adb5bd;
  margin-right: 8px;
`;

const EmptyState = styled.p`
  font-size: 12px;
  color: #6c757d;
  font-style: italic;
  margin: 0;
`;

export function Progress({ logs }: ProgressProps) {
  return (
    <ProgressContainer>
      <ProgressHeader>
        <StatusIndicator />
        <ProgressTitle>MCP Tool Activity</ProgressTitle>
      </ProgressHeader>
      
      <LogsContainer>
        {logs.map((log, index) => (
          <LogEntry key={index}>
            <LogIndex>[{index + 1}]</LogIndex>
            {log}
          </LogEntry>
        ))}
      </LogsContainer>
      
      {logs.length === 0 && (
        <EmptyState>No tool activity yet...</EmptyState>
      )}
    </ProgressContainer>
  );
}