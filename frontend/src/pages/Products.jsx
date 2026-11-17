import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { api, getRole } from '../api/client'
import ProductTable from '../components/ProductTable'
import ProductEditForm from '../components/ProductEditForm'
import Pagination from '../components/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../components/LoadingSpinner'

const STOCK_STATUS_OPTIONS = [
  { value: '', label: 'All Stock Status' },
  { value: 'IN_STOCK', label: 'In Stock' },
  { value: 'LOW_STOCK', label: 'Low Stock' },
  { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
]

export default function Products() {
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [stockStatus, setStockStatus] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortBy, setSortBy] = useState('id')
  const [sortDir, setSortDir] = useState('ASC')

  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState('')
  const [editingProduct, setEditingProduct] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

  const role = getRole()
  const canEdit = role === 'ADMIN' || role === 'MANAGER'

  // Debounce search input (400ms) and reset to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim().slice(0, 100)
      setSearch((prev) => {
        if (prev !== trimmed) {
          setPage(1)
        }
        return trimmed
      })
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Load categories once on mount: GET /api/categories/all?page=1&limit=100
  useEffect(() => {
    api('/categories/all?page=1&limit=100')
      .then((res) => {
        setCategories(res.categories || [])
      })
      .catch(() => {})
  }, [])

  const categoryMap = useMemo(() => {
    const map = {}
    categories.forEach((cat) => {
      map[cat.id] = cat.name
    })
    return map
  }, [categories])

  const fetchProducts = useCallback(() => {
    setFetching(true)
    setError('')
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('size', String(size))
    params.set('sortBy', sortBy)
    params.set('sortDir', sortDir)
    if (search) params.set('search', search)
    if (categoryId) params.set('categoryId', categoryId)
    if (stockStatus) params.set('stockStatus', stockStatus)
    if (minPrice !== '') params.set('minPrice', minPrice)
    if (maxPrice !== '') params.set('maxPrice', maxPrice)

    api(`/products/all?${params.toString()}`)
      .then((res) => {
        setProducts(res.products || [])
        setTotalElements(res.totalElements ?? 0)
        setTotalPages(res.totalPages ?? 0)
      })
      .catch((err) => {
        setError(err.message || 'An error occurred while fetching products.')
      })
      .finally(() => {
        setLoading(false)
        setFetching(false)
      })
  }, [page, size, sortBy, sortDir, search, categoryId, stockStatus, minPrice, maxPrice])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'))
    } else {
      setSortBy(field)
      setSortDir('ASC')
    }
    setPage(1)
  }

  const hasActiveFilters =
    Boolean(search) ||
    Boolean(categoryId) ||
    Boolean(stockStatus) ||
    minPrice !== '' ||
    maxPrice !== ''

  const startIndex = totalElements === 0 ? 0 : (page - 1) * size + 1
  const endIndex =
    totalElements === 0 ? 0 : Math.min(page * size, totalElements)

  return (
    <div className="w-full">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">
            Products
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your product inventory
          </p>
        </div>
      </header>

      {successMessage && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 animate-fade-in">
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              value={searchInput}
              maxLength={100}
              onChange={(e) => setSearchInput(e.target.value.slice(0, 100))}
              placeholder="Search products by name, SKU, or description..."
              aria-label="Search products"
              className="w-full pl-12 pr-4 py-3 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={minPrice}
              onChange={(e) => {
                setMinPrice(e.target.value)
                setPage(1)
              }}
              placeholder="Min Price"
              aria-label="Minimum price"
              className="w-24 px-3 py-2.5 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <span className="text-slate-400 text-sm">—</span>
            <input
              type="number"
              min={0}
              value={maxPrice}
              onChange={(e) => {
                setMaxPrice(e.target.value)
                setPage(1)
              }}
              placeholder="Max Price"
              aria-label="Maximum price"
              className="w-24 px-3 py-2.5 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <select
            value={stockStatus}
            onChange={(e) => {
              setStockStatus(e.target.value)
              setPage(1)
            }}
            aria-label="Filter by stock status"
            className="px-4 py-2.5 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          >
            {STOCK_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value)
              setPage(1)
            }}
            aria-label="Filter by category"
            className="px-4 py-2.5 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={size}
            onChange={(e) => {
              setSize(Number(e.target.value))
              setPage(1)
            }}
            aria-label="Page size"
            className="px-4 py-2.5 text-sm bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          >
            {[10, 20, 50].map((s) => (
              <option key={s} value={s}>
                {s} / page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-slate-600">
        {fetching && !loading && (
          <svg
            aria-hidden="true"
            className="inline w-4 h-4 mr-2 text-primary animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        Showing {startIndex}–{endIndex} of {totalElements} results
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState
          title="Loading products..."
          message="Please wait while we fetch your product inventory."
        />
      ) : error ? (
        <ErrorState
          title="Failed to load products"
          message={error}
          onRetry={fetchProducts}
        />
      ) : products.length === 0 ? (
        <EmptyState
          title="No products found"
          description={
            hasActiveFilters
              ? 'Try adjusting your filters or search query.'
              : 'No products available in the inventory.'
          }
        />
      ) : (
        <ProductTable
          products={products}
          categoryMap={categoryMap}
          search={search}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
          canEdit={canEdit}
          onEdit={(product) => {
            setSuccessMessage('')
            setEditingProduct(product)
          }}
        />
      )}

      {/* Pagination */}
      {totalElements > 0 && (
        <div className="pt-6">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalElements={totalElements}
            pageSize={size}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setSize(newSize)
              setPage(1)
            }}
          />
        </div>
      )}

      {/* Edit Modal */}
      {editingProduct && (
        <ProductEditForm
          product={editingProduct}
          categories={categories}
          onClose={() => setEditingProduct(null)}
          onSuccess={(msg) => {
            setEditingProduct(null)
            setSuccessMessage(msg)
            fetchProducts()
          }}
        />
      )}
    </div>
  )
}
