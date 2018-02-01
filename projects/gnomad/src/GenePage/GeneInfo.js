/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable camelcase */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import { geneData, regionalConstraint, currentTranscript } from '@broad/redux-genes'

import {
  variantCount,
  selectedVariantDataset,
  actions as variantActions,
} from '@broad/redux-variants'

import {
  GeneInfoWrapper,
  GeneNameWrapper,
  GeneSymbol,
  GeneLongName,
  GeneDetails,
  GeneAttributes,
  GeneAttributeKeys,
  GeneAttributeKey,
  GeneAttributeValues,
  GeneAttributeValue,
} from '@broad/ui'


import { ConstraintTable, ConstraintTablePlaceholder } from './Constraint'

const GeneInfo = ({
  geneData,
  variantCount,
  selectedVariantDataset,
  setSelectedVariantDataset,
  regionalConstraint,
  currentTranscript,
}) => {
  const {
    gene_name,
    gene_id,
    start,
    stop,
    chrom,
    full_gene_name,
    omim_accession,
    exacv1_constraint,
    canonical_transcript,
  } = geneData.toJS()
  return (
    <GeneInfoWrapper>
      <GeneNameWrapper>
        <GeneSymbol>{gene_name}</GeneSymbol>
        <GeneLongName>{full_gene_name}</GeneLongName>
      </GeneNameWrapper>
      <GeneDetails>
        <GeneAttributes>
          <GeneAttributeKeys>
            <GeneAttributeKey>
              Ensembl gene ID
            </GeneAttributeKey>
            <GeneAttributeKey>
              Ensembl transcript ID
            </GeneAttributeKey>
            <GeneAttributeKey>
              Number of variants
            </GeneAttributeKey>
            <GeneAttributeKey>
              UCSC Browser
            </GeneAttributeKey>
            <GeneAttributeKey>
              GeneCards
            </GeneAttributeKey>
            <GeneAttributeKey>
              OMIM
            </GeneAttributeKey>
            {/* <GeneAttributeKey>
              External references
            </GeneAttributeKey> */}
          </GeneAttributeKeys>
          <GeneAttributeValues>
            <GeneAttributeValue>
              <a
                target="_blank"
                href={`http://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${gene_id}`}
              >
                {gene_id}
              </a>
            </GeneAttributeValue>
            <GeneAttributeValue>
              <a
                target="_blank"
                href={`http://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${currentTranscript}`}
              >
                {currentTranscript || `${canonical_transcript} (canonical)`}
              </a>
            </GeneAttributeValue>
            <GeneAttributeValue>
              {variantCount}
            </GeneAttributeValue>
            <GeneAttributeValue>
              <a
                target="_blank"
                href={`http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg19&position=chr${chrom}%3A${start - 1}-${stop}&hgt.customText=http://personal.broadinstitute.org/ruderfer/exac/exac-final.autosome-1pct-sq60-qc-prot-coding.cnv.bed`}
              >
                {`${chrom}:${start}:${stop}`}
              </a>
            </GeneAttributeValue>
            <GeneAttributeValue>
              <a
                target="_blank"
                href={`http://www.genecards.org/cgi-bin/carddisp.pl?gene=${gene_name}`}
              >
                {gene_name}
              </a>
            </GeneAttributeValue>
            <GeneAttributeValue>
              <a
                target="_blank"
                href={`http://omim.org/entry/${omim_accession}`}
              >
                {omim_accession || 'N/A'}
              </a>
            </GeneAttributeValue>
            {/* <GeneAttributeValue>
              <a
                target="_blank"
                href={`http://en.wikipedia.org/wiki/${gene_name}`}
              >
                PubMed
              </a>
            </GeneAttributeValue>
            <GeneAttributeValue>
              <a
                target="_blank"
                href={`http://en.wikipedia.org/wiki/${gene_name}`}
              >
                Wikipedia
              </a>
            </GeneAttributeValue>
            <GeneAttributeValue>
              <a
                target="_blank"
                href={`http://www.wikigenes.org/?search=${gene_name}`}
              >
                Wikigenes
              </a>
            </GeneAttributeValue>
            <GeneAttributeValue>
              <a
                target="_blank"
                href={`http://www.gtexportal.org/home/gene/${gene_name}`}
              >
                GTEx (Expression)
              </a>
            </GeneAttributeValue> */}
          </GeneAttributeValues>
        </GeneAttributes>
        {selectedVariantDataset === 'exacVariants' && exacv1_constraint &&
          <ConstraintTable
            constraintData={exacv1_constraint}
            setSelectedVariantDataset={setSelectedVariantDataset}
            selectedVariantDataset={selectedVariantDataset}
          />}
        {selectedVariantDataset === 'exacVariants' && !exacv1_constraint &&
        <ConstraintTablePlaceholder
          message={'ExAC constraint not available for this gene'}
          setSelectedVariantDataset={setSelectedVariantDataset}
          selectedVariantDataset={selectedVariantDataset}
        />}
        {selectedVariantDataset === 'gnomadCombinedVariants' &&
          <ConstraintTablePlaceholder
            message={'gnomAD constraint coming soon!'}
            setSelectedVariantDataset={setSelectedVariantDataset}
            selectedVariantDataset={selectedVariantDataset}
          />}
      </GeneDetails>
    </GeneInfoWrapper>
  )
}

GeneInfo.propTypes = {
  geneData: PropTypes.object.isRequired,
  variantCount: PropTypes.number.isRequired,
  selectedVariantDataset: PropTypes.string.isRequired,
  regionalConstraint: PropTypes.array,
}

export default connect(
  state => ({
    geneData: geneData(state),
    variantCount: variantCount(state),
    selectedVariantDataset: selectedVariantDataset(state),
    regionalConstraint: regionalConstraint(state),
    currentTranscript: currentTranscript(state),
  }),
  dispatch => ({
    setSelectedVariantDataset: dataset =>
      dispatch(variantActions.setSelectedVariantDataset(dataset)),
  })
)(GeneInfo)
