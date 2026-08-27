export type BugReportContext = {
  route: {
    pathname?: string
    search?: string
  }
  section?: {
    sectionName: string
    datasetId: string
    entityDescription: string
  }
}

export const buildBugReportBody = (
  error: Error,
  bugDescription: string,
  context: BugReportContext
): string => {
  const sectionContextBlock = context.section
    ? `\n**Section**: ${context.section.sectionName}\n\n**Context**: ${context.section.entityDescription} (dataset: ${context.section.datasetId})\n`
    : ''

  return `
**Description**: ${bugDescription}
${sectionContextBlock}
**Error message**: ${error.message}

**Stack trace**:
\`\`\`
${error.stack}
\`\`\`

**Route**: ${context.route.pathname}${context.route.search}

**Browser**: ${navigator.userAgent}
`
}

export const buildBugReportUrls = (error: Error, body: string) => {
  const issueURL = `https://github.com/broadinstitute/gnomad-browser/issues/new?title=${encodeURIComponent(
    error.message
  )}&body=${encodeURIComponent(body)}&labels=Type%3A%20Bug`

  const forumURL = `https://discuss.gnomad.broadinstitute.org/new-topic?title=topic%20${encodeURIComponent(
    error.message
  )}&body=${encodeURIComponent(body)}&category=Browser&tags=bug`

  const emailURL = `mailto:gnomad@broadinstitute.org?subject=${encodeURIComponent(
    'Browser bug report'
  )}&body=${encodeURIComponent(body.replace(/```\n/g, ''))}`

  return { issueURL, forumURL, emailURL }
}
