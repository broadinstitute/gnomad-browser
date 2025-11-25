import React from 'react'
import { useCopilotAction } from '@copilotkit/react-core'
import JuhaToolsDisplay, { JuhaToolsLoading } from '../components/JuhaToolsDisplay'

// Helper to parse result if it's a JSON string (from restored messages)
const parseResultIfNeeded = (result: any): any => {
  if (typeof result === 'string') {
    try {
      return JSON.parse(result)
    } catch (e) {
      console.warn('Failed to parse result string:', e)
      return result
    }
  }
  return result
}

export function useJuhaActions() {
  useCopilotAction({
    name: "get_juha_credible_sets_by_variant",
    description: "Fetches GWAS, eQTL, and pQTL credible sets for a specific variant from the Juha API.",
    parameters: [
      { name: 'variant_id', type: 'string', required: true, description: "The ID of the variant (e.g., '1-55516888-G-GA')." },
    ],
    handler: async (args) => args,
    render: (props) => {
      const { status, result } = props
      if (status === 'executing') return <JuhaToolsLoading message="Fetching credible sets by variant..." />
      if (status === 'complete') {
        // Parse result if it's a JSON string (from restored messages)
        const parsedResult = parseResultIfNeeded(result)

        // Debug logging
        console.log('[Juha] Credible sets by variant - Full result:', parsedResult)
        console.log('[Juha] Credible sets by variant - structuredContent:', parsedResult?.structuredContent)
        console.log('[Juha] Credible sets by variant - result type:', typeof parsedResult)
        console.log('[Juha] Credible sets by variant - result keys:', parsedResult ? Object.keys(parsedResult) : 'null')

        // Extract structured content from MCP response
        const data = parsedResult?.structuredContent || parsedResult
        return <JuhaToolsDisplay data={data} toolName="credible sets" />
      }
      return null
    },
  })

  useCopilotAction({
    name: "get_juha_credible_sets_by_gene",
    description: "Fetches credible sets within the genomic region of a given gene from the Juha API.",
    parameters: [
      { name: 'gene_symbol', type: 'string', required: true, description: "The official symbol of the gene (e.g., 'PCSK9')." },
    ],
    handler: async (args) => args,
    render: (props) => {
      const { status, result } = props
      if (status === 'executing') return <JuhaToolsLoading message="Fetching credible sets by gene..." />
      if (status === 'complete') {
        const parsedResult = parseResultIfNeeded(result)
        const data = parsedResult?.structuredContent || parsedResult
        return <JuhaToolsDisplay data={data} toolName="credible sets" />
      }
      return null
    },
  })

  useCopilotAction({
    name: "get_juha_credible_sets_by_region",
    description: "Fetches credible sets within a specified genomic region (e.g., 'chr1:1000-2000') from the Juha API.",
    parameters: [
        { name: 'region', type: 'string', required: true, description: "The genomic region in the format 'chr:start-end'." },
    ],
    handler: async (args) => args,
    render: (props) => {
      const { status, result } = props
      if (status === 'executing') return <JuhaToolsLoading message="Fetching credible sets by region..." />
      if (status === 'complete') {
        const parsedResult = parseResultIfNeeded(result)
        const data = parsedResult?.structuredContent || parsedResult
        return <JuhaToolsDisplay data={data} toolName="credible sets" />
      }
      return null
    },
  })

  useCopilotAction({
    name: "get_juha_qtls_by_gene",
    description: "Fetches genome-wide QTL credible sets where the specified gene is the target from the Juha API.",
    parameters: [
        { name: 'gene_symbol', type: 'string', required: true, description: "The official symbol of the gene (e.g., 'APOE')." },
    ],
    handler: async (args) => args,
    render: (props) => {
        const { status, result } = props;
        if (status === 'executing') return <JuhaToolsLoading message="Fetching QTLs by gene..." />;
        if (status === 'complete') {
          const parsedResult = parseResultIfNeeded(result)
          const data = parsedResult?.structuredContent || parsedResult
          return <JuhaToolsDisplay data={data} toolName="QTLs" />;
        }
        return null;
    },
  });

  useCopilotAction({
    name: "get_juha_colocalization_by_variant",
    description: "Fetches colocalization data to see which traits share a causal variant at a variant's locus from the Juha API.",
    parameters: [
        { name: 'variant_id', type: 'string', required: true, description: "The ID of the variant (e.g., '1-55516888-G-GA')." },
    ],
    handler: async (args) => args,
    render: (props) => {
        const { status, result } = props;
        if (status === 'executing') return <JuhaToolsLoading message="Fetching colocalization data..." />;
        if (status === 'complete') {
          // Extract structured content from MCP response
          const data = result?.structuredContent || result
          return <JuhaToolsDisplay data={data} toolName="colocalization results" />;
        }
        return null;
    },
  });

  useCopilotAction({
    name: "get_juha_gene_disease_associations",
    description: "Fetches curated gene-to-disease associations from the Juha API.",
    parameters: [
        { name: 'gene_symbol', type: 'string', required: true, description: "The official symbol of the gene (e.g., 'CFTR')." },
    ],
    handler: async (args) => args,
    render: (props) => {
        const { status, result } = props;
        if (status === 'executing') return <JuhaToolsLoading message="Fetching gene-disease associations..." />;
        if (status === 'complete') {
          // Extract structured content from MCP response
          const data = result?.structuredContent || result
          return <JuhaToolsDisplay data={data} toolName="gene-disease associations" />;
        }
        return null;
    },
  });
}
