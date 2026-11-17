import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { getToken } from './api/client'

function App() {
  const [loggedIn, setLoggedIn] = useState(!!getToken())
  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />
  return <Dashboard onLogout={() => setLoggedIn(false)} />
}

createRoot(document.getElementById('root')).render(<App />)
