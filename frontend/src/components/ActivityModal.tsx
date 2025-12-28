import React, { useEffect, useState } from 'react'
import BubbleButton from './BubbleButton'
import Select from './Select'
import * as activitiesApi from '../services/activities'
import * as clientsApi from '../services/clients'

type Props = {
  open: boolean
  onClose: () => void
  onSave: (data: { type: activitiesApi.ActivityType; description: string; date: string; clientId: string; activityStatus?: string }) => Promise<void>
  initial?: { type: activitiesApi.ActivityType; description: string; date: string; clientId: string; activityStatus?: string }
}

const ActivityModal: React.FC<Props> = ({ open, onClose, onSave, initial }) => {
  const [type, setType] = useState<activitiesApi.ActivityType>(initial?.type || 'call')
  const [customType, setCustomType] = useState('')
  const [description, setDescription] = useState(initial?.description || '')
  const [date, setDate] = useState(initial?.date ? new Date(initial.date).toISOString().slice(0,16) : new Date().toISOString().slice(0,16))
  const [clientId, setClientId] = useState(initial?.clientId || '')
  const [activityStatus, setActivityStatus] = useState(initial?.activityStatus || 'scheduled')
  const [clients, setClients] = useState<clientsApi.Client[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      // if initial type is custom, preselect 'other' and populate customType
      const knownTypes = ['call','meeting','proposal','task']
      if (initial?.type && !knownTypes.includes(initial.type)) {
        setType('other')
        setCustomType(initial.type)
      } else {
        setType(initial?.type || 'call')
        setCustomType('')
      }
      setDescription(initial?.description || '')
      setDate(initial?.date ? new Date(initial.date).toISOString().slice(0,16) : new Date().toISOString().slice(0,16))
      setClientId(initial?.clientId || '')
      setActivityStatus(initial?.activityStatus || 'scheduled')
      setError(null)
      clientsApi.listClients().then(res => {
        setClients(res)
        // if no initial client and there are clients, select first by default
        if (!initial?.clientId && res.length > 0) setClientId(res[0].id)
      }).catch(()=>{})
    }
  }, [open, initial])

  if (!open) return null

  const save = async () => {
    if (!clientId) {
      setError('Please select a client before saving')
      return
    }

    // compute final outgoing type
    const outgoingType = type === 'other' ? customType.trim() : (type as string)
    if (!outgoingType) {
      setError('Please provide a custom type')
      return
    }

    const payload = { type: outgoingType as any, description, date: new Date(date).toISOString(), clientId, activityStatus }

    setLoading(true)
    setError(null)
    try {
      await onSave(payload)
      onClose()
    } catch (err: any) {
      setError(err?.error || err?.message || 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3>{initial ? 'Edit Activity' : 'New Activity'}</h3>
        <div style={{marginBottom:8}}>
          <label>Type</label>
          <div style={{marginTop:6}}>
            <Select options={[{value:'call',label:'Call'},{value:'meeting',label:'Meeting'},{value:'proposal',label:'Proposal'},{value:'task',label:'Task'},{value:'other',label:'Other'}]} value={type} onChange={(v:any)=>setType(v)} />
          </div>
          {type === 'other' && (
            <div style={{marginTop:8}}>
              <input placeholder="Custom type (e.g. 'Design review')" value={customType} onChange={e=>setCustomType(e.target.value)} />
            </div>
          )}
        </div>
        <div style={{marginBottom:8}}>
          <label>Client</label>
          <div style={{marginTop:6}}>
            <Select options={clients.map(c=>({value:c.id,label:c.name}))} value={clientId} onChange={(v:any)=>setClientId(v)} />
          </div>
        </div>
        <div style={{marginBottom:8}}>
          <label>Date & time</label>
          <input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} />
        </div>
        <div style={{marginBottom:8}}>
          <label>Activity Status</label>
          <div style={{marginTop:6}}>
            <Select options={[{value:'scheduled',label:'Scheduled'},{value:'completed',label:'Completed'},{value:'missed',label:'Missed'},{value:'cancelled',label:'Cancelled'}]} value={activityStatus} onChange={(v:any)=>setActivityStatus(v)} />
          </div>
        </div>
        <div style={{marginBottom:8}}>
          <label>Description</label>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} />
        </div>
        {error && <div style={{color:'var(--danger)',marginBottom:8}}>{error}</div>}
        {clients.length === 0 && <div style={{color: 'var(--muted)', marginBottom:8}}>No clients available — create a client first.</div>}
        <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
          <button className="btn" onClick={onClose} disabled={loading}>Cancel</button>
          <BubbleButton className="btn primary" onClick={save} disabled={loading || !clientId || clients.length===0}>{loading ? 'Saving...' : 'Save'}</BubbleButton>
        </div>
      </div>
    </div>
  )
}

export default ActivityModal
