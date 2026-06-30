import { useState, useEffect } from 'react'

export default function AdminGuard({ children }) {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const saved = sessionStorage.getItem('joesbrew_admin_authed')
    if (saved === 'true') setAuthed(true)
    setChecking(false)
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (password === import.meta.env.VITE_ADMIN_PASSWORD) {
      sessionStorage.setItem('joesbrew_admin_authed', 'true')
      setAuthed(true)
      setError('')
    } else {
      setError('Incorrect password.')
    }
  }

  if (checking) return null

  if (!authed) {
    return (
      <div className="min-h-screen bg-brew-beige flex items-center justify-center px-4">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm"
        >
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

          {error && (
            <p className="font-body text-sm text-red-600 mb-3">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-brew-brown text-brew-beige font-heading tracking-wider py-3 rounded-xl hover:bg-brew-dark transition-colors"
          >
            ENTER
          </button>
        </form>
      </div>
    )
  }

  return children
}