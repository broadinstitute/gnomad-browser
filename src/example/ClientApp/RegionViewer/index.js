import React, { PropTypes } from 'react'

import {
  groupExonsByTranscript,
  RegionViewer,
  TranscriptTrack,
} from 'react-gnomad'

import css from './styles.css'

console.log(css)

const attributeConfig = {
  CDS: {
    color: '#375D81',
    thickness: '30px',
  },
  start_pad: {
    color: '#183152',
    thickness: '5px',
  },
  end_pad: {
    color: '#183152',
    thickness: '5px',
  },
  intron: {
    color: '#183152',
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
        padding={75}
        regions={canonicalExons}
        regionAttributes={attributeConfig}
      >
        <TranscriptTrack
          css={css}
          transcriptsGrouped={transcriptsGrouped}
          height={20}
        />
      </RegionViewer>
    </div>
  )
}
GeneRegion.propTypes = {
  gene: PropTypes.object.isRequired,
}
export default GeneRegion
