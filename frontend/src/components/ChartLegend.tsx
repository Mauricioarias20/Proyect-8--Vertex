import React from 'react'

type Item = { label: string; color: string }

const ChartLegend: React.FC<{ items: Item[] }> = ({ items }) => {
  if (!items || items.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
      {items.map(i => (
        <div key={i.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 12, height: 12, background: i.color, borderRadius: 3, display: 'inline-block', boxShadow: '0 0 0 1px rgba(0,0,0,0.06)' }} />
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{i.label}</span>
        </div>
      ))}
    </div>
  )
}

export default ChartLegend
