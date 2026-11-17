const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

let token = sessionStorage.getItem('token')
let role = sessionStorage.getItem('role')
let currentUser = (() => {
  try {
    const raw = sessionStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
})()

export const setToken = (t) => {
  token = t
  if (t) {
    sessionStorage.setItem('token', t)
  } else {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('role')
    sessionStorage.removeItem('user')
    role = null
    currentUser = null
  }
}

export const setAuth = (data) => {
  setToken(data?.token || null)
  if (data?.role) {
    role = data.role
    sessionStorage.setItem('role', data.role)
  }
  if (data?.user) {
    currentUser = data.user
    sessionStorage.setItem('user', JSON.stringify(data.user))
  }
}

export const getToken = () => token
export const getRole = () => role || currentUser?.role || 'STAFF'
export const getUser = () => currentUser

export async function api(path, { method = 'GET', body } = {}) {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const headers = {
    ...(!isFormData && body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && token) {
    setToken(null)
    window.location.reload()
  }
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`)
  return data
}
