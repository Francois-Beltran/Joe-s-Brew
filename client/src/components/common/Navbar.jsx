import { useState } from 'react'
import { useCart } from '../../hooks/useCart'
import Cart from "../../features/cart/Cart";

/**
 * Navigation bar component with cart button
 * Displays brand logo, navigation links, and cart item count
 * 
 * @returns {JSX.Element} Navigation bar UI
 */
export default function Navbar() {
  const { totalItems } = useCart()
  const [cartOpen, setCartOpen] = useState(false)

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-brew-brown text-brew-beige shadow-lg transition-shadow duration-300">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl tracking-widest">JOE'S BREW</h1>
            <p className="text-xs text-brew-beige/60 tracking-wider">EST. 1939</p>
          </div>

          <div className="hidden md:flex items-center gap-8 font-body text-sm tracking-wide">
            <a href="#menu" className="hover:text-white transition-colors">Menu</a>
            <a href="#about" className="hover:text-white transition-colors">About</a>
          </div>

          <button
            onClick={() => setCartOpen(true)}
            className="relative bg-brew-beige text-brew-brown px-4 py-2 rounded-full font-body font-semibold text-sm hover:bg-white transition-colors"
          >
            Cart
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </nav>

      {cartOpen && <Cart onClose={() => setCartOpen(false)} />}
    </>
  )
}