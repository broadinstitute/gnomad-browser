/* eslint-disable dot-notation */

import expect from 'expect'
import R from 'ramda'
import data from 'data/transcript-tools-CD33.json'  // eslint-disable-line

import {
  getTranscriptsfromExons,
  groupExonsByTranscript,
} from './index'

const exonList = data.gene.exons

describe('getTranscriptsfromExonList', () => {
  it('should get a list of unique transcript ids from exon list', () => {
    const transcriptList = getTranscriptsfromExons(exonList)
    expect(transcriptList).toEqual([
      'ENST00000436584',
      'ENST00000421133',
      'ENST00000391796',
      'ENST00000262262',
      'ENST00000601785',
      'ENST00000598473',
      'ENST00000600557',
    ])
  })
})

describe('groupExonsByTranscript', () => {
  it('should return the dictionary of transcript ids / exon lists', () => {
    const exonsByTranscript = groupExonsByTranscript(exonList)
    expect(exonsByTranscript['ENST00000436584'].length).toBe(12)
    expect(exonsByTranscript['ENST00000436584'][0]).toEqual({
      _id: '589d0fe145a2800021451f08',
      start: 51728321,
      transcript_id: 'ENST00000436584',
      feature_type: 'exon',
      strand: '+',
      stop: 51728412,
      chrom: '19',
      gene_id: 'ENSG00000105383',
    })
  })
})
