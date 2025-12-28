import React from 'react'

export const Skeleton: React.FC<{lines?: number; height?: number}> = ({ lines = 3, height = 12 }) => {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {Array.from({length:lines}).map((_,i)=> (
        <div key={i} className={`skeleton ${i===0 ? 'large' : ''}`} style={{height:i===0?height*3:height}} />
      ))}
    </div>
  )
}

export default Skeleton
