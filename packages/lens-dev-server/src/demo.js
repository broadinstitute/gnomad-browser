import React, { PropTypes } from 'react'
import { TrafficBar, TrafficArea} from 'lens-plot-traffic'
// import TranscriptDemo from 'lens-track-transcript/example/TranscriptTrack.example'
import css from './styles.css'

const Demo = () => {
  return (
    <div className={css.demo}>
      {'hardcoded!!!'}
      <TrafficBar />
      {/*<TrafficArea />*/}
    </div>
  )
}

export default Demo
