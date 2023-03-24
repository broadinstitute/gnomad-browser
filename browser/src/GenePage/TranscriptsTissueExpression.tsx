import { mean } from 'd3-array'
import React, { useState } from 'react'
import styled from 'styled-components'

import { Select } from '@gnomad/ui'

import { GTEX_TISSUE_NAMES } from '../gtex'

import sortedTranscripts from './sortedTranscripts'
import TranscriptsTissueExpressionPlot from './TranscriptsTissueExpressionPlot'

const ScrollWrapper = styled.div`
  display: inline-block;
  overflow-x: auto;
  overflow-y: hidden;
  width: 100%;
`

const isTranscriptCoding = (transcript: any) =>
  transcript.exons.some((exon: any) => exon.feature_type === 'CDS')

type OwnTranscriptsTissueExpressionProps = {
  transcripts: {
    transcript_id: string
    transcript_version: string
    exons: {
      feature_type: string
      start: number
      stop: number
    }[]
  }[]
  includeNonCodingTranscripts: boolean
  preferredTranscriptId?: string
  preferredTranscriptDescription?: string | React.ReactNode
  defaultSortTissuesBy?: 'alphabetical' | 'mean-expression'
}

export type GtexTissueExpression = {
  adipose_subcutaneous: number
  adipose_visceral_omentum: number
  adrenal_gland: number
  artery_aorta: number
  artery_coronary: number
  artery_tibial: number
  bladder: number
  brain_amygdala: number
  brain_anterior_cingulate_cortex_ba24: number
  brain_caudate_basal_ganglia: number
  brain_cerebellar_hemisphere: number
  brain_cerebellum: number
  brain_cortex: number
  brain_frontal_cortex_ba9: number
  brain_hippocampus: number
  brain_hypothalamus: number
  brain_nucleus_accumbens_basal_ganglia: number
  brain_putamen_basal_ganglia: number
  brain_spinal_cord_cervical_c_1: number
  brain_substantia_nigra: number
  breast_mammary_tissue: number
  cells_ebv_transformed_lymphocytes: number
  cells_transformed_fibroblasts: number
  cervix_ectocervix: number
  cervix_endocervix: number
  colon_sigmoid: number
  colon_transverse: number
  esophagus_gastroesophageal_junction: number
  esophagus_mucosa: number
  esophagus_muscularis: number
  fallopian_tube: number
  heart_atrial_appendage: number
  heart_left_ventricle: number
  kidney_cortex: number
  liver: number
  lung: number
  minor_salivary_gland: number
  muscle_skeletal: number
  nerve_tibial: number
  ovary: number
  pancreas: number
  pituitary: number
  prostate: number
  skin_not_sun_exposed_suprapubic: number
  skin_sun_exposed_lower_leg: number
  small_intestine_terminal_ileum: number
  spleen: number
  stomach: number
  testis: number
  thyroid: number
  uterus: number
  vagina: number
  whole_blood: number
}

// @ts-expect-error TS(2456) FIXME: Type alias 'TranscriptsTissueExpressionProps' circ... Remove this comment to see the full error message
type TranscriptsTissueExpressionProps = OwnTranscriptsTissueExpressionProps &
  typeof TranscriptsTissueExpression.defaultProps

// @ts-expect-error TS(7022) FIXME: 'TranscriptsTissueExpression' implicitly has type ... Remove this comment to see the full error message
const TranscriptsTissueExpression = ({
  transcripts,
  includeNonCodingTranscripts,
  preferredTranscriptId,
  preferredTranscriptDescription,
  defaultSortTissuesBy,
}: TranscriptsTissueExpressionProps) => {
  const [sortTranscriptsBy, setSortTranscriptsBy] = useState('default')

  let renderedTranscripts =
    sortTranscriptsBy === 'default'
      ? sortedTranscripts(transcripts, preferredTranscriptId)
      : [...transcripts].sort((t1, t2) => {
          const t1Expression = t1.gtex_tissue_expression[sortTranscriptsBy] || 0
          const t2Expression = t2.gtex_tissue_expression[sortTranscriptsBy] || 0

          if (t1Expression === t2Expression) {
            return t1.transcript_id.localeCompare(t2.transcript_id)
          }

          return t2Expression - t1Expression
        })

  const [sortTissuesBy, setSortTissuesBy] = useState(defaultSortTissuesBy)
  let tissues
  if (sortTissuesBy === 'mean-expression') {
    const meanExpressionByTissue = Object.keys(GTEX_TISSUE_NAMES).reduce(
      (acc, tissueId) => ({
        ...acc,
        [tissueId]: mean(
          transcripts.map((transcript: any) => transcript.gtex_tissue_expression[tissueId] || 0)
        ),
      }),
      {}
    )
    tissues = Object.entries(GTEX_TISSUE_NAMES)
      .sort((t1: any, t2: any) => {
        // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        const t1Expression = meanExpressionByTissue[t1[0]]
        // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        const t2Expression = meanExpressionByTissue[t2[0]]
        if (t1Expression === t2Expression) {
          return t1[1].localeCompare(t2[1])
        }
        return t2Expression - t1Expression
      })
      .map((t: any) => t[0])
  } else {
    tissues = Object.entries(GTEX_TISSUE_NAMES)
      .sort((t1: any, t2: any) => t1[1].localeCompare(t2[1]))
      .map((t: any) => t[0])
  }

  if (!includeNonCodingTranscripts) {
    renderedTranscripts = renderedTranscripts.filter(isTranscriptCoding)
  }

  return (
    <div>
      <div style={{ marginBottom: '1em' }}>
        <label htmlFor="transcript-tissue-expression-sort-transcripts-by">
          Sort transcripts by:{' '}
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Select
            id="transcript-tissue-expression-sort-transcripts-by"
            value={sortTranscriptsBy}
            onChange={(e: any) => setSortTranscriptsBy(e.target.value)}
          >
            <option value="default">Default</option>
            <optgroup label="Expression in tissue">
              {Object.entries(GTEX_TISSUE_NAMES).map(([tissueId, tissueName]) => {
                return (
                  <option key={tissueId} value={tissueId}>
                    {tissueName}
                  </option>
                )
              })}
            </optgroup>
          </Select>
        </label>
      </div>
      <div style={{ marginBottom: '1em' }}>
        <label htmlFor="transcript-tissue-expression-sort-tissues-by">
          Sort tissues by: {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Select
            id="transcript-tissue-expression-sort-tissues-by"
            value={sortTissuesBy}
            onChange={(e: any) => setSortTissuesBy(e.target.value)}
          >
            <option value="alphabetical">Alphabetical</option>
            <option value="mean-expression">Mean transcript expression in tissue</option>
          </Select>
        </label>
      </div>
      {preferredTranscriptDescription && <p>* {preferredTranscriptDescription}</p>}
      <ScrollWrapper>
        <TranscriptsTissueExpressionPlot
          tissues={tissues}
          transcripts={renderedTranscripts}
          starredTranscriptId={preferredTranscriptId}
        />
      </ScrollWrapper>
    </div>
  )
}

TranscriptsTissueExpression.defaultProps = {
  preferredTranscriptId: null,
  preferredTranscriptDescription: null,
  defaultSortTissuesBy: 'alphabetical',
}

export default TranscriptsTissueExpression
