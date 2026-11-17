import React from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString()
}

function CategoryTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const item = payload[0]?.payload
  if (!item) return null

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-lg">
      <p className="mb-2 font-semibold text-slate-900">{item.name}</p>
      <div className="space-y-1">
        <p className="flex items-center justify-between gap-6 text-slate-900">
          <span className="font-medium">Total Stock</span>
          <span>{formatNumber(item.totalQuantity)} units</span>
        </p>
        <p className="flex items-center justify-between gap-6 text-slate-600">
          <span>Products</span>
          <span>{formatNumber(item.productCount)} items</span>
        </p>
      </div>
    </div>
  )
}

export default function CategoryChart({ data = [] }) {
  return (
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={360}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 12, right: 24, left: 24, bottom: 12 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: '#334155', fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fill: '#0f172a', fontSize: 12 }}
          />
          <Tooltip content={<CategoryTooltip />} />
          <Bar
            dataKey="totalQuantity"
            name="Total Quantity"
            fill="#3E3998"
            radius={[4, 4, 4, 4]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
