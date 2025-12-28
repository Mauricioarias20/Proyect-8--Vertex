import React, { useEffect, useState } from 'react'
import BubbleButton from './BubbleButton'
import Select from './Select'
import { useAuth } from '../context/AuthContext'

type Props = {
  open: boolean
  onClose: () => void
  onSave: (data: { name: string; email: string; clientState: string; userId?: string }) => Promise<void>
  initial?: { name: string; email: string; clientState: string; userId?: string }
}

const ClientModal: React.FC<Props> = ({ open, onClose, onSave, initial }) => {
  const [name, setName] = useState(initial?.name || '')
  const [email, setEmail] = useState(initial?.email || '')
  const [clientState, setClientState] = useState(initial?.clientState || 'lead')
  const [userId, setUserId] = useState<string | undefined>(initial?.userId)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { user } = useAuth()
  const [members, setMembers] = useState<{ username: string; email: string }[]>([])

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        if (user?.role === 'owner' || user?.role === 'manager') {
          const team = await (await import('../services/team')).listTeam()
          setMembers(team)
        }
      } catch (e) { /* ignore errors */ }
    }
    if (open) fetchMembers()
  }, [open, user])

  useEffect(() => {
    if (open) {
      setName(initial?.name || '')
      setEmail(initial?.email || '')
      setClientState(initial?.clientState || 'lead')
      setError(null)
    }
  }, [open, initial])

  if (!open) return null

  const save = async () => {
    setLoading(true)
    setError(null)
    try {
      await onSave({ name, email, clientState, userId })
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
        <h3>{initial ? 'Edit Client' : 'New Client'}</h3>
        <div style={{marginBottom:8}}>
          <label>Name</label>
          <input value={name} onChange={e=>setName(e.target.value)} />
        </div>
        <div style={{marginBottom:8}}>
          <label>Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div style={{marginBottom:8}}>
          <label>Client State</label>
          <div style={{marginTop:6}}>
            <Select options={[{value:'lead',label:'Lead'},{value:'active',label:'Active'},{value:'paused',label:'Paused'},{value:'churned',label:'Churned'}]} value={clientState} onChange={v=>setClientState(v)} />
          </div>
        </div>
        {(user?.role === 'owner' || user?.role === 'manager') && (
          <div style={{marginBottom:8}}>
            <label>Assign to</label>
            <select value={userId || ''} onChange={e=>setUserId(e.target.value || undefined)}>
              <option value="">(unassigned)</option>
              {members.map(m => <option key={m.email} value={m.email}>{m.username} — {m.email}</option>)}
            </select>
          </div>
        )}
        {error && <div style={{color:'var(--danger)',marginBottom:8}}>{error}</div>}
        <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
          <button className="btn" onClick={onClose} disabled={loading}>Cancel</button>
          <BubbleButton className="btn primary" onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save'}</BubbleButton>
        </div>
      </div>
    </div>
  )
}

export default ClientModal
