import React, { useEffect, useState } from 'react'
import * as statsApi from '../services/stats'
import SimpleBarChart from '../components/SimpleBarChart'
import ChartLegend from '../components/ChartLegend'
import { hashToColor } from '../utils/color'
import { downloadCSV } from '../utils/csv'
import * as clientsApi from '../services/clients'
import * as activitiesApi from '../services/activities'

const Analytics: React.FC = () => {
  const [byType, setByType] = useState<Array<{type:string;count:number}>>([])
  const [freqTop, setFreqTop] = useState<Array<{type:string;count:number}>>([])
  const [weeklyData, setWeeklyData] = useState<Array<{weekStart:string;count:number}>>([])
  const [clients, setClients] = useState<clientsApi.Client[]>([])
  const [activities, setActivities] = useState<activitiesApi.Activity[]>([])
  const [atRisk, setAtRisk] = useState<Array<{client:any;health:any}>>([])
  const [avgBetween, setAvgBetween] = useState<{ overallAvgDays: number | null; perClient: Array<any> } | null>(null)
  const [churnedMonthly, setChurnedMonthly] = useState<Array<{month:string;count:number}>>([])
  const [loading, setLoading] = useState(true)
  const [statsAvailable, setStatsAvailable] = useState<boolean | null>(null)

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      // Try to fetch stats first; handle permission issues gracefully
      let t: any = [], ft: any = [], w: any = [], r: any = [], avg: any = null, churn: any = []
      try {
        [t, ft, w, r, avg, churn] = await Promise.all([
          statsApi.activitiesByType(30),
          statsApi.mostFrequentActivities(30, 6),
          statsApi.activitiesPerWeek(12),
          statsApi.clientsMostAtRisk(8),
          statsApi.avgTimeBetweenContacts(365),
          statsApi.churnedPerMonth(12)
        ])
        setStatsAvailable(true)
      } catch (err: any) {
        // If stats are denied for role, mark unavailable and continue
        setStatsAvailable(false)
        t = []; ft = []; w = []; r = []; avg = null; churn = []
      }

      // Always fetch clients and activities so the rest of the dashboard populates
      const [cls, acts] = await Promise.all([clientsApi.listClients(), activitiesApi.listActivities()])

      // Use server stats when available
      if (statsAvailable) {
        setByType(t)
        setFreqTop(ft)
        setWeeklyData(w)
        setAtRisk(r)
        setAvgBetween(avg)
        setChurnedMonthly(churn)
      } else {
        // Fallback: compute simple metrics from fetched clients & activities
        const thirtyDays = Date.now() - 30 * 24 * 60 * 60 * 1000
        const counts: Record<string, number> = {}
        acts.forEach(a => {
          if (new Date(a.date).getTime() < thirtyDays) return
          counts[a.type] = (counts[a.type] || 0) + 1
        })
        const byTypeComputed = Object.keys(counts).map(k => ({ type: k, count: counts[k] }))
        const freqTopComputed = byTypeComputed.slice().sort((a,b)=>b.count-a.count).slice(0,6)

        // weekly bins (12 weeks)
        const weeks = 12
        const now = new Date()
        const weekStart = (d: Date) => {
          const dt = new Date(d)
          const day = (dt.getDay() + 6) % 7
          dt.setHours(0,0,0,0)
          dt.setDate(dt.getDate() - day)
          return dt
        }
        const bins: { start: Date; label: string; count: number }[] = []
        for (let i = weeks - 1; i >= 0; i--) {
          const start = weekStart(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7))
          const label = `${start.toISOString().slice(0,10)}`
          bins.push({ start, label, count: 0 })
        }
        acts.forEach(a => {
          const d = new Date(a.date)
          for (const b of bins) {
            const start = b.start.getTime()
            const end = start + 7 * 24 * 60 * 60 * 1000
            if (d.getTime() >= start && d.getTime() < end) { b.count += 1; break }
          }
        })
        const weeklyComputed = bins.map(b => ({ weekStart: b.label, count: b.count }))

        // compute at-risk based on last activity
        const atRiskComputed: Array<any> = clients.map((c:any) => {
          const clientActs = acts.filter(a => a.clientId === c.id)
          const last = clientActs.length ? clientActs.map(a => +new Date(a.date)).sort((x,y)=>y-x)[0] : null
          const daysSince = last ? Math.round((Date.now() - last)/(24*60*60*1000)) : null
          const status = daysSince === null ? 'inactive' : daysSince > 30 ? 'inactive' : daysSince > 14 ? 'at-risk' : 'active'
          const score = daysSince === null ? 0 : Math.max(0, 100 - daysSince)
          return { client: c, health: { score, status, lastActivityAt: last ? new Date(last).toISOString() : null } }
        }).filter(r => r.health.status === 'at-risk' || r.health.status === 'inactive').slice(0,8)

        // avg time between contacts
        const clientAverages: Array<any> = clients.map((c:any) => {
          const clientActs = acts.filter(a => a.clientId === c.id).map(a => +new Date(a.date)).sort((x,y)=>x-y)
          if (clientActs.length < 2) return { clientId: c.id, name: c.name, avgDays: null, samples: clientActs.length }
          let sum = 0; let count = 0
          for (let i = 1; i < clientActs.length; i++) { sum += (clientActs[i] - clientActs[i-1]) / (24*60*60*1000); count++ }
          return { clientId: c.id, name: c.name, avgDays: sum / count, samples: count }
        })
        const valid = clientAverages.filter((p:any) => p.avgDays !== null)
        const overallAvg = valid.length ? (valid.reduce((s:any,v:any)=>s + (v.avgDays as number), 0) / valid.length) : null

        // churned per month (12 months)
        const months = 12
        const nowDate = new Date()
        const monthBins: { month: string; count: number }[] = []
        for (let i = months - 1; i >= 0; i--) { const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1); monthBins.push({ month: d.toISOString().slice(0,7), count: 0 }) }
        clients.forEach((c:any) => {
          const clientActs = acts.filter(a => a.clientId === c.id)
          const last = clientActs.length ? clientActs.map(a => +new Date(a.date)).sort((x,y)=>y-x)[0] : null
          const daysSince = last ? Math.round((Date.now() - last)/(24*60*60*1000)) : null
          const isChurned = c.clientState === 'churned' || (daysSince !== null && daysSince > 30)
          if (!isChurned) return
          const monthKey = last ? new Date(last).toISOString().slice(0,7) : new Date(c.createdAt).toISOString().slice(0,7)
          const bin = monthBins.find(b => b.month === monthKey); if (bin) bin.count += 1
        })

        setByType(byTypeComputed)
        setFreqTop(freqTopComputed)
        setWeeklyData(weeklyComputed)
        setAtRisk(atRiskComputed)
        setAvgBetween({ overallAvgDays: overallAvg, perClient: clientAverages.sort((a,b)=> (a.avgDays ?? 1e9) - (b.avgDays ?? 1e9)) })
        setChurnedMonthly(monthBins)
      }
      setClients(cls)
      setActivities(acts)
      setLastUpdated(new Date())
    } catch (err) {
      // ignore for now
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const onFocus = () => { loadData() }
    const onVisibility = () => { if (!document.hidden) loadData() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVisibility) }
  }, [])

  // Color mapping for activity types
  const baseColors: Record<string, string> = {
    call: 'var(--primary-1)',
    calls: 'var(--primary-1)',
    meeting: 'var(--success)',
    meetings: 'var(--success)',
    proposal: 'var(--warning)',
    proposals: 'var(--warning)'
  }

  const colorFn = (label: string) => {
    const key = label.trim().toLowerCase()
    return baseColors[key] || hashToColor(label)
  }

  // Calculate stats
  const totalActivities = byType.reduce((sum, b) => sum + b.count, 0)
  const activeClients = clients.filter(c => c.businessStatus === 'active').length
  const atRiskClients = clients.filter(c => c.businessStatus === 'at-risk').length
  const inactiveClients = clients.filter(c => c.businessStatus === 'inactive').length

  // Calculate weekly trend
  const weeklyTrend = () => {
    if (weeklyData.length < 2) return { current: 0, previous: 0, change: 0 }
    const current = weeklyData[weeklyData.length - 1].count
    const previous = weeklyData[weeklyData.length - 2].count
    return { current, previous, change: current - previous }
  }

  const trend = weeklyTrend()
  const trendPercent = trend.previous > 0 ? Math.round((trend.change / trend.previous) * 100) : 0
  const trendIcon = trend.change > 0 ? '↑' : trend.change < 0 ? '↓' : '→'
  const trendColor = trend.change > 0 ? 'var(--success)' : trend.change < 0 ? 'var(--danger)' : '#999'

  const legendItems = Array.from(new Map<string, string>(
    byType.map(b => [b.type, colorFn(b.type)])
  ).entries()).map(([label, color]) => ({ label, color }))

  const exportByTypeCSV = () => {
    const rows = byType.map(b => ({ type: b.type, count: b.count, percentage: ((b.count / totalActivities) * 100).toFixed(1) }))
    downloadCSV('activity-insights.csv', rows, ['type', 'count', 'percentage'])
  }

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <h2>Performance Overview</h2>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button className="btn" onClick={loadData} disabled={loading} title="Refresh statistics">Refresh</button>
          {lastUpdated ? <div style={{fontSize:12,color:'var(--muted)'}}>Updated {lastUpdated.toLocaleTimeString()}</div> : null}
          {statsAvailable === false && <div style={{fontSize:12,color:'var(--warning)',marginLeft:8}}>Statistics are not available for your account. Try Refresh or sign in as an owner to view full analytics.</div>}
        </div>
      </div>
      
      <div style={{marginTop:20}}>
        {loading ? (
          <div>Loading…</div>
        ) : (
          <>
            {/* Activities by Type */}
            <div style={{marginBottom:32}}>
              <div style={{marginBottom:16}}>
                <h3>Activities by Type (Last 30 Days)</h3>
                <p style={{color:'var(--muted)',marginTop:4}}>Distribution of {totalActivities} total activities</p>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 350px',gap:24}}>
                <div>
                  {totalActivities === 0 ? (
                    <div style={{color:'var(--muted)'}}>No activity data yet</div>
                  ) : (
                    <SimpleBarChart
                      data={byType.map(b => ({label: b.type, value: b.count}))}
                      color={colorFn}
                      formatValue={(n) => n.toLocaleString()}
                    />
                  )}
                </div>

                <div>
                  <ChartLegend items={legendItems} />
                  <div style={{marginTop:12}}>
                    {byType.map(b => {
                      const pct = totalActivities > 0 ? ((b.count / totalActivities) * 100).toFixed(0) : 0
                      return (
                        <div key={b.type} style={{marginBottom:10,paddingBottom:10,borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                            <strong style={{textTransform:'capitalize'}}>{b.type}</strong>
                            <span style={{color:'var(--muted)'}}>{b.count}</span>
                          </div>
                          <div style={{width:'100%',height:6,background:'rgba(255,255,255,0.05)',borderRadius:3,marginTop:6,overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${pct}%`,background:colorFn(b.type),transition:'width 0.3s'}} />
                          </div>
                          <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>{pct}% of activities</div>
                        </div>
                      )
                    })}
                  </div>
                  <button className="btn" style={{marginTop:16,width:'100%'}} onClick={exportByTypeCSV}>Export CSV</button>
                </div>
              </div>
            </div>

            {/* Client Health */}
            <div style={{marginBottom:32}}>
              <div style={{marginBottom:16}}>
                <h3>Operational Health (30-Day Activity)</h3>
                <p style={{color:'var(--muted)',marginTop:4}}>Status based on recent engagement</p>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:16}}>
                <div style={{padding:16,background:'rgba(var(--success-rgb),0.06)',border:'1px solid rgba(var(--success-rgb),0.12)',borderRadius:8}}>
                  <div style={{fontSize:32,fontWeight:700,color:'var(--success)'}}>{activeClients}</div>
                  <div style={{color:'var(--muted)',marginTop:4}}>Active Clients</div>
                  <div style={{fontSize:12,color:'var(--success)',marginTop:6}}>Activity in last 14 days</div>
                </div>

                <div style={{padding:16,background:'rgba(var(--warning-rgb),0.06)',border:'1px solid rgba(var(--warning-rgb),0.12)',borderRadius:8}}>
                  <div style={{fontSize:32,fontWeight:700,color:'var(--warning)'}}>{atRiskClients}</div>
                  <div style={{color:'var(--muted)',marginTop:4}}>At Risk</div>
                  <div style={{fontSize:12,color:'var(--warning)',marginTop:6}}>14–30 days without activity</div>
                </div>

                <div style={{padding:16,background:'rgba(var(--danger-rgb),0.06)',border:'1px solid rgba(var(--danger-rgb),0.12)',borderRadius:8}}>
                  <div style={{fontSize:32,fontWeight:700,color:'var(--danger)'}}>{inactiveClients}</div>
                  <div style={{color:'var(--muted)',marginTop:4}}>Inactive</div>
                  <div style={{fontSize:12,color:'var(--danger)',marginTop:6}}>30+ days without activity</div>
                </div>
              </div>

              <div style={{marginTop:12,padding:12,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.03)',borderRadius:6}}>
                <strong>Engagement Rate:</strong> {clients.length > 0 ? ((activeClients / clients.length) * 100).toFixed(0) : 0}% of clients active
              </div>

              {/* Top at-risk clients */}
              <div style={{marginTop:18}}>
                <h4>Top at-risk clients</h4>
                {atRisk.length === 0 ? <div style={{color:'var(--muted)'}}>No at-risk clients</div> : (
                  <div style={{marginTop:8}}>
                    <table style={{width:'100%'}}>
                      <thead><tr><th>Name</th><th>Health</th><th>Status</th><th>Last Activity</th></tr></thead>
                      <tbody>
                        {atRisk.map((r:any)=> (
                          <tr key={r.client.id}>
                            <td>{r.client.name} <small style={{color:'#888',marginLeft:6}}>{r.client.email}</small></td>
                            <td>{r.health.score}%</td>
                            <td>{r.health.status}</td>
                            <td>{r.health.lastActivityAt ? new Date(r.health.lastActivityAt).toLocaleDateString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

            {/* Weekly Trend */}
            <div style={{marginBottom:32}}>
              <div style={{marginBottom:16}}>
                <h3>Weekly Trend</h3>
                <p style={{color:'var(--muted)',marginTop:4}}>Activity velocity compared to previous week</p>
              </div>

              {/* Most frequent activities (top) */}
              <div style={{marginTop:12,marginBottom:12}}>
                <h4>Most frequent activities</h4>
                {freqTop.length === 0 ? <div style={{color:'var(--muted)'}}>No data</div> : (
                  <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:8}}>
                    {freqTop.map(f => (
                      <div key={f.type} style={{padding:8,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.03)',borderRadius:6}}>
                        <div style={{fontWeight:700}}>{f.count}</div>
                        <div style={{fontSize:12,color:'#888'}}>{f.type}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:16}}>
                <div style={{padding:16,background:'rgba(75,191,247,0.06)',border:'1px solid rgba(75,191,247,0.12)',borderRadius:8}}>
                  <div style={{fontSize:12,color:'var(--muted)',textTransform:'uppercase'}}>This Week</div>
                  <div style={{fontSize:32,fontWeight:700,color:'var(--celeste)',marginTop:8}}>{trend.current}</div>
                  <div style={{fontSize:14,color:'var(--muted)',marginTop:4}}>activities</div>
                </div>

                <div style={{padding:16,background:'rgba(75,191,247,0.06)',border:'1px solid rgba(75,191,247,0.12)',borderRadius:8}}>
                  <div style={{fontSize:12,color:'var(--muted)',textTransform:'uppercase'}}>Previous Week</div>
                  <div style={{fontSize:32,fontWeight:700,color:'var(--celeste)',marginTop:8}}>{trend.previous}</div>
                  <div style={{fontSize:14,color:'var(--muted)',marginTop:4}}>activities</div>
                </div>

                <div style={{padding:16,background: trend.change > 0 ? 'rgba(var(--success-rgb),0.06)' : trend.change < 0 ? 'rgba(var(--danger-rgb),0.06)' : 'rgba(100,100,100,0.06)',border: trend.change > 0 ? '1px solid rgba(var(--success-rgb),0.12)' : trend.change < 0 ? '1px solid rgba(var(--danger-rgb),0.12)' : '1px solid rgba(100,100,100,0.12)',borderRadius:8}}>
                  <div style={{fontSize:12,color:'var(--muted)',textTransform:'uppercase'}}>Change</div>
                  <div style={{fontSize:32,fontWeight:700,color:trendColor,marginTop:8}}>
                    <span style={{marginRight:8}}>{trendIcon}</span>
                    {Math.abs(trend.change)}
                  </div>
                  <div style={{fontSize:12,color:trendColor,marginTop:4}}>{trendPercent > 0 ? '+' : ''}{trendPercent}%</div>
                </div>
              </div>

              {trend.change > 0 && (
                <div style={{marginTop:12,padding:10,background:'rgba(var(--success-rgb),0.06)',border:'1px solid rgba(var(--success-rgb),0.12)',borderRadius:6,color:'var(--success)'}}>
                  ✓ Great momentum! More activities this week.
                </div>
              )}
              {trend.change < 0 && (
                <div style={{marginTop:12,padding:10,background:'rgba(var(--danger-rgb),0.06)',border:'1px solid rgba(var(--danger-rgb),0.12)',borderRadius:6,color:'var(--danger)'}}>
                  ⚠ Activity decreased this week. Consider scheduling more.
                </div>
              )}
            </div>

            {/* Avg time between contacts & churned per month */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginTop:18}}>
              <div style={{padding:16,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.03)',borderRadius:8}}>
                <h4>Avg time between contacts</h4>
                <div style={{marginTop:8}}>
                  {avgBetween ? (
                    <>
                      <div style={{fontSize:28,fontWeight:700}}>{avgBetween.overallAvgDays ? `${Math.round(avgBetween.overallAvgDays)} days` : '—'}</div>
                      <div style={{color:'var(--muted)',marginTop:6}}>Average across clients with at least 2 contacts</div>
                      <div style={{marginTop:12,maxHeight:180,overflow:'auto'}}>
                        <table style={{width:'100%'}}>
                          <thead><tr><th>Client</th><th>Avg days</th><th>Samples</th></tr></thead>
                          <tbody>
                            {avgBetween.perClient.slice(0,8).map((p:any)=> (
                              <tr key={p.clientId}><td>{p.name}</td><td>{p.avgDays ? Math.round(p.avgDays) : '—'}</td><td>{p.samples}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div style={{color:'var(--muted)'}}>No data</div>
                  )}
                </div>
              </div>

              <div style={{padding:16,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.03)',borderRadius:8}}>
                <h4>Clients abandoned per month</h4>
                <div style={{marginTop:8}}>
                  {churnedMonthly.length === 0 ? <div style={{color:'var(--muted)'}}>No churn data</div> : (
                    <div style={{maxHeight:220,overflow:'auto'}}>
                      <table style={{width:'100%'}}>
                        <thead><tr><th>Month</th><th>Count</th></tr></thead>
                        <tbody>
                          {churnedMonthly.map(m => (<tr key={m.month}><td>{m.month}</td><td>{m.count}</td></tr>))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div style={{padding:16,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.03)',borderRadius:8,marginTop:18}}>
              <strong>Summary:</strong> You've logged <strong>{totalActivities} activities</strong> this month across <strong>{clients.length} clients</strong>.
              {activeClients === clients.length && clients.length > 0 && ' All clients are actively engaged.'}
              {atRiskClients > 0 && ` ${atRiskClients} client${atRiskClients > 1 ? 's' : ''} need attention soon.`}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Analytics
