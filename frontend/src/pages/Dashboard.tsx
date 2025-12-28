import React, { useEffect, useState } from 'react'
import * as clientsApi from '../services/clients'
import * as activitiesApi from '../services/activities'
import ActivityModal from '../components/ActivityModal'
import ClientModal from '../components/ClientModal'
import BubbleButton from '../components/BubbleButton'
import { useAuth } from '../context/AuthContext'

const Metric: React.FC<{label: string; value: string | number}> = ({label, value}) => (
  <div className="metric">
    <div className="metric-value">{value}</div>
    <div className="metric-label">{label}</div>
  </div>
)

const Dashboard: React.FC = () => {
  const [clients, setClients] = useState<clientsApi.Client[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [atRiskCount, setAtRiskCount] = useState(0)
  const [recent, setRecent] = useState<activitiesApi.Activity[]>([])
  const [upcoming, setUpcoming] = useState<activitiesApi.Activity[]>([])
  const [clientsNoRecent, setClientsNoRecent] = useState<any[]>([])
  const [activitiesModalOpen, setActivitiesModalOpen] = useState(false)
  const [clientModalOpen, setClientModalOpen] = useState(false)
  const { user } = useAuth()

  const onCreateClient = async (data: { name: string; email: string; status?: string }) => {
    try {
      await clientsApi.createClient(data)
      // refresh clients and related stats
      const [cls, recents] = await Promise.all([clientsApi.listClients(), activitiesApi.listRecent(5)])
      setClients(cls)
      setRecent(recents)
      const stats = await import('../services/stats')
      const [up, noRecent] = await Promise.all([stats.upcomingActivities(5), stats.clientsNoRecent(30)])
      setUpcoming(up)
      setClientsNoRecent(noRecent)
    } catch (err: any) {
      alert(err?.error || err?.message || 'Failed to create client (permission?)')
    }
  }
  useEffect(() => {
    let mounted = true
    setLoadingClients(true)
    clientsApi.listClients()
      .then(res => { if (mounted) setClients(res) })
      .catch(() => {})
      .finally(() => { if (mounted) setLoadingClients(false) })

    // Get at-risk clients count
    clientsApi.getAtRiskClients().then(res => { if (mounted) setAtRiskCount(res.count) }).catch(()=>{})

    activitiesApi.listRecent(5).then(res => { if (mounted) setRecent(res) }).catch(()=>{})
    // upcoming activities
    import('../services/stats').then(s => s.upcomingActivities(5).then(res => { if (mounted) setUpcoming(res) }).catch(()=>{}))
    // clients without recent activity
    import('../services/stats').then(s => s.clientsNoRecent(30).then(res => { if (mounted) setClientsNoRecent(res) }).catch(()=>{}))

    return () => { mounted = false }
  }, [])

  // Auto-refresh every 30 seconds to keep data fresh
  useEffect(() => {
    let mounted = true
    const refreshInterval = setInterval(() => {
      if (mounted) {
        clientsApi.listClients().then(res => { if (mounted) setClients(res) }).catch(()=>{})
        clientsApi.getAtRiskClients().then(res => { if (mounted) setAtRiskCount(res.count) }).catch(()=>{})
        activitiesApi.listRecent(5).then(res => { if (mounted) setRecent(res) }).catch(()=>{})
      }
    }, 30000) // 30 seconds

    return () => {
      mounted = false
      clearInterval(refreshInterval)
    }
  }, [])

  const activeCount = clients.filter(c => c.businessStatus === 'active').length
  const atRiskCountCalc = clients.filter(c => c.businessStatus === 'at-risk').length
  const inactiveCount = clients.filter(c => c.businessStatus === 'inactive').length

  const onCreateActivity = async (data: { type: activitiesApi.ActivityType; description: string; date: string; clientId: string }) => {
    await activitiesApi.createActivity(data)
    const updated = await activitiesApi.listRecent(5)
    setRecent(updated)
  }

  return (
    <div className="dashboard-grid">
      <div className="panel overview">
        <h2>Overview</h2>
        <div className="metrics">
          <Metric label="Active Clients" value={loadingClients ? '…' : activeCount} />
          <Metric label="At risk" value={loadingClients ? '…' : atRiskCountCalc} />
          <Metric label="Inactive" value={loadingClients ? '…' : inactiveCount} />
          <Metric label="Total Clients" value={loadingClients ? '…' : clients.length} />
        </div>

        {atRiskCountCalc > 0 && (
          <div style={{marginTop:12,padding:10,background:'linear-gradient(90deg, rgba(255,215,0,0.06), rgba(255,215,0,0.02))',border:'1px solid rgba(255,215,0,0.12)',borderRadius:6}}>
            <strong style={{color:'var(--warning)'}}>{atRiskCountCalc} client{atRiskCountCalc>1?'s':''} at risk</strong> (no activity in 14+ days) — reach out to re-engage. <a href="/clients" style={{marginLeft:8,color:'var(--warning)'}}>View clients</a>
          </div>
        )}

        {inactiveCount > 0 && (
          <div style={{marginTop:8,padding:10,background:'linear-gradient(90deg, rgba(255,123,123,0.06), rgba(255,123,123,0.02))',border:'1px solid rgba(255,123,123,0.12)',borderRadius:6}}>
            <strong style={{color:'var(--danger)'}}>{inactiveCount} inactive client{inactiveCount>1?'s':''}</strong> — consider reaching out or scheduling activities. <a href="/clients" style={{marginLeft:8,color:'var(--danger)'}}>Manage clients</a>
          </div>
        )}
      </div>

      <div className="panel activity">
        <h3>Recent Activity</h3>
        {recent.length === 0 ? <div className="empty-state">No recent activity</div> : (
          <ul>
            {recent.map(a => {
              const client = clients.find(c => c.id === a.clientId)
              return (<li key={a.id} style={{marginBottom:6}}>{new Date(a.date).toLocaleString()} — <strong>{a.type}</strong> with {client ? client.name : 'Unknown client'} — {a.description}</li>)
            })}
          </ul>
        )}

        <hr style={{margin:'12px 0',borderColor:'rgba(255,255,255,0.03)'}} />

        <h4 style={{marginTop:8}}>Upcoming</h4>
        {upcoming.length === 0 ? <div style={{color:'var(--muted)'}}>No upcoming activities</div> : (
          <ul>
            {upcoming.map(a => {
              const client = clients.find(c => c.id === a.clientId)
              return (<li key={a.id} style={{marginBottom:6}}>{new Date(a.date).toLocaleString()} — <strong>{a.type}</strong> with {client ? client.name : 'Unknown'} </li>)
            })}
          </ul>
        )}

      </div>

      <div className="panel actions">
        <h3>Quick Actions</h3>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <div style={{display:'flex',gap:8}}>
            {/* Visible quick action button: opens Client modal */}
            <BubbleButton className="btn primary" onClick={() => { console.debug('Dashboard: Quick Action New Client clicked'); setClientModalOpen(true); }}>New Client</BubbleButton>

            <button className="btn" onClick={()=>setActivitiesModalOpen(true)}>New Activity</button>
          <ActivityModal open={activitiesModalOpen} onClose={()=>setActivitiesModalOpen(false)} onSave={onCreateActivity} />
          <ClientModal open={clientModalOpen} onClose={()=>setClientModalOpen(false)} onSave={onCreateClient} />
          </div>

          <div style={{marginTop:8}}>
            <h4 style={{margin:'0 0 8px 0'}}>Clients without recent activity</h4>
            {clientsNoRecent.length === 0 ? <div style={{color:'var(--muted)'}}>All clients active recently</div> : (
              <ul>
                {clientsNoRecent.map((r:any) => (
                  <li key={r.client.id} style={{marginBottom:6}}>{r.client.name} — {r.lastActivityAt ? `${r.daysSinceLast} days since last` : 'Never'}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
