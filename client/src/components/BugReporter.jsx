import { useState } from 'react'

export default function BugReporter() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

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
          url: window.location.href 
        })
      })

      if (res.ok) {
        setSent(true)
        setTimeout(() => {
          setOpen(false)
          setMessage('')
          setSent(false)
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
    <>
      {/* Floating Chat Head */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 bg-brew-brown text-brew-beige rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-3xl"
        aria-label="Report a bug"
      >
        🐞
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[70] w-80 bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-brew-brown text-brew-beige p-4 flex items-center justify-between">
            <div>
              <p className="font-heading tracking-wide">Report a Bug</p>
              <p className="text-xs opacity-75">Help us improve Joe's Brew</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-xl leading-none">✕</button>
          </div>

          {sent ? (
            <div className="p-8 text-center">
              <div className="text-5xl mb-3">✅</div>
              <p className="font-heading text-brew-brown">Thank you!</p>
              <p className="text-sm text-brew-brown/70">Your report has been received.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <input
                type="email"
                placeholder="Your email (optional)"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-brew-brown/30 rounded-xl px-4 py-3 text-sm"
              />
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="What went wrong? Be as detailed as possible..."
                rows={5}
                className="w-full border border-brew-brown/30 rounded-xl px-4 py-3 text-sm resize-y"
                required
              />
              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="w-full bg-brew-brown text-white font-heading py-3 rounded-xl disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'SEND REPORT'}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  )
}