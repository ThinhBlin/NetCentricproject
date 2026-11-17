import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import AppLayout from './components/AppLayout'
import { getToken } from './api/client'

function App() {
  const [loggedIn, setLoggedIn] = useState(!!getToken())
  const [activePage, setActivePage] = useState('dashboard')

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />
  }

  return (
    <AppLayout
      activePage={activePage}
      onNavigate={setActivePage}
      onLogout={() => setLoggedIn(false)}
    >
      {activePage === 'products' ? <Products /> : <Dashboard />}
    </AppLayout>
  )
}

createRoot(document.getElementById('root')).render(<App />)
