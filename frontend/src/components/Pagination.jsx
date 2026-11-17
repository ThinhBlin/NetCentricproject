import React, { useMemo } from 'react'

const PAGE_SIZE_OPTIONS = [10, 20, 50]
const MAX_VISIBLE_PAGES = 3

export default function Pagination({
  currentPage,
  totalPages,
  totalElements = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
}) {
  const safeTotalPages = Math.max(1, totalPages || 1)

  const visiblePages = useMemo(() => {
    if (safeTotalPages <= MAX_VISIBLE_PAGES) {
      return Array.from({ length: safeTotalPages }, (_, i) => i + 1)
    }

    const pages = []
    const half = Math.floor(MAX_VISIBLE_PAGES / 2)

    let start = currentPage - half
    let end = currentPage + half

    if (start <= 0) {
      start = 1
      end = MAX_VISIBLE_PAGES
    } else if (end > safeTotalPages) {
      end = safeTotalPages
      start = safeTotalPages - MAX_VISIBLE_PAGES + 1
    }

    if (start > 1) {
      pages.push(1)
      if (start > 2) {
        pages.push('...')
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (end < safeTotalPages) {
      if (end < safeTotalPages - 1) {
        pages.push('...')
      }
      pages.push(safeTotalPages)
    }

    return pages
  }, [currentPage, safeTotalPages])

  const baseButtonClass =
    'rounded-md border border-slate-200 bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-[#776B6B] shadow-sm disabled:cursor-not-allowed disabled:opacity-60 hover:bg-slate-50 min-w-[2rem]'
  const activeButtonClass =
    'rounded-md border border-[#776B6B] bg-[#776B6B] px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-white shadow-sm min-w-[2rem]'
  const ellipsisClass = 'px-1 text-xs sm:text-sm text-[#776B6B] font-medium'

  return (
    <footer className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pt-4 border-t border-slate-100">
      <div className="text-xs sm:text-sm text-slate-500">
        Page <span className="font-semibold text-slate-700">{currentPage}</span> of{' '}
        <span className="font-semibold text-slate-700">{totalPages || 0}</span>{' '}
        <span className="text-slate-400">•</span>{' '}
        <span className="font-semibold text-slate-700">{totalElements}</span> total rows
      </div>

      <nav
        aria-label="Pagination"
        className="flex flex-wrap items-center justify-center gap-2 sm:gap-4"
      >
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xs sm:text-sm text-[#776B6B]">Show</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Items per page"
              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-[#776B6B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#776B6B]"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-xs sm:text-sm text-[#776B6B]">per page</span>
          </div>
        )}

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            aria-label="Previous page"
            className={baseButtonClass}
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            &laquo; Prev
          </button>

          {visiblePages.map((page, index) =>
            page === '...' ? (
              <span key={`ellipsis-${index}`} className={ellipsisClass}>
                ...
              </span>
            ) : (
              <button
                key={page}
                type="button"
                aria-label={`Go to page ${page}`}
                aria-current={currentPage === page ? 'page' : undefined}
                className={
                  currentPage === page ? activeButtonClass : baseButtonClass
                }
                onClick={() => onPageChange(page)}
              >
                {page}
              </button>
            )
          )}

          <button
            type="button"
            aria-label="Next page"
            className={baseButtonClass}
            disabled={currentPage >= safeTotalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Next &raquo;
          </button>
        </div>
      </nav>
    </footer>
  )
}
