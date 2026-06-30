import { useState } from 'react'
import { useCart } from '../hooks/useCart'
import GCashModal from './GCashModal'

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
  const [showGCash, setShowGCash] = useState(false)

  const displayTotal = cart.reduce((s, i) => s + i.displayPrice * i.quantity, 0)

  /**
   * Handles successful payment completion
   * Closes cart and redirects to success page
   */
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

        {/* Drawer */}
        <div className="w-full max-w-md bg-brew-light h-full flex flex-col shadow-2xl overflow-y-auto">
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
                  <li key={item.menuItemId} className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="font-heading text-brew-brown">{item.name}</p>
                      <p className="font-body text-sm text-brew-brown/60">
                        ₱{Number(item.displayPrice).toFixed(2)} each
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.menuItemId, item.quantity - 1)}
                        className="w-7 h-7 rounded-full border border-brew-brown text-brew-brown flex items-center justify-center hover:bg-brew-brown hover:text-brew-beige transition-colors"
                      >−</button>
                      <span className="font-body w-6 text-center text-brew-brown">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.menuItemId, item.quantity + 1)}
                        className="w-7 h-7 rounded-full border border-brew-brown text-brew-brown flex items-center justify-center hover:bg-brew-brown hover:text-brew-beige transition-colors"
                      >+</button>
                    </div>

                    <button
                      onClick={() => removeItem(item.menuItemId)}
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

                <button
                  onClick={() => setShowGCash(true)}
                  className="w-full bg-[#0070C0] text-white font-heading tracking-widest text-lg py-4 rounded-xl hover:bg-[#005a9e] transition-colors flex items-center justify-center gap-3"
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