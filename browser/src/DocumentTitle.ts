import PropTypes from 'prop-types'
import { useEffect } from 'react'
import { useCopilotReadable } from '@copilotkit/react-core'

const DocumentTitle = ({ title, pageContext }: any) => {
  useEffect(() => {
    const fullTitle = title ? `${title} | gnomAD` : 'gnomAD'
    document.title = fullTitle
  }, [title])

  let contextDescription = 'The current page context'
  let contextValue = 'No context is available for the current page.'

  if (pageContext) {
    if (pageContext.gene_id && pageContext.symbol) {
      contextDescription = 'The currently viewed gene'
      const geneContext = {
        gene_id: pageContext.gene_id,
        symbol: pageContext.symbol,
        name: pageContext.name,
        reference_genome: pageContext.reference_genome,
      }
      contextValue = JSON.stringify(geneContext, null, 2)
    } else if (pageContext.variant_id) {
      contextDescription = 'The currently viewed variant'
      const variantContext = {
        variant_id: pageContext.variant_id,
        reference_genome: pageContext.reference_genome,
        caid: pageContext.caid,
        rsids: pageContext.rsids,
      }
      contextValue = JSON.stringify(variantContext, null, 2)
    } else {
      // Fallback for other contexts that might be passed
      contextValue = JSON.stringify(pageContext, null, 2)
    }
  }

  useCopilotReadable({
    description: contextDescription,
    value: contextValue,
  })

  return null
}

DocumentTitle.propTypes = {
  title: PropTypes.string,
  pageContext: PropTypes.object,
}

DocumentTitle.defaultProps = {
  title: null,
  pageContext: null,
}

export default DocumentTitle
