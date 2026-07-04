import { useState, useEffect } from 'react'
import { API_URL } from "../../lib/api";

export default function AdminGuard({ children }) {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem('joesbrew_admin_token')
    setAuthed(!!token)
    setChecking(false)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Incorrect password.')
        return
      }
      sessionStorage.setItem('joesbrew_admin_token', data.token)
      setAuthed(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) return null

  if (!authed) {
    return (
      <div className="min-h-screen bg-brew-beige flex items-center justify-center px-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
          <h1 className="font-heading text-3xl text-brew-brown mb-2">ADMIN ACCESS</h1>
          <p className="font-body text-brew-brown/60 text-sm mb-6">Joe's Brew Dashboard</p>

          <input
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            className="w-full border-2 border-brew-brown/30 rounded-xl px-4 py-3 font-body text-brew-brown bg-transparent placeholder:text-brew-brown/30 focus:outline-none focus:border-brew-brown mb-3"
          />

          {error && <p className="font-body text-sm text-red-600 mb-3">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brew-brown text-brew-beige font-heading tracking-wider py-3 rounded-xl hover:bg-brew-dark transition-colors disabled:opacity-50"
          >
            {loading ? 'CHECKING...' : 'ENTER'}
          </button>
        </form>
      </div>
    )
  }

  return children
}