import { useState, useEffect } from 'react';
import { useCart } from '../hooks/useCart';
import { API_URL } from '../lib/api';
import GCashModal from './GCashModal';
import { useBranch } from '../context/BranchContext';

/**
 * Shopping cart drawer component
 * Displays cart items, allows quantity adjustments, and initiates GCash payment
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onClose - Callback when cart is closed
 * @returns {JSX.Element} Cart drawer UI
 */
export default function Cart({ onClose }) {
  const { cart, removeItem, updateQty } = useCart()
  const { branch } = useBranch()
  const [showGCash, setShowGCash] = useState(false)

  const displayTotal = cart.reduce((s, i) => s + i.displayPrice * i.quantity, 0)

  const [shopOpen, setShopOpen] = useState(true)
  const [statusLoading, setStatusLoading] = useState(false)

  const checkShopStatus = async () => {
    setStatusLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/shop/status`)
      const data = await res.json()
      setShopOpen(data.isOpen)
    } catch {
      setShopOpen(true) // fail-open
    } finally {
      setStatusLoading(false)
    }
  }

  useEffect(() => {
    checkShopStatus()
    const interval = setInterval(checkShopStatus, 30000) // recheck every 30s
    return () => clearInterval(interval)
  }, [])

  const handleSuccess = () => {
    setShowGCash(false)
    onClose()
    window.location.href = '/success'
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex">
        {/* Backdrop */}
        <div
          className="flex-1 bg-brew-dark/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Drawer — glassmorphism panel */}
        <div
          className="w-full max-w-md h-full flex flex-col shadow-2xl overflow-y-auto animate-fade-in-up"
          style={{
            background: 'rgba(243, 233, 220, 0.82)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderLeft: '1px solid rgba(213,188,158,0.4)',
          }}
        >
          <div className="p-6 border-b border-brew-brown/20 flex items-center justify-between">
            <h2 className="font-heading text-2xl text-brew-brown tracking-wider">YOUR ORDER</h2>
            <button onClick={onClose} className="text-brew-brown/60 hover:text-brew-brown text-2xl">✕</button>
          </div>

          {cart.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="font-body text-brew-brown/50">Your cart is empty.</p>
            </div>
          ) : (
            <>
              <ul className="flex-1 p-6 space-y-4">
                {cart.map(item => (
                  <li key={`${item.menuItemId}-${item.size}`} className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="font-heading text-brew-brown">{item.name}</p>
                      <p className="font-body text-xs text-brew-brown/50">
                        {item.sizeLabel && item.sizeLabel !== 'One Size' ? item.sizeLabel + ' · ' : ''}
                        ₱{Number(item.displayPrice).toFixed(2)} each
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.menuItemId, item.quantity - 1, item.size)}
                        className="w-7 h-7 rounded-full border border-brew-brown text-brew-brown flex items-center justify-center hover:bg-brew-brown hover:text-brew-beige transition-colors"
                      >−</button>
                      <span className="font-body w-6 text-center text-brew-brown">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.menuItemId, item.quantity + 1, item.size)}
                        className="w-7 h-7 rounded-full border border-brew-brown text-brew-brown flex items-center justify-center hover:bg-brew-brown hover:text-brew-beige transition-colors"
                      >+</button>
                    </div>

                    <button
                      onClick={() => removeItem(item.menuItemId, item.size)}
                      className="text-brew-brown/40 hover:text-red-500 transition-colors text-sm"
                    >✕</button>
                  </li>
                ))}
              </ul>

              <div className="p-6 border-t border-brew-brown/20 space-y-4">
                <div className="flex justify-between font-heading text-xl text-brew-brown">
                  <span>TOTAL</span>
                  <span>₱{displayTotal.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="font-body text-brew-brown/70">Shop Status</span>
                  <button 
                    onClick={checkShopStatus}
                    disabled={statusLoading}
                    className="text-xs underline"
                  >
                    {shopOpen ? '🟢 Open' : '🔴 Closed'} {statusLoading && '⋯'}
                  </button>
                </div>

                {!shopOpen && (
                  <p className="font-body text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 text-center mb-2">
                    🔒 We're currently closed. You can still browse, but checkout is disabled until we reopen.
                  </p>
                )}

                {branch.comingSoon && (
                  <p className="font-body text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-3 text-center mb-2">
                    🚧 The {branch.label} branch is coming soon — ordering is not yet available.
                  </p>
                )}

                <button
                  onClick={() => setShowGCash(true)}
                  disabled={!shopOpen || branch.comingSoon}
                  className="w-full bg-[#0070C0] text-white font-heading tracking-widest text-lg py-4 rounded-xl hover:bg-[#005a9e] transition-colors flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="text-2xl">💙</span>
                  PAY WITH GCASH
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showGCash && (
        <GCashModal
          onClose={() => setShowGCash(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}