import React, { useState } from 'react'
import { getUser, getRole, setToken } from '../api/client'

const navItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    iconPath:
      'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    id: 'products',
    label: 'Products',
    iconPath:
      'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  },
]

function NavIcon({ iconPath }) {
  return (
    <svg
      className="w-5 h-5 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d={iconPath}
      />
    </svg>
  )
}

function SidebarContent({
  userName,
  initials,
  currentRole,
  activePage,
  onNavigate,
  onLogout,
  onClose,
}) {
  return (
    <div className="flex flex-col h-full p-4 sm:p-6">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="relative">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white/20 bg-white/10 flex items-center justify-center text-2xl sm:text-3xl font-display font-semibold mb-3">
            {initials}
          </div>
        </div>
        <h2 className="text-lg font-display font-semibold text-white">
          {userName}
        </h2>
        <span className="text-xs text-white/70 mt-1">{currentRole}</span>
      </div>

      <div className="h-px w-full bg-white/20 mb-4" />

      <nav className="flex-1 overflow-y-auto space-y-1">
        {navItems.map((item) => {
          const isActive = activePage === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onNavigate(item.id)
                onClose?.()
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white/20 text-white shadow-soft'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <NavIcon iconPath={item.iconPath} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <button
        type="button"
        onClick={onLogout}
        className="mt-2 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
      >
        <svg
          className="w-5 h-5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        <span>Logout</span>
      </button>
    </div>
  )
}

export default function AppLayout({ activePage, onNavigate, onLogout, children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const user = getUser()
  const currentRole = getRole()
  const userName = user?.name || 'User'

  const initials = userName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U'

  const handleLogout = () => {
    setToken(null)
    setIsMobileMenuOpen(false)
    onLogout()
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:flex-shrink-0 bg-primary text-white">
        <SidebarContent
          userName={userName}
          initials={initials}
          currentRole={currentRole}
          activePage={activePage}
          onNavigate={onNavigate}
          onLogout={handleLogout}
        />
      </aside>

      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-primary text-white transform transition-transform duration-300 ease-out lg:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent
          userName={userName}
          initials={initials}
          currentRole={currentRole}
          activePage={activePage}
          onNavigate={onNavigate}
          onLogout={handleLogout}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      </div>

      <div className="w-full flex-1 flex flex-col min-h-screen">
        <header className="lg:hidden w-full flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-30">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Open menu"
          >
            <svg
              className="w-6 h-6 text-slate-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <h1 className="text-lg font-display font-semibold text-slate-800">
            Inventory System
          </h1>
          <div className="w-10" />
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="w-full min-h-full p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-7xl mx-auto">
              <nav className="flex items-center gap-2 text-sm mb-6" aria-label="Breadcrumb">
                <ol className="flex items-center gap-1.5 flex-wrap">
                  <li className="flex items-center">
                    {activePage === 'dashboard' ? (
                      <span className="font-medium text-slate-700" aria-current="page">
                        Home
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onNavigate('dashboard')}
                        className="text-slate-500 hover:text-primary transition-colors"
                      >
                        Home
                      </button>
                    )}
                  </li>
                  {activePage !== 'dashboard' && (
                    <li className="flex items-center">
                      <span className="mx-2 text-slate-400" aria-hidden="true">
                        /
                      </span>
                      <span className="font-medium text-slate-700" aria-current="page">
                        Products
                      </span>
                    </li>
                  )}
                </ol>
              </nav>

              <div className="w-full bg-white rounded-2xl lg:rounded-3xl shadow-soft p-4 sm:p-8 animate-fade-in">
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
