const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

let token = sessionStorage.getItem('token')

export const setToken = (t) => {
  token = t
  t ? sessionStorage.setItem('token', t) : sessionStorage.removeItem('token')
}
export const getToken = () => token

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && token) {
    setToken(null)
    window.location.reload()
  }
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`)
  return data
}
