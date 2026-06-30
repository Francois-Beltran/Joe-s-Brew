import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { API_URL } from '../../lib/api'

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
  const [actionError, setActionError] = useState('')

  /**
   * Fetches orders from Supabase with related order items
   */
  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(quantity, unit_price, menu_items(name))')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Failed to fetch orders:', error)
        return
      }
      setOrders(data ?? [])
    } catch (error) {
      console.error('Fetch orders error:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Fetches menu items from Supabase
   */
  const fetchMenu = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name, price, is_available, category, rating, best_seller')
        .order('category')

      if (error) {
        console.error('Failed to fetch menu:', error)
        return
      }
      setMenuItems(data ?? [])
    } catch (error) {
      console.error('Fetch menu error:', error)
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
        () => fetchOrders()
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
    setActionError('')
    try {
      const res = await fetch(`${API_URL}/orders/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setActionError(data?.error || `Failed to verify (status ${res.status})`)
        return
      }

      fetchOrders()
    } catch (error) {
      setActionError('Network error: ' + error.message)
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
    setActionError('')
    try {
      const res = await fetch(`${API_URL}/orders/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setActionError(data?.error || `Failed to fulfill (status ${res.status})`)
        return
      }

      fetchOrders()
    } catch (error) {
      setActionError('Network error: ' + error.message)
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
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !item.is_available })
        .eq('id', item.id)

      if (error) {
        setActionError('Failed to update item availability')
        return
      }

      setMenuItems(prev =>
        prev.map(m => m.id === item.id ? { ...m, is_available: !m.is_available } : m)
      )
    } catch (error) {
      setActionError('Failed to update item availability')
    }
  }

  /**
   * Filters orders based on active tab
   */
  const filteredOrders = orders.filter(o => {
    if (activeTab === 'unverified') return ['pending', 'unverified'].includes(o.status)
    if (activeTab === 'paid') return o.status === 'paid'
    return true
  })

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

        <div className="mb-6">
          <h1 className="font-heading text-5xl text-brew-brown">ADMIN DASHBOARD</h1>
          <p className="font-body text-brew-brown/60 mt-1">Joe's Brew · Live order management</p>
        </div>

        {actionError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
            <p className="font-body text-sm text-red-700">{actionError}</p>
            <button
              onClick={() => setActionError('')}
              className="text-red-400 hover:text-red-600 text-sm shrink-0"
            >✕</button>
          </div>
        )}

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
                      ({orders.filter(o => ['pending', 'unverified'].includes(o.status)).length})
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

                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-heading text-brew-brown text-lg">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="font-body text-xs text-brew-brown/50">{order.customer_phone}</p>
                        {order.telegram_username && (
                          <p className="font-body text-xs text-blue-500">@{order.telegram_username}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-heading text-brew-brown">₱{Number(order.total_amount).toFixed(2)}</p>
                        <span className={`font-body text-xs px-2 py-0.5 rounded-full ${statusBadge(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>

                    <ul className="mb-3 space-y-1">
                      {order.order_items?.map((oi, i) => (
                        <li key={i} className="font-body text-sm text-brew-brown/80 flex justify-between">
                          <span>{oi.quantity}× {oi.menu_items?.name}</span>
                          <span>₱{(oi.unit_price * oi.quantity).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="bg-brew-beige/50 rounded-xl p-3 mb-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-body text-xs text-brew-brown/60">GCash Ref</span>
                        <span className="font-heading text-sm text-brew-brown tracking-wider">
                          {order.gcash_ref ?? (
                            <span className="text-amber-600 font-body text-xs">Not provided</span>
                          )}
                        </span>
                      </div>
                      {order.gcash_screenshot_url && (
                        <button
                          onClick={() => setLightbox(order.gcash_screenshot_url)}
                          className="font-body text-xs text-blue-600 hover:underline mt-1"
                        >
                          📸 View screenshot
                        </button>
                      )}
                    </div>

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
                          {fulfilling === order.id ? 'NOTIFYING...' : '☕ READY & NOTIFY'}
                        </button>
                      )}
                      {order.status === 'ready' && (
                        <p className="flex-1 text-center font-body text-xs text-purple-700 py-2">
                          ✓ Picked up / notified
                        </p>
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