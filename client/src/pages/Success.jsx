import { useEffect } from 'react'
import { useCart } from '../hooks/useCart'

/**
 * Order success page component
 * Displays confirmation message after successful order placement
 * Clears cart on mount to prevent stale data
 * 
 * @returns {JSX.Element} Success page UI
 */
export default function Success() {
  const { clearCart } = useCart()

  useEffect(() => {
    clearCart()
  }, [])

  return (
    <div className="min-h-screen bg-brew-beige flex flex-col items-center justify-center text-center px-6">
      <div className="text-7xl mb-6">☕</div>
      <h1 className="font-heading text-5xl text-brew-brown mb-4">ORDER PLACED!</h1>
      <p className="font-body text-brew-brown/70 max-w-sm mb-8">
        Payment confirmed. We'll send you an SMS when your order is ready for pickup.
      </p>
      
      <a
        href="/"
        className="bg-brew-brown text-brew-beige font-heading tracking-wider px-8 py-3 rounded-full hover:bg-brew-dark transition-colors"
      >
        BACK TO MENU
      </a>
    </div>
  )
}