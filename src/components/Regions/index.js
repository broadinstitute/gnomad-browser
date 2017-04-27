import React, { PropTypes } from 'react'

import {
  groupExonsByTranscript,
  RegionViewer,
  TranscriptTrack,
} from 'react-gnomad'

import css from './styles.css'

const attributeConfig = {
  CDS: {
    color: '#424242',
    thickness: '30px',
  },
  start_pad: {
    color: '#e0e0e0',
    thickness: '5px',
  },
  end_pad: {
    color: '#e0e0e0',
    thickness: '5px',
  },
  intron: {
    color: '#e0e0e0',
    thickness: '5px',
  },
  default: {
    color: '#grey',
    thickness: '5px',
  },
}

const GeneRegion = ({ gene }) => {
  const geneExons = gene.exons
  const canonicalExons = gene.transcript.exons

  const transcriptsGrouped = groupExonsByTranscript(geneExons)

  return (
    <div className={css.geneRegion}>
      <RegionViewer
        css={css}
        width={1100}
        regions={canonicalExons}
        regionAttributes={attributeConfig}
      >
        <TranscriptTrack
          transcriptsGrouped={transcriptsGrouped}
          height={15}
        />
      </RegionViewer>
    </div>
  )
}
GeneRegion.propTypes = {
  gene: PropTypes.object.isRequired,
}
export default GeneRegion
