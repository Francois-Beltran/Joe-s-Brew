import { useState } from 'react'
import { useCart } from '../hooks/useCart'
import { useBranch, BRANCHES } from '../context/BranchContext'
import Cart from './Cart'

export default function Navbar() {
  const { totalItems } = useCart()
  const { branch, setBranchId } = useBranch()
  const [cartOpen, setCartOpen] = useState(false)
  const [branchOpen, setBranchOpen] = useState(false)

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 text-brew-beige shadow-lg transition-all duration-300"
        style={{
          background: 'rgba(74, 37, 17, 0.82)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(213, 188, 158, 0.15)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">

          {/* Brand */}
          <div className="shrink-0">
            <h1 className="font-heading text-xl md:text-2xl tracking-widest">JOE'S BREW</h1>
            <p className="text-[10px] text-brew-beige/50 tracking-wider hidden md:block">EST. 1939</p>
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6 font-body text-sm tracking-wide">
            <a href="#menu"     className="hover:text-white transition-colors">Menu</a>
            <a href="#branches" className="hover:text-white transition-colors">Branches</a>
            <a href="#about"    className="hover:text-white transition-colors">About</a>
          </div>

          {/* Branch selector */}
          <div className="relative">
            <button
              onClick={() => setBranchOpen(o => !o)}
              className="flex items-center gap-1.5 font-heading text-xs tracking-wider px-3 py-1.5 rounded-full border border-brew-beige/25 hover:border-brew-beige/60 transition-colors"
            >
              <span>{branch.emoji}</span>
              <span className="hidden sm:inline">{branch.label}</span>
              <span className="text-brew-beige/50">▾</span>
            </button>

            {branchOpen && (
              <>
                {/* click-away overlay */}
                <div className="fixed inset-0 z-10" onClick={() => setBranchOpen(false)} />
                <div
                  className="absolute right-0 top-full mt-2 w-52 rounded-2xl overflow-hidden shadow-2xl z-20"
                  style={{
                    background: 'rgba(74,37,17,0.95)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(213,188,158,0.2)',
                  }}
                >
                  {Object.values(BRANCHES).map(b => (
                    <button
                      key={b.id}
                      onClick={() => { setBranchId(b.id); setBranchOpen(false) }}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors hover:bg-brew-beige/10 ${branch.id === b.id ? 'bg-brew-beige/15' : ''}`}
                    >
                      <span className="text-lg">{b.emoji}</span>
                      <div>
                        <p className="font-heading text-brew-beige text-sm tracking-wide">{b.label}</p>
                        <p className="font-body text-brew-beige/45 text-[10px]">
                          {b.comingSoon ? 'Coming Soon' : b.delivery ? 'Pickup & Delivery' : 'Pickup Only'}
                        </p>
                      </div>
                      {branch.id === b.id && <span className="ml-auto text-brew-beige/60 text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Cart */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative bg-brew-beige text-brew-brown px-3 md:px-4 py-2 rounded-full font-body font-semibold text-sm hover:bg-white transition-colors shrink-0"
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
