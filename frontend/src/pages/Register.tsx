import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Register: React.FC = () => {
  const { register } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await register(username, email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.error || err?.message || 'Registration failed')
    }
  }

  return (
    <div className="card" style={{maxWidth:480}}>
      <h2>Register</h2>
      <form onSubmit={onSubmit}>
        <div style={{marginBottom:8}}>
          <label style={{display:'block',fontSize:13,marginBottom:6}}>Username</label>
          <input className="search" value={username} onChange={e=>setUsername(e.target.value)} />
        </div>
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
          <button className="btn primary" type="submit">Create account</button>
          <Link to="/login" className="btn">Sign in</Link>
        </div>
      </form>
    </div>
  )
}

export default Register
