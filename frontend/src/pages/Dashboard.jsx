import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { api, setToken } from '../api/client'

const money = (n) => Number(n || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' })

function Card({ label, value }) {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, minWidth: 160 }}>
      <div style={{ color: '#666', fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600 }}>{value}</div>
    </div>
  )
}

export default function Dashboard({ onLogout }) {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/dashboard/stats')
      .then((d) => setStats(d.dashboardStats))
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2>Inventory Dashboard</h2>
        <button onClick={() => { setToken(null); onLogout() }}>Log out</button>
      </div>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {!stats && !error && <p>Loading...</p>}
      {stats && (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Card label="Active products" value={stats.totalActiveProducts} />
            <Card label="Low stock" value={stats.lowStockCount} />
            <Card label="Out of stock" value={stats.outOfStockCount} />
            <Card label="Stock value" value={money(stats.totalStockValue)} />
            <Card label="Inventory cost" value={money(stats.inventoryCost)} />
            <Card label="Estimated margin" value={money(stats.estimatedMargin)} />
          </div>
          <h3>Stock by category</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={stats.warehouseStats || []}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalQuantity" name="Total quantity" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
