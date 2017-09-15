import R from 'ramda'

export const getTranscriptsfromExons = R.pipe(R.pluck('transcript_id'), R.uniq)

export const groupExonsByTranscript = exons => exons.reduce((acc, exon) => {
  const { transcript_id } = exon
  if (!acc[transcript_id]) {
    return {
      ...acc,
      [transcript_id]: [
        exon,
      ],
    }
  }
  return ({
    ...acc,
    [transcript_id]: [
      ...acc[transcript_id],
      exon,
    ],
  })
}, {})
