import React, { useRef, useEffect, useState } from 'react'

type Props = {
  data: Array<{ label: string; value: number }>
  height?: number
  color?: string | ((label: string) => string)
  showValueLabels?: boolean
  formatValue?: (n: number) => string
}

const SimpleBarChart: React.FC<Props> = ({ data, height = 120, color = 'var(--warning)', showValueLabels = true, formatValue = n => String(n) }) => {
  if (!data || data.length === 0) return <div style={{ color: 'var(--muted)' }}>No data</div>

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(500)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setWidth(Math.max(300, Math.floor(e.contentRect.width)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const w = width
  const h = height
  const pad = 32
  const max = Math.max(...data.map(d => d.value), 1)
  const colW = (w - pad * 2) / data.length
  const bw = colW * 0.7

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [data])

  return (
    <div ref={containerRef}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block' }}>
        {/* horizontal grid and y labels */}
        {Array.from({ length: 5 }).map((_, i) => {
          const v = Math.round((max * i) / 4)
          const y = h - pad - (v / Math.max(1, max)) * (h - pad * 2)
          return (
            <g key={i}>
              <line x1={pad} x2={w - pad} y1={y} y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
              <text x={8} y={y + 4} fill="rgba(255,255,255,0.6)" fontSize={11}>{formatValue(v)}</text>
            </g>
          )
        })}

        {data.map((d, i) => {
          const x = pad + i * colW + (colW - bw) / 2
          const barH = (d.value / Math.max(1, max)) * (h - pad * 2)
          const y = h - pad - barH
          const resolvedColor = typeof color === 'function' ? color(d.label) : color
          const valueLabelInside = barH > 22

          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={bw}
                height={barH}
                fill={resolvedColor}
                rx={4}
                style={{
                  transformOrigin: `${x + bw / 2}px ${h - pad}px`,
                  transform: mounted ? 'scaleY(1)' : 'scaleY(0)',
                  transition: 'transform 600ms cubic-bezier(.2,.9,.2,1)'
                }}
              />

              {showValueLabels && (
                <text x={x + bw / 2} y={valueLabelInside ? y + 16 : y - 6} fill={valueLabelInside ? '#fff' : 'rgba(255,255,255,0.9)'} fontSize={11} textAnchor="middle">
                  {formatValue(d.value)}
                </text>
              )}

              <text x={x + bw / 2} y={h - 8} fill="rgba(255,255,255,0.6)" fontSize={11} textAnchor="middle">{d.label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default SimpleBarChart
