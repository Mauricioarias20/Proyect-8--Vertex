import React from 'react'
import { NavLink } from 'react-router-dom'

const Sidebar: React.FC<{open?: boolean; onClose?: () => void}> = ({ open = false, onClose }) => {
  const svgRef = React.useRef<SVGSVGElement | null>(null)

  React.useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const bubbles = Array.from(svg.querySelectorAll<SVGCircleElement>('.bubble'))
    bubbles.forEach((el) => {
      // random duration between 7s and 16s for slower, longer climbs
      const dur = 7 + Math.random() * 9
      // random negative delay to stagger initial positions
      const delay = -Math.random() * dur
      // slightly larger sizes: scale between 0.95 and 1.3
      const scale = 0.95 + Math.random() * 0.35
      // increase radius modestly between ~1.6 and ~3.4
      const newR = +(1.6 + Math.random() * 1.8).toFixed(1)
      // add a stronger black outline to each bubble for contrast
      el.setAttribute('r', String(newR))
      el.setAttribute('stroke', 'rgba(0,0,0,1)')
      el.setAttribute('stroke-width', '1.8')
      el.setAttribute('stroke-linejoin', 'round')
      el.setAttribute('stroke-linecap', 'round')
      el.style.setProperty('--dur', `${dur}s`)
      el.style.setProperty('--delay', `${delay}s`)
      el.style.setProperty('--scale', String(scale))
    })
  }, [])

  // Lock body scroll when sidebar is opened on mobile
  React.useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  return (
    <>
      {/* Backdrop for mobile overlay */}
      <div className={"sidebar-backdrop" + (open ? ' visible' : '')} onClick={onClose} aria-hidden={!open}></div>

      <aside className={"sidebar" + (open ? ' mobile-open' : '')} role="navigation" aria-hidden={!open && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width:900px)').matches}>
        <div className="sidebar-header">
          <div className="sidebar-brand">Vertex</div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({isActive}) => isActive? 'nav-item active' : 'nav-item'} onClick={onClose}>Dashboard</NavLink>
          <NavLink to="/clients" className={({isActive}) => isActive? 'nav-item active' : 'nav-item'} onClick={onClose}>Client Portfolio</NavLink>
          <NavLink to="/activities" className={({isActive}) => isActive? 'nav-item active' : 'nav-item'} onClick={onClose}>Agency Activity Feed</NavLink>
          <NavLink to="/analytics" className={({isActive}) => isActive? 'nav-item active' : 'nav-item'} onClick={onClose}>Performance Overview</NavLink>
          <NavLink to="/team" className={({isActive}) => isActive? 'nav-item active' : 'nav-item'} onClick={onClose}>Team Overview</NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-chart" aria-hidden="true">
            <svg ref={svgRef} width="140" height="64" viewBox="0 0 140 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="chart-svg" aria-hidden="true">
              <rect className="bar bar-1" x="12" y="26" width="16" height="28" rx="3" fill="currentColor" />
              <rect className="bar bar-2" x="36" y="18" width="16" height="36" rx="3" fill="currentColor" />
              <rect className="bar bar-3" x="60" y="12" width="16" height="42" rx="3" fill="currentColor" />
              <rect className="bar bar-4" x="84" y="22" width="16" height="32" rx="3" fill="currentColor" />
              <rect className="bar bar-5" x="108" y="16" width="16" height="38" rx="3" fill="currentColor" />

              {/* Celeste neon bubbles (decorative). Each bubble subtly rises and fades. */}
              <g className="bubbles" aria-hidden="true">
                <circle className="bubble b1" cx="12" cy="56" r="1.8" />
                <circle className="bubble b2" cx="28" cy="58" r="2.2" />
                <circle className="bubble b3" cx="44" cy="56" r="2.0" />
                <circle className="bubble b4" cx="58" cy="54" r="1.6" />
                <circle className="bubble b5" cx="72" cy="52" r="2.4" />
                <circle className="bubble b6" cx="86" cy="50" r="2.0" />
                <circle className="bubble b7" cx="100" cy="49" r="1.9" />
                <circle className="bubble b8" cx="114" cy="52" r="2.6" />
                <circle className="bubble b9" cx="30" cy="50" r="1.7" />
                <circle className="bubble b10" cx="52" cy="58" r="2.3" />
                <circle className="bubble b11" cx="92" cy="46" r="2.1" />
                <circle className="bubble b12" cx="120" cy="56" r="1.9" />
              </g>
            </svg>
          </div>
          <div className="sidebar-caption">Insights</div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
