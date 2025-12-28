import React, { useRef, useState, useEffect } from 'react'

type Props = { data: Array<{ x: string; y: number }>; height?: number; color?: string }

const SimpleLineChart: React.FC<Props> = ({ data, height = 120, color = 'var(--primary-1)' }) => {
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

  const values = data.map(d => d.y)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const w = width
  const h = height
  const pad = 32

  // scales
  const yRange = Math.max(1, max - min)
  const xStep = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0

  // path d
  const dPath = data.map((d, i) => {
    const x = pad + i * xStep
    const y = h - pad - ((d.y - min) / yRange) * (h - pad * 2)
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')

  // y ticks (4 ticks)
  const yTicks = 4
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => Math.round(min + (yRange * i / yTicks)))

  // x ticks: pick up to 6 ticks
  const maxXTicks = 6
  const xTickIndexes: number[] = []
  if (data.length <= maxXTicks) {
    for (let i = 0; i < data.length; i++) xTickIndexes.push(i)
  } else {
    const stepIdx = Math.ceil((data.length - 1) / (maxXTicks - 1))
    for (let i = 0; i < data.length; i += stepIdx) xTickIndexes.push(i)
    if (!xTickIndexes.includes(data.length - 1)) xTickIndexes.push(data.length - 1)
  }

  const formatX = (s: string) => {
    // use Intl to format yyyy-mm-dd to short month/day when possible
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (m) {
      try {
        const dt = new Date(s + 'T00:00:00')
        return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      } catch { return `${m[2]}/${m[3]}` }
    }
    return s.length > 10 ? s.slice(0, 10) : s
  }

  const pathRef = useRef<SVGPathElement | null>(null)
  const [pathLength, setPathLength] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(false)
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [data])

  useEffect(() => {
    if (pathRef.current) {
      try {
        const l = (pathRef.current as any).getTotalLength()
        setPathLength(l)
      } catch { setPathLength(0) }
    }
  }, [dPath, width])

  const [hover, setHover] = useState<{ index: number; left: number; top: number } | null>(null)

  useEffect(() => {
    // hide tooltip on resize
    const onResize = () => setHover(null)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const onMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const svgWidth = rect.width || (w)
    const px = Math.max(0, Math.min(svgWidth, x))
    const ratio = (px - pad) / (svgWidth - pad * 2)
    const idx = Math.round((data.length - 1) * Math.max(0, Math.min(1, ratio)))
    const clamped = Math.max(0, Math.min(data.length - 1, idx))

    // compute svg coords to position tooltip
    const svgX = pad + clamped * xStep
    const svgY = h - pad - ((data[clamped].y - min) / yRange) * (h - pad * 2)

    setHover({ index: clamped, left: svgX, top: svgY })
  }

  const onLeave = () => setHover(null)

  return (
    <div style={{ position: 'relative' }} ref={containerRef} onMouseMove={onMouseMove} onMouseLeave={onLeave}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* horizontal grid and y-axis labels */}
        {yTickValues.map((v, idx) => {
          const y = h - pad - ((v - min) / yRange) * (h - pad * 2)
          return (
            <g key={idx}>
              <line x1={pad} x2={w - pad} y1={y} y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
              <text x={8} y={y + 4} fill="rgba(255,255,255,0.6)" fontSize={11}>{v}</text>
            </g>
          )
        })}

        {/* x-axis labels */}
        {xTickIndexes.map(i => {
          const x = pad + i * xStep
          const label = formatX(String(data[i].x))
          return <text key={i} x={x} y={h - 6} fill="rgba(255,255,255,0.6)" fontSize={11} textAnchor="middle">{label}</text>
        })}

        {/* area and line */}
        <path d={`${dPath} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`} fill="url(#g1)" stroke="none" />
        <path
          ref={pathRef}
          d={dPath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: pathLength,
            strokeDashoffset: mounted ? 0 : pathLength,
            transition: 'stroke-dashoffset 700ms ease'
          }}
        />

        {/* markers */}
        {data.map((d, i) => {
          const x = pad + i * xStep
          const y = h - pad - ((d.y - min) / yRange) * (h - pad * 2)
          return <circle key={i} cx={x} cy={y} r={3} fill={color} style={{ transition: 'r 250ms' }} />
        })}

        {/* hover highlight */}
        {hover && (
          <g>
            <circle cx={hover.left} cy={hover.top} r={6} fill="none" stroke={color} strokeWidth={2} />
          </g>
        )}

      </svg>

      {hover && (
        <div className="chart-tooltip" style={{ position: 'absolute', left: Math.max(8, hover.left - 40), top: Math.max(8, hover.top - 40) }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{data[hover.index].y}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{data[hover.index].x}</div>
        </div>
      )}
    </div>
  )
}

export default SimpleLineChart
