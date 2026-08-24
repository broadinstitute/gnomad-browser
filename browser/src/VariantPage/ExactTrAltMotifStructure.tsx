import React, { useMemo } from 'react'

import HaplotypeHelpButton from '../Haplotypes/HelpButton'
import { AlleleStructureGrid, MotifHighlightedSequence } from '../Haplotypes/TrAlleleStructure'
import { decomposeExactTrAlt } from '../Haplotypes/trAlleleStructureData'

const Heading = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
    <h2 style={{ marginRight: 0 }}>{children}</h2>
    <HaplotypeHelpButton title="About the selected ALT motif structure">
      <p style={{ marginTop: 0 }}>
        This grid decomposes only the exact nucleotide sequence of the selected tandem-repeat ALT
        against the catalog motif or motifs. It is not a carrier, genotype, or full-cohort
        distribution and does not show the other ALTs in the allelic series.
      </p>
      <p>
        The shared VCF anchor base, when present, is omitted before decomposition. Colored blocks
        are motif-aligned units; dark blocks are interruption segments. A colored unit may contain
        mismatching bases, which are shown in dark when its sequence is expanded.
      </p>
      <p style={{ marginBottom: 0 }}>
        The DP badge denotes dynamic-programming alignment; RE denotes the greedy regular-expression
        fallback. For very long alleles, the grid switches to a 100 bp heatmap of exact motif-base
        matches. These decompositions are descriptive and should not be interpreted as clinical
        classifications.
      </p>
    </HaplotypeHelpButton>
  </div>
)

const unavailableMessage = (reason: 'missing_motifs' | 'missing_alt_sequence') =>
  reason === 'missing_motifs'
    ? 'Motif decomposition is unavailable because no repeat motif was provided for this record.'
    : 'Motif decomposition is unavailable because this record does not provide an exact nucleotide ALT sequence.'

const ExactTrAltMotifStructure = ({
  refAllele,
  altAllele,
  motifs,
  showHighlightedExactSequence = false,
}: {
  refAllele: string
  altAllele: string
  motifs: string[] | null
  showHighlightedExactSequence?: boolean
}) => {
  const decomposition = useMemo(
    () => decomposeExactTrAlt({ ref: refAllele, alt: altAllele, motifs }),
    [refAllele, altAllele, motifs]
  )

  return (
    <>
      <Heading>Selected ALT Motif Structure</Heading>
      {decomposition.status === 'unavailable' ? (
        <p>{unavailableMessage(decomposition.reason)}</p>
      ) : (
        <>
          {showHighlightedExactSequence && (
            <section aria-labelledby="highlighted-exact-alt-heading">
              <h4 id="highlighted-exact-alt-heading">
                Highlighted exact ALT sequence ({altAllele.length.toLocaleString()} bp)
              </h4>
              <MotifHighlightedSequence
                tokens={decomposition.structure.tokens}
                motifs={decomposition.motifs}
                leadingSequence={decomposition.sharedAnchorRemoved ? altAllele.slice(0, 1) : ''}
                ariaLabel="Complete motif-highlighted exact ALT sequence"
                wrap
              />
              {decomposition.sharedAnchorRemoved && (
                <p style={{ marginTop: 4, color: '#4f5960', fontSize: 12 }}>
                  Gray leading base: shared VCF anchor. Dark bases: interruptions or motif
                  mismatches.
                </p>
              )}
            </section>
          )}
          <p style={{ maxWidth: 900 }}>
            Sequence-level decomposition of this selected ALT against{' '}
            {decomposition.motifs.length === 1 ? 'motif' : 'motifs'}{' '}
            <span style={{ fontFamily: 'monospace' }}>{decomposition.motifs.join(', ')}</span>.
            {decomposition.sharedAnchorRemoved && ' The shared VCF anchor base is omitted.'}
          </p>
          <AlleleStructureGrid
            structures={[decomposition.structure]}
            motifs={decomposition.motifs}
            flankPrefix={decomposition.flankPrefix}
            flankSuffix={decomposition.flankSuffix}
            showAssignedCopies={false}
            showSequenceControls={!showHighlightedExactSequence}
            ariaLabel="Selected ALT motif structure grid"
          />
        </>
      )}
    </>
  )
}

export default ExactTrAltMotifStructure
