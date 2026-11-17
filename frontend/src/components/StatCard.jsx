import React from 'react'

export default function StatCard({ label, value, tone = 'primary' }) {
  const toneClasses = {
    primary: 'border-primary/20 bg-primary-subtle text-primary',
    warning: 'border-warning/20 bg-warning-light text-warning',
    error: 'border-error/20 bg-error-light text-error',
    success: 'border-success/20 bg-success-light text-success',
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
      <div
        className={`mb-4 h-2 w-12 rounded-full ${toneClasses[tone] || toneClasses.primary}`}
      />
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-display font-bold text-slate-900">
        {value}
      </p>
    </div>
  )
}
