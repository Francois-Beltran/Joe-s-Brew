import { useState, useRef } from 'react'
import { useCart } from '../hooks/useCart'
import { API_URL } from '../lib/api'
/**
 * GCash payment modal component
 * Handles GCash payment flow with QR code display, reference number input,
 * screenshot upload, and order submission
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {Function} props.onSuccess - Callback when payment is successful
 * @returns {JSX.Element} GCash payment modal UI
 */
export default function GCashModal({ onClose, onSuccess }) {
  const { cart, clearCart } = useCart()
  const [phone, setPhone] = useState('')
  const [refNumber, setRefNumber] = useState('')
  const [screenshot, setScreenshot] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [telegramUsername, setTelegramUsername] = useState('')
  const [error, setError] = useState('')
  const [stage, setStage] = useState('instructions')
  const [result, setResult] = useState(null)
  const fileInputRef = useRef(null)

  const GCASH_NUMBER = import.meta.env.VITE_GCASH_NUMBER || '09XXXXXXXXX'
  const GCASH_NAME = import.meta.env.VITE_GCASH_NAME || 'Joe Dela Cruz'

  const displayTotal = cart.reduce((s, i) => s + i.displayPrice * i.quantity, 0)

  /**
   * Handles file input change for screenshot upload
   * Validates file type and creates preview
   * 
   * @param {Event} e - File input change event
   */
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.')
      return
    }
    setScreenshot(file)
    setPreview(URL.createObjectURL(file))
    setError('')
  }

  /**
   * Handles form submission for GCash payment
   * Validates inputs and submits order to backend
   */
  const handleSubmit = async () => {
    // Validate phone
    if (!phone.match(/^\+63\d{10}$/)) {
      setError('Enter a valid PH number: +639XXXXXXXXX')
      return
    }
    // Validate ref number — GCash ref is 13 digits
    if (!refNumber.match(/^\d{13}$/)) {
      setError('GCash reference number must be exactly 13 digits.')
      return
    }
    if (!screenshot) {
      setError('Please upload your GCash payment screenshot.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('items', JSON.stringify(
        cart.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity }))
      ))
      formData.append('customerPhone', phone)
      formData.append('gcashRef', refNumber)
      formData.append('screenshot', screenshot)
      formData.append('telegramUsername', telegramUsername)

      const res = await fetch(`${import.meta.env.VITE_API_URL}/checkout`, { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        return
      }

      setResult(data)
      setStage('done')
      clearCart()

    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-brew-dark/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-brew-light rounded-3xl shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh]">

        {/* Header */}
        <div className="bg-brew-brown text-brew-beige p-6 rounded-t-3xl flex items-center justify-between">
          <div>
            <h2 className="font-heading text-2xl tracking-wider">PAY WITH GCASH</h2>
            <p className="font-body text-brew-beige/60 text-sm">Joe's Brew · Order Total</p>
          </div>
          <p className="font-heading text-3xl">₱{displayTotal.toFixed(2)}</p>
        </div>

        <div className="p-6 space-y-5">

          {stage === 'instructions' && (
            <>
              {/* GCash QR */}
              <div className="bg-white rounded-2xl p-4 flex flex-col items-center border-2 border-dashed border-brew-brown/30">
                {/* Swap this div with your real QR: <img src="/images/gcash-qr.png" className="w-48 h-48 rounded-xl" /> */}
                <div className="w-48 h-48 bg-brew-beige rounded-xl flex flex-col items-center justify-center mb-3 border border-brew-brown/20">
                  <span className="text-5xl mb-2">📱</span>
                  <p className="font-body text-xs text-brew-brown/50 text-center px-4">
                    Place your GCash QR here
                  </p>
                </div>
                <p className="font-heading text-brew-brown text-lg tracking-wide">{GCASH_NUMBER}</p>
                <p className="font-body text-brew-brown/60 text-sm">{GCASH_NAME}</p>
              </div>

              {/* Steps */}
              <ol className="space-y-2">
                {[
                  `Open GCash and send exactly ₱${displayTotal.toFixed(2)} to ${GCASH_NUMBER}`,
                  'Wait for the GCash payment confirmation screen',
                  'Copy your 13-digit reference number from the confirmation',
                  'Take a screenshot and fill in the form below',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 font-body text-sm text-brew-brown/80">
                    <span className="w-6 h-6 rounded-full bg-brew-brown text-brew-beige flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>

              <hr className="border-brew-brown/20" />

              {/* Phone */}
              <div>
                <label className="font-body text-sm text-brew-brown/70 mb-1 block">
                  Your phone number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="+639XXXXXXXXX"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full border-2 border-brew-brown/30 rounded-xl px-4 py-3 font-body text-brew-brown bg-transparent placeholder:text-brew-brown/30 focus:outline-none focus:border-brew-brown"
                />
              </div>

              {/* Reference number */}
              <div>
                <label className="font-body text-sm text-brew-brown/70 mb-1 block">
                  GCash reference number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1234567890123"
                  maxLength={13}
                  value={refNumber}
                  onChange={e => setRefNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full border-2 border-brew-brown/30 rounded-xl px-4 py-3 font-body text-brew-brown bg-transparent placeholder:text-brew-brown/30 focus:outline-none focus:border-brew-brown tracking-widest font-heading text-lg"
                />
                <p className="font-body text-xs text-brew-brown/40 mt-1">
                  {refNumber.length}/13 digits
                  {refNumber.length === 13 && <span className="text-green-600 ml-2">✓</span>}
                </p>
              </div>

              {/* Telegram username */}
              <div>
                <label className="font-body text-sm text-brew-brown/70 mb-1 block">
                  Telegram username <span className="text-brew-brown/40 text-xs">(optional, for order updates)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-body text-brew-brown/40">@</span>
                  <input
                    type="text"
                    placeholder="yourusername"
                    value={telegramUsername}
                    onChange={e => setTelegramUsername(e.target.value.replace('@', '').replace(/\s/g, ''))}
                    className="w-full border-2 border-brew-brown/30 rounded-xl pl-8 pr-4 py-3 font-body text-brew-brown bg-transparent placeholder:text-brew-brown/30 focus:outline-none focus:border-brew-brown"
                  />
                </div>

                {/* 💡 FIXED: Wrapped attributes in an actual <a> tag */}
                <a
href={`tg://resolve?domain=${import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? 'your_bot'}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-body text-xs text-blue-600 hover:underline mt-2 block"
                >
                  👆 Start our bot first to receive notifications
                </a>
              </div>
              {/* Screenshot upload */}
              <div>
                <label className="font-body text-sm text-brew-brown/70 mb-2 block">
                  Payment screenshot <span className="text-red-500">*</span>
                </label>

                {preview ? (
                  <div className="relative">
                    <img
                      src={preview}
                      alt="GCash screenshot preview"
                      className="w-full rounded-xl border-2 border-green-400 object-contain max-h-64"
                    />
                    <button
                      onClick={() => { setScreenshot(null); setPreview(null) }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-600"
                    >✕</button>
                    <p className="mt-1 font-body text-xs text-green-600">✓ Screenshot ready</p>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="w-full border-2 border-dashed border-brew-brown/40 rounded-xl py-8 flex flex-col items-center gap-2 hover:border-brew-brown hover:bg-brew-brown/5 transition-colors"
                  >
                    <span className="text-3xl">📸</span>
                    <p className="font-body text-sm text-brew-brown/70">Tap to upload screenshot</p>
                    <p className="font-body text-xs text-brew-brown/40">JPG, PNG supported</p>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {error && (
                <p className="font-body text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">
                  {error}
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !screenshot || !phone || refNumber.length !== 13}
                className="w-full bg-brew-brown text-brew-beige font-heading tracking-widest text-lg py-4 rounded-xl hover:bg-brew-dark transition-colors disabled:opacity-40"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-brew-beige border-t-transparent rounded-full animate-spin" />
                    SUBMITTING...
                  </span>
                ) : 'CONFIRM ORDER'}
              </button>
            </>
          )}

          {/* Done stage */}
          {stage === 'done' && result && (
            <div className="py-8 flex flex-col items-center gap-4 text-center">
              <div className="text-6xl">✅</div>
              <h3 className="font-heading text-2xl text-brew-brown">ORDER RECEIVED!</h3>

              <div className="bg-white rounded-2xl p-5 w-full border border-brew-brown/20 space-y-3">
                <div>
                  <p className="font-body text-xs text-brew-brown/50 mb-1">Order ID</p>
                  <p className="font-heading text-lg text-brew-brown tracking-widest">
                    #{result.orderId?.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <hr className="border-brew-brown/10" />
                <div>
                  <p className="font-body text-xs text-brew-brown/50 mb-1">GCash Reference Number</p>
                  <p className="font-heading text-2xl text-brew-brown tracking-widest">
                    {result.gcashRef}
                  </p>
                </div>
                <hr className="border-brew-brown/10" />
                <div>
                  <p className="font-body text-xs text-brew-brown/50 mb-1">Amount</p>
                  <p className="font-heading text-xl text-brew-brown">
                    ₱{Number(result.totalAmount).toFixed(2)}
                  </p>
                </div>
              </div>

              <p className="font-body text-brew-brown/60 text-sm">
                Our staff will verify your payment shortly. You'll receive an SMS when your order is ready for pickup.
              </p>

              <button
                onClick={onSuccess}
                className="w-full bg-brew-brown text-brew-beige font-heading tracking-wider py-3 rounded-xl hover:bg-brew-dark transition-colors"
              >
                DONE
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}