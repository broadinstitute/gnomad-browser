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
  pmid: string
  doi: string
  pdfUrl: string
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
  browserRegion: { chrom: string; start: number; stop: number }
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
  const { chrom, start, stop } = workflow.browserRegion
  const params = new URLSearchParams({
    dataset: 'gnomad_r4_lr',
    lr_cohort: 'hgsvc_hprc',
    show_haplotypes: 'true',
  })
  return `/region/${chrom}-${start}-${stop}?${params.toString()}`
}
