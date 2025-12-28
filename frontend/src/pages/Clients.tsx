import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as clientsApi from '../services/clients'
import * as teamApi from '../services/team'
import Select from '../components/Select'
import ClientModal from '../components/ClientModal'
import BubbleButton from '../components/BubbleButton'
import Tooltip from '../components/Tooltip'
import { useToast } from '../components/ToastProvider'
import { Skeleton } from '../components/Skeleton'
import { useAuth } from '../context/AuthContext' 

const EmptyState: React.FC<{onCreate: ()=>void}> = ({onCreate}) => (
    <div className="empty-state card">
    <h3>No clients yet</h3>
    <p className="muted">You don't have any clients in this portfolio. Click <strong>New Client</strong> to add one.</p>
    <div style={{marginTop:12}}>
      <BubbleButton className="btn primary" onClick={onCreate}>New Client</BubbleButton>
    </div>
  </div>
)

const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<clientsApi.Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<clientsApi.Client | null>(null)
  const [suggestions, setSuggestions] = useState<Record<string, clientsApi.NextAction | null>>({})
  const [showArchived, setShowArchived] = useState(false)
  const [stateFilter, setStateFilter] = useState<string | null>(null)
  const [userFilter, setUserFilter] = useState<string | null>(null)
  const [q, setQ] = useState<string>('')
  const [team, setTeam] = useState<{ username: string; email: string }[]>([])

  const { user, isOwner, isManager, isStaff } = useAuth()
  const navigate = useNavigate()

  const fetchSuggestions = async (list: clientsApi.Client[]) => {
    const pairs = await Promise.all(list.map(async c => {
      try { const s = await clientsApi.getNextAction(c.id); return [c.id, s] as const }
      catch { return [c.id, null] as const }
    }))
    setSuggestions(Object.fromEntries(pairs))
  }

  const toast = useToast()

  const fetch = async () => {
    setLoading(true); setError(null)
    try {
      const res = await clientsApi.listClients({ archived: showArchived, state: stateFilter ?? undefined, userId: userFilter ?? undefined, q: q || undefined })
      setClients(res)
      // fetch per-client suggestion (lightweight heuristic)
      fetchSuggestions(res)
    } catch (err: any) {
      setError(err?.error || err?.message || 'Failed to load')
      toast.push({ message: 'Failed to load clients', type: 'error' })
    } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])
  useEffect(() => { fetch() }, [showArchived, stateFilter, userFilter, q])

  useEffect(() => {
    let cancelled = false
    teamApi.listTeam().then(list=>{ if (!cancelled) setTeam(list.map(m => ({ username: m.username, email: m.email }))) }).catch(()=>{})
    return ()=>{ cancelled=true }
  }, [])

  const create = async (data: { name: string; email: string; clientState?: string; userId?: string }) => {
    setError(null)
    try {
      const res = await clientsApi.createClient(data)
      setClients(prev => [res, ...prev])
      setModalOpen(false)
      toast.push({ message: 'Client created', type: 'success' })
    } catch (err: any) {
      setError(err?.error || err?.message || 'Failed to create')
      toast.push({ message: 'Failed to create client', type: 'error' })
    }
  }

  const save = async (data: { name: string; email: string; clientState?: string; userId?: string }) => {
    setError(null)
    try {
      if (!editing) return await create(data)
      const res = await clientsApi.updateClient(editing.id, data)
      setClients(prev => prev.map(c => c.id === res.id ? res : c))
      setEditing(null)
      setModalOpen(false)
      toast.push({ message: 'Client updated', type: 'success' })
    } catch (err: any) {
      setError(err?.error || err?.message || 'Failed to save')
      toast.push({ message: 'Failed to update client', type: 'error' })
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this client?')) return
    setError(null)
    try {
      await clientsApi.deleteClient(id)
      setClients(prev => prev.filter(c => c.id !== id))
      toast.push({ message: 'Client deleted', type: 'success' })
    } catch (err: any) {
      setError(err?.error || err?.message || 'Failed to delete')
      toast.push({ message: 'Failed to delete client', type: 'error' })
    }
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <h2>Client Portfolio</h2>
        <div>
          <BubbleButton className="btn primary" onClick={() => { setEditing(null); setModalOpen(true) }}>New Client</BubbleButton>
          <button className="btn" style={{marginLeft:8}} onClick={() => setShowArchived(s => !s)}>{showArchived ? 'Show active' : 'Show archived'}</button>
        </div>
      </div>

      <div className="filters-row">
        <input className="filter-input" placeholder="Search name or email" value={q} onChange={e=>setQ(e.target.value)} />
        <Select options={[{ value: '', label: 'All status' }, { value: 'lead', label: 'Lead' }, { value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }, { value: 'churned', label: 'Churned' }]} value={stateFilter ?? ''} onChange={v=>setStateFilter(v || null)} />
        <Select options={[{ value: '', label: 'All owners' }, ...team.map(t => ({ value: t.email, label: t.username }))]} value={userFilter ?? ''} onChange={v=>setUserFilter(v || null)} />
      </div>

      {loading ? <div className="card"><Skeleton lines={4} /></div> : null}
      {error ? <div className="card" style={{color:'var(--danger)'}}>{error}</div> : null}

      {!loading && clients.length === 0 ? <EmptyState onCreate={() => { setModalOpen(true) }} /> : (
        <div className="card">
          <table className="clients-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Operational Health</th><th>Status</th><th>Suggested</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {clients.map(c => {
                const bs = c.businessStatus ?? 'active'
                const bsColor = bs === 'active' ? 'var(--success)' : bs === 'at-risk' ? 'var(--warning)' : 'var(--danger)'
                const sug = suggestions[c.id]
                const health = c.health
                const healthColor = health ? (health.status === 'Healthy' ? 'var(--success)' : health.status === 'At Risk' ? 'var(--warning)' : 'var(--danger)') : 'var(--muted)'

                return (
                <tr key={c.id}>
                  <td style={{display:'flex',alignItems:'center',gap:8}} title={c.lastActivityAt ? `${c.daysSinceLast} days since last activity` : 'No activity yet'}>
                    <span style={{width:10,height:10,background:bsColor,borderRadius:6,display:'inline-block',boxShadow:'0 0 0 1px rgba(0,0,0,0.06)'}} />
                    <span>{c.name}</span>
                  </td>
                  <td>{c.email}</td>
                  <td>
                    {health ? (
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:10,height:10,background:healthColor,borderRadius:6}} />
                        <div style={{fontSize:13}}>{health.score}% <small style={{color:'#888',marginLeft:6}}>{health.status}</small></div>
                      </div>
                    ) : (
                      <span style={{fontSize:13,color:'var(--muted)'}}>-</span>
                    )}
                  </td>
                  <td><span className={`status-badge ${c.clientState}`}>{c.clientState}</span></td>
                  <td style={{maxWidth:220}}>{sug ? <span style={{fontSize:13}}>{sug.label} <small style={{color:'#888',marginLeft:6}}>({Math.round(sug.score*100)}%)</small></span> : <span style={{color:'var(--muted)'}}>-</span>}</td>
                  <td>{new Date(c.createdAt).toLocaleString()}</td>
                  <td style={{textAlign:'right'}}>
                    { (isOwner || isManager || isStaff) ? (
                      <>
                        <Tooltip content="Edit client"><button className="btn" onClick={() => { setEditing(c); setModalOpen(true) }}>Edit</button></Tooltip>
                        <Tooltip content="Delete client"><button className="btn" onClick={() => remove(c.id)} style={{marginLeft:8}}>Delete</button></Tooltip>
                        <Tooltip content="Open timeline"><button className="btn" onClick={() => navigate(`/clients/${c.id}/timeline`)} style={{marginLeft:8}}>Timeline</button></Tooltip>
                        {!c.archived ? (
                          <Tooltip content="Archive client">
                          <button type="button" className="btn icon-btn" aria-label="Archive client" style={{marginLeft:8}} onClick={async ()=>{
                            if (!confirm('Archive this client?')) return
                            try { await clientsApi.archiveClient(c.id); setClients(prev => prev.filter(p=>p.id!==c.id)); toast.push({ message: 'Client archived', type: 'success' }) } catch (err:any) { setError(err?.error||err?.message||'Failed to archive'); toast.push({ message: 'Failed to archive', type: 'error' }) }
                          }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                              <rect x="3.5" y="3.5" width="17" height="3" rx="0.8" stroke="currentColor" strokeWidth="1.2" fill="none" />
                              <rect x="4" y="7" width="16" height="11" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
                              <rect x="8" y="11" width="8" height="2" rx="0.6" fill="currentColor" />
                            </svg>
                          </button>
                          </Tooltip>
                        ) : (
                          <Tooltip content="Unarchive client">
                          <button type="button" className="btn icon-btn" aria-label="Unarchive client" style={{marginLeft:8}} onClick={async ()=>{
                            try { await clientsApi.unarchiveClient(c.id); setClients(prev => prev.filter(p=>p.id!==c.id)); toast.push({ message: 'Client unarchived', type: 'success' }) } catch (err:any) { setError(err?.error||err?.message||'Failed to unarchive'); toast.push({ message: 'Failed to unarchive', type: 'error' }) }
                          }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                              <rect x="4" y="7" width="16" height="11" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
                              <path d="M12 9v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                              <rect x="8" y="11" width="8" height="2" rx="0.6" fill="currentColor" />
                            </svg>
                          </button>
                          </Tooltip>
                        )}
                      </>
                    ) : (
                      <>
                        <button className="btn" onClick={() => navigate(`/clients/${c.id}/timeline`)}>Timeline</button>
                        <span style={{color:'var(--muted)',marginLeft:8}}>Managed by owners</span>
                      </>
                    )}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}

      <ClientModal open={modalOpen} onClose={() => setModalOpen(false)} initial={editing ? { name: editing.name, email: editing.email, clientState: editing.clientState, userId: editing.userId } : undefined} onSave={save} />
    </div>
  )
}

export default ClientsPage
