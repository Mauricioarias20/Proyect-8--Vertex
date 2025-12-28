import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import * as clientsApi from '../services/clients'
import BubbleButton from '../components/BubbleButton'
import { useAuth } from '../context/AuthContext'

const knownTypes = ['call','meeting','proposal','task']

const TimelinePage: React.FC = () => {
  const { id } = useParams<{id: string}>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [groupBy, setGroupBy] = useState<'day'|'week'|'none'>('day')
  const [types, setTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{ total: number; groups: any[] } | null>(null)

  const fetch = async () => {
    if (!id) return
    setLoading(true); setError(null)
    try {
      const res = await clientsApi.getTimeline(id, { types, groupBy, limit: 500 })
      setData(res)
    } catch (err: any) {
      setError(err?.error || err?.message || 'Failed to load timeline')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [id, types, groupBy])

  const toggleType = (t: string) => setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div>
          <h2>Timeline</h2>
          <div style={{fontSize:13,color:'#666'}}>{id ? `Client: ${id}` : ''}</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <div>
            <label style={{marginRight:8}}>Group:</label>
            <select value={groupBy} onChange={(e)=>setGroupBy(e.target.value as any)}>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="none">None</option>
            </select>
          </div>
          <div style={{display:'flex',gap:8}}>
            {knownTypes.map(t => (
              <label key={t} style={{fontSize:13}}>
                <input type="checkbox" checked={types.includes(t)} onChange={() => toggleType(t)} /> {t}
              </label>
            ))}
          </div>
          <BubbleButton className="btn" onClick={()=>fetch()}>Refresh</BubbleButton>
          <button className="btn" onClick={()=>navigate('/clients')}>Back</button>
        </div>
      </div>

      {loading ? <div className="card">Loading…</div> : null}
      {error ? <div className="card" style={{color:'var(--danger)'}}>{error}</div> : null}

      {data && data.groups.length === 0 ? <div className="card">No timeline events</div> : null}

      {data?.groups.map(group => (
        <div key={group.key} className="card" style={{marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div style={{fontWeight:600}}>{group.label} <span style={{fontSize:12,color:'#888',marginLeft:8}}>{group.items.length} events</span></div>
          </div>
          <div>
            {group.items.map((it: any) => (
              <div key={it.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderTop:'1px solid rgba(0,0,0,0.04)'}}>
                <div>
                  <div style={{fontWeight:600}}>{it.type} <small style={{color:'#666',marginLeft:8}}>{new Date(it.date).toLocaleString()}</small></div>
                  <div style={{color:'#333'}}>{it.description}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:13,color:'#666'}}>{it.activityStatus}</div>
                  <div style={{fontSize:12,color:'#666',marginTop:6}}>{it.userId}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

    </div>
  )
}

export default TimelinePage
