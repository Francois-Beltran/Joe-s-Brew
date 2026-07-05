import { useState } from 'react'

// BugReporter is now a pure modal — no floating tab.
// Parent controls visibility via the `open` and `onClose` props.
export default function BugReporter({ open, onClose }) {
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim()) return

    setSending(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/bug-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          email: email.trim() || 'anonymous',
          url: window.location.href,
        }),
      })

      if (res.ok) {
        setSent(true)
        setTimeout(() => {
          setSent(false)
          setMessage('')
          setEmail('')
          onClose()
        }, 1800)
      } else {
        alert('Failed to send report. Please try again.')
      }
    } catch {
      alert('Network error. Please try again later.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-brew-dark/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="bg-brew-brown text-brew-beige px-6 py-4 flex items-center justify-between">
          <div>
            <p className="font-heading tracking-wide text-lg">Report / Suggest</p>
            <p className="text-xs text-brew-beige/60">Help us improve Joe's Brew</p>
          </div>
          <button onClick={onClose} className="text-brew-beige/70 hover:text-brew-beige text-2xl leading-none">✕</button>
        </div>

        {sent ? (
          <div className="p-10 text-center">
            <div className="text-5xl mb-3">✅</div>
            <p className="font-heading text-brew-brown text-lg">Thank you!</p>
            <p className="text-sm text-brew-brown/70 mt-1">Your feedback has been received.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <input
              type="email"
              placeholder="Your email (optional)"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-brew-brown/25 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brew-brown"
            />
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Describe the bug or your suggestion in detail..."
              rows={5}
              className="w-full border border-brew-brown/25 rounded-xl px-4 py-3 text-sm resize-y focus:outline-none focus:border-brew-brown"
              required
            />
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="w-full bg-brew-brown text-brew-beige font-heading tracking-wider py-3 rounded-xl hover:bg-brew-dark transition-colors disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'SEND REPORT'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
