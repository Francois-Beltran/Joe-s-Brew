import { useState, useEffect } from 'react';
import { useCart } from "../../hooks/useCart";
import { API_URL } from "../../lib/api";
import GCashModal from "../checkout/GCashModal";

export default function Cart({ onClose }) {
  const { cart, removeItem, updateQty } = useCart();
  const [showGCash, setShowGCash] = useState(false);

  // Calculate real cart total
  const cartTotal = cart.reduce((sum, item) => {
    return sum + (Number(item.displayPrice) * item.quantity);
  }, 0);

  const [shopOpen, setShopOpen] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);

  const checkShopStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/shop/status`);
      const data = await res.json();
      setShopOpen(data.isOpen);
    } catch {
      setShopOpen(true); // fail-open
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    checkShopStatus();
    const interval = setInterval(checkShopStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSuccess = (orderData) => {
    console.log('=== ORDER SUCCESS ===');
    console.log('Order Data received:', orderData);

    setShowGCash(false);
    onClose();

    // TEMPORARILY DISABLE REDIRECT
    // window.location.href = '/success';

    alert('Order placed successfully! Check console for details. Do not close this alert yet.');
  };
  return (
    <>
      <div className="fixed inset-0 z-50 flex">
        {/* Backdrop */}
        <div className="flex-1 bg-brew-dark/60 backdrop-blur-sm" onClick={onClose} />

        {/* Drawer */}
        <div className="w-full max-w-md bg-brew-light h-full flex flex-col shadow-2xl overflow-y-auto animate-fade-in-up">
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
                      <p className="font-body text-xs text-brew-brown/50">
                        {item.sizeLabel && item.sizeLabel !== 'One Size' ? item.sizeLabel + ' · ' : ''}
                        ₱{Number(item.displayPrice).toFixed(2)} each
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.menuItemId, item.quantity - 1, item.size)} className="w-7 h-7 rounded-full border border-brew-brown text-brew-brown flex items-center justify-center hover:bg-brew-brown hover:text-brew-beige transition-colors">−</button>
                      <span className="font-body w-6 text-center text-brew-brown">{item.quantity}</span>
                      <button onClick={() => updateQty(item.menuItemId, item.quantity + 1, item.size)} className="w-7 h-7 rounded-full border border-brew-brown text-brew-brown flex items-center justify-center hover:bg-brew-brown hover:text-brew-beige transition-colors">+</button>
                    </div>

                    <button onClick={() => removeItem(item.menuItemId, item.size)} className="text-brew-brown/40 hover:text-red-500 transition-colors text-sm">✕</button>
                  </li>
                ))}
              </ul>

              <div className="p-6 border-t border-brew-brown/20 space-y-4">
                <div className="flex justify-between font-heading text-xl text-brew-brown">
                  <span>TOTAL</span>
                  <span>₱{cartTotal.toFixed(2)}</span>
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

                <button
                  onClick={() => setShowGCash(true)}
                  disabled={!shopOpen}
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
          cartItems={cart}
          cartTotal={cartTotal}
          onClose={() => setShowGCash(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}