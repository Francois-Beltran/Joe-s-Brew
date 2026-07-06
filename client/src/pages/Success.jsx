import { useEffect, useState } from 'react'
import { useCart } from '../hooks/useCart'
import { supabase } from '../lib/supabaseClient'

export default function Success() {
  const { clearCart } = useCart()
  const [feedback, setFeedback] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const orderId = sessionStorage.getItem('joesbrew_last_order_id')

  useEffect(() => {
    clearCart()
  }, [])

  const submitFeedback = async () => {
    if (!feedback.trim()) return
    setSubmitting(true)
    await supabase.from('customer_feedback').insert({
      order_id: orderId || null,
      message: feedback.trim(),
    })
    sessionStorage.removeItem('joesbrew_last_order_id')
    setSubmitted(true)
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-brew-beige flex flex-col items-center justify-center text-center px-6 py-12">
      <div className="text-7xl mb-6">☕</div>
      <h1 className="font-heading text-5xl text-brew-brown mb-4">ORDER PLACED!</h1>
      <p className="font-body text-brew-brown/70 max-w-sm mb-8">
        Payment confirmed. We'll send you an SMS when your order is verified and ready.
      </p>

      {/* Optional feedback */}
      <div className="w-full max-w-sm mb-6">
        {submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4">
            <p className="font-heading text-green-700 text-sm tracking-wide">THANK YOU FOR YOUR FEEDBACK! 🙏</p>
          </div>
        ) : (
          <div className="bg-white/60 rounded-2xl p-5 border border-brew-brown/15 text-left space-y-3">
            <p className="font-heading text-brew-brown text-sm tracking-wider">LEAVE FEEDBACK</p>
            <p className="font-body text-brew-brown/50 text-xs">Optional — share your experience with us.</p>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="How was your experience? Any suggestions?"
              rows={3}
              className="w-full border border-brew-brown/20 rounded-xl px-4 py-3 font-body text-sm text-brew-brown bg-transparent placeholder:text-brew-brown/30 focus:outline-none focus:border-brew-brown resize-none"
            />
            <button
              onClick={submitFeedback}
              disabled={submitting || !feedback.trim()}
              className="w-full bg-brew-brown text-brew-beige font-heading tracking-wider text-sm py-2.5 rounded-xl hover:bg-brew-dark transition-colors disabled:opacity-40"
            >
              {submitting ? 'SENDING...' : 'SUBMIT FEEDBACK'}
            </button>
          </div>
        )}
      </div>

      <a
        href="/"
        className="bg-brew-brown text-brew-beige font-heading tracking-wider px-8 py-3 rounded-full hover:bg-brew-dark transition-colors"
      >
        BACK TO MENU
      </a>
    </div>
  )
}
