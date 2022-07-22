import React from 'react'

import { Badge } from '@gnomad/ui'

import { TranscriptConsequenceList } from './TranscriptConsequenceList'
import TranscriptConsequencePropType from './TranscriptConsequencePropType'

type Props = {
  variant: {
    reference_genome: 'GRCh37' | 'GRCh38'
    transcript_consequences: TranscriptConsequencePropType[]
  }
}

const VariantTranscriptConsequences = ({ variant }: Props) => {
  const { transcript_consequences: transcriptConsequences } = variant
  const numTranscripts = transcriptConsequences.length
  const geneIds = Array.from(new Set(transcriptConsequences.map((csq) => csq.gene_id)))
  const numGenes = geneIds.length

  return (
    <div>
      <p>
        This variant falls on {numTranscripts} transcript{numTranscripts !== 1 && 's'} in {numGenes}{' '}
        gene{numGenes !== 1 && 's'}.
      </p>

      <p>
        <Badge level="info">Note</Badge> The gene symbols shown below are provided by VEP and may
        differ from the symbol shown on gene pages.
      </p>

      <TranscriptConsequenceList transcriptConsequences={transcriptConsequences} />
    </div>
  )
}

export default VariantTranscriptConsequences
