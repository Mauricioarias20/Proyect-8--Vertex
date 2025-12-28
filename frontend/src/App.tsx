import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import ClientsPage from './pages/Clients'
import Activities from './pages/Activities'
import Analytics from './pages/Analytics'
import NotesPage from './pages/Notes'
import TeamPage from './pages/Team'
import TimelinePage from './pages/Timeline'
import PrivateRoute from './components/PrivateRoute'
import { AuthProvider } from './context/AuthContext'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/clients" element={<PrivateRoute><ClientsPage /></PrivateRoute>} />
            <Route path="/clients/:id/timeline" element={<PrivateRoute><TimelinePage /></PrivateRoute>} />
            <Route path="/activities" element={<PrivateRoute><Activities /></PrivateRoute>} />
            <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
            <Route path="/notes" element={<PrivateRoute><NotesPage /></PrivateRoute>} />
            <Route path="/team" element={<PrivateRoute><TeamPage /></PrivateRoute>} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  )
}
