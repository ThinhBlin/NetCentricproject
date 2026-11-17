import React, { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function ProductEditForm({
  product,
  categories = [],
  onClose,
  onSuccess,
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stockQuantity, setStockQuantity] = useState('')
  const [reorderThreshold, setReorderThreshold] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (product) {
      setName(product.name ?? '')
      setDescription(product.description ?? '')
      setPrice(String(product.price ?? 0))
      setStockQuantity(String(product.stockQuantity ?? 0))
      setReorderThreshold(String(product.reorderThreshold ?? 10))
      setCategoryId(product.categoryId ? String(product.categoryId) : '')
      setErrors({})
      setServerError('')
    }
  }, [product])

  if (!product) return null

  const validate = () => {
    const next = {}
    if (!name || !name.trim()) {
      next.name = 'Name is required'
    }
    const parsedPrice = Number(price)
    if (price === '' || Number.isNaN(parsedPrice) || parsedPrice < 0) {
      next.price = 'Price must be a number >= 0'
    }
    const parsedStock = Number(stockQuantity)
    if (
      stockQuantity === '' ||
      !Number.isInteger(parsedStock) ||
      parsedStock < 0
    ) {
      next.stockQuantity = 'Stock quantity must be a whole number >= 0'
    }
    const parsedThreshold = Number(reorderThreshold)
    if (
      reorderThreshold === '' ||
      !Number.isInteger(parsedThreshold) ||
      parsedThreshold < 0
    ) {
      next.reorderThreshold = 'Reorder threshold must be a whole number >= 0'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    if (!validate()) return

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('productId', String(product.id))
      formData.append('name', name.trim())
      if (description.trim()) {
        formData.append('description', description.trim())
      }
      formData.append('price', String(Number(price)))
      formData.append('stockQuantity', String(Number(stockQuantity)))
      formData.append('reorderThreshold', String(Number(reorderThreshold)))
      if (categoryId && Number(categoryId) > 0) {
        formData.append('categoryId', String(Number(categoryId)))
      }

      const res = await api('/products/update', {
        method: 'PUT',
        body: formData,
      })
      onSuccess(res.message || 'Product was successfully updated')
    } catch (err) {
      setServerError(err.message || 'Failed to update product.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-elevated animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">
              Edit Product
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Update product details for #{product.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="edit-name"
                className="block text-sm font-semibold text-slate-700"
              >
                Product Name
              </label>
              <div className="bg-gray-100 rounded-md px-3 py-2 hover:bg-gray-200 transition duration-300">
                <input
                  id="edit-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent outline-none text-sm text-slate-900"
                />
              </div>
              {errors.name && (
                <p className="text-xs text-red-600 font-medium">{errors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="edit-sku"
                className="block text-sm font-semibold text-slate-700"
              >
                Product Code (SKU)
              </label>
              <div className="bg-gray-100 rounded-md px-3 py-2">
                <input
                  id="edit-sku"
                  type="text"
                  value={product.sku ?? ''}
                  disabled
                  readOnly
                  className="w-full bg-transparent text-slate-500 outline-none text-sm cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="edit-description"
              className="block text-sm font-semibold text-slate-700"
            >
              Description
            </label>
            <div className="bg-gray-100 rounded-md px-3 py-2 hover:bg-gray-200 transition duration-300">
              <textarea
                id="edit-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-transparent outline-none text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="edit-price"
                className="block text-sm font-semibold text-slate-700"
              >
                Selling Price ($)
              </label>
              <div className="bg-gray-100 rounded-md px-3 py-2 hover:bg-gray-200 transition duration-300">
                <input
                  id="edit-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-transparent outline-none text-sm text-slate-900"
                />
              </div>
              {errors.price && (
                <p className="text-xs text-red-600 font-medium">{errors.price}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="edit-stock"
                className="block text-sm font-semibold text-slate-700"
              >
                Stock Quantity
              </label>
              <div className="bg-gray-100 rounded-md px-3 py-2 hover:bg-gray-200 transition duration-300">
                <input
                  id="edit-stock"
                  type="number"
                  min={0}
                  step="1"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="w-full bg-transparent outline-none text-sm text-slate-900"
                />
              </div>
              {errors.stockQuantity && (
                <p className="text-xs text-red-600 font-medium">
                  {errors.stockQuantity}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="edit-threshold"
                className="block text-sm font-semibold text-slate-700"
              >
                Reorder Threshold
              </label>
              <div className="bg-gray-100 rounded-md px-3 py-2 hover:bg-gray-200 transition duration-300">
                <input
                  id="edit-threshold"
                  type="number"
                  min={0}
                  step="1"
                  value={reorderThreshold}
                  onChange={(e) => setReorderThreshold(e.target.value)}
                  className="w-full bg-transparent outline-none text-sm text-slate-900"
                />
              </div>
              {errors.reorderThreshold && (
                <p className="text-xs text-red-600 font-medium">
                  {errors.reorderThreshold}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="edit-category"
              className="block text-sm font-semibold text-slate-700"
            >
              Category
            </label>
            <div className="bg-gray-100 rounded-md px-3 py-2 hover:bg-gray-200 transition duration-300">
              <select
                id="edit-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-transparent outline-none text-sm text-slate-900"
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {serverError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-dark text-sm font-semibold text-white shadow-soft transition-all disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Update Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
