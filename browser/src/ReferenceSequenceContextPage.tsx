import React, { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { BaseTable } from '@gnomad/ui'

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
  sourceIntervalLabel,
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

const CardGrid = styled.div`
  display: grid;
  /* stylelint-disable-next-line unit-whitelist */
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 270px), 1fr));
  gap: 1em;
`

const Card = styled.article`
  min-width: 0;
  padding: 1em;
  border: 1px solid #b8c3cc;
  border-radius: 5px;
  background: #fff;

  h3 {
    margin: 0 0 0.45em;
  }
`

const BadgeList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.3em;
  margin: 0.8em 0;
`

const Badge = styled.span`
  display: inline-block;
  padding: 0.15em 0.45em;
  border: 1px solid #66819b;
  border-radius: 3px;
  background: #edf3f7;
  font-size: 0.84em;
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65em 1em;

  a,
  button {
    min-height: 44px;
  }

  a {
    display: inline-flex;
    align-items: center;
    font-weight: 700;
    ${focusRing}
  }
`

const SecondaryButton = styled.button`
  min-height: 44px;
  padding: 0.5em 0.8em;
  ${focusRing}
`

const FeaturedEvidence = styled.div`
  padding-top: 0.8em;
  border-top: 1px solid #ddd;
  margin-top: 0.8em;
  overflow-wrap: anywhere;
`

const EvidenceList = styled.ul`
  padding-left: 1.3em;
  margin: 0.5em 0;

  li {
    margin: 0.45em 0;
  }
`

const TopicButton = styled.button<{ $active: boolean }>`
  width: 100%;
  min-height: 74px;
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
    margin-top: 0.25em;
    color: #555;
    font-weight: 400;
  }
`

const AdvancedToggle = styled.button`
  width: min(100%, 640px);
  min-height: 48px;
  padding: 0.7em 1em;
  border: 1px solid #54718a;
  border-radius: 4px;
  background: #edf3f7;
  color: #18364c;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  text-align: left;
  ${focusRing}
`

const AdvancedPanel = styled.section`
  max-width: 1100px;
  padding-top: 1em;

  > h2:focus {
    outline: none;
  }
`

const TopicNotice = styled.p`
  padding: 0.65em 0.8em;
  border-left: 4px solid #2369a0;
  background: #eef6fb;
`

const MobileFilterButton = styled.button`
  display: none;
  min-height: 44px;
  padding: 0.5em 0.9em;
  margin: 0.5em 0 0;
  ${focusRing}

  @media (max-width: 700px) {
    display: block;
  }
`

const FiltersPanel = styled.div<{ $open: boolean }>`
  padding: 1em;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin: 1.2em 0;
  background: #fafafa;

  @media (max-width: 700px) {
    display: ${(props) => (props.$open ? 'block' : 'none')};
  }
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

  small {
    display: block;
    margin-top: 0.15em;
    color: #555;
    line-height: 1.3;
  }
`
/* stylelint-enable unit-whitelist */

const FilterOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.7em 1.3em;
  margin-top: 0.8em;

  label {
    display: flex;
    align-items: center;
    min-height: 44px;
    gap: 0.4em;
  }
`

const Problem = styled.div`
  margin: 0.8em 0;
  color: #8a1c1c;
  font-weight: 600;
`

const ResultsSummary = styled.p`
  margin: 1em 0 0.5em;
  font-weight: 600;
`

const TableWrap = styled.div`
  overflow-x: auto;
  max-width: 100%;
`

const ResultsTable = styled(BaseTable)`
  width: 100%;
  min-width: 780px;

  caption {
    padding: 0 0 0.5em;
    color: #555;
    text-align: left;
  }

  th,
  td {
    vertical-align: top;
  }

  @media (max-width: 700px) {
    min-width: 0;

    thead {
      position: absolute;
      overflow: hidden;
      width: 1px;
      height: 1px;
      clip: rect(0 0 0 0);
    }

    tbody,
    tr,
    td {
      display: block;
      width: auto;
    }

    tr {
      padding: 0.6em;
      border: 1px solid #ccc;
      border-radius: 4px;
      margin-bottom: 0.8em;
    }

    td {
      display: grid;
      grid-template-columns: minmax(100px, 34%) minmax(0, 66%);
      padding: 0.35em 0;
      border: 0;
      overflow-wrap: anywhere;
    }

    td::before {
      content: attr(data-label);
      padding-right: 0.5em;
      font-weight: 700;
    }
  }
`

const TableActions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5em;

  a,
  button {
    min-height: 44px;
  }
`

const DetailsCell = styled.td`
  && {
    padding: 0.8em 1em;
    background: #f7f7f7;
  }

  @media (max-width: 700px) {
    && {
      display: block;
    }

    &&::before {
      content: none;
    }
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
  margin: 1.5em 0;

  summary {
    min-height: 44px;
    cursor: pointer;
    font-weight: 700;
    ${focusRing}
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
  categoryIds: string[]
}

const topics: Topic[] = [
  {
    id: 'duplicated',
    label: 'Duplicated sequence',
    description: 'Segmental duplication annotations',
    categoryIds: ['segmental-duplications'],
  },
  {
    id: 'low-mappability',
    label: 'Low short-read mappability',
    description: 'Contexts where short-read mapping can be challenging',
    categoryIds: ['low-mappability'],
  },
  {
    id: 'long-tandem-repeats',
    label: 'Long tandem repeats',
    description: 'Repeat annotations with an underlying length of at least 101 bp',
    categoryIds: ['long-tandem-repeats'],
  },
  {
    id: 'satellites-gaps',
    label: 'Satellites / reference gaps',
    description: 'Satellite annotations or regions near GRCh38 reference gaps',
    categoryIds: ['satellites', 'reference-gaps'],
  },
  {
    id: 'igl',
    label: 'IGL locus',
    description: 'The reviewed chromosome 22 VDJ / IGL named stratum',
    categoryIds: ['vdj-igl'],
  },
  {
    id: 'false-duplication',
    label: 'GRCh38 false duplication',
    description: "GIAB's correct-copy false-duplication stratum",
    categoryIds: ['false-duplication-correct-copy'],
  },
]

const featuredReasons: Record<string, string> = {
  LCR22:
    'This reviewed region combines segmental duplication, low-mappability, long tandem repeat, and satellite annotations.',
  IGL: 'This reviewed locus combines the IGL named stratum with duplication, low-mappability, tandem-repeat, and satellite annotations.',
  'CYP2D6/CYP2D7 area':
    'This reviewed area combines segmental duplication, low-mappability, and long tandem repeat annotations.',
}

const detailId = (prefix: string, region: ContextRegion) =>
  `${prefix}-${region.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`

const ExactEvidence = ({
  region,
  categoryById,
}: {
  region: ContextRegion
  categoryById: Map<string, ContextAsset['categories'][number]>
}) => (
  <>
    <strong>Exact GIAB source intervals (0-based, half-open BED)</strong>
    <EvidenceList>
      {region.evidence.map((evidence) => {
        const category = categoryById.get(evidence.sourceId)!
        return (
          <li key={`${evidence.sourceId}-${evidence.start0}-${evidence.end0}`}>
            <strong>{category.label}:</strong> {sourceIntervalLabel(evidence)} in Browser
            coordinates; BED{' '}
            <code>
              chr22 {evidence.start0} {evidence.end0}
            </code>
            . {category.definition} <a href={category.sourceUrl}>Pinned source file</a>
          </li>
        )
      })}
    </EvidenceList>
    <p>
      Conversion: Browser start = BED start + 1; Browser stop = BED end. The merged component adds
      no slop and is not itself a GIAB stratum. These annotations do not establish coverage,
      callability, accuracy, diagnostic status, or better performance for long reads.
    </p>
  </>
)

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
  const featuredRegions = useMemo(
    () =>
      ['LCR22', 'IGL', 'CYP2D6/CYP2D7 area'].map(
        (label) => asset.regions.find((region) => region.curatedLabel === label)!
      ),
    [asset.regions]
  )
  const [filters, setFilters] = useState<ContextFilters>(() =>
    defaultContextFilters(asset.categories.map((category) => category.id))
  )
  const [page, setPage] = useState(1)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [featuredExpanded, setFeaturedExpanded] = useState<Set<string>>(() => new Set())
  const advancedHeadingRef = useRef<HTMLHeadingElement>(null)
  const shouldFocusAdvanced = useRef(false)
  const problem = queryProblem(filters.query)
  const filteredRegions = useMemo(
    () => (advancedOpen ? filterContextRegions(asset.regions, filters) : []),
    [advancedOpen, asset.regions, filters]
  )
  const pageCount = Math.max(1, Math.ceil(filteredRegions.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const visibleRegions = advancedOpen
    ? filteredRegions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
    : []

  useEffect(() => {
    if (advancedOpen && shouldFocusAdvanced.current) {
      advancedHeadingRef.current?.focus()
      shouldFocusAdvanced.current = false
    }
  }, [advancedOpen, selectedTopic])

  const updateFilters = (update: Partial<ContextFilters>) => {
    setFilters((current) => ({ ...current, ...update }))
    setPage(1)
    setExpanded(new Set())
    setSelectedTopic(null)
  }

  const toggleCategory = (categoryId: string) => {
    const selected = new Set(filters.categoryIds)
    if (selected.has(categoryId)) selected.delete(categoryId)
    else selected.add(categoryId)
    updateFilters({ categoryIds: [...selected] })
  }

  const resetFilters = () => {
    setFilters(defaultContextFilters(asset.categories.map((category) => category.id)))
    setPage(1)
    setExpanded(new Set())
    setSelectedTopic(null)
  }

  const chooseTopic = (topic: Topic) => {
    setFilters({
      query: '',
      categoryIds: topic.categoryIds,
      matchMode: 'any',
      multipleOnly: false,
      namedOnly: false,
      sort: 'coordinate',
    })
    setPage(1)
    setExpanded(new Set())
    setSelectedTopic(topic)
    setAdvancedOpen(true)
    setFiltersOpen(false)
    shouldFocusAdvanced.current = true
  }

  const toggleDetails = (regionId: string, setter = setExpanded) => {
    setter((current) => {
      const next = new Set(current)
      if (next.has(regionId)) next.delete(regionId)
      else next.add(regionId)
      return next
    })
  }

  return (
    <InfoPage>
      <DocumentTitle title="Explore chr22 sequence contexts with long-read data" />
      <Pilot>Pilot / experimental</Pilot>
      <h1>Explore chr22 sequence contexts with long-read data</h1>
      <Intro>
        Start with a reviewed example or choose a reference sequence topic, then open a bounded
        gnomAD long-read summary for that region.
      </Intro>
      <Boundary>
        <strong>What these annotations mean:</strong> GIAB/GA4GH Genome Stratifications v3.6 mark
        GRCh38 reference sequence contexts for separate benchmark analysis. Topic and category
        choices find reference annotations—not observed long-read superiority, coverage,
        callability, accuracy, diagnostic status, or relative performance. This pilot is limited to
        chromosome 22.
      </Boundary>

      <Section aria-labelledby="featured-regions-heading">
        <h2 id="featured-regions-heading">Start with a featured region</h2>
        <CardGrid>
          {featuredRegions.map((region) => {
            const isExpanded = featuredExpanded.has(region.id)
            const evidenceId = detailId('featured-evidence', region)
            return (
              <Card key={region.id} data-testid="featured-region-card">
                <h3>{region.curatedLabel}</h3>
                <p>{featuredReasons[region.curatedLabel!]}</p>
                <BadgeList aria-label="GIAB categories">
                  {region.categories.map((categoryId) => (
                    <Badge key={categoryId}>{categoryById.get(categoryId)!.label}</Badge>
                  ))}
                </BadgeList>
                <Actions>
                  <Link preserveSelectedDataset={false} to={longReadSummaryUrl(region)}>
                    Explore long-read data
                  </Link>
                  <SecondaryButton
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={evidenceId}
                    onClick={() => toggleDetails(region.id, setFeaturedExpanded)}
                  >
                    Why this region?
                  </SecondaryButton>
                </Actions>
                {region.spanBp > 100_000 && (
                  <small>The summary opens a bounded 100 kb window.</small>
                )}
                {isExpanded && (
                  <FeaturedEvidence id={evidenceId}>
                    <ExactEvidence region={region} categoryById={categoryById} />
                  </FeaturedEvidence>
                )}
              </Card>
            )
          })}
        </CardGrid>
      </Section>

      <Section aria-labelledby="topics-heading">
        <h2 id="topics-heading">Browse by sequence context</h2>
        <p>
          Choose a topic to reveal matching GIAB reference annotations in the advanced browser.
          Categories are matched independently; no score or performance comparison is calculated.
        </p>
        <CardGrid>
          {topics.map((topic) => (
            <TopicButton
              key={topic.id}
              type="button"
              $active={selectedTopic?.id === topic.id}
              aria-pressed={selectedTopic?.id === topic.id}
              aria-controls="advanced-context-browser"
              onClick={() => chooseTopic(topic)}
            >
              {topic.label}
              <small>{topic.description}</small>
            </TopicButton>
          ))}
        </CardGrid>
      </Section>

      <Section aria-label="Advanced region browser">
        <AdvancedToggle
          type="button"
          aria-expanded={advancedOpen}
          aria-controls="advanced-context-browser"
          onClick={() => {
            setAdvancedOpen((open) => !open)
            setFiltersOpen(false)
          }}
        >
          {advancedOpen ? 'Hide advanced browser' : 'Advanced: browse all 9,440 GIAB regions'}
        </AdvancedToggle>
      </Section>

      {advancedOpen && (
        <AdvancedPanel id="advanced-context-browser" aria-labelledby="advanced-browser-heading">
          <h2 id="advanced-browser-heading" ref={advancedHeadingRef} tabIndex={-1}>
            Advanced GIAB region browser
          </h2>
          {selectedTopic && (
            <TopicNotice>
              Topic: <strong>{selectedTopic.label}</strong>. Filters match any selected source and
              include both single- and multi-source regions.
            </TopicNotice>
          )}
          <p>
            Filter merged evidence regions while retaining each exact source BED interval. Opening
            Advanced directly starts with the 1,005 multi-source or reviewed regions.
          </p>

          <MobileFilterButton
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="context-filters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            {filtersOpen ? 'Hide filters' : 'Show filters'}
          </MobileFilterButton>
          <FiltersPanel id="context-filters" $open={filtersOpen}>
            <FilterGrid>
              <label>
                Find coordinate or reviewed locus
                <input
                  type="search"
                  value={filters.query}
                  placeholder="22:18,709,565-18,947,752 or IGL"
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
                    <span>
                      {category.label}
                      <small>{category.definition}</small>
                    </span>
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
                Named strata only
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
                  <option value="category">Category</option>
                </select>
              </label>
              <SecondaryButton type="button" onClick={resetFilters}>
                Clear filters
              </SecondaryButton>
            </FilterOptions>
          </FiltersPanel>

          {problem && <Problem role="alert">{problem.message}</Problem>}
          <ResultsSummary aria-live="polite" aria-atomic="true">
            Showing {filteredRegions.length.toLocaleString('en-US')} of{' '}
            {asset.regions.length.toLocaleString('en-US')} merged evidence regions. Counts and
            source bases overlap and are not additive.
          </ResultsSummary>

          {filteredRegions.length === 0 && !problem ? (
            <div>
              <p>No chr22 regions match these filters.</p>
              <SecondaryButton type="button" onClick={resetFilters}>
                Clear filters
              </SecondaryButton>
            </div>
          ) : (
            !problem && (
              <>
                <TableWrap>
                  <ResultsTable>
                    <caption>
                      Chr22 merged sequence-context evidence regions, 50 results per page
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Region</th>
                        <th scope="col">Span</th>
                        <th scope="col">Sequence context</th>
                        <th scope="col">Source intervals</th>
                        <th scope="col">Reviewed label</th>
                        <th scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRegions.map((region: ContextRegion) => {
                        const isExpanded = expanded.has(region.id)
                        const oversized = region.spanBp > 100_000
                        const evidenceId = detailId('details', region)
                        return (
                          <React.Fragment key={region.id}>
                            <tr data-testid="context-region-row">
                              <td data-label="Region">{formatRegion(region)}</td>
                              <td data-label="Span">{formatSpan(region.spanBp)}</td>
                              <td data-label="Sequence context">
                                <BadgeList>
                                  {region.categories.map((categoryId) => {
                                    const category = categoryById.get(categoryId)!
                                    return (
                                      <Badge
                                        key={categoryId}
                                        aria-label={`${category.label}: ${category.definition}`}
                                      >
                                        {category.shortLabel}
                                      </Badge>
                                    )
                                  })}
                                </BadgeList>
                              </td>
                              <td data-label="Source intervals">{region.evidence.length}</td>
                              <td data-label="Reviewed label">{region.curatedLabel || '—'}</td>
                              <td data-label="Actions">
                                <TableActions>
                                  <Link
                                    preserveSelectedDataset={false}
                                    to={longReadSummaryUrl(region)}
                                  >
                                    Explore long-read data
                                  </Link>
                                  <SecondaryButton
                                    type="button"
                                    aria-expanded={isExpanded}
                                    aria-controls={evidenceId}
                                    onClick={() => toggleDetails(region.id)}
                                  >
                                    Why this region?
                                  </SecondaryButton>
                                  {oversized && <small>Opens a bounded 100 kb window.</small>}
                                </TableActions>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr id={evidenceId}>
                                <DetailsCell colSpan={6}>
                                  <ExactEvidence region={region} categoryById={categoryById} />
                                </DetailsCell>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </ResultsTable>
                </TableWrap>
                <Pagination aria-label="Result pages">
                  <button
                    type="button"
                    disabled={safePage === 1}
                    onClick={() => {
                      setPage((current) => Math.max(1, current - 1))
                      setExpanded(new Set())
                    }}
                  >
                    Previous
                  </button>
                  <span>
                    Page {safePage} of {pageCount}
                  </span>
                  <button
                    type="button"
                    disabled={safePage === pageCount}
                    onClick={() => {
                      setPage((current) => Math.min(pageCount, current + 1))
                      setExpanded(new Set())
                    }}
                  >
                    Next
                  </button>
                </Pagination>
              </>
            )
          )}
        </AdvancedPanel>
      )}

      <Provenance>
        <summary>Methods &amp; provenance</summary>
        <p>
          This pilot uses pinned, offline static assets. It makes no runtime request to GIAB, NCBI,
          GraphQL, the gnomAD API, or ClickHouse for sequence-context data.
        </p>
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
