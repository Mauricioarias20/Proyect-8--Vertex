import React from 'react'

const Card: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div className="card">{children}</div>
)

export default Card
