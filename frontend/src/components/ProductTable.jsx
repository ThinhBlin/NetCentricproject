import React from 'react'

export function getProductStockStatus(product) {
  const stock = Number(product?.stockQuantity ?? 0)
  const threshold = Number(product?.reorderThreshold ?? 0)
  if (stock === 0) return 'OUT_OF_STOCK'
  if (stock <= threshold) return 'LOW_STOCK'
  return 'IN_STOCK'
}

export function StockStatusBadge({ product }) {
  const status = getProductStockStatus(product)

  if (status === 'OUT_OF_STOCK') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-error-light px-2.5 py-0.5 text-xs font-semibold text-error">
        <span className="w-1.5 h-1.5 rounded-full bg-error" />
        Out of Stock
      </span>
    )
  }

  if (status === 'LOW_STOCK') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning-light px-2.5 py-0.5 text-xs font-semibold text-warning">
        <span className="w-1.5 h-1.5 rounded-full bg-warning" />
        Low Stock
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-success-light px-2.5 py-0.5 text-xs font-semibold text-success">
      <span className="w-1.5 h-1.5 rounded-full bg-success" />
      In Stock
    </span>
  )
}

export function highlightMatch(text, term) {
  if (!text) return null
  if (!term) return text
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = String(text).split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-100 text-yellow-800 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

function SortHeader({ label, field, sortBy, sortDir, onSort }) {
  const active = sortBy === field
  return (
    <th
      scope="col"
      className="px-4 py-4 text-left text-xs font-display font-semibold uppercase tracking-wider text-slate-700 select-none"
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-primary transition-colors"
      >
        <span>{label}</span>
        <span className={`text-xs ${active ? 'text-primary font-bold' : 'text-slate-400'}`}>
          {active ? (sortDir === 'DESC' ? '↓' : '↑') : '↕'}
        </span>
      </button>
    </th>
  )
}

export default function ProductTable({
  products = [],
  categoryMap = {},
  search = '',
  sortBy = 'id',
  sortDir = 'ASC',
  onSort,
  canEdit = false,
  onEdit,
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-soft">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <SortHeader
              label="ID"
              field="id"
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={onSort}
            />
            <th
              scope="col"
              className="px-4 py-4 text-left text-xs font-display font-semibold uppercase tracking-wider text-slate-700"
            >
              SKU
            </th>
            <SortHeader
              label="Name"
              field="name"
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={onSort}
            />
            <th
              scope="col"
              className="px-4 py-4 text-left text-xs font-display font-semibold uppercase tracking-wider text-slate-700"
            >
              Category
            </th>
            <SortHeader
              label="Price"
              field="price"
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              label="Stock"
              field="stock_quantity"
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={onSort}
            />
            <th
              scope="col"
              className="px-4 py-4 text-left text-xs font-display font-semibold uppercase tracking-wider text-slate-700"
            >
              Reorder Threshold
            </th>
            <th
              scope="col"
              className="px-4 py-4 text-left text-xs font-display font-semibold uppercase tracking-wider text-slate-700"
            >
              Status
            </th>
            <SortHeader
              label="Created"
              field="created_at"
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={onSort}
            />
            <th
              scope="col"
              className="px-4 py-4 text-left text-xs font-display font-semibold uppercase tracking-wider text-slate-700"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {products.map((product) => (
            <tr
              key={product.id}
              className="hover:bg-slate-50 transition-colors"
            >
              <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                #{product.id}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-slate-700">
                {highlightMatch(product.sku, search)}
              </td>
              <td className="px-4 py-4 text-sm">
                <div className="font-semibold text-slate-900">
                  {highlightMatch(product.name, search)}
                </div>
                {product.description && (
                  <div className="text-xs text-slate-500 truncate max-w-xs">
                    {highlightMatch(product.description, search)}
                  </div>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                {categoryMap[product.categoryId] || 'Uncategorized'}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-primary">
                ${Number(product.price ?? 0).toFixed(2)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-slate-900">
                {product.stockQuantity}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                {product.reorderThreshold}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm">
                <StockStatusBadge product={product} />
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                {product.createdAt ? String(product.createdAt).slice(0, 10) : '—'}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm font-medium">
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => onEdit(product)}
                    aria-label={`Edit ${product.name}`}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold text-primary hover:text-primary-dark bg-primary-subtle hover:bg-primary/10 transition-colors"
                  >
                    Edit
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">Read-only</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
