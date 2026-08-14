import React, { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'
import Link from './Link'
import {
  ContextAsset,
  ContextFilters,
  ContextProvenance,
  ContextRegion,
  PAGE_SIZE,
  contextLoadResult,
  defaultContextFilters,
  filterContextRegions,
  formatRegion,
  formatSpan,
  longReadSummaryUrl,
  queryProblem,
} from './referenceSequenceContext'

const focusRing = `
  &:focus-visible {
    outline: 3px solid #1f6fb2;
    outline-offset: 3px;
  }
`

const Pilot = styled.span`
  display: inline-block;
  padding: 0.25em 0.6em;
  border: 1px solid #8a6d1d;
  border-radius: 3px;
  margin-bottom: 0.7em;
  background: #fff8d8;
  color: #5f4b13;
  font-size: 0.85em;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`

const Intro = styled.p`
  max-width: 760px;
  margin-top: 0;
  font-size: 1.1em;
  line-height: 1.5;
`

const Boundary = styled.div`
  max-width: 960px;
  padding: 0.8em 1em;
  border-left: 4px solid #5b7894;
  background: #f3f6f8;
  line-height: 1.45;
`

const Section = styled.section`
  max-width: 1100px;
  margin-top: 2em;
`

const TopicGrid = styled.div`
  display: grid;
  /* stylelint-disable-next-line unit-whitelist */
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 270px), 1fr));
  gap: 0.75em;
`

const TopicButton = styled.button<{ $active: boolean }>`
  width: 100%;
  min-height: 76px;
  padding: 0.75em;
  border: 2px solid ${(props) => (props.$active ? '#2369a0' : '#aab6bf')};
  border-radius: 5px;
  background: ${(props) => (props.$active ? '#e8f3fb' : '#fff')};
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  line-height: 1.25;
  text-align: left;
  ${focusRing}

  small {
    display: block;
    margin-top: 0.3em;
    color: #555;
    font-weight: 400;
  }
`

const CountCaveat = styled.p`
  max-width: 800px;
  color: #555;
  font-size: 0.92em;
`

const MoreFiltersButton = styled.button`
  min-height: 44px;
  padding: 0.55em 0.85em;
  border: 1px solid #54718a;
  border-radius: 4px;
  margin-top: 1em;
  background: #edf3f7;
  color: #18364c;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  ${focusRing}
`

const FiltersPanel = styled.div`
  max-width: 1100px;
  padding: 1em;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-top: 0.8em;
  background: #fafafa;
`

/* stylelint-disable unit-whitelist */
const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(230px, 2fr) repeat(3, minmax(130px, 1fr));
  gap: 0.8em;
  align-items: end;

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
    font-weight: 600;
  }

  input,
  select {
    min-height: 44px;
    padding: 0.4em;
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`

const CategoryFieldset = styled.fieldset`
  padding: 0;
  border: 0;
  margin: 1em 0 0;

  legend {
    margin-bottom: 0.5em;
    font-weight: 700;
  }
`

const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 255px), 1fr));
  gap: 0.55em 1em;
`

const CategoryChoice = styled.label`
  display: grid;
  grid-template-columns: 22px 1fr;
  align-items: start;
  min-height: 44px;
  gap: 0.4em;

  input {
    width: 18px;
    height: 18px;
  }
`
/* stylelint-enable unit-whitelist */

const FilterOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.7em 1.3em;
  margin-top: 0.8em;

  label {
    display: flex;
    align-items: center;
    min-height: 44px;
    gap: 0.4em;
  }
`

const SecondaryButton = styled.button`
  min-height: 44px;
  padding: 0.5em 0.8em;
  ${focusRing}
`

const Problem = styled.div`
  margin: 0.8em 0;
  color: #8a1c1c;
  font-weight: 600;
`

const ResultsSection = styled.section`
  max-width: 900px;
  margin-top: 1.5em;

  > h2:focus {
    outline: none;
  }
`

const ResultsSummary = styled.p`
  margin: 0.5em 0 1em;
  font-weight: 600;
`

const RegionList = styled.ul`
  padding: 0;
  margin: 0;
  list-style: none;
`

const RegionCard = styled.li`
  min-width: 0;
  padding: 0.9em 1em;
  border: 1px solid #b8c3cc;
  border-radius: 5px;
  margin-bottom: 0.75em;
  background: #fff;

  h3 {
    margin: 0 0 0.25em;
    font-size: 1.05em;
    overflow-wrap: anywhere;
  }

  p {
    margin: 0.5em 0;
  }
`

const BadgeList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.3em;
  margin: 0.55em 0;
`

const Badge = styled.span`
  display: inline-block;
  padding: 0.15em 0.45em;
  border: 1px solid #66819b;
  border-radius: 3px;
  background: #edf3f7;
  font-size: 0.84em;
`

const RegionAction = styled.div`
  margin-top: 0.65em;

  a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    font-weight: 700;
    ${focusRing}
  }

  small {
    display: block;
    margin-top: 0.25em;
  }
`

const Pagination = styled.nav`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1em;
  margin: 1em 0 2em;

  button {
    min-width: 88px;
    min-height: 44px;
  }
`

const Provenance = styled.details`
  max-width: 980px;
  margin: 2em 0 1.5em;

  summary {
    min-height: 44px;
    cursor: pointer;
    font-weight: 700;
    ${focusRing}
  }

  li {
    margin: 0.65em 0;
  }

  pre {
    overflow-wrap: anywhere;
    font: inherit;
    font-size: 0.88em;
    white-space: pre-wrap;
  }
`

type Topic = {
  id: string
  label: string
  description: string
  categoryId: string
}

const topics: Topic[] = [
  {
    id: 'low-mappability',
    label: 'Low short-read mappability',
    description: 'Contexts where short-read mapping can be challenging',
    categoryId: 'low-mappability',
  },
  {
    id: 'segmental-duplications',
    label: 'Segmental duplications',
    description: 'Large, highly similar duplicated reference sequences',
    categoryId: 'segmental-duplications',
  },
  {
    id: 'long-tandem-repeats',
    label: 'Long tandem repeats',
    description: 'Tandem-repeat annotations at least 101 bp long',
    categoryId: 'long-tandem-repeats',
  },
  {
    id: 'satellites',
    label: 'Satellites',
    description: 'Satellite repeat annotations',
    categoryId: 'satellites',
  },
  {
    id: 'reference-gaps',
    label: 'Reference gaps',
    description: 'Regions within 15 kb of GRCh38 reference gaps',
    categoryId: 'reference-gaps',
  },
  {
    id: 'reference-representation',
    label: 'Reference representation',
    description: "GIAB's correct-copy false-duplication stratum",
    categoryId: 'false-duplication-correct-copy',
  },
  {
    id: 'immune-loci',
    label: 'Highly polymorphic immune loci',
    description: 'The chromosome 22 VDJ / immunoglobulin lambda stratum',
    categoryId: 'vdj-igl',
  },
]

const Unavailable = () => (
  <InfoPage>
    <DocumentTitle title="Reference sequence-context data unavailable" />
    <h1>Reference sequence-context data are unavailable</h1>
    <p>
      The pinned static asset or its integrity receipt could not be validated. The page fails closed
      rather than showing an empty result. Please <Link to="/contact">contact the gnomAD team</Link>
      .
    </p>
  </InfoPage>
)

const ReferenceSequenceContextExplorer = ({
  asset,
  provenance,
}: {
  asset: ContextAsset
  provenance: ContextProvenance
}) => {
  const categoryById = useMemo(
    () => new Map(asset.categories.map((category) => [category.id, category])),
    [asset.categories]
  )
  const topicCounts = useMemo(
    () =>
      new Map(
        topics.map((topic) => [
          topic.id,
          asset.regions.filter((region) => region.categories.includes(topic.categoryId)).length,
        ])
      ),
    [asset.regions]
  )
  const [filters, setFilters] = useState<ContextFilters>(() =>
    defaultContextFilters(asset.categories.map((category) => category.id))
  )
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [resultsActive, setResultsActive] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null)
  const shouldFocusResults = useRef(false)
  const problem = queryProblem(filters.query)
  const filteredRegions = useMemo(
    () => (resultsActive ? filterContextRegions(asset.regions, filters) : []),
    [asset.regions, filters, resultsActive]
  )
  const pageCount = Math.max(1, Math.ceil(filteredRegions.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const visibleRegions = resultsActive
    ? filteredRegions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
    : []

  useEffect(() => {
    if (resultsActive && shouldFocusResults.current) {
      resultsHeadingRef.current?.focus()
      shouldFocusResults.current = false
    }
  }, [resultsActive, selectedTopic])

  const updateFilters = (update: Partial<ContextFilters>) => {
    setFilters((current) => ({ ...current, ...update }))
    setPage(1)
    setSelectedTopic(null)
  }

  const toggleCategory = (categoryId: string) => {
    const selected = new Set(filters.categoryIds)
    if (selected.has(categoryId)) selected.delete(categoryId)
    else selected.add(categoryId)
    updateFilters({ categoryIds: [...selected] })
  }

  const resetExplorer = () => {
    setFilters(defaultContextFilters(asset.categories.map((category) => category.id)))
    setPage(1)
    setSelectedTopic(null)
    setResultsActive(false)
  }

  const showAllRegions = () => {
    setFilters({
      query: '',
      categoryIds: asset.categories.map((category) => category.id),
      matchMode: 'any',
      multipleOnly: false,
      namedOnly: false,
      sort: 'coordinate',
    })
    setPage(1)
    setSelectedTopic(null)
    setResultsActive(true)
    shouldFocusResults.current = true
  }

  const chooseTopic = (topic: Topic) => {
    setFilters({
      query: '',
      categoryIds: [topic.categoryId],
      matchMode: 'any',
      multipleOnly: false,
      namedOnly: false,
      sort: 'coordinate',
    })
    setPage(1)
    setSelectedTopic(topic)
    setResultsActive(true)
    shouldFocusResults.current = true
  }

  const firstVisible = filteredRegions.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const lastVisible = Math.min(safePage * PAGE_SIZE, filteredRegions.length)

  return (
    <InfoPage>
      <DocumentTitle title="Explore reference sequence contexts on chromosome 22" />
      <Pilot>Pilot / experimental</Pilot>
      <h1>Explore reference sequence contexts on chromosome 22</h1>
      <Intro>
        Choose a broad reference sequence context, then open the full matching region in the gnomAD
        long-read summary.
      </Intro>
      <Boundary>
        <strong>Scientific boundary:</strong> GIAB/GA4GH Genome Stratifications v3.6 mark GRCh38
        reference sequence contexts for separate benchmark analysis. They do not show observed
        long-read superiority, coverage, callability, accuracy, diagnostic status, or relative
        performance. This pilot is limited to chromosome 22.
      </Boundary>

      <Section aria-labelledby="topics-heading">
        <h2 id="topics-heading">Choose a context</h2>
        <p>Choose a sequence context to see matching chromosome 22 regions.</p>
        <TopicGrid>
          {topics.map((topic) => (
            <TopicButton
              key={topic.id}
              type="button"
              $active={selectedTopic?.id === topic.id}
              aria-pressed={selectedTopic?.id === topic.id}
              aria-controls="context-results"
              onClick={() => chooseTopic(topic)}
            >
              {topic.label}
              <small>{topic.description}</small>
              <small>{topicCounts.get(topic.id)!.toLocaleString('en-US')} matching regions</small>
            </TopicButton>
          ))}
        </TopicGrid>
        <CountCaveat>
          Topic counts are non-additive: regions can appear in more than one sequence context, and
          underlying source annotations can overlap.
        </CountCaveat>

        <MoreFiltersButton
          type="button"
          aria-expanded={filtersOpen}
          aria-controls="context-filters"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          {filtersOpen ? 'Fewer filters ▴' : 'More filters ▾'}
        </MoreFiltersButton>

        {filtersOpen && (
          <FiltersPanel id="context-filters">
            <FilterGrid>
              <label>
                Find coordinate or named source region
                <input
                  type="search"
                  value={filters.query}
                  placeholder="22:18,709,565-18,947,752 or a named source"
                  onChange={(event) => updateFilters({ query: event.target.value })}
                />
              </label>
              <label>
                Match contexts
                <select
                  value={filters.matchMode}
                  onChange={(event) =>
                    updateFilters({ matchMode: event.target.value as ContextFilters['matchMode'] })
                  }
                >
                  <option value="any">Match any selected</option>
                  <option value="all">Match all selected</option>
                </select>
              </label>
              <label>
                Minimum span (bp)
                <input
                  type="number"
                  min="1"
                  value={filters.minSpanBp ?? ''}
                  onChange={(event) =>
                    updateFilters({
                      minSpanBp: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                />
              </label>
              <label>
                Maximum span (bp)
                <input
                  type="number"
                  min="1"
                  value={filters.maxSpanBp ?? ''}
                  onChange={(event) =>
                    updateFilters({
                      maxSpanBp: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                />
              </label>
            </FilterGrid>

            <CategoryFieldset>
              <legend>Sequence contexts</legend>
              <CategoryGrid>
                {asset.categories.map((category) => (
                  <CategoryChoice key={category.id}>
                    <input
                      type="checkbox"
                      checked={filters.categoryIds.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                    />
                    <span>{category.label}</span>
                  </CategoryChoice>
                ))}
              </CategoryGrid>
            </CategoryFieldset>

            <FilterOptions>
              <label>
                <input
                  type="checkbox"
                  checked={filters.multipleOnly}
                  onChange={(event) => updateFilters({ multipleOnly: event.target.checked })}
                />
                Multiple source contexts only
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={filters.namedOnly}
                  onChange={(event) => updateFilters({ namedOnly: event.target.checked })}
                />
                Named source regions only
              </label>
              <label>
                Sort
                <select
                  value={filters.sort}
                  onChange={(event) =>
                    updateFilters({ sort: event.target.value as ContextFilters['sort'] })
                  }
                >
                  <option value="coordinate">Coordinate</option>
                  <option value="span">Span (largest first)</option>
                  <option value="category">Context</option>
                </select>
              </label>
              {!resultsActive && (
                <SecondaryButton type="button" onClick={showAllRegions}>
                  Show all regions
                </SecondaryButton>
              )}
              <SecondaryButton type="button" onClick={resetExplorer}>
                Reset explorer
              </SecondaryButton>
            </FilterOptions>
          </FiltersPanel>
        )}
      </Section>

      {resultsActive && (
        <ResultsSection id="context-results" aria-labelledby="results-heading">
          <h2 id="results-heading" ref={resultsHeadingRef} tabIndex={-1}>
            {selectedTopic
              ? `Regions matching “${selectedTopic.label}”`
              : 'Chromosome 22 regions matching filters'}
          </h2>
          {problem && <Problem role="alert">{problem.message}</Problem>}
          {!problem && (
            <ResultsSummary role="status" aria-live="polite" aria-atomic="true">
              {filteredRegions.length.toLocaleString('en-US')} matching regions. Showing{' '}
              {firstVisible.toLocaleString('en-US')}–{lastVisible.toLocaleString('en-US')}. Context
              and underlying source annotation counts overlap and are not measures of evidence
              strength.
            </ResultsSummary>
          )}

          {filteredRegions.length === 0 && !problem ? (
            <div>
              <p>No chromosome 22 regions match these filters.</p>
              <SecondaryButton type="button" onClick={resetExplorer}>
                Reset explorer
              </SecondaryButton>
            </div>
          ) : (
            !problem && (
              <>
                <RegionList aria-label="Matching chromosome 22 regions">
                  {visibleRegions.map((region: ContextRegion) => {
                    return (
                      <RegionCard key={region.id} data-testid="context-region-row">
                        <h3>
                          {formatRegion(region)} · {formatSpan(region.spanBp)}
                        </h3>
                        <BadgeList aria-label="Sequence contexts">
                          {region.categories.map((categoryId) => (
                            <Badge key={categoryId}>
                              {categoryById.get(categoryId)!.shortLabel}
                            </Badge>
                          ))}
                        </BadgeList>
                        <p>
                          {region.categories.length} context{' '}
                          {region.categories.length === 1 ? 'type' : 'types'} ·{' '}
                          {region.evidence.length.toLocaleString('en-US')} underlying source{' '}
                          {region.evidence.length === 1 ? 'annotation' : 'annotations'}
                        </p>
                        <RegionAction>
                          <Link preserveSelectedDataset={false} to={longReadSummaryUrl(region)}>
                            Explore long-read data
                          </Link>
                        </RegionAction>
                      </RegionCard>
                    )
                  })}
                </RegionList>
                <Pagination aria-label="Result pages">
                  <button
                    type="button"
                    disabled={safePage === 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </button>
                  <span>
                    Page {safePage} of {pageCount}
                  </span>
                  <button
                    type="button"
                    disabled={safePage === pageCount}
                    onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                  >
                    Next
                  </button>
                </Pagination>
              </>
            )
          )}
        </ResultsSection>
      )}

      <Provenance>
        <summary>Methods &amp; provenance</summary>
        <p>
          This pilot uses seven pinned, offline GIAB/GA4GH Genome Stratifications v3.6 sources. It
          makes no runtime request to GIAB, NCBI, GraphQL, the gnomAD API, or ClickHouse for
          sequence-context data.
        </p>
        <p>
          Coordinates shown in the explorer are GRCh38, 1-based, and inclusive. Pinned source BED
          files use 0-based, half-open coordinates; browser start = BED start + 1 and browser stop =
          BED end. Merged regions add no slop and are not themselves GIAB strata.
        </p>
        <h2>Pinned source definitions</h2>
        <ul>
          {asset.categories.map((category) => (
            <li key={category.id}>
              <strong>{category.label}:</strong> {category.definition}{' '}
              <a href={category.sourceUrl}>Pinned source file</a>
            </li>
          ))}
        </ul>
        <p>{provenance.processingDescription}</p>
        <p>
          Generated asset SHA-256: <code>{provenance.generatedAssetSha256}</code>. GRCh38 FASTA:{' '}
          {provenance.referenceFasta.assemblyAccession}; uncompressed MD5{' '}
          <code>{provenance.referenceFasta.uncompressedMd5}</code>.
        </p>
        <p>
          {provenance.citation.text} <a href={`https://doi.org/${provenance.citation.doi}`}>DOI</a>
        </p>
        <p>{provenance.acknowledgement}</p>
        <p>{provenance.sharing}</p>
        <h2>NIST data-use policy</h2>
        <pre>{provenance.dataUsePolicy}</pre>
      </Provenance>
    </InfoPage>
  )
}

const ReferenceSequenceContextPage = () => {
  if (!contextLoadResult.asset || !contextLoadResult.provenance) return <Unavailable />
  return (
    <ReferenceSequenceContextExplorer
      asset={contextLoadResult.asset}
      provenance={contextLoadResult.provenance}
    />
  )
}

export default ReferenceSequenceContextPage
