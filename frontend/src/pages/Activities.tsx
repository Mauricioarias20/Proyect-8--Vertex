import React, { useEffect, useState } from 'react'
import * as activitiesApi from '../services/activities'
import * as clientsApi from '../services/clients'
import Select from '../components/Select'
import ActivityModal from '../components/ActivityModal'
import BubbleButton from '../components/BubbleButton'
import Tooltip from '../components/Tooltip'
import { useToast } from '../components/ToastProvider'
import { Skeleton } from '../components/Skeleton'

const formatDate = (iso: string) => new Date(iso).toLocaleString()

const Activities: React.FC = () => {
  const [activities, setActivities] = useState<activitiesApi.Activity[]>([])
  const [clients, setClients] = useState<clientsApi.Client[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<activitiesApi.Activity | null>(null)

  // Filters
  const [filterClient, setFilterClient] = useState<string | undefined>(undefined)
  const [filterTypes, setFilterTypes] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined)
  const [filterStart, setFilterStart] = useState<string | undefined>(undefined)
  const [filterEnd, setFilterEnd] = useState<string | undefined>(undefined)
  const [filterQ, setFilterQ] = useState<string | undefined>(undefined)

  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const [acts, cls] = await Promise.all([activitiesApi.listActivities({ clientId: filterClient, types: filterTypes.length ? filterTypes : undefined, status: filterStatus, start: filterStart, end: filterEnd, q: filterQ }), clientsApi.listClients()])
      setActivities(acts)
      setClients(cls)
    } catch (err:any) {
      toast.push({ message: 'Failed to load activities', type: 'error' })
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])
  useEffect(() => { load() }, [filterClient, filterTypes, filterStatus, filterStart, filterEnd, filterQ])

  const onSave = async (data: { type: activitiesApi.ActivityType; description: string; date: string; clientId: string; activityStatus?: string }) => {
    try {
      if (editing) {
        await activitiesApi.updateActivity(editing.id, data)
        toast.push({ message: 'Activity updated', type: 'success' })
      } else {
        await activitiesApi.createActivity(data)
        toast.push({ message: 'Activity created', type: 'success' })
      }
      setEditing(null)
      await load()
    } catch (err:any) {
      toast.push({ message: 'Failed to save activity', type: 'error' })
    }
  }

  const onDelete = async (id: string) => {
    if (!confirm('Delete activity?')) return
    try {
      await activitiesApi.deleteActivity(id)
      await load()
      toast.push({ message: 'Activity deleted', type: 'success' })
    } catch (err:any) {
      toast.push({ message: 'Failed to delete', type: 'error' })
    }
  }

  // Get overdue activities (scheduled and in the past)
  const now = new Date().getTime()
  const overdueCount = activities.filter(a => {
    const actDate = new Date(a.date).getTime()
    return a.activityStatus === 'scheduled' && actDate < now
  }).length

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h2>Agency Activity Feed</h2>
        <div style={{display:'flex',gap:8}}>
          <button className="btn" onClick={()=>{setEditing(null); setModalOpen(true)}}>New Activity</button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-row" style={{marginTop:12}}>
        <div className="filter-group">
          <label>Client</label>
          <Select options={[{ value: '', label: 'All clients' }, ...clients.map(c => ({ value: c.id, label: c.name }))]} value={filterClient || ''} onChange={v => setFilterClient(v || undefined)} />
        </div>
        <div className="filter-group">
          <label>Type</label>
          <div className="filter-checkboxes">
            {['call','meeting','proposal','task'].map(t => (
              <label key={t} className="checkbox-label">
                <input type="checkbox" checked={filterTypes.includes(t)} onChange={e=>{
                  if (e.target.checked) setFilterTypes(prev => [...prev, t])
                  else setFilterTypes(prev => prev.filter(x=>x!==t))
                }} /> <span className="checkbox-text">{t}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <Select options={[{ value: '', label: 'All' }, { value: 'scheduled', label: 'scheduled' }, { value: 'completed', label: 'completed' }, { value: 'missed', label: 'missed' }, { value: 'cancelled', label: 'cancelled' }]} value={filterStatus || ''} onChange={v => setFilterStatus(v || undefined)} />
        </div>
        <div className="filter-group">
          <label>Start</label>
          <div>
            <input className="filter-input" type="date" value={filterStart ? filterStart.split('T')[0] : ''} onChange={e=>setFilterStart(e.target.value ? new Date(e.target.value).toISOString() : undefined)} />
          </div>
        </div>
        <div className="filter-group">
          <label>End</label>
          <div>
            <input className="filter-input" type="date" value={filterEnd ? filterEnd.split('T')[0] : ''} onChange={e=>setFilterEnd(e.target.value ? new Date(e.target.value).toISOString() : undefined)} />
          </div>
        </div>
        <div className="filters-actions">
          <label>Search</label>
          <div>
            <input className="filter-input" placeholder="Search activities or type" value={filterQ||''} onChange={e=>setFilterQ(e.target.value || undefined)} />
          </div>
        </div>
      </div>

      {overdueCount > 0 && (
        <div style={{marginTop:12,padding:10,background:'linear-gradient(90deg, rgba(255,100,100,0.06), rgba(255,100,100,0.02))',border:'1px solid rgba(255,100,100,0.12)',borderRadius:6}}>
          <strong style={{color:'var(--danger)'}}>{overdueCount} overdue activity{overdueCount>1?'ies':''}</strong> — auto-completed on load. Review and update if needed.
        </div>
      )}

      <div style={{marginTop:12}}>
        {loading ? <div className="card"><Skeleton lines={4} /></div> : (
          activities.length === 0 ? <div className="card empty-state"><h3>No activities yet</h3><p className="muted">Create an activity to start tracking agency work.</p></div> : (
            <div className="timeline">
              {activities.map(a => {
                const client = clients.find(c=>c.id === a.clientId)
                const slug = a.type.toLowerCase().replace(/[^a-z0-9]+/g,'-')
                return (
                  <div className="timeline-item" key={a.id}>
                    <div className="timeline-item-left">
                      <div className={`badge type-${slug}`}>{a.type}</div>
                      <div style={{marginTop:6}}>
                        <span className={`badge status-${a.activityStatus}`}>{a.activityStatus}</span>
                      </div>
                      <div className="time">{formatDate(a.date)}</div>
                    </div>
                    <div className="timeline-item-body">
                      <div className="timeline-item-title">{client ? client.name : 'Unknown client'}</div>
                      <div className="timeline-item-desc">{a.description}</div>
                      <div style={{marginTop:8}}>
                        <Tooltip content="Edit activity"><button className="btn" onClick={()=>{setEditing(a); setModalOpen(true)}}>Edit</button></Tooltip>
                        <Tooltip content="Delete activity"><button className="btn" onClick={()=>onDelete(a.id)} style={{marginLeft:8}}>Delete</button></Tooltip>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>

      <ActivityModal open={modalOpen} onClose={()=>setModalOpen(false)} onSave={onSave} initial={editing ? { type: editing.type, description: editing.description, date: editing.date, clientId: editing.clientId, activityStatus: editing.activityStatus } : undefined} />
    </div>
  )
}

export default Activities
