import React, { PropTypes } from 'react'
// import LensTest from 'lens-test'
import Traffic from 'lens-plot-traffic'
// import TranscriptDemo from 'lens-track-transcript/example/TranscriptTrack.example'
import css from './styles.css'

const Demo = () => {
  return (
    <div className={css.demo}>
      {'hardcoded!!!'}
      {/*<LensTest message={'hello'} />*/}
      <Traffic />
    </div>
  )
}

export default Demo
