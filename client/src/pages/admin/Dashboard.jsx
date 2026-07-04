import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { API_URL } from '../../lib/api'
import { createAuthFetch } from '../../lib/authFetch'
import InstallPrompt, { InstallButton } from '../../components/InstallPrompt'

const adminFetch = createAuthFetch('joesbrew_admin_token')

/**
 * Admin dashboard — verifies/rejects GCash payments only.
 * Fulfillment and inventory now live in the Employee Dashboard (/employee).
 */
export default function Dashboard() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('unverified')
  const [verifying, setVerifying] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  const [actionError, setActionError] = useState('')
  const [shopOpen, setShopOpen] = useState(true)
  const [togglingShop, setTogglingShop] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)

  const todayStr = new Date().toDateString()

  const todaysOrders = orders.filter(o => {
    const orderDate = new Date(o.created_at).toDateString()
    return orderDate === todayStr && ['paid', 'ready'].includes(o.status)
  })

  // ============================================================
  // EXPORT TO SPREADSHEET
  // ============================================================
  const exportOrdersToCSV = () => {
    const headers = [
      'Priority #', 'Order ID', 'Date', 'Time', 'Customer Name', 'Phone',
      'Order Type', 'Sitio/Address', 'Items', 'GCash Ref', 'Status', 'Total Amount'
    ]

    const rows = orders.map(o => {
      const date = new Date(o.created_at)
      const SIZE_LABEL_CSV = { base: 'Medio', grande: 'Grande', king: 'King' }
      const itemsSummary = o.order_items
        ?.map(oi => {
          const isAddon = oi.menu_items?.category === 'Add-ons'
          const sizeTag = !isAddon && oi.size && oi.size !== 'base' ? ` (${SIZE_LABEL_CSV[oi.size] ?? oi.size})` : ''
          const baseTag = oi.base_type ? ` [${oi.base_type}]` : ''
          return `${oi.quantity}x ${oi.menu_items?.name}${baseTag}${sizeTag}`
        })
        .join('; ') || ''

      return [
        o.priority_number,
        o.id.slice(0, 8).toUpperCase(),
        date.toLocaleDateString('en-PH'),
        date.toLocaleTimeString('en-PH'),
        o.customer_name || '',
        o.customer_phone || '',
        o.order_type,
        o.delivery_address || 'Pickup',
        itemsSummary,
        o.gcash_ref || '',
        o.status,
        Number(o.total_amount).toFixed(2),
      ]
    })

    const todaysRevenue = todaysOrders.reduce((sum, o) => sum + Number(o.total_amount), 0)

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      '',
      `"Today's Total Revenue (${new Date().toLocaleDateString('en-PH')})","₱${todaysRevenue.toFixed(2)}"`,
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `JoesBrew_Orders_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const totalRevenue = todaysOrders.reduce((sum, o) => sum + Number(o.total_amount), 0)

  const SIZE_LABEL = { base: 'Medio', grande: 'Grande', king: 'King' }

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(quantity, unit_price, size, base_type, menu_items(name, category))')
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

  useEffect(() => {
    fetch(`${API_URL}/api/shop/status`).then(r => r.json()).then(d => setShopOpen(d.isOpen))
  }, [])

  const toggleShop = async () => {
    setTogglingShop(true)
    try {
      const res = await adminFetch(`${API_URL}/api/shop/toggle`, { method: 'POST' })
      if (!res) return // 401 handled by authFetch (reloads)
      const data = await res.json()
      setShopOpen(data.isOpen)
    } catch {
      setActionError('Failed to toggle shop status')
    } finally {
      setTogglingShop(false)
    }
  }

  useEffect(() => {
    fetchOrders()

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        console.log('🔔 New order detected:', payload.new)

        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('New Order Received! ☕', {
            body: `Order from ${payload.new.customer_name || 'a customer'} — ₱${Number(payload.new.total_amount).toFixed(2)}`,
            icon: '/images/admin-icon-192.png',
          })
        }
        fetchOrders()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const verifyOrder = async (order) => {
    setVerifying(order.id)
    setActionError('')
    try {
      const res = await adminFetch(`${API_URL}/api/orders/verify`, {
        method: 'POST',
        body: JSON.stringify({ orderId: order.id }),
      })
      if (!res) return
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

  const rejectOrder = async (order) => {
    const reason = prompt('Reason for rejection (optional):')
    if (reason === null) return

    setVerifying(order.id)
    setActionError('')
    try {
      const res = await adminFetch(`${API_URL}/api/orders/reject`, {
        method: 'POST',
        body: JSON.stringify({ orderId: order.id, reason }),
      })
      if (!res) return
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setActionError(data?.error || `Failed to reject (status ${res.status})`)
        return
      }
      fetchOrders()
    } catch (error) {
      setActionError('Network error: ' + error.message)
    } finally {
      setVerifying(null)
    }
  }

  const deleteOrder = async (order) => {
    const confirmPassword = prompt(
      `To permanently delete order #${order.id.slice(0, 8).toUpperCase()}, please re-enter the admin password:`
    )
    if (confirmPassword === null) return

    setActionError('')
    try {
      const res = await adminFetch(`${API_URL}/api/orders/${order.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ confirmPassword }),
      })
      if (!res) return
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setActionError(data?.error || `Failed to delete (status ${res.status})`)
        return
      }
      fetchOrders()
    } catch (error) {
      setActionError('Network error: ' + error.message)
    }
  }

  const deleteAllOrders = async () => {
    const confirmPassword = prompt('Enter admin password to DELETE ALL ORDERS and reset priority counter:')
    if (confirmPassword === null) return

    setDeletingAll(true)
    setActionError('')
    try {
      const res = await adminFetch(`${API_URL}/api/orders`, {
        method: 'DELETE',
        body: JSON.stringify({ confirmPassword }),
      })
      if (!res) return
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setActionError(data?.error || `Failed to delete all orders (status ${res.status})`)
        return
      }
      fetchOrders()
    } catch (error) {
      setActionError('Network error: ' + error.message)
    } finally {
      setDeletingAll(false)
    }
  }

  const filteredOrders = orders.filter(o => {
    if (activeTab === 'unverified') return ['pending', 'unverified'].includes(o.status)
    if (activeTab === 'paid') return o.status === 'paid'
    if (activeTab === 'rejected') return o.status === 'rejected'
    return true
  })

  const statusBadge = (status) => {
    const map = {
      unverified: 'bg-amber-100 text-amber-800',
      pending: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      ready: 'bg-purple-100 text-purple-800',
      rejected: 'bg-red-100 text-red-800',
    }
    return map[status] ?? 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-brew-beige p-6">
      <div className="max-w-3xl mx-auto">

        <div className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-heading text-5xl text-brew-brown">ADMIN DASHBOARD</h1>
            <InstallButton context="admin" />
          </div>
          <p className="font-body text-brew-brown/60 mt-1">Joe's Brew · Payment verification</p>
        </div>

        {/* SHOP OPEN/CLOSED TOGGLE */}
        <div className={`mb-6 rounded-2xl p-4 flex items-center justify-between ${shopOpen ? 'bg-green-100' : 'bg-red-100'}`}>
          <div>
            <p className="font-heading text-lg text-brew-brown">
              Shop is currently {shopOpen ? 'OPEN' : 'CLOSED'}
            </p>
            <p className="font-body text-xs text-brew-brown/60">
              {shopOpen ? 'Customers can place orders normally.' : 'Customers can browse but cannot checkout.'}
            </p>
          </div>
          <button
            onClick={toggleShop}
            disabled={togglingShop}
            className={`font-heading text-sm px-5 py-2 rounded-full transition-colors ${shopOpen ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'
              }`}
          >
            {togglingShop ? '...' : shopOpen ? 'CLOSE SHOP' : 'OPEN SHOP'}
          </button>
        </div>

        <div className="mb-6 bg-brew-brown text-brew-beige rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="font-body text-xs text-brew-beige/60 uppercase tracking-widest">Today's Revenue</p>
            <p className="font-heading text-3xl">₱{totalRevenue.toFixed(2)}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-4xl">💰</span>
            <button
              onClick={exportOrdersToCSV}
              className="bg-brew-beige text-brew-brown font-heading text-xs px-4 py-2 rounded-full hover:bg-white transition-colors whitespace-nowrap"
            >
              📊 EXPORT TO SHEET
            </button>
          </div>
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

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <h2 className="font-heading text-2xl text-brew-brown tracking-wide">ORDERS</h2>
          <button
            onClick={fetchOrders}
            className="font-heading text-xs tracking-wider px-4 py-1 rounded-full border border-brew-brown/30 text-brew-brown hover:border-brew-brown transition-colors"
          >
            ↻ REFRESH
          </button>
          <button
            onClick={deleteAllOrders}
            disabled={deletingAll || orders.length === 0}
            className="ml-auto font-heading text-xs tracking-wider px-4 py-1 rounded-full border border-red-300 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deletingAll ? '...' : '🗑 DELETE ALL'}
          </button>
          {['unverified', 'paid', 'rejected', 'all'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`font-heading text-xs tracking-wider px-4 py-1 rounded-full border transition-colors ${activeTab === tab
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

                <div className="flex justify-end mb-1">
                  <button
                    onClick={() => deleteOrder(order)}
                    className="text-brew-brown/30 hover:text-red-500 transition-colors text-xs font-body"
                  >
                    🗑 Delete
                  </button>
                </div>

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-heading text-brew-brown text-lg">
                      #{order.priority_number} <span className="text-xs text-brew-brown/40">({order.id.slice(0, 8).toUpperCase()})</span>
                    </p>
                    <p className="font-body text-xs text-brew-brown/50">{order.customer_name || order.customer_phone}</p>
                    <p className="font-body text-xs text-brew-brown/50">{order.customer_phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading text-brew-brown">₱{Number(order.total_amount).toFixed(2)}</p>
                    <span className={`font-body text-xs px-2 py-0.5 rounded-full ${statusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className={`font-body text-xs px-2 py-0.5 rounded-full ${order.order_type === 'delivery' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {order.order_type === 'delivery' ? '🛵 Delivery' : '🏪 Pickup'}
                  </span>
                  {order.order_type === 'delivery' && order.delivery_fee > 0 && (
                    <span className="font-body text-xs text-brew-brown/50">
                      +₱{Number(order.delivery_fee).toFixed(2)} delivery fee
                    </span>
                  )}
                </div>

                {order.order_type === 'delivery' && order.delivery_address && (
                  <div className="bg-brew-beige/50 rounded-lg px-3 py-2 mb-3">
                    <p className="font-body text-xs text-brew-brown/70">📍 {order.delivery_address}</p>
                    {order.delivery_lat && order.delivery_lng && (
                      <a
                        href={`https://www.google.com/maps?q=${order.delivery_lat},${order.delivery_lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-body text-xs text-blue-600 underline mt-1 inline-block"
                      >
                        🗺️ Open exact pinned location in Google Maps
                      </a>
                    )}
                  </div>
                )}

                {order.status === 'rejected' && order.rejection_reason && (
                  <p className="font-body text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
                    Reason: {order.rejection_reason}
                  </p>
                )}

                <ul className="mb-3 space-y-1">
                  {order.order_items?.map((oi, i) => {
                    const isAddon = oi.menu_items?.category === 'Add-ons'
                    const sizeTag = !isAddon && oi.size && oi.size !== 'base'
                      ? ` · ${SIZE_LABEL[oi.size] ?? oi.size}`
                      : ''
                    const baseTag = oi.base_type ? ` · ${oi.base_type}` : ''
                    return (
                      <li key={i} className={`font-body text-sm flex justify-between ${isAddon ? 'pl-4 text-brew-brown/50 text-xs' : 'text-brew-brown/80'}`}>
                        <span>
                          {isAddon ? '↳ ' : ''}{oi.quantity}× {oi.menu_items?.name}
                          {(baseTag || sizeTag) && (
                            <span className="text-brew-brown/40">{baseTag}{sizeTag}</span>
                          )}
                        </span>
                        <span>₱{(oi.unit_price * oi.quantity).toFixed(2)}</span>
                      </li>
                    )
                  })}
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
                    <>
                      <button
                        onClick={() => verifyOrder(order)}
                        disabled={verifying === order.id}
                        className="flex-1 bg-green-600 text-white font-heading text-xs tracking-wider py-2 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {verifying === order.id ? 'PROCESSING...' : '✓ VERIFY'}
                      </button>
                      <button
                        onClick={() => rejectOrder(order)}
                        disabled={verifying === order.id}
                        className="flex-1 bg-red-600 text-white font-heading text-xs tracking-wider py-2 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        ✕ REJECT
                      </button>
                    </>
                  )}
                  {order.status === 'paid' && (
                    <p className="flex-1 text-center font-body text-xs text-blue-700 py-2">
                      ✓ Confirmed — sent to Order Dashboard
                    </p>
                  )}
                  {order.status === 'ready' && (
                    <p className="flex-1 text-center font-body text-xs text-purple-700 py-2">
                      ✓ Picked up / notified
                    </p>
                  )}
                  {order.status === 'rejected' && (
                    <p className="flex-1 text-center font-body text-xs text-red-700 py-2">
                      ✕ Rejected
                    </p>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}

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
    <InstallPrompt context="admin" />
  )
}