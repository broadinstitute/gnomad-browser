import PropTypes from 'prop-types'
import React, { useState, useEffect } from 'react'
import styled from 'styled-components'

import { ExternalLink } from '@gnomad/ui'

import TranscriptConsequence from '../VariantPage/TranscriptConsequence'

const AttributeName = styled.dt`
  display: inline;

  ::after {
    content: ': ';
  }
`

const AttributeValue = styled.dd`
  display: inline;
  margin: 0;
`

const AttributeList = styled.dl`
  display: flex;
  flex-direction: column;
  margin: 0;
`

const HmtVarInfo = ({ variant }) => {
  const [response, setResponse] = useState(null)

  const url = `https://www.hmtvar.uniba.it/api/main/mutation/${variant.ref}${variant.pos}${variant.alt}`

  useEffect(() => {
    fetch(url)
      .then(r => r.json())
      .then(setResponse, () => {})
  }, [url])

  return (
    response && (
      <div style={{ marginTop: '0.25em' }}>
        <AttributeName>
          <ExternalLink href="https://www.hmtvar.uniba.it/">HmtVar</ExternalLink>
        </AttributeName>
        <AttributeValue>
          {response.pathogenicity
            .split('_')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')}{' '}
          ({response.disease_score.toPrecision(3)})
        </AttributeValue>
      </div>
    )
  )
}

HmtVarInfo.propTypes = {
  variant: PropTypes.shape({
    pos: PropTypes.number.isRequired,
    ref: PropTypes.string.isRequired,
    alt: PropTypes.string.isRequired,
  }).isRequired,
}

const MitochondrialVariantTranscriptConsequence = ({ consequence, variant }) => {
  if (variant.mitotip_trna_prediction || variant.pon_mt_trna_prediction) {
    return (
      <AttributeList>
        {variant.mitotip_trna_prediction && (
          <div style={{ marginTop: '0.25em' }}>
            <AttributeName>
              <ExternalLink href="https://www.mitomap.org/MITOMAP/MitoTipInfo">
                MitoTIP
              </ExternalLink>
            </AttributeName>
            <AttributeValue>
              {variant.mitotip_trna_prediction} ({variant.mitotip_score.toPrecision(3)})
            </AttributeValue>
          </div>
        )}
        {variant.pon_mt_trna_prediction && (
          <div style={{ marginTop: '0.25em' }}>
            <AttributeName>
              <ExternalLink href="http://structure.bmc.lu.se/PON-mt-tRNA/about.html/">
                PON-mt-tRNA
              </ExternalLink>
            </AttributeName>
            <AttributeValue>
              {variant.pon_mt_trna_prediction} (
              {variant.pon_ml_probability_of_pathogenicity.toPrecision(3)})
            </AttributeValue>
          </div>
        )}
        <HmtVarInfo variant={variant} />
      </AttributeList>
    )
  }

  return <TranscriptConsequence consequence={consequence} />
}

MitochondrialVariantTranscriptConsequence.propTypes = {
  consequence: PropTypes.any.isRequired, // eslint-disable-line react/forbid-prop-types
  variant: PropTypes.shape({
    mitotip_score: PropTypes.number,
    mitotip_trna_prediction: PropTypes.string,
    pon_ml_probability_of_pathogenicity: PropTypes.number,
    pon_mt_trna_prediction: PropTypes.string,
  }).isRequired,
}

export default MitochondrialVariantTranscriptConsequence
