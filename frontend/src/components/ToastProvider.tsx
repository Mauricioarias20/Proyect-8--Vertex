import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type Toast = { id: string; message: string; type?: 'info'|'success'|'error'; duration?: number }

type ToastContext = { push: (t: { message: string; type?: Toast['type']; duration?: number }) => void }

const Ctx = createContext<ToastContext | null>(null)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((t: { message: string; type?: Toast['type']; duration?: number }) => {
    const id = Math.random().toString(36).slice(2,9)
    const toast: Toast = { id, message: t.message, type: t.type || 'info', duration: t.duration ?? 3500 }
    setToasts(s => [...s, toast])
    if (toast.duration! > 0) {
      setTimeout(() => setToasts(s => s.filter(x => x.id !== id)), toast.duration)
    }
  }, [])

  const handleClose = useCallback((id: string) => setToasts(s => s.filter(x => x.id !== id)), [])

  const ctx = useMemo(() => ({ push }), [push])

  return (
    <Ctx.Provider value={ctx}>
      {children}
      <div aria-live="polite" style={{position:'fixed',right:16,bottom:16,zIndex:6000,display:'flex',flexDirection:'column',gap:10}}>
        {toasts.map(t => (
          <div key={t.id} role="status" className={`toast ${t.type}`} style={{minWidth:220,padding:'10px 14px',borderRadius:10,background:t.type==='error' ? 'linear-gradient(90deg, rgba(255,80,80,0.12), rgba(255,80,80,0.04))' : t.type==='success' ? 'linear-gradient(90deg, rgba(40,200,120,0.06), rgba(40,200,120,0.02))' : 'linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',border:'1px solid rgba(255,255,255,0.04)',color:'var(--text)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
              <div style={{fontSize:13}}>{t.message}</div>
              <button aria-label="Dismiss" onClick={()=>handleClose(t.id)} style={{border:0,background:'transparent',color:'var(--muted)',cursor:'pointer'}}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('useToast must be used within ToastProvider')
  return c
}
