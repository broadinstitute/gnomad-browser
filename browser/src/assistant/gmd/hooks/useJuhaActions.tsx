import React from 'react'
import { useCopilotAction } from '@copilotkit/react-core'
import JuhaToolsDisplay, { JuhaToolsLoading } from '../components/JuhaToolsDisplay'
import { useToolResult } from '../../hooks/useToolResult'

// Convert to a proper React component so hooks work correctly
const JuhaRenderComponent: React.FC<{ props: any; loadingMessage: string; toolName: string }> = ({
  props,
  loadingMessage,
  toolName
}) => {
  const { status } = props
  const { data: resolvedData, isLoading, error } = useToolResult(props.result)

  if (status === 'executing' || isLoading) {
    return <JuhaToolsLoading message={loadingMessage} />
  }

  if (error) {
    return <div>Error: {error.message}</div>
  }

  if (status === 'complete' && resolvedData) {
    // The 'results' key is added by our backend standard
    return <JuhaToolsDisplay data={resolvedData.results} toolName={toolName} />
  }

  return null
}

export function useJuhaActions() {
  useCopilotAction({
    name: "get_juha_credible_sets_by_variant",
    description: "Fetches GWAS, eQTL, and pQTL credible sets for a specific variant from the Juha API.",
    parameters: [
      { name: 'variant_id', type: 'string', required: true, description: "The ID of the variant (e.g., '1-55516888-G-GA')." },
    ],
    handler: async (args) => args,
    render: (props) => <JuhaRenderComponent props={props} loadingMessage="Fetching credible sets by variant..." toolName="credible sets" />,
  })

  useCopilotAction({
    name: "get_juha_credible_sets_by_gene",
    description: "Fetches credible sets within the genomic region of a given gene from the Juha API.",
    parameters: [
      { name: 'gene_symbol', type: 'string', required: true, description: "The official symbol of the gene (e.g., 'PCSK9')." },
    ],
    handler: async (args) => args,
    render: (props) => <JuhaRenderComponent props={props} loadingMessage="Fetching credible sets by gene..." toolName="credible sets" />,
  })

  useCopilotAction({
    name: "get_juha_credible_sets_by_region",
    description: "Fetches credible sets within a specified genomic region (e.g., 'chr1:1000-2000') from the Juha API.",
    parameters: [
        { name: 'region', type: 'string', required: true, description: "The genomic region in the format 'chr:start-end'." },
    ],
    handler: async (args) => args,
    render: (props) => <JuhaRenderComponent props={props} loadingMessage="Fetching credible sets by region..." toolName="credible sets" />,
  })

  useCopilotAction({
    name: "get_juha_qtls_by_gene",
    description: "Fetches genome-wide QTL credible sets where the specified gene is the target from the Juha API.",
    parameters: [
        { name: 'gene_symbol', type: 'string', required: true, description: "The official symbol of the gene (e.g., 'APOE')." },
    ],
    handler: async (args) => args,
    render: (props) => <JuhaRenderComponent props={props} loadingMessage="Fetching QTLs by gene..." toolName="QTLs" />,
  });

  useCopilotAction({
    name: "get_juha_colocalization_by_variant",
    description: "Fetches colocalization data to see which traits share a causal variant at a variant's locus from the Juha API.",
    parameters: [
        { name: 'variant_id', type: 'string', required: true, description: "The ID of the variant (e.g., '1-55516888-G-GA')." },
    ],
    handler: async (args) => args,
    render: (props) => <JuhaRenderComponent props={props} loadingMessage="Fetching colocalization data..." toolName="colocalization results" />,
  });

  useCopilotAction({
    name: "get_juha_gene_disease_associations",
    description: "Fetches curated gene-to-disease associations from the Juha API.",
    parameters: [
        { name: 'gene_symbol', type: 'string', required: true, description: "The official symbol of the gene (e.g., 'CFTR')." },
    ],
    handler: async (args) => args,
    render: (props) => <JuhaRenderComponent props={props} loadingMessage="Fetching gene-disease associations..." toolName="gene-disease associations" />,
  });
}
