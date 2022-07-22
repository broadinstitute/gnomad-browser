import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'

const Delayed = ({ children, delay }: any) => {
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    const renderTimeout = setTimeout(() => {
      setShouldRender(true)
    }, delay)

    return () => {
      clearTimeout(renderTimeout)
    }
  })

  return shouldRender ? children : null
}

Delayed.propTypes = {
  children: PropTypes.node.isRequired,
  delay: PropTypes.number,
}

Delayed.defaultProps = {
  delay: 150,
}

export default Delayed
