import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchJSON } from '../services/api'
import { highlightMatch } from '../utils'

type Item = { type: 'client'|'activity'|'note'; id: string; title: string; snippet?: string; clientId?: string }

const DEBOUNCE_MS = 300

const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Item[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timer = useRef<number | null>(null)
  const nav = useNavigate()
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current)
    if (!query.trim()) { setResults([]); setLoading(false); return }
    setLoading(true)
    timer.current = window.setTimeout(async () => {
      try {
        const res = await fetchJSON(`/api/search?q=${encodeURIComponent(query)}`) as Item[]
        setResults(res)
        setOpen(true)
      } catch (err) {
        setResults([])
      } finally { setLoading(false) }
    }, DEBOUNCE_MS)
  }, [query])

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'Enter' && results.length > 0) {
      const it = results[0]
      gotoItem(it)
    }
  }

  const gotoItem = (it: Item) => {
    setOpen(false)
    if (it.type === 'client') return nav('/clients')
    if (it.type === 'activity') return nav('/activities')
    if (it.type === 'note') return nav('/notes')
  }

  return (
    <div ref={rootRef} style={{position:'relative'}}>
      <input className="search" placeholder="Search clients, activities, notes..." value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={onKeyDown} onFocus={()=>{ if (results.length) setOpen(true) }} />

      {open && ( <div className="search-dropdown card" style={{position:'absolute',left:0,top:40,width:520,maxHeight:320,overflow:'auto',zIndex:40,background:'rgba(15,15,20,0.95)',backdropFilter:'blur(8px)'}}>
        {loading ? <div style={{padding:12}}>Searching…</div> : (
          <div>
            {results.length === 0 ? <div style={{padding:12,color:'rgba(255,255,255,0.7)'}}>No results</div> : (
              <div style={{padding:8}}>
                {results.map(r => (
                  <div key={`${r.type}-${r.id}`} style={{padding:'8px 6px',borderBottom:'1px solid rgba(255,255,255,0.08)',cursor:'pointer',background:'rgba(255,255,255,0.01)',transition:'background 150ms'}} onMouseEnter={(e)=>e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={(e)=>e.currentTarget.style.background='rgba(255,255,255,0.01)'} onClick={()=>gotoItem(r)}>
                    <div style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,0.95)'}} dangerouslySetInnerHTML={{__html: highlightMatch(r.title, query)}} />
                    {r.snippet ? <div style={{fontSize:12,color:'rgba(255,255,255,0.6)',marginTop:6}} dangerouslySetInnerHTML={{__html: highlightMatch(r.snippet, query)}} /> : null}
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',marginTop:6}}>{r.type}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div> )}
    </div>
  )
}

export default GlobalSearch
