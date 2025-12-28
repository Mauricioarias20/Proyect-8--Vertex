import React from 'react'
import Background from './Background'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const Layout: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  return (
    <div className="app-root">
      <Background />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-area">
        <Topbar onToggleSidebar={() => setSidebarOpen(s => !s)} sidebarOpen={sidebarOpen} />
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
