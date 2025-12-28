import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Login: React.FC = () => {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      // surface full error for debugging
      console.error('Login error', err)
      setError(err?.error || err?.message || 'Login failed')
    }
  }

  return (
    <div className="card" style={{maxWidth:420}}>
      <h2>Login</h2>
      <form onSubmit={onSubmit}>
        <div style={{marginBottom:8}}>
          <label style={{display:'block',fontSize:13,marginBottom:6}}>Email</label>
          <input className="search" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div style={{marginBottom:12}}>
          <label style={{display:'block',fontSize:13,marginBottom:6}}>Password</label>
          <input className="search" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        {error && <div style={{color:'var(--danger)',marginBottom:8}}>{error}</div>}
        <div style={{display:'flex',gap:8}}>
          <button className="btn primary" type="submit">Sign in</button>
          <Link to="/register" className="btn">Register</Link>
        </div>
      </form>
    </div>
  )
}

export default Login
