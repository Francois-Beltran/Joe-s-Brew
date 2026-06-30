import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

/**
 * Admin dashboard component for managing orders and inventory
 * Displays orders by status, allows payment verification and order fulfillment,
 * and manages menu item availability
 * 
 * @returns {JSX.Element} Admin dashboard UI
 */
export default function Dashboard() {
  const [orders, setOrders] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('unverified')
  const [fulfilling, setFulfilling] = useState(null)
  const [verifying, setVerifying] = useState(null)
  const [lightbox, setLightbox] = useState(null)

  /**
   * Fetches orders from Supabase with related order items
   */
  const fetchOrders = async () => {
    try {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(quantity, unit_price, menu_items(name))')
        .order('created_at', { ascending: true })
      setOrders(data ?? [])
    } catch (error) {
      // Handle error silently or show toast notification
    } finally {
      setLoading(false)
    }
  }

  /**
   * Fetches menu items from Supabase
   */
  const fetchMenu = async () => {
    try {
      const { data } = await supabase
        .from('menu_items')
        .select('id, name, price, is_available, category, rating, best_seller')
        .order('category')
      setMenuItems(data ?? [])
    } catch (error) {
      // Handle error silently or show toast notification
    }
  }

  useEffect(() => {
    fetchOrders()
    fetchMenu()

    const channel = supabase
      .channel('admin-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders()
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  /**
   * Verifies GCash payment for an order
   * 
   * @param {Object} order - Order object to verify
   */
  const verifyOrder = async (order) => {
    setVerifying(order.id)
    try {
      const res = await fetch('/api/orders/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET,
        },
        body: JSON.stringify({ orderId: order.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert('Error: ' + data.error)
      } else {
        fetchOrders()
      }
    } catch (error) {
      alert('Network error: ' + error.message)
    } finally {
      setVerifying(null)
    }
  }

  /**
   * Marks order as ready for pickup and notifies customer
   * 
   * @param {Object} order - Order object to fulfill
   */
  const markReady = async (order) => {
    setFulfilling(order.id)
    try {
      const res = await fetch('/api/orders/fulfill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET,
        },
        body: JSON.stringify({ orderId: order.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert('Error: ' + data.error)
      } else {
        fetchOrders()
      }
    } catch (error) {
      alert('Network error: ' + error.message)
    } finally {
      setFulfilling(null)
    }
  }

  /**
   * Toggles availability status of a menu item
   * 
   * @param {Object} item - Menu item to toggle
   */
  const toggleAvailability = async (item) => {
    try {
      await supabase
        .from('menu_items')
        .update({ is_available: !item.is_available })
        .eq('id', item.id)
      setMenuItems(prev =>
        prev.map(m => m.id === item.id ? { ...m, is_available: !m.is_available } : m)
      )
    } catch (error) {
      alert('Failed to update item availability')
    }
  }

  /**
   * Filters orders based on active tab
   * 
   * @returns {Array<Object>} Filtered orders
   */
  const filteredOrders = orders.filter(o => {
    if (activeTab === 'unverified') return ['pending', 'unverified'].includes(o.status)
    if (activeTab === 'paid') return o.status === 'paid'
    return true
  })

  /**
   * Returns Tailwind CSS classes for order status badge
   * 
   * @param {string} status - Order status
   * @returns {string} Tailwind CSS classes
   */
  const statusBadge = (status) => {
    const map = {
      unverified: 'bg-amber-100 text-amber-800',
      pending: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      ready: 'bg-purple-100 text-purple-800',
    }
    return map[status] ?? 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-brew-beige p-6">
      <div className="max-w-6xl mx-auto">

        <div className="mb-8">
          <h1 className="font-heading text-5xl text-brew-brown">ADMIN DASHBOARD</h1>
          <p className="font-body text-brew-brown/60 mt-1">Joe's Brew · Live order management</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Orders Panel */}
          <div>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <h2 className="font-heading text-2xl text-brew-brown tracking-wide">ORDERS</h2>
              {['unverified', 'paid', 'all'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`font-heading text-xs tracking-wider px-4 py-1 rounded-full border transition-colors ${
                    activeTab === tab
                      ? 'bg-brew-brown text-brew-beige border-brew-brown'
                      : 'text-brew-brown border-brew-brown/30 hover:border-brew-brown'
                  }`}
                >
                  {tab.toUpperCase()}
                  {tab === 'unverified' && (
                    <span className="ml-1">
                      ({orders.filter(o => ['pending','unverified'].includes(o.status)).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="font-body text-brew-brown/50">Loading...</p>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-brew-light rounded-2xl p-8 text-center">
                <p className="text-4xl mb-3">☕</p>
                <p className="font-body text-brew-brown/50">No orders in this view.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-2xl p-5 shadow-md">

                    {/* Order header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-heading text-brew-brown text-lg">
                          #{order.id.slice(0,8).toUpperCase()}
                        </p>
                        <p className="font-body text-xs text-brew-brown/50">{order.customer_phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-heading text-brew-brown">₱{Number(order.total_amount).toFixed(2)}</p>
                        <span className={`font-body text-xs px-2 py-0.5 rounded-full ${statusBadge(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>

                    {/* Items */}
                    <ul className="mb-3 space-y-1">
                      {order.order_items?.map((oi, i) => (
                        <li key={i} className="font-body text-sm text-brew-brown/80 flex justify-between">
                          <span>{oi.quantity}× {oi.menu_items?.name}</span>
                          <span>₱{(oi.unit_price * oi.quantity).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>

                    {/* GCash info */}
                    <div className="bg-brew-beige/50 rounded-xl p-3 mb-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-body text-xs text-brew-brown/60">GCash Ref</span>
                        <span className="font-heading text-sm text-brew-brown tracking-wider">
                          {order.gcash_ref ?? (
                            <span className="text-amber-600 font-body text-xs">Not extracted</span>
                          )}
                        </span>
                      </div>
                      {order.gcash_amount_paid && (
                        <div className="flex items-center justify-between">
                          <span className="font-body text-xs text-brew-brown/60">Amount paid</span>
                          <span className={`font-body text-sm font-medium ${
                            Math.abs(order.gcash_amount_paid - order.total_amount) < 1
                              ? 'text-green-600' : 'text-red-600'
                          }`}>
                            ₱{Number(order.gcash_amount_paid).toFixed(2)}
                            {Math.abs(order.gcash_amount_paid - order.total_amount) < 1
                              ? ' ✓' : ' ⚠ mismatch'}
                          </span>
                        </div>
                      )}
                      {order.gcash_screenshot_url && (
                        <button
                          onClick={() => setLightbox(order.gcash_screenshot_url)}
                          className="font-body text-xs text-blue-600 hover:underline mt-1"
                        >
                          📸 View screenshot
                        </button>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {['pending', 'unverified'].includes(order.status) && (
                        <button
                          onClick={() => verifyOrder(order)}
                          disabled={verifying === order.id}
                          className="flex-1 bg-green-600 text-white font-heading text-xs tracking-wider py-2 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {verifying === order.id ? 'VERIFYING...' : '✓ VERIFY PAYMENT'}
                        </button>
                      )}
                      {order.status === 'paid' && (
                        <button
                          onClick={() => markReady(order)}
                          disabled={fulfilling === order.id}
                          className="flex-1 bg-brew-brown text-brew-beige font-heading text-xs tracking-wider py-2 rounded-xl hover:bg-brew-dark transition-colors disabled:opacity-50"
                        >
                          {fulfilling === order.id ? 'SENDING SMS...' : '☕ READY & NOTIFY'}
                        </button>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inventory Panel */}
          <div>
            <h2 className="font-heading text-2xl text-brew-brown mb-4 tracking-wide">INVENTORY</h2>
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-brew-brown text-brew-beige">
                  <tr>
                    <th className="font-heading text-left px-5 py-3 text-xs tracking-wider">ITEM</th>
                    <th className="font-heading text-right px-5 py-3 text-xs tracking-wider">PRICE</th>
                    <th className="font-heading text-center px-5 py-3 text-xs tracking-wider">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brew-beige/40">
                  {menuItems.map(item => (
                    <tr key={item.id} className="hover:bg-brew-beige/20 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-body font-medium text-brew-brown text-sm">{item.name}</p>
                            <p className="font-body text-xs text-brew-brown/40">{item.category}</p>
                          </div>
                          {item.best_seller && (
                            <span className="text-amber-400 text-xs">⭐</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-body text-sm text-brew-brown">
                        ₱{Number(item.price).toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => toggleAvailability(item)}
                          className={`px-3 py-1 rounded-full font-heading text-xs tracking-wider transition-colors ${
                            item.is_available
                              ? 'bg-green-100 text-green-800 hover:bg-red-100 hover:text-red-800'
                              : 'bg-red-100 text-red-800 hover:bg-green-100 hover:text-green-800'
                          }`}
                        >
                          {item.is_available ? 'AVAILABLE' : 'OUT OF STOCK'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* Screenshot lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-sm w-full">
            <img src={lightbox} alt="GCash screenshot" className="w-full rounded-2xl shadow-2xl" />
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-3 right-3 bg-white/20 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-white/40"
            >✕</button>
          </div>
        </div>
      )}
    </div>
  )
}