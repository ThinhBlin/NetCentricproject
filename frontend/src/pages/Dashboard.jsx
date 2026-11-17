import React, { useEffect, useState } from 'react'
import { api } from '../api/client'
import StatCard from '../components/StatCard'
import CategoryChart from '../components/CategoryChart'
import { ErrorState, Skeleton } from '../components/LoadingSpinner'

function formatCurrency(value) {
  const amount = Number(value ?? 0)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString()
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadStats = () => {
    setLoading(true)
    setError('')
    api('/dashboard/stats')
      .then((d) => setStats(d.dashboardStats))
      .catch((e) => setError(e.message || 'Unable to load dashboard metrics.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadStats()
  }, [])

  if (error) {
    return (
      <ErrorState
        title="Failed to load dashboard"
        message={error}
        onRetry={loadStats}
      />
    )
  }

  return (
    <div>
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Inventory health, stock value, and category stock distribution at a glance.
          </p>
        </div>
      </header>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <>
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft"
              >
                <Skeleton className="mb-4 w-12 h-2" variant="text" />
                <Skeleton className="w-24 h-4" variant="text" />
                <Skeleton className="mt-2 w-32 h-8" variant="text" />
              </div>
            ))}
          </>
        ) : (
          <>
            <StatCard
              label="Total Products"
              value={formatNumber(stats?.totalActiveProducts)}
              tone="primary"
            />
            <StatCard
              label="Low Stock"
              value={formatNumber(stats?.lowStockCount)}
              tone="warning"
            />
            <StatCard
              label="Out of Stock"
              value={formatNumber(stats?.outOfStockCount)}
              tone="error"
            />
            <StatCard
              label="Stock Value (Retail)"
              value={formatCurrency(stats?.totalStockValue)}
              tone="success"
            />
            <StatCard
              label="Inventory Cost"
              value={formatCurrency(stats?.inventoryCost)}
              tone="primary"
            />
            <StatCard
              label="Estimated Margin"
              value={formatCurrency(stats?.estimatedMargin)}
              tone={(stats?.estimatedMargin ?? 0) >= 0 ? 'success' : 'error'}
            />
          </>
        )}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Stock by Category
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Stock quantity currently assigned to each category.
          </p>
        </div>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="w-1/3 h-4" variant="text" />
                  <Skeleton className="w-full h-4" variant="text" />
                </div>
              ))}
            </div>
          ) : (
            <CategoryChart data={stats?.warehouseStats || []} />
          )}
        </div>
      </section>
    </div>
  )
}
