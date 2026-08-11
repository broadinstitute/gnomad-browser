import React from 'react'
import styled from 'styled-components'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'
import {
  CapabilityStatus,
  literatureWorkflowBrowserPath,
  LiteratureWorkflow,
  workflowBySlug,
} from './longReadLiteratureWorkflows'

const INDEX_PATH = '/long-read-literature-examples'

const statusLabels: Record<CapabilityStatus, string> = {
  'supported-and-usable': 'Supported and usable',
  'supported-but-awkward': 'Supported but awkward',
  underdeveloped: 'Underdeveloped',
  absent: 'Absent',
  'data-blocked': 'Data blocked',
  'inappropriate/unsafe': 'Inappropriate / unsafe',
}

const evidenceLabels = {
  P: 'P — Paper explicit',
  I: 'I — Analyst inferred',
  B: 'B — Browser observed',
}

const Header = styled.header`
  /* stylelint-disable order/properties-order, unit-whitelist, no-descending-specificity -- Follow existing styled-component conventions; the legacy config rejects CSS Grid's fr unit. */
  max-width: 960px;
  margin-bottom: 1.5rem;
`

const BackLink = styled.a`
  display: inline-block;
  margin-bottom: 0.8rem;
`

const Eyebrow = styled.div`
  color: #555;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.025em;
  text-transform: uppercase;
`

const Meta = styled.p`
  color: #555;
  line-height: 1.5;
`

const LinkRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem 1rem;
  margin: 1rem 0;
`

const PrimaryLink = styled.a`
  display: inline-block;
  border-radius: 4px;
  background: #1c4e80;
  color: #fff;
  font-weight: 700;
  padding: 0.55rem 0.85rem;
  text-decoration: none;

  &:hover,
  &:focus {
    background: #123654;
    color: #fff;
    text-decoration: underline;
  }
`

const BlockedBrowserNote = styled.p`
  color: #792525;
  font-weight: 700;
  margin: 0;
`

const ProvisionalBrowserAction = styled.div`
  align-items: flex-start;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
`

const ProvisionalBrowserNote = styled.p`
  color: #792525;
  font-weight: 700;
  margin: 0;
  max-width: 620px;
`

const Boundary = styled.div`
  border-left: 5px solid #b35c00;
  background: #fff5e8;
  margin: 1rem 0;
  max-width: 960px;
  padding: 0.8rem 1rem;

  strong {
    display: block;
    margin-bottom: 0.2rem;
  }
`

const Content = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.2rem;
  max-width: 1100px;
  min-width: 0;
`

const Panel = styled.section`
  border: 1px solid #d8d8d8;
  border-radius: 6px;
  min-width: 0;
  padding: 1rem 1.15rem;

  h2 {
    margin-top: 0;
  }
`

const PersonaGrid = styled.dl`
  display: grid;
  grid-template-columns: minmax(130px, 0.3fr) minmax(0, 1fr);
  gap: 0.4rem 1rem;
  margin-bottom: 0;

  dt {
    font-weight: 700;
  }

  dd {
    margin: 0;
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
    gap: 0.2rem;

    dd {
      margin-bottom: 0.6rem;
    }
  }
`

const PhaseGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;

  h3 {
    font-size: 1rem;
    margin-top: 0;
  }

  ol {
    margin-bottom: 0;
    padding-left: 1.4rem;
  }

  li + li {
    margin-top: 0.55rem;
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`

const BranchList = styled.ul`
  list-style: none;
  padding: 0;

  li {
    border-left: 4px solid #667;
    margin: 0.7rem 0;
    padding: 0.25rem 0 0.25rem 0.8rem;
  }
`

const Stop = styled.span`
  display: inline-block;
  border-radius: 3px;
  background: #8e2a2a;
  color: #fff;
  font-size: 0.78rem;
  font-weight: 700;
  margin-left: 0.5rem;
  padding: 0.1rem 0.35rem;
`

const Story = styled.dl`
  border-left: 5px solid #1c4e80;
  margin: 0;
  padding-left: 1rem;

  dt {
    font-weight: 700;
    margin-top: 0.7rem;
  }

  dt:first-child {
    margin-top: 0;
  }

  dd {
    margin: 0.15rem 0 0;
  }
`

const MatrixWrap = styled.div`
  max-width: 100%;
  overflow-x: auto;
`

const Matrix = styled.table`
  border-collapse: collapse;
  min-width: 700px;
  width: 100%;

  th,
  td {
    border-bottom: 1px solid #ddd;
    padding: 0.6rem;
    text-align: left;
    vertical-align: top;
  }

  th {
    background: #f4f4f4;
  }
`

const statusColors: Record<CapabilityStatus, { border: string; text: string }> = {
  'supported-and-usable': { border: '#2e8540', text: '#246c34' },
  'supported-but-awkward': { border: '#997404', text: '#765a03' },
  underdeveloped: { border: '#997404', text: '#765a03' },
  absent: { border: '#8e2a2a', text: '#7b2222' },
  'data-blocked': { border: '#8e2a2a', text: '#7b2222' },
  'inappropriate/unsafe': { border: '#8e2a2a', text: '#7b2222' },
}

const StatusBadge = styled.span<{ $status: CapabilityStatus }>`
  display: inline-block;
  border: 1px solid ${(props) => statusColors[props.$status].border};
  border-radius: 999px;
  color: ${(props) => statusColors[props.$status].text};
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  white-space: nowrap;
`

const TestGrid = styled.dl`
  display: grid;
  grid-template-columns: minmax(120px, 0.22fr) minmax(0, 1fr);
  gap: 0.55rem 1rem;

  dt {
    font-weight: 700;
  }

  dd {
    margin: 0;
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const Forbidden = styled.dd`
  color: #792525;
  font-weight: 700;
`

const EvidenceDetails = styled.details`
  border-top: 1px solid #ddd;
  padding: 0.75rem 0;

  &:last-child {
    padding-bottom: 0;
  }

  summary {
    cursor: pointer;
    font-weight: 700;
  }
`

const EvidenceList = styled.ul`
  padding-left: 1.25rem;

  li + li {
    margin-top: 0.65rem;
  }
`

const Basis = styled.p`
  background: #f4f4f4;
  font-size: 0.9rem;
  padding: 0.75rem;
`

const UnknownWorkflow = ({ slug }: { slug: string }) => (
  <InfoPage>
    <DocumentTitle title="Literature workflow not found" />
    <h1>Literature workflow not found</h1>
    <p>
      There is no curated detailed workflow for <code>{slug}</code>.
    </p>
    <p>The requested paper does not have a curated detail page.</p>
    <a href={INDEX_PATH}>Back to long-read literature examples</a>
  </InfoPage>
)

const WorkflowPage = ({ workflow }: { workflow: LiteratureWorkflow }) => {
  const browserPath = literatureWorkflowBrowserPath(workflow)
  const byClass = {
    P: workflow.evidence.filter((item) => item.class === 'P'),
    I: workflow.evidence.filter((item) => item.class === 'I'),
    B: workflow.evidence.filter((item) => item.class === 'B'),
  }
  let browserAction: React.ReactNode
  if (!browserPath) {
    browserAction = (
      <BlockedBrowserNote role="status">{workflow.browserRegionBlockedReason}</BlockedBrowserNote>
    )
  } else if (workflow.browserRegionStatus === 'provisional') {
    browserAction = (
      <ProvisionalBrowserAction>
        <PrimaryLink href={browserPath}>Open provisional locus overview</PrimaryLink>
        <ProvisionalBrowserNote role="status">
          {workflow.browserRegionNotice}
        </ProvisionalBrowserNote>
      </ProvisionalBrowserAction>
    )
  } else {
    browserAction = <PrimaryLink href={browserPath}>Try in browser</PrimaryLink>
  }

  return (
    <InfoPage>
      <DocumentTitle title={`${workflow.paper.title} — detailed workflow`} />
      <Header>
        <BackLink href={INDEX_PATH}>← Back to long-read literature examples</BackLink>
        <Eyebrow>
          Paper {workflow.ref} · {workflow.archetypes.join(' · ')}
        </Eyebrow>
        <h1>{workflow.paper.title}</h1>
        <Meta>
          {workflow.paper.venue} ({workflow.paper.year}) · {workflow.locus}
        </Meta>
        <LinkRow aria-label="Paper and browser links">
          {browserAction}
          {workflow.paper.pdfUrl && (
            <a href={workflow.paper.pdfUrl} target="_blank" rel="noopener noreferrer">
              PDF
            </a>
          )}
          {workflow.paper.pmid && (
            <a
              href={`https://pubmed.ncbi.nlm.nih.gov/${workflow.paper.pmid}/`}
              target="_blank"
              rel="noopener noreferrer"
            >
              PubMed
            </a>
          )}
          {workflow.paper.doi && (
            <a
              href={`https://doi.org/${workflow.paper.doi}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              DOI
            </a>
          )}
        </LinkRow>
        <Boundary role="note" aria-label="Non-diagnostic boundary">
          <strong>Population-reference research only — not diagnostic</strong>
          {workflow.nonDiagnosticBoundary}
        </Boundary>
      </Header>

      <Content>
        <Panel aria-labelledby="persona-heading">
          <h2 id="persona-heading">Who starts, and with what?</h2>
          <PersonaGrid>
            <dt>Mode</dt>
            <dd>{workflow.persona.mode}</dd>
            <dt>Persona</dt>
            <dd>{workflow.persona.role}</dd>
            <dt>Context</dt>
            <dd>{workflow.persona.context}</dd>
            <dt>Trigger</dt>
            <dd>{workflow.startingState.trigger}</dd>
          </PersonaGrid>
          <h3>Starting inputs</h3>
          <ul>
            {workflow.startingState.inputs.map((input) => (
              <li key={input}>{input}</li>
            ))}
          </ul>
          <h3>Bounded question</h3>
          <p>{workflow.startingState.question}</p>
          <p>
            <strong>Initial stop rule:</strong> {workflow.startingState.stopRule}
          </p>
        </Panel>

        <Panel aria-labelledby="workflow-heading">
          <h2 id="workflow-heading">Ordered workflow</h2>
          <PhaseGrid>
            {(
              [
                ['Before browser', workflow.workflow.before],
                ['In browser', workflow.workflow.inside],
                ['After browser', workflow.workflow.after],
              ] as const
            ).map(([heading, steps]) => (
              <section key={heading} aria-label={heading}>
                <h3>{heading}</h3>
                <ol>
                  {steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </section>
            ))}
          </PhaseGrid>
          <h3>Decision branches and uncertainty</h3>
          <BranchList>
            {workflow.branches.map((branch) => (
              <li key={branch.condition}>
                <strong>{branch.condition}</strong>
                {branch.stopRule && <Stop>Stop rule</Stop>}
                <br />
                {branch.action}
              </li>
            ))}
          </BranchList>
        </Panel>

        <Panel aria-labelledby="story-heading">
          <h2 id="story-heading">Exact Given / When / Then story</h2>
          <Story>
            <dt>Given</dt>
            <dd>{workflow.story.given}</dd>
            <dt>When</dt>
            <dd>{workflow.story.when}</dd>
            <dt>Then</dt>
            <dd>{workflow.story.then}.</dd>
          </Story>
        </Panel>

        <Panel aria-labelledby="capability-heading">
          <h2 id="capability-heading">Step-level capability matrix</h2>
          <MatrixWrap
            aria-label="Scrollable capability matrix; scroll horizontally to see all columns"
            role="region"
            tabIndex={0}
          >
            <Matrix>
              <thead>
                <tr>
                  <th scope="col">Workflow step</th>
                  <th scope="col">Status</th>
                  <th scope="col">Observed basis</th>
                </tr>
              </thead>
              <tbody>
                {workflow.capabilities.map((capability) => (
                  <tr key={capability.step}>
                    <th scope="row">{capability.step}</th>
                    <td>
                      <StatusBadge $status={capability.status}>
                        {statusLabels[capability.status]}
                      </StatusBadge>
                    </td>
                    <td>{capability.evidence}</td>
                  </tr>
                ))}
              </tbody>
            </Matrix>
          </MatrixWrap>
          <Basis>
            <strong>Live capability basis:</strong> {workflow.capabilityBasis}
          </Basis>
        </Panel>

        <Panel aria-labelledby="acceptance-heading">
          <h2 id="acceptance-heading">Acceptance test and forbidden interpretation</h2>
          <TestGrid>
            <dt>Fixture</dt>
            <dd>{workflow.acceptanceTest.fixture}</dd>
            <dt>Actions</dt>
            <dd>{workflow.acceptanceTest.actions}</dd>
            <dt>Expected</dt>
            <dd>{workflow.acceptanceTest.expected}</dd>
            <dt>Forbidden</dt>
            <Forbidden>{workflow.acceptanceTest.forbidden}</Forbidden>
          </TestGrid>
        </Panel>

        <Panel aria-labelledby="evidence-heading">
          <h2 id="evidence-heading">Evidence and citations</h2>
          <p>
            Claims retain their evidence class: paper fact (P), analyst reconstruction (I), or
            observed browser/API/source behavior (B). Open a class to review its citations.
          </p>
          {(Object.keys(byClass) as Array<keyof typeof byClass>).map((evidenceClass) => (
            <EvidenceDetails key={evidenceClass} open={evidenceClass === 'P'}>
              <summary>
                {evidenceLabels[evidenceClass]} ({byClass[evidenceClass].length})
              </summary>
              <EvidenceList>
                {byClass[evidenceClass].map((item) => (
                  <li key={`${item.claim}-${item.citation}`}>
                    {item.claim} <cite>{item.citation}</cite>
                  </li>
                ))}
              </EvidenceList>
            </EvidenceDetails>
          ))}
        </Panel>
      </Content>
    </InfoPage>
  )
}

type Props = {
  match: { params: { slug: string } }
}

const LongReadLiteratureWorkflowPage = ({ match }: Props) => {
  const { slug } = match.params
  const workflow = workflowBySlug.get(slug)
  return workflow ? <WorkflowPage workflow={workflow} /> : <UnknownWorkflow slug={slug} />
}

export default LongReadLiteratureWorkflowPage
