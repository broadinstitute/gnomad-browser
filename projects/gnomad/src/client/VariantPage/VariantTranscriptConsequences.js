import PropTypes from 'prop-types'
import React from 'react'

import { ExternalLink } from '@gnomad/ui'

import Query from '../Query'

import { TranscriptConsequenceList } from './TranscriptConsequenceList'
import TranscriptConsequencePropType from './TranscriptConsequencePropType'

const VariantTranscriptConsequences = ({ variant }) => {
  const { sortedTranscriptConsequences } = variant
  const numTranscripts = sortedTranscriptConsequences.length
  const geneIds = Array.from(new Set(sortedTranscriptConsequences.map(csq => csq.gene_id)))
  const numGenes = geneIds.length

  return (
    <div>
      <p>
        This variant falls on {numTranscripts} transcript{numTranscripts !== 1 && 's'} in {numGenes}{' '}
        gene{numGenes !== 1 && 's'}.
      </p>
      <Query
        query={`{\n${geneIds
          .sort()
          .map(
            geneId => `
              ${geneId}: gene(gene_id: "${geneId}", reference_genome: ${variant.reference_genome}) {
                canonical_transcript_id
                mane_select_transcript {
                  ensembl_id
                  ensembl_version
                }
              }
            `
          )
          .join('\n')}}`}
      >
        {({ data, error, loading }) => {
          const transcriptNotes = {}
          if (!loading && !error && data) {
            const genes = data
            sortedTranscriptConsequences.forEach(consequence => {
              const consequenceGene = genes[consequence.gene_id]
              let note
              if (
                consequenceGene.mane_select_transcript &&
                consequence.transcript_id === consequenceGene.mane_select_transcript.ensembl_id
              ) {
                if (
                  consequence.transcript_version ===
                  consequenceGene.mane_select_transcript.ensembl_version
                ) {
                  note = (
                    <React.Fragment>
                      <ExternalLink href="https://www.ncbi.nlm.nih.gov/refseq/MANE/">
                        MANE
                      </ExternalLink>{' '}
                      Select transcript for {consequence.gene_symbol}
                    </React.Fragment>
                  )
                } else {
                  note = (
                    <React.Fragment>
                      Different version of{' '}
                      <ExternalLink href="https://www.ncbi.nlm.nih.gov/refseq/MANE/">
                        MANE
                      </ExternalLink>{' '}
                      Select transcript for {consequence.gene_symbol}
                    </React.Fragment>
                  )
                }
              } else if (consequenceGene.canonical_transcript_id === consequence.transcript_id) {
                note = `Ensembl canonical transcript for ${consequence.gene_symbol}`
              }
              transcriptNotes[consequence.transcript_id] = note
            })
          }

          return (
            <React.Fragment>
              <TranscriptConsequenceList
                sortedTranscriptConsequences={sortedTranscriptConsequences}
                transcriptNotes={transcriptNotes}
              />
            </React.Fragment>
          )
        }}
      </Query>
    </div>
  )
}

VariantTranscriptConsequences.propTypes = {
  variant: PropTypes.shape({
    reference_genome: PropTypes.oneOf(['GRCh37', 'GRCh38']).isRequired,
    sortedTranscriptConsequences: PropTypes.arrayOf(TranscriptConsequencePropType).isRequired,
  }).isRequired,
}

export default VariantTranscriptConsequences
