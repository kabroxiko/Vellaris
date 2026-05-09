import React from 'react'
import PropTypes from 'prop-types'

export default function WorkingIndicator({ phase, className }) {
  const text = phase === 'generating' ? 'Generating map…' : 'Downloading map…'

  return (
    <div className={className} role="status" aria-live="polite">
      <div className="working-indicator-dot" aria-hidden="true" />
      <div className="working-indicator-text">{text}</div>
    </div>
  )
}

WorkingIndicator.propTypes = {
  phase: PropTypes.oneOf(['generating', 'downloading']).isRequired,
  className: PropTypes.string.isRequired,
}
