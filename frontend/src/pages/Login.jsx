import { useState } from 'react'
import { api, setToken } from '../api/client'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    try {
      const data = await api('/auth/login', { method: 'POST', body: { email, password } })
      setToken(data.token)
      onLogin(data)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 320, margin: '80px auto', display: 'grid', gap: 12 }}>
      <h2>Inventory Dashboard</h2>
      <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit">Log in</button>
      {error && <div style={{ color: 'crimson' }}>{error}</div>}
    </form>
  )
}
