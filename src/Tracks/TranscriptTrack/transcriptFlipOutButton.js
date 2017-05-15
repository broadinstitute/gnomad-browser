import React, { PropTypes } from 'react'
// import fewerTranscripts from './transcript-flip-out-less.svg'
// import moreTranscripts from './transcript-flip-out-more.svg'

const fewerTranscripts = (
  <svg>
    <rect x="13.2" y="16.7" width="9.5" height="9.1" />
    <rect x="24.6" y="16.7" width="18.3" height="9.1" />
    <rect x="44.8" y="16.7" width="28.8" height="9.1" />
    <rect x="75.4" y="16.7" width="9.5" height="9.1" />
  </svg>
)

const moreTranscripts = (
  <svg>
    <rect x="14.5" y="10.4" width="9.5" height="3.7" />
    <rect x="25.8" y="10.4" width="18.3" height="3.7" />
    <rect x="46.1" y="10.4" width="28.8" height="3.7" />
    <rect x="14.5" y="15.9" width="9.5" height="3.7" />
    <rect x="76.7" y="10.4" width="9.5" height="3.7" />
    <rect x="25.8" y="15.9" width="18.3" height="3.7" />
    <rect x="46.1" y="15.9" width="28.8" height="3.7" />
    <rect x="14.5" y="21.5" width="9.5" height="3.7" />
    <rect x="76.7" y="21.5" width="9.5" height="3.7" />
    <rect x="46.1" y="21.5" width="28.8" height="3.7" />
    <rect x="14.5" y="27.1" width="9.5" height="3.7" />
    <rect x="76.7" y="27.1" width="9.5" height="3.7" />
    <rect x="25.8" y="27.1" width="18.3" height="3.7" />
  </svg>
)

const TranscriptFlipOutButton = ({ css, localHeight, leftPanelWidth, onClick }) => {
  return (
    <div className={css.transcriptFlipOutButtonContainer}>
      <button
        className={css.transcriptFlipOutButton}
        style={{
          height: localHeight - 10,
          width: leftPanelWidth - 10,
        }}
        onClick={onClick}
      >
        +
      </button>
    </div>
  )
}
TranscriptFlipOutButton.propTypes = {
  css: PropTypes.object.isRequired,
  localHeight: PropTypes.number.isRequired,
  leftPanelWidth: PropTypes.number.isRequired,
  onClick: PropTypes.func.isRequired,
}
export default TranscriptFlipOutButton
