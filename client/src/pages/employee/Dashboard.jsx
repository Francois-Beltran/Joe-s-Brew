import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { API_URL } from '../../lib/api'

export default function EmployeeDashboard() {
    const [orders, setOrders] = useState([])
    const [activeTab, setActiveTab] = useState('pending')
    const [menuItems, setMenuItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [fulfilling, setFulfilling] = useState(null)
    const [actionError, setActionError] = useState('')

    const [shopOpen, setShopOpen] = useState(true)
    const [togglingShop, setTogglingShop] = useState(false)

    const fetchOrders = async () => {
        const { data } = await supabase
            .from('orders')
            .select('*, order_items(quantity, unit_price, menu_items(name))')
            .in('status', ['paid', 'ready'])
            .order('created_at', { ascending: true })
        setOrders(data ?? [])
        setLoading(false)
    }

    const fetchMenu = async () => {
        const { data } = await supabase
            .from('menu_items')
            .select('id, name, price, price_grande, price_king, is_available, category, best_seller')
            .order('category')
        setMenuItems(data ?? [])
    }

    useEffect(() => {
        fetchOrders()
        fetchMenu()
        const channel = supabase
            .channel('employee-orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
            .subscribe()
        return () => supabase.removeChannel(channel)
    }, [])

    useEffect(() => {
        fetch(`${API_URL}/api/shop/status`)
            .then(r => r.json())
            .then(d => setShopOpen(d.isOpen))
            .catch(() => setShopOpen(true))
    }, [])

    const toggleShop = async () => {
        setTogglingShop(true)
        try {
            const res = await fetch(`${API_URL}/api/shop/toggle`, {
                method: 'POST',
                headers: { 'X-Session-Token': sessionStorage.getItem('joesbrew_employee_token') },
            })
            const data = await res.json()
            setShopOpen(data.isOpen)
        } catch {
            setActionError('Failed to toggle shop status')
        } finally {
            setTogglingShop(false)
        }
    }

    const markReady = async (order) => {
        setFulfilling(order.id)
        setActionError('')
        try {
            const res = await fetch(`${API_URL}/api/orders/fulfill`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Token': sessionStorage.getItem('joesbrew_employee_token'),
                },
                body: JSON.stringify({ orderId: order.id }),
            })
            const data = await res.json().catch(() => null)
            if (!res.ok) {
                setActionError(data?.error || `Failed (status ${res.status})`)
                return
            }
            fetchOrders()
        } catch (error) {
            setActionError('Network error: ' + error.message)
        } finally {
            setFulfilling(null)
        }
    }

    const toggleAvailability = async (item) => {
        const { error } = await supabase
            .from('menu_items')
            .update({ is_available: !item.is_available })
            .eq('id', item.id)
        if (error) {
            setActionError('Failed to update: ' + error.message)
            return
        }
        setMenuItems(prev => prev.map(m => m.id === item.id ? { ...m, is_available: !m.is_available } : m))
    }

    const CATEGORY_ORDER = [
        'Hot Brew', 'Cold Brew', 'Barista Signature', 'Frappe', 'Milk Tea',
        'Fruity Seltzer', 'Tea Infused Fruit Blend', 'Aqua Infused Fruit Blend',
        'Coffee', 'Non-Coffee', 'Takoyaki', 'Waffles', 'Nachos', 'Fries', 'Food', 'Add-ons'
    ]

    const grouped = menuItems.reduce((acc, item) => {
        const cat = item.category || 'Other'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(item)
        return acc
    }, {})

    const sortedCats = Object.keys(grouped).sort((a, b) => {
        const ai = CATEGORY_ORDER.indexOf(a), bi = CATEGORY_ORDER.indexOf(b)
        if (ai === -1 && bi === -1) return a.localeCompare(b)
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
    })

    const filteredOrders = orders.filter(o => {
        if (activeTab === 'pending') return o.status === 'paid'
        if (activeTab === 'completed') return o.status === 'ready'
        return true
    })

    return (
        <div className="min-h-screen bg-brew-beige p-6">
            <div className="max-w-6xl mx-auto">
                <div className="mb-6">
                    <h1 className="font-heading text-5xl text-brew-brown">ORDER DASHBOARD</h1>
                    <p className="font-body text-brew-brown/60 mt-1">Joe's Brew · Employee fulfillment</p>
                </div>

                {/* SHOP OPEN/CLOSED TOGGLE — controls whether customers can checkout */}
                <div className={`mb-6 rounded-2xl p-4 flex items-center justify-between ${shopOpen ? 'bg-green-100' : 'bg-red-100'}`}>
                    <div>
                        <p className="font-heading text-lg text-brew-brown no-underline decoration-none">
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

                {actionError && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex justify-between">
                        <p className="font-body text-sm text-red-700">{actionError}</p>
                        <button onClick={() => setActionError('')} className="text-red-400 text-sm">✕</button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Orders to fulfill */}
                    <div>
                        <div className="flex items-center gap-3 mb-4 flex-wrap">
                            <h2 className="font-heading text-2xl text-brew-brown">ORDERS</h2>
                            {['pending', 'completed', 'all'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`font-heading text-xs tracking-wider px-4 py-1 rounded-full border transition-colors ${activeTab === tab
                                        ? 'bg-brew-brown text-brew-beige border-brew-brown'
                                        : 'text-brew-brown border-brew-brown/30 hover:border-brew-brown'
                                        }`}
                                >
                                    {tab.toUpperCase()}
                                    {tab === 'pending' && (
                                        <span className="ml-1">({orders.filter(o => o.status === 'paid').length})</span>
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
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                {/* 🔢 PRIORITY NUMBER — shows queue order, auto-assigned by database */}
                                                <p className="font-heading text-brew-brown text-lg">
                                                    #{order.priority_number} <span className="text-xs text-brew-brown/40">({order.id.slice(0, 8).toUpperCase()})</span>
                                                </p>
                                                <p className="font-body text-xs text-brew-brown/50">{order.customer_name}</p>
                                                <p className="font-body text-xs text-brew-brown/50">{order.customer_phone}</p>
                                            </div>
                                            <span className={`font-body text-xs px-2 py-0.5 rounded-full ${order.order_type === 'delivery' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                                }`}>
                                                {order.order_type === 'delivery' ? '🛵 Delivery' : '🏪 Pickup'}
                                            </span>
                                        </div>

                                        {order.order_type === 'delivery' && order.delivery_address && (
                                            <p className="font-body text-xs text-brew-brown/70 bg-brew-beige/50 rounded-lg px-3 py-2 mb-2">
                                                📍 {order.delivery_address}
                                            </p>
                                        )}

                                        <ul className="mb-3 space-y-1">
                                            {order.order_items?.map((oi, i) => (
                                                <li key={i} className="font-body text-sm text-brew-brown/80 flex justify-between">
                                                    <span>{oi.quantity}× {oi.menu_items?.name}</span>
                                                    <span>₱{(oi.unit_price * oi.quantity).toFixed(2)}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        {order.status === 'paid' ? (
                                            <button
                                                onClick={() => markReady(order)}
                                                disabled={fulfilling === order.id}
                                                className="w-full bg-brew-brown text-brew-beige font-heading text-xs tracking-wider py-2 rounded-xl hover:bg-brew-dark disabled:opacity-50"
                                            >
                                                {fulfilling === order.id ? 'NOTIFYING...' : '☕ READY & NOTIFY CUSTOMER'}
                                            </button>
                                        ) : (
                                            <p className="text-center font-body text-xs text-purple-700 py-2">
                                                ✓ Completed
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Inventory */}
                    <div>
                        <h2 className="font-heading text-2xl text-brew-brown mb-4">INVENTORY</h2>
                        {sortedCats.map(cat => (
                            <div key={cat} className="mb-4">
                                <div className="bg-brew-brown/10 px-4 py-2 rounded-t-xl">
                                    <p className="font-heading text-sm text-brew-brown tracking-widest">{cat.toUpperCase()}</p>
                                </div>
                                <div className="bg-white rounded-b-xl shadow-sm overflow-hidden">
                                    {grouped[cat].map((item, idx) => (
                                        <div key={item.id} className={`flex items-center justify-between px-4 py-3 gap-3 ${idx !== grouped[cat].length - 1 ? 'border-b border-brew-beige/40' : ''
                                            }`}>
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                {item.best_seller && <span className="text-amber-400 text-xs shrink-0">⭐</span>}
                                                <p className="font-body font-medium text-brew-brown text-sm truncate">{item.name}</p>
                                            </div>
                                            <button
                                                onClick={() => toggleAvailability(item)}
                                                className={`shrink-0 px-3 py-1.5 rounded-full font-heading text-xs tracking-wider whitespace-nowrap ${item.is_available
                                                    ? 'bg-green-100 text-green-800 hover:bg-red-100 hover:text-red-800'
                                                    : 'bg-red-100 text-red-800 hover:bg-green-100 hover:text-green-800'
                                                    }`}
                                            >
                                                {item.is_available ? 'AVAILABLE' : 'UNAVAILABLE'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    )
}