import React, { useMemo, useState } from 'react'
import styled from 'styled-components'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'
import { literatureWorkflowPath, workflowByRef } from './longReadLiteratureWorkflows'

import examplesData from './data/longReadLiteratureExamples.json'

const LR_DATASET = 'gnomad_r4_lr'
const LR_COHORT = 'hgsvc_hprc'

type Region = {
  chrom: string
  start: number
  stop: number
  truncated: boolean
  verified: boolean
}

type LiteratureExample = {
  ref: string
  archetype: string | null
  title: string
  year: string | null
  venue: string | null
  pmid: string | null
  doi: string | null
  geneSymbol: string | null
  variantClass: string | null
  priorShortReadResult: string | null
  populationComparator: string | null
  whyInTruthSet: string | null
  region: Region | null
  variantId?: string | null
  pdfUrl: string | null
}

const examples = examplesData as LiteratureExample[]

const ARCHETYPE_LABELS: Record<string, string> = {
  A1: 'Repeat expansions',
  A2: 'Methylation and imprinting',
  A3: 'Paralogs and pseudogenes',
  A4: 'Mobile element insertions',
  A5: 'Phasing and compound heterozygosity',
  A6: 'Inversions and balanced rearrangements',
  A7: 'Deep intronic and regulatory variants',
  A8: 'Complex structural variants',
  R: 'Other / reference',
}
const ARCHETYPE_ORDER = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'R']

function primaryArchetypeCode(archetype: string | null): string {
  if (!archetype) return 'R'
  const code = archetype.split('+')[0].trim()
  return ARCHETYPE_LABELS[code] ? code : 'R'
}

function regionUrl(region: Region, variantId?: string | null): string {
  const params = new URLSearchParams({
    dataset: LR_DATASET,
    lr_cohort: LR_COHORT,
    show_haplotypes: 'true',
  })
  if (variantId) params.set('variant_id', variantId)
  return `/region/${region.chrom}-${region.start}-${region.stop}?${params.toString()}`
}

// Papers that share a resolved gene symbol almost always share (or overlap) a
// region too, so grouping by gene is enough to cluster same-locus papers.
function groupByGene(items: LiteratureExample[]) {
  const byGene = new Map<string, LiteratureExample[]>()
  items.forEach((ex) => {
    if (!ex.geneSymbol) return
    if (!byGene.has(ex.geneSymbol)) byGene.set(ex.geneSymbol, [])
    byGene.get(ex.geneSymbol)!.push(ex)
  })
  const clusters = [...byGene.entries()]
    .filter(([, group]) => group.length > 1)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([gene, group]) => ({ gene, items: group }))
  const clustered = new Set(clusters.flatMap((c) => c.items.map((ex) => ex.ref)))
  const standalone = items.filter((ex) => !clustered.has(ex.ref))
  return { clusters, standalone }
}

const Intro = styled.p`
  max-width: 900px;
`

const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 1em 0 1.5em;
`

const FilterButton = styled.button<{ $active: boolean }>`
  border: 1px solid ${(props) => (props.$active ? '#428bca' : '#ccc')};
  background: ${(props) => (props.$active ? '#428bca' : '#fff')};
  color: ${(props) => (props.$active ? '#fff' : '#333')};
  border-radius: 14px;
  padding: 4px 12px;
  font-size: 0.85em;
  cursor: pointer;
`

const Section = styled.div`
  margin-bottom: 2em;
`

const SectionTitle = styled.h2`
  border-bottom: 1px solid #ccc;
  padding-bottom: 0.3em;
  font-size: 1.2em;
`

const ExampleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 12px;
`

const ExampleCard = styled.div`
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const ExampleTitle = styled.div`
  font-weight: bold;
  font-size: 0.95em;
`

const MetaRow = styled.div`
  color: #666;
  font-size: 0.82em;
`

const badgeBackground = (tone?: 'verified' | 'approximate' | 'missing') => {
  if (tone === 'verified') return '#2e8540'
  if (tone === 'approximate') return '#997404'
  return '#999'
}

const Badge = styled.span<{ tone?: 'verified' | 'approximate' | 'missing' }>`
  display: inline-block;
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 0.75em;
  margin-right: 4px;
  color: #fff;
  background: ${(props) => badgeBackground(props.tone)};
`

const GeneRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const GeneTag = styled.span`
  display: inline-block;
  background: #1c4e80;
  color: #fff;
  font-weight: 700;
  font-size: 0.85em;
  letter-spacing: 0.02em;
  border-radius: 3px;
  padding: 2px 8px;
`

const VariantClass = styled.span`
  color: #666;
  font-size: 0.85em;
`

const Why = styled.div`
  font-size: 0.85em;
  line-height: 1.3;
`

const LinkRow = styled.div`
  display: flex;
  gap: 10px;
  font-size: 0.85em;
  margin-top: 4px;
`

const GeneGroup = styled.div`
  border: 1px solid #b7c8dc;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 12px;
  background: #f7f9fc;
`

const GeneGroupHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`

const GeneGroupCount = styled.span`
  color: #555;
  font-size: 0.85em;
`

const StandaloneLabel = styled.div`
  color: #888;
  font-size: 0.8em;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 4px 0;
`

const ExampleCardView = ({ ex, sectionCode }: { ex: LiteratureExample; sectionCode: string }) => (
  <ExampleCard>
    <ExampleTitle>{ex.title}</ExampleTitle>
    {(ex.geneSymbol || ex.variantClass) && (
      <GeneRow>
        {ex.geneSymbol && <GeneTag>{ex.geneSymbol}</GeneTag>}
        {ex.variantClass && <VariantClass>{ex.variantClass}</VariantClass>}
      </GeneRow>
    )}
    <MetaRow>
      {ex.year && <>{ex.year} · </>}
      {ex.venue}
      {ex.archetype && ex.archetype !== sectionCode && <> · archetype {ex.archetype}</>}
    </MetaRow>
    {ex.priorShortReadResult && (
      <MetaRow>Prior short-read result: {ex.priorShortReadResult}</MetaRow>
    )}
    {ex.populationComparator && (
      <MetaRow>Population comparator used in paper: {ex.populationComparator}</MetaRow>
    )}
    {ex.whyInTruthSet && <Why>{ex.whyInTruthSet}</Why>}
    <div>
      {ex.region ? (
        <Badge tone={ex.region.verified ? 'verified' : 'approximate'}>
          {ex.region.verified ? 'verified region' : 'approximate region'}
          {ex.region.truncated ? ' · truncated to 100kb' : ''}
        </Badge>
      ) : (
        <Badge tone="missing">no region mapped</Badge>
      )}
    </div>
    <LinkRow>
      {workflowByRef.has(ex.ref) && (
        <a href={literatureWorkflowPath(workflowByRef.get(ex.ref)!.slug)}>Detailed workflow</a>
      )}
      {ex.region && (
        <a href={regionUrl(ex.region, ex.variantId)} target="_blank" rel="noopener noreferrer">
          {ex.region.verified ? 'View in browser' : 'Open provisional locus overview'}
        </a>
      )}
      {ex.pdfUrl && (
        <a href={ex.pdfUrl} target="_blank" rel="noopener noreferrer">
          PDF
        </a>
      )}
      {ex.pmid && (
        <a
          href={`https://pubmed.ncbi.nlm.nih.gov/${ex.pmid}/`}
          target="_blank"
          rel="noopener noreferrer"
        >
          PubMed
        </a>
      )}
      {!ex.pmid && ex.doi && (
        <a href={`https://doi.org/${ex.doi}`} target="_blank" rel="noopener noreferrer">
          DOI
        </a>
      )}
    </LinkRow>
  </ExampleCard>
)

const LongReadLiteratureExamplesPage = () => {
  const [activeArchetype, setActiveArchetype] = useState<string | null>(null)

  const sections = useMemo(() => {
    const byCode = new Map<string, LiteratureExample[]>()
    examples.forEach((ex) => {
      const code = primaryArchetypeCode(ex.archetype)
      if (!byCode.has(code)) byCode.set(code, [])
      byCode.get(code)!.push(ex)
    })
    return ARCHETYPE_ORDER.filter((code) => byCode.has(code)).map((code) => ({
      code,
      label: ARCHETYPE_LABELS[code],
      items: byCode.get(code)!,
    }))
  }, [])

  const visibleSections = activeArchetype
    ? sections.filter((s) => s.code === activeArchetype)
    : sections

  const regionCount = examples.filter((ex) => ex.region).length
  const pdfCount = examples.filter((ex) => ex.pdfUrl).length

  return (
    <InfoPage>
      <DocumentTitle title="Long Read Diagnostic Literature Examples" />
      <h1>Long Read Diagnostic Literature Examples</h1>
      <Intro>
        {examples.length} papers describing long-read-solved or long-read-relevant clinical
        diagnoses, curated from a literature screen and tagged by an LLM with locus, variant class,
        and prior short-read result. {regionCount} have a browser region link (
        {sections.flatMap((s) => s.items).filter((ex) => ex.region?.verified).length} hand-verified,
        the rest an approximate window around the gene — check and refine before relying on them).{' '}
        {pdfCount} link to the source PDF. Use this to test-drive the browser against real
        documented diagnostic use-cases and find where region mapping, haplotype display, or
        methylation views need work.
      </Intro>

      <FilterBar>
        <FilterButton $active={activeArchetype === null} onClick={() => setActiveArchetype(null)}>
          All ({examples.length})
        </FilterButton>
        {sections.map((s) => (
          <FilterButton
            key={s.code}
            $active={activeArchetype === s.code}
            onClick={() => setActiveArchetype(s.code)}
          >
            {s.code} — {s.label} ({s.items.length})
          </FilterButton>
        ))}
      </FilterBar>

      {visibleSections.map((section) => {
        const { clusters, standalone } = groupByGene(section.items)
        return (
          <Section key={section.code}>
            <SectionTitle>
              {section.code} — {section.label}
            </SectionTitle>

            {clusters.map((cluster) => (
              <GeneGroup key={cluster.gene}>
                <GeneGroupHeader>
                  <GeneTag>{cluster.gene}</GeneTag>
                  <GeneGroupCount>{cluster.items.length} papers</GeneGroupCount>
                </GeneGroupHeader>
                <ExampleGrid>
                  {cluster.items.map((ex) => (
                    <ExampleCardView key={ex.ref} ex={ex} sectionCode={section.code} />
                  ))}
                </ExampleGrid>
              </GeneGroup>
            ))}

            {clusters.length > 0 && standalone.length > 0 && (
              <StandaloneLabel>Other papers in this category</StandaloneLabel>
            )}
            {standalone.length > 0 && (
              <ExampleGrid>
                {standalone.map((ex) => (
                  <ExampleCardView key={ex.ref} ex={ex} sectionCode={section.code} />
                ))}
              </ExampleGrid>
            )}
          </Section>
        )
      })}
    </InfoPage>
  )
}

export default LongReadLiteratureExamplesPage
