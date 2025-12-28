import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BubbleButton from './BubbleButton'
const LazyGlobalSearch = React.lazy(() => import('./GlobalSearch'))

const Topbar: React.FC<{onToggleSidebar?: () => void; sidebarOpen?: boolean}> = ({ onToggleSidebar, sidebarOpen }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="topbar">
      <div className="topbar-left">
        {/* Hamburger for mobile */}
        <button className="hamburger-btn btn" aria-label="Open menu" aria-expanded={sidebarOpen ? 'true' : 'false'} onClick={onToggleSidebar}>☰</button>
        {/* Global search with debounce & highlight */}
        <React.Suspense fallback={<input className="search" placeholder="Search" />}>
          <LazyGlobalSearch />
        </React.Suspense>
      </div>
      <div className="topbar-right">
        {user ? (
          <>
            <div style={{marginRight:12}}>
              <div style={{fontWeight:600}}>{user.username}</div>
              <div style={{fontSize:12,color:'#aaa'}}>{user.role} · {user.organizationId?.slice(0,8)}</div>
            </div>
            <button className="btn" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn">Sign in</Link>
            <BubbleButton className="btn primary" onClick={()=>navigate('/register')}>Register</BubbleButton>
          </>
        )}
      </div>
    </div>
  )
}

export default Topbar
