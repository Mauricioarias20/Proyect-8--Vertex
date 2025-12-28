import React, { useEffect, useState } from 'react'
import * as teamApi from '../services/team'
import { useAuth } from '../context/AuthContext'
import BubbleButton from '../components/BubbleButton'

const TeamPage: React.FC = () => {
  const [members, setMembers] = useState<teamApi.Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingEmail, setEditingEmail] = useState<string | null>(null)
  const [newRole, setNewRole] = useState<'owner'|'manager'|'staff'>('staff')

  const { user } = useAuth()

  const fetch = async () => {
    setLoading(true); setError(null)
    try {
      const res = await teamApi.listTeam()
      setMembers(res)
    } catch (err: any) { setError(err?.error || err?.message || 'Failed to load') }
    finally { setLoading(false) }
  }
  useEffect(() => { fetch() }, [])

  const startEdit = (email: string, current: teamApi.Member['role']) => { setEditingEmail(email); setNewRole(current) }
  const save = async () => {
    if (!editingEmail) return
    try {
      const updated = await teamApi.updateMember(editingEmail, { role: newRole })
      setMembers(prev => prev.map(m => m.email === updated.email ? updated : m))
      setEditingEmail(null)
    } catch (err: any) { setError(err?.error || err?.message || 'Failed to save') }
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <h2>Team Overview</h2>
        <div>
          {user?.role === 'owner' ? (
            <BubbleButton className="btn primary" onClick={() => alert('Invite flow not implemented yet')}>Invite member</BubbleButton>
          ) : null}
        </div>
      </div>

      {loading ? <div className="card">Loading…</div> : null}
      {error ? <div className="card" style={{color:'var(--danger)'}}>{error}</div> : null}

      <div className="card">
        <table className="clients-table">
          <thead>
            <tr><th>Username</th><th>Email</th><th>Role</th><th>Last activity</th><th></th></tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.email}>
                <td>{m.username}</td>
                <td>{m.email}</td>
                <td>{m.role}</td>
                <td>{m.lastActivityAt ? new Date(m.lastActivityAt).toLocaleString() : <span style={{color:'var(--muted)'}}>Never</span>}</td>
                <td style={{textAlign:'right'}}>
                  {(user?.role === 'owner' || user?.role === 'manager') && m.email !== user?.email ? (
                    editingEmail === m.email ? (
                      <>
                        <select value={newRole} onChange={e=>setNewRole(e.target.value as any)}>
                          {user?.role === 'owner' ? (
                            <>
                              <option value="owner">Owner</option>
                              <option value="manager">Manager</option>
                              <option value="staff">Staff</option>
                            </>
                          ) : (
                            <>
                              <option value="staff">Staff</option>
                            </>
                          )}
                        </select>
                        <button className="btn" onClick={save} style={{marginLeft:8}}>Save</button>
                        <button className="btn" onClick={()=>setEditingEmail(null)} style={{marginLeft:8}}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="btn" onClick={()=>startEdit(m.email, m.role)}>Change role</button>
                      </>
                    )
                  ) : <span style={{color:'var(--muted)'}}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TeamPage
