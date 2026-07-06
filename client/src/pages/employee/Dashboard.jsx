import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { API_URL } from '../../lib/api'
import { createAuthFetch } from '../../lib/authFetch'
import InstallPrompt, { InstallButton } from '../../components/InstallPrompt'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import { BRANCHES } from '../../context/BranchContext'

const employeeFetch = createAuthFetch('joesbrew_employee_token')

// Branch availability is scoped per-branch in branch_menu_availability table.
// SQL migration (run once in Supabase SQL editor):
//   CREATE TABLE IF NOT EXISTS branch_menu_availability (
//     branch_id TEXT NOT NULL,
//     menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
//     is_available BOOLEAN NOT NULL DEFAULT true,
//     PRIMARY KEY (branch_id, menu_item_id)
//   );
async function fetchBranchAvailability(branchId) {
    const { data } = await supabase
        .from('branch_menu_availability')
        .select('menu_item_id, is_available')
        .eq('branch_id', branchId)
    return Object.fromEntries((data ?? []).map(r => [r.menu_item_id, r.is_available]))
}

export default function EmployeeDashboard() {
    const [orders, setOrders] = useState([])
    const [activeTab, setActiveTab] = useState('pending')
    const [menuItems, setMenuItems] = useState([])
    const [branchAvail, setBranchAvail] = useState({})   // { [menu_item_id]: boolean }
    const [selectedBranch, setSelectedBranch] = useState('cogtong')
    const [loading, setLoading] = useState(true)
    const [fulfilling, setFulfilling] = useState(null)
    const [actionError, setActionError] = useState('')

    const [shopOpen, setShopOpen] = useState(true)
    const [togglingShop, setTogglingShop] = useState(false)
    const { status: pushStatus, subscribe: subscribePush } = usePushNotifications('employee')

    const SIZE_LABEL = { base: 'Medio', grande: 'Grande', king: 'King' }

    const fetchOrders = async (branchId = selectedBranch) => {
        const { data } = await supabase
            .from('orders')
            .select('*, order_items(quantity, unit_price, size, base_type, sort_order, menu_items(name, category))')
            .eq('branch_id', branchId)
            .in('status', ['paid', 'ready'])
            .order('created_at', { ascending: true })
        setOrders(data ?? [])
        setLoading(false)
    }

    const fetchMenu = async (branchId = selectedBranch) => {
        const [{ data }, avail] = await Promise.all([
            supabase.from('menu_items')
                .select('id, name, price, price_grande, price_king, is_available, category, best_seller')
                .order('category'),
            fetchBranchAvailability(branchId),
        ])
        setMenuItems(data ?? [])
        setBranchAvail(avail)
    }

    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
        }
        fetchMenu()
    }, [])

    // Re-fetch and re-subscribe to Realtime whenever the selected branch changes
    useEffect(() => {
        setLoading(true)
        fetchOrders(selectedBranch)

        const channel = supabase
            .channel(`employee-orders-${selectedBranch}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
                if (payload.new?.branch_id !== selectedBranch) return
                if (payload.new?.status === 'paid') {
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification('New Order Ready to Fulfill! ☕', {
                            body: `Order from ${payload.new.customer_name || 'a customer'} — ₱${Number(payload.new.total_amount).toFixed(2)}`,
                            icon: '/images/employee-icon-192.png',
                        })
                    }
                }
                fetchOrders(selectedBranch)
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
                if (payload.new?.branch_id !== selectedBranch) return
                fetchOrders(selectedBranch)
            })
            .subscribe()
        return () => supabase.removeChannel(channel)
    }, [selectedBranch])

    useEffect(() => {
        fetch(`${API_URL}/api/shop/status`)
            .then(r => r.json())
            .then(d => setShopOpen(d.isOpen))
            .catch(() => setShopOpen(true))
    }, [])

    const toggleShop = async () => {
        setTogglingShop(true)
        try {
            const res = await employeeFetch(`${API_URL}/api/shop/toggle`, { method: 'POST' })
            if (!res) return
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
            const res = await employeeFetch(`${API_URL}/api/orders/fulfill`, {
                method: 'POST',
                body: JSON.stringify({ orderId: order.id }),
            })
            if (!res) return
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

    // Effective availability = branch override if it exists, else true (COALESCE default)
    const effectiveAvail = (item) =>
        item.id in branchAvail ? branchAvail[item.id] : true

    const toggleAvailability = async (item) => {
        const current = effectiveAvail(item)
        const next = !current
        const { error } = await supabase
            .from('branch_menu_availability')
            .upsert(
                { branch_id: selectedBranch, menu_item_id: item.id, is_available: next },
                { onConflict: 'branch_id,menu_item_id' }
            )
        if (error) {
            // Fallback: write to global menu_items if branch table unavailable
            const { error: fallbackErr } = await supabase
                .from('menu_items')
                .update({ is_available: next })
                .eq('id', item.id)
            if (fallbackErr) { setActionError('Failed to update: ' + fallbackErr.message); return }
            setMenuItems(prev => prev.map(m => m.id === item.id ? { ...m, is_available: next } : m))
        }
        // Always update branchAvail so effectiveAvail reflects the new state in the UI
        setBranchAvail(prev => ({ ...prev, [item.id]: next }))
    }

    // Reload branch availability when branch changes
    useEffect(() => {
        fetchBranchAvailability(selectedBranch).then(setBranchAvail)
    }, [selectedBranch])

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
      <>
        <div className="min-h-screen bg-brew-beige p-6">
            <div className="max-w-6xl mx-auto">
                <div className="mb-6">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                            <h1 className="font-heading text-5xl text-brew-brown">ORDER DASHBOARD</h1>
                            <p className="font-body text-brew-brown/60 mt-1 text-sm">
                                {BRANCHES[selectedBranch]?.emoji} {BRANCHES[selectedBranch]?.label} Branch
                            </p>
                        </div>
                        <div className="flex gap-2 items-center flex-wrap">
                            {/* Branch switcher */}
                            <div className="flex gap-1">
                                {Object.values(BRANCHES).map(b => (
                                    <button
                                        key={b.id}
                                        onClick={() => setSelectedBranch(b.id)}
                                        className={`font-heading text-xs tracking-wider px-3 py-1.5 rounded-full border transition-colors ${selectedBranch === b.id
                                            ? 'bg-brew-brown text-brew-beige border-brew-brown'
                                            : 'text-brew-brown border-brew-brown/30 hover:border-brew-brown'}`}
                                    >
                                        {b.emoji} {b.label}
                                    </button>
                                ))}
                            </div>
                            {pushStatus === 'idle' && (
                                <button onClick={subscribePush} className="font-heading text-xs tracking-wider px-4 py-1 rounded-full border border-brew-brown/30 text-brew-brown hover:border-brew-brown transition-colors">
                                    🔔 ENABLE ALERTS
                                </button>
                            )}
                            {pushStatus === 'subscribed' && (
                                <span className="font-heading text-xs text-green-700 px-3 py-1 rounded-full bg-green-100">🔔 ALERTS ON</span>
                            )}
                            <InstallButton context="employee" />
                        </div>
                    </div>
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
                            <button
                                onClick={fetchOrders}
                                className="ml-auto font-heading text-xs tracking-wider px-4 py-1 rounded-full border border-brew-brown/30 text-brew-brown hover:border-brew-brown transition-colors"
                            >
                                ↻ REFRESH
                            </button>
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

                                        {order.order_type === 'delivery' && (
                                            <div className="bg-brew-beige/50 rounded-lg px-3 py-2 mb-2 space-y-1">
                                                {order.delivery_address && (
                                                    <p className="font-body text-xs text-brew-brown/70">
                                                        📍 {order.delivery_address}
                                                    </p>
                                                )}
                                                {order.delivery_lat && order.delivery_lng && (
                                                    <a
                                                        href={`https://www.google.com/maps?q=${order.delivery_lat},${order.delivery_lng}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 font-heading text-xs text-blue-600 hover:text-blue-800 underline"
                                                    >
                                                        🗺️ View Pinpoint on Map
                                                    </a>
                                                )}
                                            </div>
                                        )}

                                        <ul className="mb-3 space-y-1">
                                            {[...(order.order_items ?? [])].sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999)).map((oi, i) => {
                                                const isAddon = oi.menu_items?.category === 'Add-ons'
                                                const sizeTag = !isAddon && oi.size && oi.size !== 'base'
                                                    ? ` · ${SIZE_LABEL[oi.size] ?? oi.size}`
                                                    : ''
                                                const baseTag = oi.base_type ? ` · ${oi.base_type}` : ''
                                                return (
                                                    <li key={i} className={`font-body flex justify-between ${isAddon ? 'pl-4 text-brew-brown/50 text-xs' : 'text-sm text-brew-brown/80'}`}>
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
                                                className={`shrink-0 px-3 py-1.5 rounded-full font-heading text-xs tracking-wider whitespace-nowrap ${effectiveAvail(item)
                                                    ? 'bg-green-100 text-green-800 hover:bg-red-100 hover:text-red-800'
                                                    : 'bg-red-100 text-red-800 hover:bg-green-100 hover:text-green-800'
                                                    }`}
                                            >
                                                {effectiveAvail(item) ? 'AVAILABLE' : 'UNAVAILABLE'}
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
        <InstallPrompt context="employee" />
      </>
    )
}