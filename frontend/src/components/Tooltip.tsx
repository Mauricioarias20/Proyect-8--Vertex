import React from 'react'

const Tooltip: React.FC<{ content: React.ReactNode; children: React.ReactElement; position?: 'top'|'right'|'bottom'|'left' }> = ({ content, children }) => {
  return (
    <span className="tooltip-wrapper" style={{position:'relative',display:'inline-block'}}>
      {children}
      <span className="tooltip" role="tooltip">{content}</span>
    </span>
  )
}

export default Tooltip
