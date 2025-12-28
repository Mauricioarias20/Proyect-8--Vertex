import React, { createContext, useContext, useEffect, useState } from 'react'
import * as authService from '../services/auth'

type User = { username: string; email: string; role?: 'owner'|'manager'|'staff'; organizationId: string } | null

type AuthContextValue = {
  user: User
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  isOwner: boolean
  isManager: boolean
  isStaff: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const useAuth = () => {
  const c = useContext(AuthContext)
  if (!c) throw new Error('useAuth must be used within AuthProvider')
  return c
}

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User>(() => {
    try {
      const raw = localStorage.getItem('vertex_user')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })
  const role = user?.role || null
  const isOwner = user?.role === 'owner'
  const isManager = user?.role === 'manager'
  const isStaff = user?.role === 'staff'
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('vertex_token'))

  useEffect(() => {
    if (user) localStorage.setItem('vertex_user', JSON.stringify(user))
    else localStorage.removeItem('vertex_user')
  }, [user])

  useEffect(() => {
    if (token) localStorage.setItem('vertex_token', token)
    else localStorage.removeItem('vertex_token')
  }, [token])

  const login = async (email: string, password: string) => {
    const res = await authService.login({ email, password })
    setToken(res.token)
    setUser(res.user)
  }

  const register = async (username: string, email: string, password: string) => {
    const res = await authService.register({ username, email, password })
    setToken(res.token)
    setUser(res.user)
  }

  const logout = () => {
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isOwner, isManager, isStaff }}>
      {children}
    </AuthContext.Provider>
  )
}
