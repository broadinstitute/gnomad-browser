import examplesData from './data/longReadLiteratureExamples.json'
import workflowData from './data/longReadLiteratureWorkflows.json'

export type CapabilityStatus =
  | 'supported-and-usable'
  | 'supported-but-awkward'
  | 'underdeveloped'
  | 'absent'
  | 'data-blocked'
  | 'inappropriate/unsafe'

export type WorkflowEvidenceClass = 'P' | 'I' | 'B'

type PaperIdentity = {
  title: string
  year: string
  venue: string
  pmid: string | null
  doi: string | null
  pdfUrl: string | null
}

export type LiteratureWorkflow = {
  schemaVersion: 1
  recordId: string
  ref: string
  slug: string
  paper: PaperIdentity
  archetypes: string[]
  locus: string
  persona: {
    mode: 'Research' | 'Clinical research'
    role: string
    context: string
  }
  nonDiagnosticBoundary: string
  startingState: {
    trigger: string
    inputs: string[]
    question: string
    stopRule: string
  }
  workflow: {
    before: string[]
    inside: string[]
    after: string[]
  }
  branches: Array<{ condition: string; action: string; stopRule: boolean }>
  story: { given: string; when: string; then: string }
  browserRegion: { chrom: string; start: number; stop: number } | null
  browserRegionBlockedReason?: string
  capabilities: Array<{ step: string; status: CapabilityStatus; evidence: string }>
  acceptanceTest: { fixture: string; actions: string; expected: string; forbidden: string }
  evidence: Array<{ class: WorkflowEvidenceClass; claim: string; citation: string }>
  capabilityBasis: string
}

type LiteratureExampleIdentity = {
  ref: string
  title: string
  pmid: string | null
  doi: string | null
  pdfUrl: string | null
}

export const literatureWorkflows = workflowData as LiteratureWorkflow[]

const examples = examplesData as LiteratureExampleIdentity[]
const seenSlugs = new Set<string>()
const seenRefs = new Set<string>()
const capabilityStatuses = new Set<CapabilityStatus>([
  'supported-and-usable',
  'supported-but-awkward',
  'underdeveloped',
  'absent',
  'data-blocked',
  'inappropriate/unsafe',
])
const evidenceClasses = new Set<WorkflowEvidenceClass>(['P', 'I', 'B'])

literatureWorkflows.forEach((workflow) => {
  const paper = examples.find((example) => example.ref === workflow.ref)
  if (!paper) {
    throw new Error(
      `Literature workflow ${workflow.slug} points to missing paper ref ${workflow.ref}`
    )
  }
  if (
    paper.title !== workflow.paper.title ||
    paper.pmid !== workflow.paper.pmid ||
    paper.doi !== workflow.paper.doi ||
    paper.pdfUrl !== workflow.paper.pdfUrl
  ) {
    throw new Error(`Literature workflow ${workflow.slug} does not match paper ref ${workflow.ref}`)
  }
  if (seenSlugs.has(workflow.slug) || seenRefs.has(workflow.ref)) {
    throw new Error(`Duplicate literature workflow ref or slug: ${workflow.ref}/${workflow.slug}`)
  }
  if (
    workflow.capabilities.some((capability) => !capabilityStatuses.has(capability.status)) ||
    workflow.evidence.some((evidence) => !evidenceClasses.has(evidence.class))
  ) {
    throw new Error(`Literature workflow ${workflow.slug} has an invalid status or evidence class`)
  }
  if (!workflow.browserRegion && !workflow.browserRegionBlockedReason) {
    throw new Error(`Literature workflow ${workflow.slug} has no browser region or blocked reason`)
  }
  seenSlugs.add(workflow.slug)
  seenRefs.add(workflow.ref)
})

export const workflowByRef = new Map(
  literatureWorkflows.map((workflow) => [workflow.ref, workflow])
)

export const workflowBySlug = new Map(
  literatureWorkflows.map((workflow) => [workflow.slug, workflow])
)

export const literatureWorkflowPath = (slug: string) =>
  `/long-read-literature-examples/paper/${slug}`

export const literatureWorkflowBrowserPath = (workflow: LiteratureWorkflow) => {
  if (!workflow.browserRegion) {
    return null
  }

  const { chrom, start, stop } = workflow.browserRegion
  const params = new URLSearchParams({
    dataset: 'gnomad_r4_lr',
    lr_cohort: 'hgsvc_hprc',
    show_haplotypes: 'true',
  })
  return `/region/${chrom}-${start}-${stop}?${params.toString()}`
}
