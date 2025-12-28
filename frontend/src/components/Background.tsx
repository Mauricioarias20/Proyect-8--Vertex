import React from 'react'

// Replaced heavy Three.js plane with lightweight CSS overlays to avoid the cyan block.
const Background: React.FC = () => {
  return (
    <div aria-hidden style={{position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none'}}>
      <div className="bg-overlay" />
      <div className="bg-tilt" />
    </div>
  )
}

export default Background
