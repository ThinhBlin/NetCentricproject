import React from 'react'

export function LoadingSpinner({
  size = 'md',
  color = 'primary',
  withText = false,
  text = 'Loading...',
  className = '',
}) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }

  const colorClasses = {
    primary: 'border-primary/30 border-t-primary',
    white: 'border-white/30 border-t-white',
    accent: 'border-accent/30 border-t-accent',
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-spin`}
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading</span>
      </div>
      {withText && (
        <span className="text-sm font-medium text-slate-600 animate-pulse">
          {text}
        </span>
      )}
    </div>
  )
}

export function Skeleton({ className = '', variant = 'text', width, height }) {
  const variantClasses = {
    text: 'h-4 rounded',
    title: 'h-8 rounded',
    avatar: 'rounded-full',
    card: 'rounded-xl',
    button: 'rounded-lg',
    input: 'rounded-md',
    image: 'rounded-xl',
  }

  return (
    <div
      className={`skeleton ${variantClasses[variant]} ${className}`}
      style={{
        width: width || (variant === 'avatar' ? '3rem' : '100%'),
        height: height || (variant === 'avatar' ? '3rem' : undefined),
      }}
      aria-hidden="true"
    />
  )
}

export function EmptyState({
  title = 'No data found',
  description = 'There are no items to display.',
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
        <svg
          className="w-10 h-10 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>
      <h3 className="text-xl font-display font-semibold text-slate-800 mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-500 max-w-md">{description}</p>
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred while loading this content.',
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-error-light flex items-center justify-center mb-6">
        <svg
          className="w-10 h-10 text-error"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-xl font-display font-semibold text-slate-800 mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-500 max-w-md mb-6">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="border-2 border-slate-300 hover:border-slate-400 text-slate-700 hover:bg-slate-50 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all"
        >
          Try Again
        </button>
      )}
    </div>
  )
}

export function LoadingState({
  title = 'Loading...',
  message = 'Please wait while we fetch the data.',
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-primary-subtle flex items-center justify-center mb-6">
        <svg
          className="w-10 h-10 text-primary animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
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
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
      <h3 className="text-xl font-display font-semibold text-slate-800 mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-500 max-w-md">{message}</p>
    </div>
  )
}

export default LoadingSpinner
